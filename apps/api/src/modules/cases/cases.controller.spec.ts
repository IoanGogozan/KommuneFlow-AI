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
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

describe('CasesController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const casesService = {
    listActivity: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    casesService.listActivity.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
      controllers: [CasesController],
      providers: [
        {
          provide: CasesService,
          useValue: casesService,
        },
      ],
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

  it('requires authentication for case activity', () => {
    return request(app.getHttpServer())
      .get('/api/v1/cases/case_1/activity')
      .expect(401);
  });

  it('returns case activity for authenticated users', async () => {
    const user = {
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: 'case_worker',
    };
    jwtService.verifyAsync.mockResolvedValue(user);
    casesService.listActivity.mockResolvedValue([
      {
        id: 'audit_1',
        action: 'case.status_updated',
        createdAt: '2026-05-13T10:00:00.000Z',
        actor: {
          name: 'Case Worker',
          email: 'case.worker@example.local',
        },
        metadataSummary: {
          previousStatus: 'new',
          nextStatus: 'in_progress',
        },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/cases/case_1/activity')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(casesService.listActivity).toHaveBeenCalledWith('case_1', user);
  });
});
