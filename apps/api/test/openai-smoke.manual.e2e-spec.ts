import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { aiTriageOutputSchema } from '../src/modules/ai/ai.schemas';

const manualSmoke =
  process.env.OPENAI_SMOKE_ALLOW_REAL === 'true' ? describe : describe.skip;

manualSmoke('manual protected OpenAI smoke', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('runs exactly one synthetic triage through authenticated APIs', async () => {
    expect(process.env.AI_PROVIDER).toBe('openai');
    expect(process.env.OPENAI_API_KEY).toBeTruthy();
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({
        email: 'department.admin@kristiansand.local',
        password:
          process.env.OPENAI_SMOKE_DEMO_PASSWORD ??
          'OpenAISmokeSyntheticPassword123!',
      })
      .expect(201);

    const status = await agent.get('/api/v1/ai/status').expect(200);
    expect(status.body as unknown).toMatchObject({
      provider: 'openai',
      configured: true,
    });

    const casesResponse = await agent.get('/api/v1/cases').expect(200);
    const cases = casesResponse.body as unknown as Array<{ id: string }>;
    expect(cases.length).toBeGreaterThan(0);
    const caseId = cases[0].id;
    const beforeResponse = await agent
      .get(`/api/v1/cases/${caseId}`)
      .expect(200);
    const before = officialFields(beforeResponse.body);

    const triageResponse = await agent
      .post(`/api/v1/cases/${caseId}/ai-triage`)
      .set('Origin', 'http://localhost:3000')
      .expect(201);
    const suggestion = triageResponse.body as unknown as {
      id: string;
      suggestedCategory: string;
      suggestedUrgency: string;
      suggestedDepartment: { slug: string } | null;
      summary: string;
      missingInformationJson: unknown;
      confidenceScore: number;
      reasoningSummary: string;
    };
    aiTriageOutputSchema.parse({
      category: suggestion.suggestedCategory,
      suggestedDepartmentSlug:
        suggestion.suggestedDepartment?.slug ?? 'unassigned',
      urgency: suggestion.suggestedUrgency,
      summary: suggestion.summary,
      missingInformation: suggestion.missingInformationJson,
      confidence: suggestion.confidenceScore,
      reasoningSummary: suggestion.reasoningSummary,
    });

    const unchangedResponse = await agent
      .get(`/api/v1/cases/${caseId}`)
      .expect(200);
    expect(officialFields(unchangedResponse.body)).toEqual(before);

    await agent
      .post(`/api/v1/cases/${caseId}/ai-triage/${suggestion.id}/review`)
      .set('Origin', 'http://localhost:3000')
      .send({
        approvedCategory: suggestion.suggestedCategory,
        approvedUrgency: suggestion.suggestedUrgency,
        approvedDepartmentSlug: suggestion.suggestedDepartment?.slug,
        wasAiSuggestionAccepted: true,
      })
      .expect(201);
  });
});

function officialFields(body: unknown) {
  const value = body as { category: string; urgency: string; status: string };
  return {
    category: value.category,
    urgency: value.urgency,
    status: value.status,
  };
}
