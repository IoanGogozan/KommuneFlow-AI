import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const auditService = {
    listRecentEvents: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    auditService.listRecentEvents.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: auditService }],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication', () => {
    return request(app.getHttpServer()).get('/api/v1/audit/events').expect(401);
  });

  it('rejects users without audit read permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: 'case_worker',
    });

    await request(app.getHttpServer())
      .get('/api/v1/audit/events')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
    expect(auditService.listRecentEvents).not.toHaveBeenCalled();
  });

  it('returns tenant audit events for auditors', async () => {
    const user = {
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@example.local',
      role: 'auditor',
    };
    jwtService.verifyAsync.mockResolvedValue(user);
    auditService.listRecentEvents.mockResolvedValue([
      {
        id: 'audit_1',
        action: 'case.status_updated',
        entityType: 'case',
        entityId: 'case_1',
        createdAt: '2026-05-13T10:00:00.000Z',
        actor: null,
        metadataSummary: {
          previousStatus: 'new',
          nextStatus: 'in_progress',
        },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/events?action=case.status_updated')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(auditService.listRecentEvents).toHaveBeenCalledWith(user, {
      action: 'case.status_updated',
    });
  });
});
