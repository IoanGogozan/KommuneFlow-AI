import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { AuthModule } from '../auth/auth.module';
import { PrivacyModule } from './privacy.module';
import { PrivacyService } from './privacy.service';

describe('PrivacyController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const privacyService = {
    getStatus: jest.fn(),
    exportCitizenData: jest.fn(),
    anonymizeCitizenProfile: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    privacyService.getStatus.mockReturnValue({
      status: 'ok',
      capabilities: {
        citizenDataExport: true,
        citizenAnonymization: true,
        documentSoftDelete: false,
        retentionConfiguration: false,
      },
    });
    privacyService.exportCitizenData.mockReset();
    privacyService.anonymizeCitizenProfile.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule, PrivacyModule],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PrivacyService)
      .useValue(privacyService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns 401 when privacy status is requested without authentication', () => {
    return request(app.getHttpServer())
      .get('/api/v1/privacy/status')
      .expect(401);
  });

  it('returns privacy capability status for users with audit read permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@example.local',
      role: 'auditor',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/privacy/status')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      capabilities: {
        citizenDataExport: true,
        citizenAnonymization: true,
        documentSoftDelete: false,
        retentionConfiguration: false,
      },
    });
  });

  it('returns 403 when a user without privacy export permission requests export', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@example.local',
      role: 'auditor',
    });

    await request(app.getHttpServer())
      .get('/api/v1/privacy/citizen-data-export?citizenProfileId=citizen_1')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
  });

  it('exports citizen data for super admins', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'admin@example.local',
      role: 'super_admin',
    });
    privacyService.exportCitizenData.mockResolvedValue({
      exportedAt: '2026-05-09T07:00:00.000Z',
      citizenProfile: { id: 'citizen_1' },
      cases: [],
      auditEvents: [],
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/privacy/citizen-data-export?citizenProfileId=citizen_1')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toMatchObject({
      citizenProfile: { id: 'citizen_1' },
    });
    expect(privacyService.exportCitizenData).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user_1',
        tenantId: 'tenant_1',
        role: 'super_admin',
      }),
      {
        citizenProfileId: 'citizen_1',
      },
    );
  });

  it('returns 403 when a user without privacy anonymize permission requests anonymization', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@example.local',
      role: 'auditor',
    });

    await request(app.getHttpServer())
      .post('/api/v1/privacy/citizen-profiles/citizen_1/anonymize')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
  });

  it('anonymizes citizen profiles for super admins', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'admin@example.local',
      role: 'super_admin',
    });
    privacyService.anonymizeCitizenProfile.mockResolvedValue({
      anonymizedAt: '2026-05-09T07:00:00.000Z',
      citizenProfile: {
        id: 'citizen_1',
        name: 'Anonymized citizen zen_1',
        email: 'anonymized-citizen_1@privacy.local',
        phone: null,
        address: null,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/privacy/citizen-profiles/citizen_1/anonymize')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(201);

    expect(response.body).toMatchObject({
      citizenProfile: {
        id: 'citizen_1',
        phone: null,
        address: null,
      },
    });
    expect(privacyService.anonymizeCitizenProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user_1',
        tenantId: 'tenant_1',
        role: 'super_admin',
      }),
      'citizen_1',
    );
  });
});
