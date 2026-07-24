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
    createDemoSession: jest.fn(),
  };

  beforeEach(async () => {
    jwtService.verifyAsync.mockReset();
    authService.getCurrentUserProfile.mockReset();
    authService.createDemoSession.mockReset();

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

  it('creates a demo session cookie without returning the JWT', async () => {
    authService.createDemoSession.mockResolvedValue({
      accessToken: 'secret-guest-token',
      expiresAt: new Date('2026-07-24T12:30:00.000Z'),
      ttlSeconds: 1800,
      user: {
        id: 'guest_1',
        name: 'Kristiansand Portfolio Guest',
        role: UserRole.portfolio_guest,
        tenant: {
          id: 'tenant_1',
          slug: 'kristiansand',
          name: 'Kristiansand Kommune',
        },
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/demo-session')
      .set('Origin', 'http://localhost:3000')
      .send({ tenantSlug: 'kristiansand' })
      .expect(201);

    expect(response.body).toEqual({
      user: {
        id: 'guest_1',
        name: 'Kristiansand Portfolio Guest',
        role: UserRole.portfolio_guest,
        tenant: {
          id: 'tenant_1',
          slug: 'kristiansand',
          name: 'Kristiansand Kommune',
        },
      },
      expiresAt: '2026-07-24T12:30:00.000Z',
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-guest-token');
    expect(JSON.stringify(response.body)).not.toContain('password');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.headers['set-cookie']?.[0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie']?.[0]).toContain('Max-Age=1800');
  });

  it('rejects arbitrary user or role selection', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/demo-session')
      .set('Origin', 'http://localhost:3000')
      .send({
        tenantSlug: 'kristiansand',
        user: 'admin',
        role: 'super_admin',
      })
      .expect(400);

    expect(authService.createDemoSession).not.toHaveBeenCalled();
  });

  it('rejects foreign and missing origins without emitting a cookie', async () => {
    for (const origin of ['https://evil.example', null]) {
      const pendingRequest = request(app.getHttpServer()).post(
        '/api/v1/auth/demo-session',
      );
      if (origin) {
        pendingRequest.set('Origin', origin);
      }
      const response = await pendingRequest
        .send({ tenantSlug: 'kristiansand' })
        .expect(403);

      expect(response.headers['set-cookie']).toBeUndefined();
    }
    expect(authService.createDemoSession).not.toHaveBeenCalled();
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
