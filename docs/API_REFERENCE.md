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

All protected routes require the auth cookie and are checked by server-side
permission guards. Tenant scope is derived from the authenticated user and is
not trusted from a client-only selector.

| Method | Path | Required capability |
| --- | --- | --- |
| `GET` | `/cases` | Case read capability |
| `GET` | `/cases/:id` | Case read capability |
| `GET` | `/cases/:id/activity` | Case read capability |
| `PATCH` | `/cases/:id/status` | Department or tenant case update |
| `POST` | `/cases/:id/internal-notes` | Department or tenant case update |
| `GET` | `/analytics/summary` | `analytics:read` |
| `POST` | `/analytics/aggregate` | `analytics:aggregate` |
| `GET` | `/ai/status` | `ai:diagnostics:read` |
| `POST` | `/ai-triage/cases/:id/run` | `ai:triage:run` |
| `POST` | `/ai-triage/:id/review` | `ai:triage:review` |
| `GET` | `/health` | Public health check |
| `GET` | `/readiness` | Public readiness check |

Documents, operations, privacy, tenant, user, department, routing-rule, and
audit routes are protected by their corresponding capability. Consult the
controller source when adding a route; this document intentionally does not
invent endpoints that are not present in current controllers.

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
