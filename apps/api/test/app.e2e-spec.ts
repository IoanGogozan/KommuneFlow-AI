import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from '../src/configure-app';
import { appLogger } from '../src/shared/logging/app-logger';

type ErrorResponseBody = {
  error: {
    code: string;
    message?: string;
    requestId: string;
    path?: string;
  };
};

type HealthResponseBody = {
  status: 'ok';
  service: 'kommuneflow-api';
  timestamp: string;
};

type ReadinessResponseBody = {
  status: 'ready' | 'not_ready';
  checks: {
    database: { status: 'ok' | 'error' };
    uploadStorage: { status: 'ok' | 'error' };
  };
  timestamp: string;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('sets security headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });

  it('allows configured CORS origins', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Origin', process.env.APP_BASE_URL ?? 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(
      process.env.APP_BASE_URL ?? 'http://localhost:3000',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow arbitrary CORS origins', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Origin', 'https://evil.example')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects cookie-authenticated state changes from invalid origins', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://evil.example')
      .set('Cookie', ['kommuneflow_access_token=fake-token'])
      .expect(403);

    expect(response.body).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid request origin.',
      },
    });
  });

  it('allows cookie-authenticated state changes from configured origins', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Origin', process.env.APP_BASE_URL ?? 'http://localhost:3000')
      .set('Cookie', ['kommuneflow_access_token=fake-token'])
      .expect(201);
  });

  it('returns a safe error for invalid JSON bodies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/tenants/arendal/cases')
      .set('Content-Type', 'application/json')
      .send('{"citizen":')
      .expect(400);

    expect(response.body).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
      },
    });
  });

  it('returns a safe error for unsupported HTTP methods', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/health')
      .expect(404);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toEqual(expect.any(String));
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('TypeError');
  });

  it('does not leak stack traces when external integrations fail', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ upstream: 'failure' }),
    });

    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/public/tenants/arendal/integrations/kartverket/address-search',
      )
      .query({ q: 'Storgata 12' })
      .expect(502);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('BAD_GATEWAY');
    expect(body.error.message).toBe('Address lookup is unavailable.');
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('BadGatewayException');
    expect(JSON.stringify(body)).not.toContain('upstream');
  });

  it('rate limits public address search abuse', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ adresser: [] }),
    });

    for (let index = 0; index < 20; index += 1) {
      await request(app.getHttpServer())
        .get(
          '/api/v1/public/tenants/arendal/integrations/kartverket/address-search',
        )
        .query({ q: 'Storgata 12' })
        .expect(200);
    }

    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/public/tenants/arendal/integrations/kartverket/address-search',
      )
      .query({ q: 'Storgata 12' })
      .expect(429);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('does not expose a public read endpoint for guessed citizen cases', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/tenants/arendal/cases/case_from_another_citizen')
      .expect(404);
    const body = response.body as unknown as ErrorResponseBody;

    expect(body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('rejects oversized JSON bodies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/tenants/arendal/cases')
      .set('Content-Type', 'application/json')
      .send({
        citizen: {
          name: 'Demo Citizen',
          email: 'citizen@example.local',
        },
        case: {
          title: 'Oversized request',
          description: 'x'.repeat(1024 * 1024 + 1),
          sourceLanguage: 'en',
        },
        privacyAccepted: true,
      })
      .expect(413);

    expect(response.body).toMatchObject({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  });

  it('adds a generated request ID response header', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).toHaveLength(36);
  });

  it('reuses a safe incoming request ID', async () => {
    const requestId = 'req_test-12345678';

    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('X-Request-Id', requestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(requestId);
  });

  it('replaces an unsafe incoming request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('X-Request-Id', '../bad request id')
      .expect(200);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).not.toBe('../bad request id');
  });

  it('uses the request ID in structured error responses', async () => {
    const requestId = 'req_error-12345678';
    const warnSpy = jest.spyOn(appLogger, 'warn').mockImplementation();

    const response = await request(app.getHttpServer())
      .get('/api/v1/not-found')
      .set('X-Request-Id', requestId)
      .expect(404);
    const body = response.body as unknown as ErrorResponseBody;

    expect(response.headers['x-request-id']).toBe(requestId);
    expect(body.error.requestId).toBe(requestId);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http_error',
        requestId,
        errorCode: 'NOT_FOUND',
        method: 'GET',
        path: '/api/v1/not-found',
        statusCode: 404,
      }),
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('cookie');
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain('authorization');

    warnSpy.mockRestore();
  });

  it('/api/v1/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    const body = response.body as unknown as HealthResponseBody;

    expect(body.status).toBe('ok');
    expect(body.service).toBe('kommuneflow-api');
    expect(typeof body.timestamp).toBe('string');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('/api/v1/readiness (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/readiness')
      .expect((result) => {
        expect([200, 503]).toContain(result.status);
      });
    const body = response.body as unknown as ReadinessResponseBody;

    if (response.status === 200) {
      expect(body.status).toBe('ready');
      expect(['ok', 'error']).toContain(body.checks.database.status);
      expect(['ok', 'error']).toContain(body.checks.uploadStorage.status);
      expect(typeof body.timestamp).toBe('string');
    } else {
      const errorBody = response.body as unknown as ErrorResponseBody;
      expect(errorBody.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(errorBody.error.requestId).toEqual(expect.any(String));
    }

    expect(JSON.stringify(body)).not.toContain('DATABASE_URL');
    expect(JSON.stringify(body)).not.toContain('UPLOAD_STORAGE_PATH');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    await app.close();
  });
});
