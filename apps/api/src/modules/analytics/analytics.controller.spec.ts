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
import { AnalyticsModule } from './analytics.module';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const analyticsService = {
    getSummary: jest.fn(),
    aggregateTenantRange: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    analyticsService.getSummary.mockReset();
    analyticsService.aggregateTenantRange.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule, AnalyticsModule],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AnalyticsService)
      .useValue(analyticsService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 without authentication', () => {
    return request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .expect(401);
  });

  it('returns 403 when the user lacks analytics permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: 'case_worker',
    });

    await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
  });

  it('returns analytics summary for users with analytics permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'department.admin@example.local',
      role: 'department_admin',
    });
    analyticsService.getSummary.mockResolvedValue({
      tenantId: 'tenant_1',
      totals: {
        totalCases: 0,
      },
      daily: [],
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary?from=2026-05-01&to=2026-05-02')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toMatchObject({
      tenantId: 'tenant_1',
      totals: {
        totalCases: 0,
      },
    });
    expect(analyticsService.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        role: 'department_admin',
      }),
      {
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-02T00:00:00.000Z'),
      },
    );
  });
});
