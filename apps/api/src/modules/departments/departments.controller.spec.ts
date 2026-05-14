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
import {
  AdminDepartmentsController,
  DepartmentsController,
} from './departments.controller';
import { DepartmentsService } from './departments.service';

describe('DepartmentsController', () => {
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
      controllers: [DepartmentsController, AdminDepartmentsController],
      providers: [DepartmentsService],
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
    return request(app.getHttpServer()).get('/api/v1/departments').expect(401);
  });

  it('lists departments for the authenticated user tenant', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: 'case_worker',
    });
    prisma.department.findMany.mockResolvedValue([
      {
        id: 'department_1',
        name: 'Technical Department',
        slug: 'technical_department',
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/departments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 'department_1',
        name: 'Technical Department',
        slug: 'technical_department',
      },
    ]);
    expect(prisma.department.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  });

  it('rejects admin department listing for users without admin permissions', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: 'case_worker',
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/departments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
    expect(prisma.department.findMany).not.toHaveBeenCalled();
  });

  it('lists admin departments with tenant and case count', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'department.admin@example.local',
      role: 'department_admin',
    });
    prisma.department.findMany.mockResolvedValue([
      {
        id: 'department_1',
        name: 'Technical Department',
        slug: 'technical_department',
        tenant: {
          id: 'tenant_1',
          name: 'Kristiansand Kommune',
          slug: 'kristiansand',
        },
        _count: {
          cases: 7,
        },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/departments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 'department_1',
        name: 'Technical Department',
        slug: 'technical_department',
        tenant: {
          id: 'tenant_1',
          name: 'Kristiansand Kommune',
          slug: 'kristiansand',
        },
        caseCount: 7,
      },
    ]);
    expect(prisma.department.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });
  });

  it('lets super admins access tenant-level department administration', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'super.admin@example.local',
      role: 'super_admin',
    });
    prisma.department.findMany.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/admin/departments')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(prisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant_1',
        },
      }),
    );
  });
});
