import { UserRole } from '@prisma/client';
import publicSecurityMatrix from '@kommuneflow/shared/public-security.json';
import { ROLE_PERMISSIONS, roleHasPermission, type Permission } from './permissions';

type PublicSecurityRoleKey =
  | 'guest'
  | 'caseWorker'
  | 'departmentAdmin'
  | 'auditor';

describe('roleHasPermission', () => {
  it('allows case workers to update department cases', () => {
    expect(
      roleHasPermission(UserRole.case_worker, 'case:update:department'),
    ).toBe(true);
  });

  it('does not allow auditors to mutate department cases', () => {
    expect(roleHasPermission(UserRole.auditor, 'case:update:department')).toBe(
      false,
    );
  });

  it('allows super admins to manage tenants', () => {
    expect(roleHasPermission(UserRole.super_admin, 'tenant:manage')).toBe(true);
  });

  it('allows only super admins to export citizen data', () => {
    expect(roleHasPermission(UserRole.super_admin, 'privacy:export')).toBe(
      true,
    );
    expect(roleHasPermission(UserRole.auditor, 'privacy:export')).toBe(false);
  });

  it('allows only super admins to anonymize citizen data', () => {
    expect(roleHasPermission(UserRole.super_admin, 'privacy:anonymize')).toBe(
      true,
    );
    expect(roleHasPermission(UserRole.auditor, 'privacy:anonymize')).toBe(
      false,
    );
  });

  it('allows only super admins to read AI diagnostics', () => {
    expect(roleHasPermission(UserRole.super_admin, 'ai:diagnostics:read')).toBe(
      true,
    );
    expect(
      roleHasPermission(UserRole.department_admin, 'ai:diagnostics:read'),
    ).toBe(false);
    expect(roleHasPermission(UserRole.auditor, 'ai:diagnostics:read')).toBe(
      false,
    );
  });

  it('grants portfolio guests only the restricted workflow permissions', () => {
    expect(ROLE_PERMISSIONS[UserRole.portfolio_guest]).toEqual([
      'case:read:all_tenant',
      'case:update:all_tenant',
      'document:read:department',
      'ai:triage:run',
      'ai:triage:review',
      'analytics:read',
    ]);
  });

  it('keeps analytics aggregation separate from read access', () => {
    expect(roleHasPermission(UserRole.portfolio_guest, 'analytics:read')).toBe(
      true,
    );
    expect(
      roleHasPermission(UserRole.portfolio_guest, 'analytics:aggregate'),
    ).toBe(false);
    expect(
      roleHasPermission(UserRole.department_admin, 'analytics:aggregate'),
    ).toBe(true);
    expect(roleHasPermission(UserRole.super_admin, 'analytics:aggregate')).toBe(
      true,
    );
  });

  it('matches the shared public security capability matrix against backend permissions', () => {
    const {
      capabilities: PUBLIC_SECURITY_CAPABILITY_MATRIX,
      roleColumns: PUBLIC_SECURITY_ROLE_COLUMNS,
    } = publicSecurityMatrix as {
      capabilities: Array<{
        capability: string;
        permissions: Record<string, readonly string[]>;
        allowed: Record<string, boolean>;
      }>;
      roleColumns: Array<{ key: string; label: string }>;
    };
    const roleMap: Record<PublicSecurityRoleKey, UserRole> = {
      guest: UserRole.portfolio_guest,
      caseWorker: UserRole.case_worker,
      departmentAdmin: UserRole.department_admin,
      auditor: UserRole.auditor,
    };

    expect(PUBLIC_SECURITY_ROLE_COLUMNS).toEqual([
      { key: 'guest', label: 'Guest' },
      { key: 'caseWorker', label: 'Case worker' },
      { key: 'departmentAdmin', label: 'Department admin' },
      { key: 'auditor', label: 'Auditor' },
    ]);

    for (const row of PUBLIC_SECURITY_CAPABILITY_MATRIX) {
      for (const column of PUBLIC_SECURITY_ROLE_COLUMNS) {
        const actual = row.permissions[column.key].some((permission) =>
          roleHasPermission(roleMap[column.key], permission as Permission),
        );
        expect(actual).toBe(row.allowed[column.key]);
      }
    }
  });
});
