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
});

function createReflector(requiredPermissions: string[]): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
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
