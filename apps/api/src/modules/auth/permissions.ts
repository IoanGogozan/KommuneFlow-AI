import { UserRole } from '@prisma/client';

export type Permission =
  | 'case:create'
  | 'case:read:own'
  | 'case:read:department'
  | 'case:read:all_tenant'
  | 'case:update:department'
  | 'case:close'
  | 'document:upload'
  | 'document:read:own'
  | 'document:read:department'
  | 'document:read:sensitive'
  | 'ai:triage:run'
  | 'ai:triage:review'
  | 'ai:diagnostics:read'
  | 'audit:read'
  | 'privacy:export'
  | 'privacy:anonymize'
  | 'analytics:read'
  | 'operations:read'
  | 'tenant:manage'
  | 'user:manage'
  | 'routing_rules:manage';

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  case_worker: [
    'case:read:department',
    'case:update:department',
    'case:close',
    'document:upload',
    'document:read:department',
    'ai:triage:run',
    'ai:triage:review',
  ],
  department_admin: [
    'case:read:department',
    'case:update:department',
    'case:close',
    'document:upload',
    'document:read:department',
    'document:read:sensitive',
    'ai:triage:run',
    'ai:triage:review',
    'analytics:read',
    'operations:read',
    'user:manage',
    'routing_rules:manage',
  ],
  auditor: [
    'case:read:all_tenant',
    'document:read:department',
    'document:read:sensitive',
    'audit:read',
    'analytics:read',
    'operations:read',
  ],
  super_admin: [
    'case:create',
    'case:read:own',
    'case:read:department',
    'case:read:all_tenant',
    'case:update:department',
    'case:close',
    'document:upload',
    'document:read:own',
    'document:read:department',
    'document:read:sensitive',
    'ai:triage:run',
    'ai:triage:review',
    'ai:diagnostics:read',
    'audit:read',
    'privacy:export',
    'privacy:anonymize',
    'analytics:read',
    'operations:read',
    'tenant:manage',
    'user:manage',
    'routing_rules:manage',
  ],
};

export function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
