import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/configure-app';
import { AppModule } from '../src/app.module';

describe('unauthenticated application perimeter (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['GET', '/api/v1'],
    ['GET', '/api/v1/health'],
  ])('allows public %s %s', async (method, path) => {
    await request(app.getHttpServer()).get(path).expect(200);
  });

  it('allows readiness according to dependency health', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/readiness',
    );
    expect([200, 503]).toContain(response.status);
    expect(response.status).not.toBe(401);
  });

  it.each([
    ['POST', '/api/v1/public/tenants/nonexistent/cases', { invalid: true }],
    [
      'POST',
      '/api/v1/public/tenants/nonexistent/cases/status',
      { invalid: true },
    ],
  ])(
    'reaches public %s %s without authentication',
    async (_method, path, body) => {
      const response = await request(app.getHttpServer()).post(path).send(body);
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    },
  );

  it('reaches public address search without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/public/tenants/nonexistent/integrations/kartverket/address-search',
      )
      .query({ q: 'Storgata 12' });
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });

  it('reaches login and demo-session only through the protected auth policy', async () => {
    const origin = process.env.APP_BASE_URL ?? 'http://localhost:3000';
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', origin)
      .send({ email: 'unknown@example.test', password: 'invalid' })
      .expect(401);

    const demoResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-session')
      .set('Origin', origin)
      .send({ tenantSlug: 'not-allowed' });
    expect([400, 404]).toContain(demoResponse.status);
  });

  it.each([
    ['GET', '/api/v1/auth/me'],
    ['GET', '/api/v1/cases'],
    ['GET', '/api/v1/cases/example-case'],
    ['GET', '/api/v1/cases/example-case/activity'],
    ['PATCH', '/api/v1/cases/example-case/status'],
    ['POST', '/api/v1/cases/example-case/internal-notes'],
    ['GET', '/api/v1/cases/example-case/documents'],
    ['POST', '/api/v1/cases/example-case/documents'],
    ['GET', '/api/v1/cases/example-case/ai-triage/latest'],
    ['POST', '/api/v1/cases/example-case/ai-triage'],
    ['GET', '/api/v1/analytics/summary'],
    ['POST', '/api/v1/analytics/aggregate'],
    ['GET', '/api/v1/audit/events'],
    ['GET', '/api/v1/privacy/status'],
    ['POST', '/api/v1/privacy/retention-cleanup'],
    ['GET', '/api/v1/operations/metrics-summary'],
    ['GET', '/api/v1/departments'],
    ['GET', '/api/v1/integrations/kartverket/address-search?q=Storgata'],
    ['GET', '/api/v1/ai/status'],
    ['GET', '/api/v1/internal/ai/diagnostics'],
    ['POST', '/api/v1/integrations/ssb/imports/municipality-population'],
    ['GET', '/api/v1/admin/departments'],
    ['GET', '/api/v1/admin/routing-rules'],
    ['GET', '/api/v1/admin/users'],
  ])('returns 401 for protected %s %s', async (method, path) => {
    const client = request(app.getHttpServer());
    const pendingRequest =
      method === 'POST'
        ? client.post(path)
        : method === 'PATCH'
          ? client.patch(path)
          : client.get(path);
    const response = await pendingRequest
      .set('Origin', process.env.APP_BASE_URL ?? 'http://localhost:3000')
      .send({});
    expect(response.status).toBe(401);
  });
});
