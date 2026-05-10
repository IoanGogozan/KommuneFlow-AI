# Observability

## Purpose

KommuneFlow AI includes production-oriented observability for request tracing, safe structured logging, readiness, operational metrics, integration status, analytics rebuild visibility, and maintenance status.

## Request IDs

Every request gets a request ID.

Behavior:

- safe inbound `X-Request-Id` values are reused
- missing or unsafe values are replaced
- responses include `X-Request-Id`
- error responses include `requestId`
- request logs include `requestId`

## Structured Logs

The API uses structured JSON logs through Pino.

Logging rules:

- no secrets
- no raw tokens
- no API keys
- no full document contents
- no full personal address in production-oriented integration logs
- safe metadata only

## Health And Readiness

Liveness:

```http
GET /api/v1/health
```

Readiness:

```http
GET /api/v1/readiness
```

Readiness checks:

- database connectivity
- upload storage read/write access
- Kartverket integration configuration status
- SSB integration configuration status

Readiness does not call external public APIs.

## Metrics Summary

Internal endpoint:

```http
GET /api/v1/operations/metrics-summary
```

Required permission:

```txt
operations:read
```

Included metrics:

- API errors last 24 hours
- failed logins last 24 hours
- permission denied events last 24 hours
- cross-tenant access attempts last 24 hours
- public and security rate-limit blocks last 24 hours
- AI triage requests/failures last 24 hours
- AI average latency from persisted AI observability events
- document upload failures last 24 hours
- Kartverket lookup count/failure count/average latency
- latest SSB import status
- latest analytics rebuild timestamp
- latest retention cleanup timestamp
- latest backup status when recorded

## Operations Dashboard

Internal UI:

```txt
/internal/operations
```

The dashboard shows:

- API health
- readiness status
- readiness dependency checks
- Kartverket integration status
- SSB import status
- analytics rebuild status
- failed login count
- permission denied count
- cross-tenant access attempts
- rate-limit blocks
- document upload failures
- retention cleanup status
- backup status

## Integration Events

External integrations write `IntegrationHealthEvent` rows.

Current integrations:

- `kartverket_address`
- `ssb`

Tracked metadata:

- integration name
- event type
- status
- latency
- safe error code/message
- safe metadata JSON

## AI Observability

AI triage writes `AIObservabilityEvent` rows for successful and failed provider calls.

Tracked metadata:

- tenant and case identifiers
- AI triage result identifier
- model and prompt version
- duration in milliseconds
- status
- safe failure classification when failed
- safe failure reason when failed
- optional token and cost estimate fields when available
- safe input-shape metadata such as minimized title/description lengths

Failure classifications:

- `timeout`
- `provider_error`
- `invalid_response`
- `validation_failed`

AI observability events do not store raw prompts, raw citizen text, API keys, or provider secrets.

## Maintenance Runs

Maintenance status is stored in `MaintenanceRun`.

Initial maintenance types:

- `backup`
- `restore_test`
- `retention_cleanup`
- `analytics_rebuild`
- `ssb_import`

The operations summary reads latest backup and retention cleanup status from this table.

## Operational Events

Operational events are persisted in `OperationalEvent` for runtime/security events that are useful for operations but should not be mixed into legal/compliance audit history.

Current event examples:

- `auth.login_failed`
- `security.permission_denied`
- `security.cross_tenant_access_attempt`
- `security.rate_limited`
- `public.rate_limited`
- `api.error`
- `document.upload_failed`
- `integration.kartverket.failed`
- `integration.ssb.failed`
- `ai.triage_failed`
- `maintenance.retention_cleanup`

Rate-limit events are recorded by the global throttling guard when a request is blocked. Metadata includes safe operational fields such as method, path, route surface, limit, total hits, and block expiry. Query strings, request bodies, raw tokens, and raw citizen content are not stored.

## Current Limitations

- Prometheus text format is not implemented yet; JSON metrics summary is the current supported interface.
