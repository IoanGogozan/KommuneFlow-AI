import { UserRole } from '@prisma/client';
import { ROLE_PERMISSIONS, roleHasPermission } from './permissions';

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

  it('matches the public security matrix roles used on the portfolio site', () => {
    expect(ROLE_PERMISSIONS[UserRole.portfolio_guest]).toEqual([
      'case:read:all_tenant',
      'case:update:all_tenant',
      'document:read:department',
      'ai:triage:run',
      'ai:triage:review',
      'analytics:read',
    ]);
    expect(ROLE_PERMISSIONS[UserRole.case_worker]).toEqual([
      'case:read:department',
      'case:update:department',
      'case:close',
      'document:upload',
      'document:read:department',
      'ai:triage:run',
      'ai:triage:review',
    ]);
    expect(ROLE_PERMISSIONS[UserRole.department_admin]).toEqual([
      'case:read:department',
      'case:read:all_tenant',
      'case:update:department',
      'case:close',
      'document:upload',
      'document:read:department',
      'document:read:sensitive',
      'ai:triage:run',
      'ai:triage:review',
      'analytics:read',
      'analytics:aggregate',
      'operations:read',
      'user:manage',
      'routing_rules:manage',
    ]);
    expect(ROLE_PERMISSIONS[UserRole.auditor]).toEqual([
      'case:read:all_tenant',
      'document:read:department',
      'document:read:sensitive',
      'audit:read',
      'analytics:read',
      'operations:read',
    ]);
  });
});
