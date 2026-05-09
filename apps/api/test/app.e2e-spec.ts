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
    requestId: string;
  };
};

type HealthResponseBody = {
  status: 'ok';
  service: 'kommuneflow-api';
  timestamp: string;
};

type ReadinessResponseBody = {
  status: 'ready';
  checks: {
    database: { status: 'ok' };
    uploadStorage: { status: 'ok' };
  };
  timestamp: string;
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

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
      .expect(200);
    const body = response.body as unknown as ReadinessResponseBody;

    expect(body.status).toBe('ready');
    expect(body.checks.database.status).toBe('ok');
    expect(body.checks.uploadStorage.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(JSON.stringify(body)).not.toContain('DATABASE_URL');
    expect(JSON.stringify(body)).not.toContain('UPLOAD_STORAGE_PATH');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  afterEach(async () => {
    await app.close();
  });
});
