# Observability And Operations

## Goal

The application must be observable and operable in a production-like environment. It is not enough that the app works locally. The system should demonstrate that it can be monitored, debugged, backed up, restored, and operated responsibly.

The observability model should cover logs, metrics, and traces where practical. Full distributed tracing is optional for the MVP, but the architecture should not block adding it later.

## Required Capabilities

The application must include:

- structured logging
- request IDs / correlation IDs
- safe error logging
- audit logging for security and privacy events
- health check endpoint
- readiness check endpoint
- basic metrics endpoint or metrics-friendly internal structure
- deployment logs
- backup logs
- operational runbook

## Structured Logging

Backend services should emit structured JSON logs.

Every request log should include:

- `requestId`
- `method`
- `path`
- `statusCode`
- `durationMs`
- `userId` if authenticated
- `tenantId` if available
- `ipAddress` if available
- `userAgent` if available

Logs must not include:

- passwords
- tokens
- API keys
- full document contents
- uploaded file binary content
- raw OpenAI API keys
- unnecessary personal data

## Request IDs

Every incoming API request must receive or generate a request ID.

Rules:

- accept `X-Request-Id` only if it is safe and valid
- generate a new request ID if missing
- include the request ID in response headers
- include the request ID in logs
- include the request ID in structured error responses

## Error Logging

Errors must be logged with enough context to debug safely.

Error logs should include:

- `requestId`
- `errorCode`
- `safeMessage`
- `stack` only in development or controlled production logging
- `userId` if authenticated
- `tenantId` if available
- `route`

## Health And Readiness

Required endpoints:

```txt
GET /api/v1/health
GET /api/v1/readiness
```

`/health` should confirm that the API process is running.

`/readiness` should verify required dependencies:

- database connection
- upload storage path availability
- optional Redis connection if Redis is introduced later

These endpoints must not expose secrets or detailed infrastructure internals.

## Metrics

At minimum, the application should track or expose:

- request count by route and status
- request duration
- failed login attempts
- case creation count
- AI triage success/failure count
- document upload success/failure count
- permission denied count
- cross-tenant access attempt count
- background job failures

A Prometheus-compatible `/metrics` endpoint is optional, but recommended for portfolio quality.

## Operational Dashboard

The admin area should include a simple operations dashboard showing:

- total cases created today
- AI triage failures in the last 24 hours
- document upload failures in the last 24 hours
- average API response time if available
- failed login count
- latest background job status

The dashboard can be simple, but it must demonstrate operational thinking.

## Alerting

Full alerting integration is optional for portfolio scope, but recommended alert rules must be documented:

- API error rate too high
- AI triage failure rate too high
- database unavailable
- disk usage too high
- backup failed
- repeated failed login attempts
- repeated cross-tenant access attempts

## Backup And Restore Verification

Backups are not complete unless restore is tested.

Required:

- database backup script
- upload storage backup strategy
- documented restore procedure
- local or staging restore test
- documented date of the last restore test

Hetzner backups and snapshots may be used as infrastructure-level recovery, but application-level PostgreSQL dumps are still required.

## Hetzner Operations Requirements

The Hetzner deployment must include:

- firewall rules
- SSH key authentication
- no public PostgreSQL port
- HTTPS
- persistent Docker volumes
- backup or snapshot strategy
- documented update procedure
- documented rollback procedure

## Runbook

Create `docs/RUNBOOK.md` with:

- how to deploy
- how to restart services
- how to view logs
- how to run migrations
- how to create a backup
- how to restore a backup
- how to rotate secrets
- how to check disk usage
- how to respond if the AI provider fails
- how to respond if the database is unavailable

## Operational Acceptance Criteria

The project is not operationally complete unless:

- `/health` works
- `/readiness` verifies dependencies
- logs are structured
- request IDs exist
- backup script exists
- restore procedure is documented
- Hetzner deployment uses HTTPS
- the database is not publicly exposed
- sensitive values are not logged
- failure scenarios are documented
