# API endpoint security inventory

This inventory records the application-level perimeter reviewed before removing browser Basic Auth in PR 3. All paths are relative to `/api/v1`.

Classification meanings:

- **Public**: intentionally reachable without an application cookie.
- **Authenticated**: requires a valid application JWT cookie.
- **Permission protected**: requires authentication plus one or more permissions.
- **Administrative**: authenticated and restricted to administrative permissions.

| Method | Path                                                                 | Classification       | Enforcement                                                   |
| ------ | -------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------- |
| GET    | `/`                                                                  | Public               | Service identification only                                   |
| GET    | `/health`                                                            | Public               | Safe liveness response                                        |
| GET    | `/readiness`                                                         | Public               | Safe dependency status without configuration details          |
| POST   | `/public/tenants/:tenantSlug/cases`                                  | Public               | Validated intake, upload limits, throttling                   |
| POST   | `/public/tenants/:tenantSlug/cases/status`                           | Public               | Reference/access-code validation, throttling, no-store        |
| GET    | `/public/tenants/:tenantSlug/integrations/kartverket/address-search` | Public               | Validated query and throttling                                |
| POST   | `/auth/login`                                                        | Public               | Origin validation, credential validation, throttling          |
| POST   | `/auth/demo-session`                                                 | Public when enabled  | Origin validation, feature flag, tenant allowlist, throttling |
| POST   | `/auth/logout`                                                       | Public operation     | Origin validation; safely clears present/absent session       |
| GET    | `/auth/me`                                                           | Authenticated        | `AuthGuard`                                                   |
| GET    | `/cases`                                                             | Authenticated        | `AuthGuard`, tenant-scoped service filtering                  |
| GET    | `/cases/:id`                                                         | Authenticated        | `AuthGuard`, tenant-scoped service filtering                  |
| GET    | `/cases/:id/activity`                                                | Authenticated        | `AuthGuard`, tenant-scoped service filtering                  |
| PATCH  | `/cases/:id/status`                                                  | Permission protected | Any of `case:update:department`, `case:update:all_tenant`     |
| POST   | `/cases/:id/internal-notes`                                          | Permission protected | Any of `case:update:department`, `case:update:all_tenant`     |
| GET    | `/cases/:caseId/documents`                                           | Authenticated        | `AuthGuard`, tenant/case document authorization               |
| GET    | `/cases/:caseId/documents/:documentId/download`                      | Authenticated        | `AuthGuard`, tenant/case document authorization               |
| POST   | `/cases/:caseId/documents`                                           | Permission protected | `document:upload`                                             |
| DELETE | `/cases/:caseId/documents/:documentId`                               | Permission protected | `document:upload`, soft delete                                |
| GET    | `/cases/:caseId/ai-triage/latest`                                    | Authenticated        | `AuthGuard`, tenant/case authorization                        |
| POST   | `/cases/:caseId/ai-triage`                                           | Permission protected | `ai:triage:run`                                               |
| POST   | `/cases/:caseId/ai-triage/:resultId/review`                          | Permission protected | `ai:triage:review`                                            |
| GET    | `/analytics/summary`                                                 | Permission protected | `analytics:read`                                              |
| POST   | `/analytics/aggregate`                                               | Permission protected | `analytics:aggregate`                                         |
| GET    | `/audit/events`                                                      | Permission protected | `audit:read`                                                  |
| GET    | `/privacy/status`                                                    | Permission protected | `audit:read`                                                  |
| GET    | `/privacy/citizen-data-export`                                       | Permission protected | `privacy:export`                                              |
| POST   | `/privacy/citizen-profiles/:citizenProfileId/anonymize`              | Permission protected | `privacy:anonymize`                                           |
| GET    | `/privacy/retention-policy`                                          | Permission protected | `privacy:export`                                              |
| PATCH  | `/privacy/retention-policy`                                          | Permission protected | `privacy:anonymize`                                           |
| POST   | `/privacy/retention-cleanup`                                         | Permission protected | `privacy:anonymize`                                           |
| GET    | `/operations/metrics-summary`                                        | Permission protected | `operations:read`                                             |
| GET    | `/departments`                                                       | Authenticated        | `AuthGuard`, tenant-scoped service query                      |
| GET    | `/integrations/kartverket/address-search`                            | Authenticated        | `AuthGuard`, tenant-scoped integration use                    |
| GET    | `/ai/status`                                                         | Permission protected | `ai:diagnostics:read` or `operations:read`                    |
| GET    | `/internal/ai/diagnostics`                                           | Administrative       | `ai:diagnostics:read`                                         |
| POST   | `/integrations/ssb/imports/municipality-population`                  | Administrative       | `tenant:manage`                                               |
| GET    | `/admin/departments`                                                 | Administrative       | `user:manage`, `routing_rules:manage`, or `tenant:manage`     |
| GET    | `/admin/routing-rules`                                               | Administrative       | `routing_rules:manage`                                        |
| GET    | `/admin/users`                                                       | Administrative       | `user:manage`                                                 |

## Web rendering audit

All `/internal` pages render static layout/component shells. Authentication and internal records are loaded client-side from the protected API using `credentials: "include"`. The dynamic `/internal/cases/[id]` server page passes only the URL parameter to a client component; it does not fetch case data during server rendering. No internal data, JWT, cookie, or seeded credential is embedded in unauthenticated HTML.

## Perimeter conclusion

The API, not Caddy or frontend visibility, is the security authority. Public routes contain only the intended citizen/auth/health surfaces. Representative routes from every authenticated controller are covered by the unauthenticated perimeter e2e test and return `401` without an application cookie.
