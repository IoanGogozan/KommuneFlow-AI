import { MockAIProvider } from './mock-ai.provider';

describe('MockAIProvider', () => {
  it('generates deterministic case triage output', async () => {
    const provider = new MockAIProvider();

    await expect(
      provider.generateCaseTriage({
        title: 'Request about building permit',
        description:
          'I need information about documentation required for a garage extension.',
        sourceLanguage: 'en',
        departments: [
          {
            slug: 'technical_department',
            name: 'Technical Department',
            description: 'Building cases, roads, water, and waste.',
          },
        ],
      }),
    ).resolves.toMatchObject({
      model: 'mock-ai-provider',
      promptVersion: 'case_triage_v1',
      output: {
        category: 'building_case',
        suggestedDepartmentSlug: 'technical_department',
      },
    });
  });
});
