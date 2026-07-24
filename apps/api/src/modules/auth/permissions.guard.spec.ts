import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  it('returns 403 when the user role lacks the required permission', () => {
    const guard = new PermissionsGuard(
      createReflector(['case:update:department']),
      operationalEvents(),
    );

    expect(() => guard.canActivate(createContext(UserRole.auditor))).toThrow(
      ForbiddenException,
    );
  });

  it('allows a user role with the required permission', () => {
    const guard = new PermissionsGuard(
      createReflector(['case:update:department']),
      operationalEvents(),
    );

    expect(guard.canActivate(createContext(UserRole.case_worker))).toBe(true);
  });

  it('allows a role that satisfies one permission in an any-of group', () => {
    const guard = new PermissionsGuard(
      createReflector(
        [],
        [['case:update:department', 'case:update:all_tenant']],
      ),
      operationalEvents(),
    );

    expect(guard.canActivate(createContext(UserRole.portfolio_guest))).toBe(
      true,
    );
  });

  it('denies a role that satisfies no permission in an any-of group', () => {
    const guard = new PermissionsGuard(
      createReflector(
        [],
        [['case:update:department', 'case:update:all_tenant']],
      ),
      operationalEvents(),
    );

    expect(() => guard.canActivate(createContext(UserRole.auditor))).toThrow(
      ForbiddenException,
    );
  });
});

function createReflector(
  requiredPermissions: string[],
  requiredAnyPermissions: string[][] = [],
): Reflector {
  return {
    getAllAndOverride: jest
      .fn()
      .mockReturnValueOnce(requiredPermissions)
      .mockReturnValueOnce(requiredAnyPermissions),
  } as unknown as Reflector;
}

function operationalEvents() {
  return {
    record: jest.fn().mockResolvedValue(undefined),
  } as never;
}

function createContext(role: UserRole): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user_1',
          tenantId: 'tenant_1',
          departmentId: 'department_1',
          email: 'user@example.local',
          role,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}
