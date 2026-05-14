import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS } from './permissions';

type CurrentUserProfileResponse = {
  permissions: string[];
};

describe('AuthController', () => {
  let app: INestApplication<App>;
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const authService = {
    getCurrentUserProfile: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    authService.getCurrentUserProfile.mockReset();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 for current user without authentication', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('returns the current authenticated user profile', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@example.local',
      role: UserRole.case_worker,
    });
    authService.getCurrentUserProfile.mockResolvedValue({
      id: 'user_1',
      email: 'case.worker@example.local',
      name: 'Case Worker',
      role: UserRole.case_worker,
      tenantId: 'tenant_1',
      tenant: {
        id: 'tenant_1',
        name: 'Kristiansand Kommune',
        slug: 'kristiansand',
      },
      departmentId: 'department_1',
      department: {
        id: 'department_1',
        name: 'Plan og bygg',
        slug: 'planning-building',
      },
      permissions: ROLE_PERMISSIONS.case_worker,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', [`${AUTH_COOKIE_NAME}=valid-token`])
      .expect(200);

    expect(authService.getCurrentUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user_1',
        tenantId: 'tenant_1',
        role: UserRole.case_worker,
      }),
    );
    expect(response.body).toMatchObject({
      id: 'user_1',
      email: 'case.worker@example.local',
      name: 'Case Worker',
      role: UserRole.case_worker,
      tenantId: 'tenant_1',
      tenant: {
        id: 'tenant_1',
        name: 'Kristiansand Kommune',
        slug: 'kristiansand',
      },
      departmentId: 'department_1',
      department: {
        id: 'department_1',
        name: 'Plan og bygg',
        slug: 'planning-building',
      },
    });
    const body = response.body as CurrentUserProfileResponse;

    expect(body.permissions).toContain('case:read:department');
    expect(body.permissions).toContain('ai:triage:review');
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
});
