import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { AuthModule } from '../auth/auth.module';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

describe('OperationsController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const operationsService = {
    getReadinessChecks: jest.fn(),
    getMetricsSummary: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    operationsService.getReadinessChecks.mockReset();
    operationsService.getMetricsSummary.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
      controllers: [OperationsController],
      providers: [OperationsService],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(OperationsService)
      .useValue(operationsService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns health without authentication', () => {
    return request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });

  it('returns readiness when dependency checks are ready', async () => {
    operationsService.getReadinessChecks.mockResolvedValue({
      database: { status: 'ok' },
      uploadStorage: { status: 'ok' },
      kartverketAddressIntegration: { status: 'warning' },
      ssbIntegration: { status: 'warning' },
    });

    await request(app.getHttpServer()).get('/api/v1/readiness').expect(200);
  });

  it('returns 401 for metrics summary without authentication', () => {
    return request(app.getHttpServer())
      .get('/api/v1/operations/metrics-summary')
      .expect(401);
  });

  it('returns 403 for metrics summary when the role lacks permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: 'case_worker',
    });

    await request(app.getHttpServer())
      .get('/api/v1/operations/metrics-summary')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
  });

  it('returns metrics summary for auditors', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@example.local',
      role: 'auditor',
    });
    operationsService.getMetricsSummary.mockResolvedValue({
      apiErrorsLast24h: 0,
      failedLoginsLast24h: 1,
      permissionDeniedLast24h: 2,
      crossTenantAccessAttemptsLast24h: 0,
      rateLimitBlocksLast24h: 4,
      aiTriageRequestsLast24h: 5,
      aiTriageFailuresLast24h: 1,
      averageAiLatencyMsLast24h: null,
      documentUploadFailuresLast24h: 0,
      kartverketLookupCountLast24h: 3,
      kartverketFailureCountLast24h: 1,
      kartverketAverageLatencyMsLast24h: 120,
      ssbImportLastStatus: 'completed',
      ssbImportLastRunAt: '2026-05-09T10:00:00.000Z',
      analyticsLastRebuildAt: '2026-05-09T11:00:00.000Z',
      retentionCleanupLastRunAt: null,
      backupLastRunStatus: null,
      backupLastRunAt: null,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/operations/metrics-summary')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(operationsService.getMetricsSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user_1',
        tenantId: 'tenant_1',
        role: 'auditor',
      }),
    );
    expect(response.body).toMatchObject({
      failedLoginsLast24h: 1,
      rateLimitBlocksLast24h: 4,
      kartverketLookupCountLast24h: 3,
      ssbImportLastStatus: 'completed',
    });
  });
});
