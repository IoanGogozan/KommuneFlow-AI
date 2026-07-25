# API Reference

Base path: `/api/v1`. All examples use placeholder values. Do not put access
codes, passwords, cookies, or tokens in URLs.

## Public Cases

### Create case

`POST /public/tenants/:tenantSlug/cases`

The public intake accepts a JSON payload. Multipart documents are accepted by
the controller but are rejected when public uploads are disabled, which is the
current public deployment policy.

### Look up case status

`POST /public/tenants/:tenantSlug/cases/status`

Send both values in the JSON body:

```json
{
  "caseReference": "KF-YYYY-XXXX",
  "statusAccessCode": "<access-code>"
}
```

The response is `200` for a valid lookup. The controller sets:

```http
Cache-Control: no-store
Pragma: no-cache
```

The access code must not be placed in a query string, path segment, browser
history entry, example URL, screenshot, or log.

## Authentication

| Method | Path | Purpose | Authentication |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Normal staff login; JSON credentials | Public endpoint, throttled |
| `POST` | `/auth/demo-session` | Allowlisted short-lived portfolio guest session | Public endpoint, feature-flagged and throttled |
| `POST` | `/auth/logout` | Clear the auth cookie | Cookie if present |
| `GET` | `/auth/me` | Return the current profile | Auth cookie required |

Authentication responses use the HttpOnly auth cookie configured by the API.
The public guest route does not expose a password or bearer token.

## Protected Resources

Protected routes derive tenant scope from the authenticated user. This table
is pinned to the current controller decorators and explicit inline permission
checks; it does not infer route names.

| Method | Path | Current enforcement |
| --- | --- | --- |
| `GET` | `/cases` | `@UseGuards(AuthGuard, PermissionsGuard)`; no route-level permission decorator. Read access is enforced in `CasesService.list` with `case:read:all_tenant` or `case:read:department`. |
| `GET` | `/cases/:id` | `@UseGuards(AuthGuard, PermissionsGuard)`; no route-level permission decorator. Read access is enforced in `CasesService.findById` with `case:read:all_tenant` or `case:read:department`. |
| `GET` | `/cases/:id/activity` | `@UseGuards(AuthGuard, PermissionsGuard)`; no route-level permission decorator. Read access is enforced in `CasesService.listActivity` with `case:read:all_tenant` or `case:read:department`. |
| `PATCH` | `/cases/:id/status` | `@RequireAnyPermissions('case:update:department', 'case:update:all_tenant')` |
| `POST` | `/cases/:id/internal-notes` | `@RequireAnyPermissions('case:update:department', 'case:update:all_tenant')` |
| `GET` | `/cases/:caseId/documents` | `@UseGuards(AuthGuard, PermissionsGuard)`; no route-level permission decorator. Access is enforced in the documents service against the authenticated user's tenant and document-read permissions. |
| `GET` | `/cases/:caseId/documents/:documentId/download` | `@UseGuards(AuthGuard, PermissionsGuard)`; no route-level permission decorator. Access is enforced in the documents service against the authenticated user's tenant and document-read permissions. |
| `POST` | `/cases/:caseId/documents` | `@RequirePermissions('document:upload')` |
| `DELETE` | `/cases/:caseId/documents/:documentId` | `@RequirePermissions('document:upload')` |
| `GET` | `/cases/:caseId/ai-triage/latest` | `@UseGuards(AuthGuard, PermissionsGuard)`; no route-level permission decorator. Case access is enforced in the AI service through the authenticated user context. |
| `POST` | `/cases/:caseId/ai-triage` | `@RequirePermissions('ai:triage:run')` |
| `POST` | `/cases/:caseId/ai-triage/:resultId/review` | `@RequirePermissions('ai:triage:review')` |
| `GET` | `/internal/ai/diagnostics` | `@RequirePermissions('ai:diagnostics:read')` |
| `GET` | `/ai/status` | `@UseGuards(AuthGuard)` plus inline `roleHasPermission` check for either `ai:diagnostics:read` or `operations:read` |
| `GET` | `/analytics/summary` | Controller-level `@RequirePermissions('analytics:read')` |
| `POST` | `/analytics/aggregate` | Route-level `@RequirePermissions('analytics:aggregate')` |
| `GET` | `/audit/events` | `@RequirePermissions('audit:read')` |
| `GET` | `/privacy/status` | `@RequirePermissions('audit:read')` |
| `GET` | `/privacy/citizen-data-export` | `@RequirePermissions('privacy:export')` |
| `POST` | `/privacy/citizen-profiles/:citizenProfileId/anonymize` | `@RequirePermissions('privacy:anonymize')` |
| `GET` | `/privacy/retention-policy` | `@RequirePermissions('privacy:export')` |
| `PATCH` | `/privacy/retention-policy` | `@RequirePermissions('privacy:anonymize')` |
| `POST` | `/privacy/retention-cleanup` | `@RequirePermissions('privacy:anonymize')` |
| `GET` | `/operations/metrics-summary` | `@RequirePermissions('operations:read')` |
| `POST` | `/integrations/ssb/imports/municipality-population` | `@RequirePermissions('tenant:manage')` |
| `GET` | `/admin/users` | `@UseGuards(AuthGuard)` plus inline `roleHasPermission(user.role, 'user:manage')` check |
| `GET` | `/departments` | `@UseGuards(AuthGuard)`; authenticated tenant member route with no explicit permission decorator |
| `GET` | `/admin/departments` | `@UseGuards(AuthGuard)` plus inline role check for any of `user:manage`, `routing_rules:manage`, or `tenant:manage` |
| `GET` | `/admin/routing-rules` | `@UseGuards(AuthGuard)` plus inline `roleHasPermission(user.role, 'routing_rules:manage')` check |
| `GET` | `/health` | Public health check |
| `GET` | `/readiness` | Public readiness check |

When a route relies on an inline role check instead of a permission decorator,
that is called out explicitly above. Consult the controller source when adding
a route.

## Analytics

`GET /analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` reads an inclusive date
range of whole UTC days. The backend converts `to` to the exclusive next-day
boundary. `POST /analytics/aggregate` uses the same date semantics and is
separate from guest read access.

The public guest view is a deterministic synthetic snapshot. It includes
counts and denominators where the UI displays a rate, but it is not a live SSB
aggregation or a municipal performance report.

## Errors And Headers

Validation errors use a safe response shape with a request identifier. Protected
requests without a valid session return `401`; authenticated users without the
required capability return `403`. Rate limits and public upload policy can
return `4xx` or `503` responses depending on the endpoint and environment.

## Source Of Truth

The current controllers and schemas under `apps/api/src/modules` are the
authoritative API source. This page is documentation and must be updated when
those routes change. Verification results are recorded in
[VERIFICATION_LOG.md](./VERIFICATION_LOG.md).
