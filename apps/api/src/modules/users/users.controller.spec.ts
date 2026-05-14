import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const prisma = {
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    prisma.user.findMany.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, AuthModule],
      controllers: [UsersController],
      providers: [UsersService],
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
    return request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
  });

  it('rejects users without user management permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: UserRole.case_worker,
    });

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('lists tenant users without password hashes', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'department.admin@example.local',
      role: UserRole.department_admin,
    });
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user_2',
        name: 'Case Worker',
        email: 'case.worker@example.local',
        role: UserRole.case_worker,
        status: UserStatus.active,
        department: {
          id: 'department_1',
          name: 'Technical Department',
          slug: 'technical_department',
        },
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(response.body).toEqual([
      {
        id: 'user_2',
        name: 'Case Worker',
        email: 'case.worker@example.local',
        role: UserRole.case_worker,
        status: UserStatus.active,
        department: {
          id: 'department_1',
          name: 'Technical Department',
          slug: 'technical_department',
        },
      },
    ]);
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  });

  it('lets super admins access tenant-level user administration', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'super.admin@example.local',
      role: UserRole.super_admin,
    });
    prisma.user.findMany.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant_1',
        },
      }),
    );
  });
});
