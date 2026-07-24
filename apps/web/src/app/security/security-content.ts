export type SecurityProofItem = {
  title: string;
  description: string;
  evidence: string;
};

export type SecuritySection = {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  evidenceLabel: string;
  sourceLabel: string;
};

export type MatrixRow = {
  capability: string;
  guest: string;
  caseWorker: string;
  departmentAdmin: string;
  auditor: string;
};

export type SecurityLink = {
  label: string;
  href: string;
  external?: boolean;
};

export const securityIntro =
  "KommuneFlow combines application-level access control, municipality-scoped data access, restricted public-demo capabilities and private deployment boundaries. AI prepares suggestions, but employees make every official decision.";

export const securityStatusLabels = [
  "Synthetic data only",
  "Mock AI in the public deployment",
  "Restricted guest access",
  "Not approved for real municipal use",
] as const;

export const securityProofItems: SecurityProofItem[] = [
  {
    title: "Server-side access control",
    description:
      "Authentication, roles and permissions are enforced by the API. Hiding a control in the interface never replaces an authorization check.",
    evidence: "JWT sessions · RBAC · permission guards",
  },
  {
    title: "Municipality-scoped data",
    description:
      "Authenticated case operations are scoped to the user's municipality, with cross-tenant access covered by automated tests.",
    evidence: "Tenant-scoped queries · cross-tenant denial tests",
  },
  {
    title: "Human-controlled AI",
    description:
      "AI suggestions remain separate from official case values until an authorized employee explicitly accepts or corrects them.",
    evidence: "Suggestion state · explicit review · activity history",
  },
  {
    title: "Restricted public demo",
    description:
      "Guest sessions are short-lived and rate limited. Administrative actions and public document uploads are unavailable in the portfolio environment.",
    evidence: "Limited guest role · rate limits · synthetic data",
  },
] as const;

export const securityArchitectureLines = [
  "Browser",
  "  \u2193 HTTPS",
  "Gateway",
  "  \u251c\u2500\u2500 Next.js web application",
  "  \u2514\u2500\u2500 NestJS API",
  "        \u251c\u2500\u2500 Authentication and permission checks",
  "        \u251c\u2500\u2500 Municipality-scoped data access",
  "        \u251c\u2500\u2500 Audit and activity events",
  "        \u251c\u2500\u2500 Human-reviewed AI workflow",
  "        \u2514\u2500\u2500 PostgreSQL",
] as const;

