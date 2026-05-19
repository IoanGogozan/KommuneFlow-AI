# API Reference

Base path:

```txt
/api/v1
```

Internal endpoints use the `kommuneflow_access_token` `HttpOnly` cookie after login. The backend also accepts bearer tokens for API/test compatibility.

## Auth

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | public | Log in internal user and set auth cookie |
| `POST` | `/auth/logout` | cookie | Clear auth cookie |
| `GET` | `/auth/me` | internal | Return the current internal user profile and permissions |

## Public Citizen Intake

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/public/tenants/:tenantSlug/cases` | public | Create citizen case, optionally with uploaded documents |
| `GET` | `/public/tenants/:tenantSlug/cases/status?caseReference=...&statusAccessCode=...` | public | Look up safe public status fields for a submitted case |

Supports JSON body or multipart form data:

- `payload`: JSON string matching citizen/case intake schema
- `documents`: optional PDF/PNG/JPG files

## Cases

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/cases` | internal | List tenant/department-scoped cases |
| `GET` | `/cases/:id` | internal | Get case detail |
| `GET` | `/cases/:id/activity` | internal | List safe case activity/audit summaries |
| `PATCH` | `/cases/:id/status` | `case:update:department` | Update case status |
| `POST` | `/cases/:id/internal-notes` | `case:update:department` | Add internal note |

## Internal Administration

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/departments` | internal | List departments for the current tenant |
| `GET` | `/admin/departments` | admin permission | List tenant departments with admin metadata |
| `GET` | `/admin/users` | `user:manage` | List tenant users without password hashes |
| `GET` | `/admin/routing-rules` | `routing_rules:manage` | List tenant routing rules |

## Documents

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/cases/:caseId/documents` | internal | List accessible documents |
| `POST` | `/cases/:caseId/documents` | `document:upload` | Upload internal document |
| `GET` | `/cases/:caseId/documents/:documentId/download` | internal | Download accessible document and create audit event |
| `DELETE` | `/cases/:caseId/documents/:documentId` | `document:upload` | Soft-delete document metadata |

## AI Triage

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/cases/:caseId/ai-triage/latest` | internal | Get latest AI triage result |
| `POST` | `/cases/:caseId/ai-triage` | `ai:triage:run` | Generate AI triage suggestion |
| `POST` | `/cases/:caseId/ai-triage/:resultId/review` | `ai:triage:review` | Human review/approval/correction |
| `GET` | `/ai/status` | operations or AI diagnostics permission | Return safe AI provider status |
| `GET` | `/internal/ai/diagnostics` | `ai:diagnostics:read` | Return safe AI diagnostics for privileged users |

## Audit

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/audit/events` | `audit:read` | List tenant-scoped audit events with safe metadata summaries |

## Analytics

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | `analytics:read` | Read aggregated analytics |
| `POST` | `/analytics/aggregate` | `analytics:read` | Rerun aggregation for date range |

## Public API Integrations

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/integrations/kartverket/address-search?q=address` | internal | Search Kartverket Adresse-API through authenticated internal endpoint |
| `GET` | `/public/tenants/:tenantSlug/integrations/kartverket/address-search?q=address` | public, rate-limited | Search Kartverket Adresse-API during citizen intake |
| `POST` | `/integrations/ssb/imports/municipality-population` | `tenant:manage` | Import municipality population statistics from SSB table `07459` |

## Privacy

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/privacy/status` | `audit:read` | Show privacy module capabilities |
| `GET` | `/privacy/citizen-data-export` | `privacy:export` | Export citizen data by profile ID or email |
| `POST` | `/privacy/citizen-profiles/:citizenProfileId/anonymize` | `privacy:anonymize` | Anonymize citizen profile identifiers |
| `GET` | `/privacy/retention-policy` | `privacy:export` | Read tenant retention policy |
| `PATCH` | `/privacy/retention-policy` | `privacy:anonymize` | Update tenant retention policy |
| `POST` | `/privacy/retention-cleanup` | `privacy:anonymize` | Run retention cleanup dry-run or confirmed delete |

Retention cleanup responses include candidate counts, deleted counts, and `documentStorage` counters for physical uploaded-file cleanup:

```json
{
  "mode": "delete",
  "candidates": {
    "deletedDocuments": 2
  },
  "deleted": {
    "deletedDocuments": 2
  },
  "documentStorage": {
    "filesDeleted": 2,
    "filesAlreadyMissing": 0,
    "cleanupFailures": 0
  }
}
```

## Operations

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | public | Liveness check |
| `GET` | `/readiness` | public | Database and upload storage readiness |
| `GET` | `/operations/metrics-summary` | `operations:read` | Read operational metrics for the current tenant |

## Error Shape

Errors use a consistent response shape:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request.",
    "requestId": "request-id",
    "path": "/api/v1/example"
  }
}
```
