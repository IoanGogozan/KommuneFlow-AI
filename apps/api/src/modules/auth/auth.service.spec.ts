import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS } from './permissions';

describe('AuthService', () => {
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