export const securitySections: SecuritySection[] = [
  {
    id: "authentication",
    title: "Authentication and sessions",
    summary:
      "Normal login and restricted guest entry both create a JWT-backed application session. The cookie is protected, short-lived and validated before sensitive mutations.",
    bullets: [
      "The session cookie is `HttpOnly`, uses `SameSite=Lax`, and is marked `Secure` in production.",
      "The cookie is scoped to `/api/v1`, and session-changing requests pass origin validation before they can mutate state.",
      "Login and demo-session responses return the user profile and expiry metadata, not the JWT itself.",
    ],
    evidenceLabel: "Source: auth-cookie.ts, auth.controller.ts, auth.guard.ts",
    sourceLabel: "Tests: auth.controller.spec.ts, origin-validation.middleware.spec.ts",
  },
  {
    id: "authorization",
    title: "Authorization and RBAC",
    summary:
      "Permissions are enforced server-side through NestJS guards and explicit role-to-permission mappings. The UI only reflects the underlying authorization model.",
    bullets: [
      "Controllers and services check permissions before returning protected data or accepting workflow mutations.",
      "The permission guard supports both all-required and any-of permission groups.",
      "The portfolio guest role is intentionally narrow: it can demonstrate the guest workflow, but it cannot manage users, privacy operations or audit data.",
    ],
    evidenceLabel: "Source: permissions.ts, permissions.guard.ts, permissions.decorator.ts",
    sourceLabel: "Tests: permissions.spec.ts, controller permission specs",
  },
  {
    id: "tenant",
    title: "Tenant isolation",
    summary:
      "The authenticated user's tenant is part of the server-side authorization context. Case queries and mutations include tenant scope, and cross-tenant access is tested.",
    bullets: [
      "Tenant filtering happens in application code; this page does not claim database row-level security.",
      "Tenant-owned resources such as cases, documents and privacy actions reject cross-tenant access attempts.",
      "The public demo resolves an allowlisted tenant server-side instead of letting the browser pick arbitrary internal data.",
    ],
    evidenceLabel: "Source: cases.service.ts, documents.service.ts, privacy.service.ts",
    sourceLabel: "Tests: documents.service.spec.ts, privacy.service.spec.ts",
  },
  {
    id: "ai",
    title: "Human-reviewed AI",
    summary:
      "AI generates a suggestion, but the official case state changes only after a person reviews and applies it. The public deployment uses a mock provider.",
    bullets: [
      "Suggested values remain separate from official case fields until review is completed.",
      "Review actions are recorded in the activity trail so the workflow remains auditable.",
      "The portfolio environment does not need a live external AI provider to demonstrate the workflow.",
    ],
    evidenceLabel: "Source: ai.service.ts, mock-ai.provider.ts",
    sourceLabel: "Tests: ai service/controller specs, workflow full-stack test",
  },
  {
    id: "public-demo",
    title: "Public demo safety",
    summary:
      "The public demo is synthetic, allowlisted and rate limited. Public uploads are intentionally disabled in the portfolio environment.",
    bullets: [
      "Guest sessions are feature-flagged and tenant-allowlisted.",
      "Public intake, status lookup, address search and demo-session endpoints use explicit rate limits.",
      "The public environment uses synthetic data and rejects multipart uploads unless the environment is explicitly configured for local testing.",
    ],
    evidenceLabel: "Source: public-demo-safety.ts, auth.service.ts, API_REFERENCE.md",
    sourceLabel: "Tests: public-demo-safety.spec.ts, upload e2e specs",
  },
  {
    id: "deployment",
    title: "Deployment boundary",
    summary:
      "The documented home-server deployment keeps the gateway public and the application services private behind Docker networks and Caddy routing.",
    bullets: [
      "Only the gateway is externally reachable in the verified home deployment.",
      "The web app, API and PostgreSQL stay on private networks and are not published on host ports.",
      "Caddy terminates TLS and applies the security headers and request-size limits described in the deployment docs.",
    ],
    evidenceLabel: "Source: HOME_SERVER_DEPLOYMENT.md, docker-compose.prod.yml, deploy/Caddyfile",
    sourceLabel: "Evidence: VERIFICATION_LOG.md",
  },
  {
    id: "verification",
    title: "Automated verification",
    summary:
      "The public security story is backed by tests instead of marketing claims. The repository already contains negative security and workflow coverage.",
    bullets: [
      "Unit, API, browser and full-stack checks cover the expected security paths.",
      "Negative tests cover unauthenticated access, permission denials, cross-tenant denials and upload restrictions.",
      "The latest documented verification is dated 24 July 2026.",
    ],
    evidenceLabel: "Source: VERIFICATION_LOG.md, testing strategy docs",
    sourceLabel: "Tests: API, web and full-stack suites",
  },
] as const;

export const permissionMatrix: MatrixRow[] = [
  {
    capability: "View permitted cases",
    guest: "Yes",
    caseWorker: "Yes",
    departmentAdmin: "Yes",
    auditor: "Yes",
  },
  {
    capability: "Review AI suggestions",
    guest: "Yes",
    caseWorker: "Yes",
    departmentAdmin: "Yes",
    auditor: "No",
  },
  {
    capability: "Update workflow",
    guest: "Yes",
    caseWorker: "Yes",
    departmentAdmin: "Yes",
    auditor: "No",
  },
  {
    capability: "View analytics",
    guest: "Yes",
    caseWorker: "No",
    departmentAdmin: "Yes",
    auditor: "Yes",
  },
  {
    capability: "Aggregate analytics",
    guest: "No",
    caseWorker: "No",
    departmentAdmin: "Yes",
    auditor: "No",
  },
  {
    capability: "Manage users",
    guest: "No",
    caseWorker: "No",
    departmentAdmin: "Yes",
    auditor: "No",
  },
  {
    capability: "Privacy operations",
    guest: "No",
    caseWorker: "No",
    departmentAdmin: "No",
    auditor: "No",
  },
  {
    capability: "Audit access",
    guest: "No",
    caseWorker: "No",
    departmentAdmin: "No",
    auditor: "Yes",
  },
] as const;

export const securityLinks: SecurityLink[] = [
  {
    label: "View source code",
    href: "https://github.com/IoanGogozan/KommuneFlow-AI",
    external: true,
  },
  {
    label: "View security documentation",
    href: "https://github.com/IoanGogozan/KommuneFlow-AI/blob/main/docs/03_SECURITY_AND_PRIVACY.md",
    external: true,
  },
  {
    label: "View API perimeter evidence",
    href: "https://github.com/IoanGogozan/KommuneFlow-AI/blob/main/docs/API_REFERENCE.md",
    external: true,
  },
  {
    label: "View deployment verification",
    href: "https://github.com/IoanGogozan/KommuneFlow-AI/blob/main/docs/VERIFICATION_LOG.md",
    external: true,
  },
  {
    label: "Return to portfolio",
    href: "/",
  },
] as const;
