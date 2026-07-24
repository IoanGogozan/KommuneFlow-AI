import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS } from './permissions';
import { PortfolioDemoConfig } from './portfolio-demo.config';

describe('AuthService', () => {
  it('returns non-enumerating disabled behavior for demo sessions', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    const service = new AuthService(
      {} as PrismaService,
      {} as JwtService,
      operationalEvents(operationalRecordMock),
      demoConfig({ enabled: false }),
    );

    await expect(
      service.createDemoSession(
        { tenantSlug: 'kristiansand' },
        { requestId: 'req_demo_disabled' },
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(operationalRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.demo_session_denied',
        requestId: 'req_demo_disabled',
        safeMessage: 'Portfolio demo session denied.',
        metadata: {
          reason: 'disabled',
          tenantSlug: 'kristiansand',
        },
      }),
    );
  });

  it('creates a short-lived guest session for an allowlisted tenant', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    const findFirst = jest.fn().mockResolvedValue({
      id: 'guest_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'portfolio.guest@kristiansand.local',
      name: 'Kristiansand Portfolio Guest',
      role: UserRole.portfolio_guest,
      tenant: {
        id: 'tenant_1',
        slug: 'kristiansand',
        name: 'Kristiansand Kommune',
      },
    });
    const signAsync = jest.fn().mockResolvedValue('guest-access-token');
    const service = new AuthService(
      { user: { findFirst } } as unknown as PrismaService,
      { signAsync } as unknown as JwtService,
      operationalEvents(operationalRecordMock),
      demoConfig(),
    );

    const result = await service.createDemoSession(
      { tenantSlug: 'kristiansand' },
      { requestId: 'req_demo_success' },
    );

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: UserRole.portfolio_guest,
          status: UserStatus.active,
          tenant: { slug: 'kristiansand' },
        },
      }),
    );
    expect(signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'guest_1',
        tenantId: 'tenant_1',
        role: UserRole.portfolio_guest,
      }),
      { expiresIn: 1800 },
    );
    expect(result).toMatchObject({
      accessToken: 'guest-access-token',
      ttlSeconds: 1800,
      user: {
        role: UserRole.portfolio_guest,
        tenant: {
          slug: 'kristiansand',
          name: 'Kristiansand Kommune',
        },
      },
    });
    expect(JSON.stringify(result.user)).not.toContain('email');
    expect(operationalRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.demo_session_started',
        tenantId: 'tenant_1',
        userId: 'guest_1',
        requestId: 'req_demo_success',
      }),
    );
  });

  it('uses the configured default tenant only when the request omits it', async () => {
    let capturedQuery: unknown;
    const findFirst = jest.fn((input: unknown) => {
      capturedQuery = input;
      return Promise.resolve(null);
    });
    const service = new AuthService(
      { user: { findFirst } } as unknown as PrismaService,
      {} as JwtService,
      operationalEvents(),
      demoConfig(),
    );

    await expect(service.createDemoSession({})).rejects.toMatchObject({
      status: 503,
    });
    const query = capturedQuery as {
      where: { tenant: { slug: string } };
    };
    expect(query.where.tenant.slug).toBe('kristiansand');
  });

  it('rejects non-allowlisted tenants before querying for a user', async () => {
    const findFirst = jest.fn();
    const service = new AuthService(
      { user: { findFirst } } as unknown as PrismaService,
      {} as JwtService,
      operationalEvents(),
      demoConfig(),
    );

    await expect(
      service.createDemoSession({ tenantSlug: 'unknown' }),
    ).rejects.toMatchObject({ status: 400 });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('logs in an active seeded-style user with valid credentials', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    const passwordHash = await hash('DemoPassword123!', 4);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          tenantId: 'tenant_1',
          departmentId: 'department_1',
          email: 'case.worker@arendal.local',
          passwordHash,
          name: 'Arendal Case Worker',
          role: UserRole.case_worker,
          status: UserStatus.active,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    } as unknown as JwtService;
    const service = new AuthService(
      prisma,
      jwtService,
      operationalEvents(operationalRecordMock),
    );

    await expect(
      service.login(
        {
          email: 'case.worker@arendal.local',
          password: 'DemoPassword123!',
        },
        { requestId: 'req_login_success' },
      ),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      user: {
        email: 'case.worker@arendal.local',
        role: UserRole.case_worker,
      },
    });
    expect(operationalRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.login_success',
        tenantId: 'tenant_1',
        userId: 'user_1',
        requestId: 'req_login_success',
        safeMessage: 'User logged in.',
        metadata: {
          role: UserRole.case_worker,
          emailDomain: 'arendal.local',
        },
      }),
    );
  });

  it('rejects wrong passwords with a generic credentials error', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    const passwordHash = await hash('DemoPassword123!', 4);
    const service = createService(
      {
        id: 'user_1',
        tenantId: 'tenant_1',
        departmentId: 'department_1',
        email: 'case.worker@arendal.local',
        passwordHash,
        name: 'Arendal Case Worker',
        role: UserRole.case_worker,
        status: UserStatus.active,
      },
      operationalRecordMock,
    );

    await expect(
      service.login(
        {
          email: 'case.worker@arendal.local',
          password: 'WrongPassword123!',
        },
        { requestId: 'req_login_failed' },
      ),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));
    expect(operationalRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.login_failed',
        requestId: 'req_login_failed',
        safeMessage: 'Login failed.',
        metadata: {
          reason: 'invalid_password',
          emailDomain: 'arendal.local',
        },
      }),
    );
  });

  it('rejects unknown emails with the same generic credentials error', async () => {
    const service = createService(null);

    await expect(
      service.login({
        email: 'unknown@example.test',
        password: 'WrongPassword123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));
  });

  it('rejects disabled users with the same generic credentials error', async () => {
    const passwordHash = await hash('DemoPassword123!', 4);
    const service = createService({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@arendal.local',
      passwordHash,
      name: 'Arendal Case Worker',
      role: UserRole.case_worker,
      status: UserStatus.disabled,
    });

    await expect(
      service.login({
        email: 'case.worker@arendal.local',
        password: 'DemoPassword123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));
  });

  it('returns the current active user profile with tenant, department and permissions', async () => {
    const user = {
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@arendal.local',
      name: 'Arendal Case Worker',
      role: UserRole.case_worker,
      tenant: {
        id: 'tenant_1',
        name: 'Arendal Kommune',
        slug: 'arendal',
      },
      department: {
        id: 'department_1',
        name: 'Plan og bygg',
        slug: 'planning-building',
      },
    };
    const findFirstMock = jest.fn().mockResolvedValue(user);
    const prisma = {
      user: {
        findFirst: findFirstMock,
      },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      operationalEvents(),
    );

    await expect(
      service.getCurrentUserProfile({
        id: 'user_1',
        tenantId: 'tenant_1',
        departmentId: 'department_1',
        email: 'case.worker@arendal.local',
        role: UserRole.case_worker,
      }),
    ).resolves.toEqual({
      ...user,
      permissions: ROLE_PERMISSIONS.case_worker,
    });
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'user_1',
          status: UserStatus.active,
        },
      }),
    );
  });

  it('does not select or return passwordHash in the current user profile', async () => {
    const findFirstMock = jest.fn().mockResolvedValue({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@arendal.local',
      name: 'Arendal Auditor',
      role: UserRole.auditor,
      tenant: {
        id: 'tenant_1',
        name: 'Arendal Kommune',
        slug: 'arendal',
      },
      department: null,
    });
    const prisma = {
      user: {
        findFirst: findFirstMock,
      },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      operationalEvents(),
    );

    const profile = await service.getCurrentUserProfile({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@arendal.local',
      role: UserRole.auditor,
    });

    expect(JSON.stringify(findFirstMock.mock.calls)).not.toContain(
      'passwordHash',
    );
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when the current user no longer exists or is inactive', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      operationalEvents(),
    );

    await expect(
      service.getCurrentUserProfile({
        id: 'user_1',
        tenantId: 'tenant_1',
        departmentId: null,
        email: 'auditor@arendal.local',
        role: UserRole.auditor,
      }),
    ).rejects.toThrow(new UnauthorizedException('Authentication required.'));
  });

  it('records logout when a valid access token is cleared', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({
        id: 'user_1',
        tenantId: 'tenant_1',
        departmentId: 'department_1',
        email: 'case.worker@arendal.local',
        role: UserRole.case_worker,
      }),
    } as unknown as JwtService;
    const service = new AuthService(
      {} as PrismaService,
      jwtService,
      operationalEvents(operationalRecordMock),
    );

    await service.logout('access-token', { requestId: 'req_logout' });

    expect(operationalRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.logout',
        tenantId: 'tenant_1',
        userId: 'user_1',
        requestId: 'req_logout',
        safeMessage: 'User logged out.',
        metadata: {
          role: UserRole.case_worker,
        },
      }),
    );
  });

  it('does not fail logout when the access token is absent or invalid', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    const jwtService = {
      verifyAsync: jest.fn().mockRejectedValue(new Error('invalid token')),
    } as unknown as JwtService;
    const service = new AuthService(
      {} as PrismaService,
      jwtService,
      operationalEvents(operationalRecordMock),
    );

    await expect(service.logout(undefined)).resolves.toBeUndefined();
    await expect(service.logout('invalid-token')).resolves.toBeUndefined();
    expect(operationalRecordMock).not.toHaveBeenCalled();
  });
});

function createService(user: unknown, operationalRecordMock?: jest.Mock) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
    },
  } as unknown as PrismaService;
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
  } as unknown as JwtService;

  return new AuthService(
    prisma,
    jwtService,
    operationalEvents(operationalRecordMock),
  );
}

function operationalEvents(
  recordMock = jest.fn().mockResolvedValue(undefined),
) {
  return {
    record: recordMock,
  } as never;
}

function demoConfig(
  overrides: Partial<PortfolioDemoConfig> = {},
): PortfolioDemoConfig {
  return {
    enabled: true,
    allowedTenantSlugs: new Set(['kristiansand', 'arendal', 'grimstad']),
    defaultTenantSlug: 'kristiansand',
    sessionTtlSeconds: 1800,
    ...overrides,
  };
}
