import { UserRole } from '@prisma/client';
import { roleHasPermission } from './permissions';

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
});
