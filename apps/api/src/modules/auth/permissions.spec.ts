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
});
