import { getApiBaseUrl } from "./api";

export type InternalPermission =
  | "case:create"
  | "case:read:own"
  | "case:read:department"
  | "case:read:all_tenant"
  | "case:update:department"
  | "case:update:all_tenant"
  | "case:close"
  | "document:upload"
  | "document:read:own"
  | "document:read:department"
  | "document:read:sensitive"
  | "ai:triage:run"
  | "ai:triage:review"
  | "ai:diagnostics:read"
  | "audit:read"
  | "privacy:export"
  | "privacy:anonymize"
  | "analytics:read"
  | "analytics:aggregate"
  | "operations:read"
  | "tenant:manage"
  | "user:manage"
  | "routing_rules:manage";

export type InternalTenant = {
  id: string;
  name: string;
  slug: string;
};

export type InternalDepartment = {
  id: string;
  name: string;
  slug: string;
};

export type InternalRole =
  | "case_worker"
  | "department_admin"
  | "auditor"
  | "super_admin"
  | "portfolio_guest";

export type InternalCurrentUser = {
  id: string;
  email: string;
  name: string;
  role: InternalRole;
  tenantId: string;
  tenant: InternalTenant;
  departmentId: string | null;
  department: InternalDepartment | null;
  permissions: InternalPermission[];
};

export class InternalUserRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "InternalUserRequestError";
  }
}

export async function getCurrentInternalUser(): Promise<InternalCurrentUser | null> {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new InternalUserRequestError(
      "Failed to load the current internal user.",
      response.status,
    );
  }

  return (await response.json()) as InternalCurrentUser;
}
