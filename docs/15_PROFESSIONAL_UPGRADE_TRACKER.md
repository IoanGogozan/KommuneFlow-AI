# Professional Upgrade Tracker

## Purpose

This is the active tracker for the current KommuneFlow AI professional upgrade. It replaces the older roadmap, development plan, and implementation checklist documents.

Use this file to answer:

- what has already been completed
- what phase is next
- what must not be treated as complete yet
- which verification commands were last run

## Ground Rules

- Do not deploy to Hetzner until explicitly requested.
- Hetzner deployment remains the final reviewed phase.
- Keep changes small and reviewable.
- Do not remove existing features.
- Do not weaken tenant isolation, RBAC, auditability, file security, or privacy behavior.
- Add or update tests with backend behavior changes.
- CI must not call real Kartverket, SSB, or OpenAI APIs.
- Code, backend naming, database fields, API routes, comments, docs, and internal technical text must stay in English.
- User-facing UI must support Norwegian Bokmal (`nb`) and English (`en`).

## Current Status

```txt
Current phase: Phase H - E2E tests in CI business-flow expansion
Last completed phase: Phase G - Security and negative test completion
Deployment status: Not deployed; Hetzner remains final phase only
Last updated: 2026-05-09
```

## Completed Phases

### Phase A: Kartverket Address API Integration

Status: completed for current backend/UI scope.

Implemented:

- `CaseAddress` storage and migration
- `IntegrationHealthEvent` foundation
- internal authenticated Kartverket address search
- public rate-limited address search for citizen intake
- validated and normalized address enrichment during intake
- tenant-scoped address data storage through case records
- case detail address enrichment display
- mocked service/controller/case intake tests
- API reference entries for Kartverket endpoints

Remaining future polish:

- add dedicated `docs/integrations/kartverket-address.md`

### Phase B: SSB API Analytics Enrichment

Status: completed.

Implemented:

- SSB integration module
- municipality population import from table `07459`
- local `ExternalMunicipalityStatistic` and `ExternalDataImportRun` storage
- idempotent import behavior
- import success/failure tracking
- analytics cases per 1,000 inhabitants
- dashboard SSB enrichment status
- `docs/integrations/ssb.md`

### Phase C: Python ELT Package

Status: completed.

Implemented:

- `apps/etl`
- typed Python 3.11+ package
- PostgreSQL extraction helpers
- SSB import command
- analytics transforms
- data quality checks
- idempotent analytics loaders
- CLI commands
- pytest coverage
- `docs/analytics/elt-pipeline.md`

### Phase D: Analytics Effect Metrics

Status: completed.

Implemented:

- average and median triage time
- average and median close time
- waiting-for-citizen count
- AI triage success/failure metrics
- AI acceptance/correction metrics
- estimated manual minutes saved
- configurable savings assumptions
- analytics rebuild timestamp
- SSB-normalized cases per 1,000 inhabitants
- analytics dashboard updates

### Phase E: Observability Complete Upgrade

Status: completed.

Implemented:

- request IDs
- structured logging foundation
- `/api/v1/health`
- `/api/v1/readiness`
- operations metrics summary endpoint
- `operations:read` permission
- operations dashboard
- readiness integration configuration status
- `MaintenanceRun`
- backup/retention status visibility
- `docs/observability.md`

### Phase F: AI Production Hardening

Status: completed.

Implemented:

- OpenAI timeout handling
- limited retry policy
- provider failure classifications
- minimized/redacted AI provider input
- `AIObservabilityEvent`
- duration/status/failure tracking
- token estimate capture when available
- AI latency metric in operations summary
- clear UI notice that AI suggestions require human review

### Phase G: Security And Negative Test Completion

Status: completed.

Implemented:

- expired token coverage verified
- unauthorized operations metrics coverage
- unsupported-method safe-error e2e coverage
- external integration no-stack-trace e2e coverage
- public address-search throttling e2e coverage
- guessed public citizen-case route e2e coverage
- CI PostgreSQL-backed API e2e execution
- dependency audit preserved in CI
- `docs/security/negative-testing.md`

## Remaining Phases

### Phase H: E2E Tests In CI Business-Flow Expansion

Status: next.

Target:

- expand e2e from negative/security checks into a realistic business flow
- keep all external systems mocked in CI

Planned flow:

- citizen submits case with address
- mocked Kartverket validates/enriches address
- mocked AI generates triage suggestion
- case worker logs in
- case worker reviews AI suggestion
- case worker updates status
- document upload/download is exercised if stable in e2e
- analytics rebuild is triggered
- operations metrics show relevant events
- audit log contains important events where API coverage exists

### Phase I: Demo Data Upgrade

Status: not started.

Target:

- Arendal Kommune
- Grimstad Kommune
- Kristiansand Kommune
- realistic departments
- 15 to 25 realistic cases
- validated demo addresses
- accepted/corrected AI suggestions
- waiting and closed cases
- demo documents
- SSB demo population data
- analytics snapshots
- audit history

### Phase J: README And Portfolio Polish

Status: partially done, final polish still pending.

Target:

- update README for Kartverket, SSB, ELT, observability, security, and negative testing
- add or capture screenshots
- clearly mark Hetzner as final phase and not deployed
- add missing Kartverket integration document
- keep English and Norwegian portfolio positioning text current

## Final Acceptance Status

Done:

- Kartverket lookup works with mocked tests
- citizen intake can validate/enrich address
- case detail displays address enrichment data
- SSB import works with mocked tests
- analytics uses SSB population data
- Python ELT package exists and has tested transformations
- analytics dashboard shows effect metrics
- operations dashboard exists
- metrics summary endpoint exists
- AI integration has timeout/retry/safe failure handling
- negative security tests pass
- e2e tests run in CI for the API security/health scope
- CI does not call real external APIs

Not done yet:

- expanded business-flow e2e
- realistic upgraded demo seed data
- final README/docs polish
- screenshots
- Hetzner deployment and live HTTPS verification

## Last Verification

Most recent verification:

```txt
pnpm --filter @kommuneflow/api lint
pnpm --filter @kommuneflow/api typecheck
pnpm --filter @kommuneflow/api test -- --runInBand
pnpm --filter @kommuneflow/api test:e2e -- --runInBand
pnpm --filter @kommuneflow/web typecheck
pnpm --filter @kommuneflow/web lint
pnpm audit:deps
```

Result:

- API lint passed
- API typecheck passed
- API tests passed: 117 tests
- API e2e passed: 18 tests
- Web typecheck passed
- Web lint passed
- Dependency audit passed at the configured `high` threshold, with 2 moderate advisories still reported
