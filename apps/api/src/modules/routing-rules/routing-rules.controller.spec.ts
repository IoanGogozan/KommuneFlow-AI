import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { RoutingRulesController } from './routing-rules.controller';
import { RoutingRulesService } from './routing-rules.service';

describe('RoutingRulesController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const prisma = {
    department: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    prisma.department.findMany.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
      controllers: [RoutingRulesController],
      providers: [RoutingRulesService],
    })
      .overrideProvider(JwtService)
      .useValue(jwtService)
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('requires authentication', () => {
    return request(app.getHttpServer())
      .get('/api/v1/admin/routing-rules')
      .expect(401);
  });

  it('rejects users without routing rules permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: UserRole.case_worker,
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/routing-rules')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });

  it('returns read-only tenant routing rules', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'department.admin@example.local',
      role: UserRole.department_admin,
    });
    prisma.department.findMany.mockResolvedValue([
      {
        id: 'department_1',
        name: 'Technical Department',
        slug: 'technical_department',
      },
      {
        id: 'department_2',
        name: 'General Administration',
        slug: 'general_administration',
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/routing-rules')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'building_case',
          defaultDepartmentSlug: 'technical_department',
          defaultDepartment: {
            id: 'department_1',
            name: 'Technical Department',
            slug: 'technical_department',
          },
          source: 'static_config',
        }),
        expect.objectContaining({
          category: 'general_inquiry',
          defaultDepartmentSlug: 'general_administration',
        }),
      ]),
    );
    expect(prisma.department.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  });
});
