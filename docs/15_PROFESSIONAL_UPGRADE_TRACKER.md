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
Current phase: Phase J - README, screenshots, UI localization, and portfolio polish
Last completed phase: Phase I - Demo data upgrade
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
- `docs/integrations/kartverket-address.md`

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
- persisted operational events for failed logins, permission denials, cross-tenant attempts, rate-limit blocks, API errors, document failures, integration failures, AI failures, and maintenance runs
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

### Phase H: E2E Tests In CI Business-Flow Expansion

Status: completed.

Implemented:

- citizen submits case with address and a document
- mocked Kartverket validates/enriches address
- case worker logs in
- mocked AI generates triage suggestion
- case worker reviews AI suggestion
- case worker updates status
- analytics rebuild is triggered
- operations metrics show relevant events
- audit log contains important events
- external systems remain mocked in CI

### Phase I: Demo Data Upgrade

Status: completed.

Implemented:

- Arendal Kommune
- Grimstad Kommune
- Kristiansand Kommune
- 5 departments per tenant
- 18 realistic cases across statuses and categories
- Norwegian and English demo case descriptions
- validated demo addresses
- accepted, corrected, and failed AI triage examples
- waiting and closed cases
- demo documents
- SSB demo population data
- analytics snapshots
- audit history
- operational events
- seed code split into small modules under `apps/api/prisma/seed/`

## Remaining Phases

### Phase J: README And Portfolio Polish

Status: partially done, final polish still pending.

Target:

- update README for Kartverket, SSB, ELT, observability, security, business-flow e2e, and demo data
- add or capture screenshots
- clearly mark Hetzner as final phase and not deployed
- keep English and Norwegian portfolio positioning text current

### Phase K: Internal UI Localization And Polish

Status: not started.

Target:

- user-facing internal UI labels available in Norwegian Bokmal and English
- keep code, route internals, API fields, and technical identifiers in English
- prefer a small internal dictionary unless route-level locale support becomes necessary
- polish internal cases, analytics, operations, and login screens after the seed data upgrade

### Final Phase: Hetzner Deployment

Status: not started.

Target:

- deploy only after the app is polished and explicitly requested
- run smoke tests against the live HTTPS deployment
- verify backups, restore path, Caddy TLS, health, readiness, and demo login

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
- e2e tests run in CI for API security/health and business-flow scope
- CI does not call real external APIs
- Python ELT tests run in CI
- operations metrics are backed by persisted `OperationalEvent` rows
- public and security rate-limit blocks are persisted as operational events
- demo seed includes three tenants, realistic cases, analytics, SSB records, audit records, and operational events
- Kartverket integration documentation exists
- SSB live query shape was manually verified on 2026-05-09

Not done yet:

- internal UI localization and polish
- final README/docs polish
- screenshots
- Hetzner deployment and live HTTPS verification

## Manual External Verification

SSB live verification was run manually on 2026-05-09. This is intentionally not part of CI.

Command:

```bash
cd apps/etl
python - <<'PY'
from kommuneflow_elt.ssb_import import fetch_population

records = fetch_population(2025, ["4203", "4204", "4205"])
for record in records:
    print(f"{record.municipality_code}\t{record.municipality_name}\t{record.year}\t{record.value}")
print(f"records={len(records)}")
PY
```

Result:

```txt
4203    Arendal       2025    46568
4204    Kristiansand  2025    118221
4205    Lindesnes     2025    23768
records=3
```

Conclusion:

- table `07459` is reachable through PxWebApi v2
- `valueCodes[Region]` accepts `K-<municipalityCode>` values with `codelist[Region]=agg_KommSummer`
- `valueCodes[Tid]=2025` and `valueCodes[ContentsCode]=Personer1` return the expected population metric
- the parser returns municipality code, name, year, and integer population values
- CI must continue using mocked SSB responses only

## Last Verification

Most recent verification:

```txt
pnpm --filter @kommuneflow/api lint
pnpm --filter @kommuneflow/api typecheck
pnpm --filter @kommuneflow/api test -- --runInBand
pnpm --filter @kommuneflow/api test:e2e -- --runInBand
pnpm --filter @kommuneflow/api build
pnpm --filter @kommuneflow/web typecheck
pnpm --filter @kommuneflow/web lint
python -m pytest -q
pnpm audit:deps
```

Result:

- API lint passed
- API typecheck passed
- API tests passed: 117 tests
- API e2e passed: 19 tests
- API build passed
- Web typecheck passed
- Web lint passed
- Python ELT tests passed: 12 tests
- Dependency audit passed at the configured `high` threshold, with 2 moderate advisories still reported
