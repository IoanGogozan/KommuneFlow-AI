# Python ELT Pipeline

## Purpose

KommuneFlow AI includes a Python ELT package in `apps/etl` to demonstrate data platform and data engineering competence alongside the NestJS application.

The ELT package transforms operational municipal case data into analytics-ready daily records. It complements the API and does not replace the application backend.

## Pipeline Overview

Extract:

- cases
- departments
- validated case addresses
- AI triage results
- AI review results
- locally imported SSB municipality population statistics

Transform:

- daily tenant analytics snapshots
- department daily metrics
- AI quality daily metrics
- municipality daily metrics
- cases per 1,000 inhabitants
- average time to triage
- average time to close
- AI acceptance and correction rates
- estimated manual minutes saved
- AI triage success and failure rates

## Effect Metrics

The application analytics layer now exposes effect metrics that help evaluate whether digital workflows and AI-assisted triage are improving operations:

- daily case volume
- cases by status, category, and department
- average and median time to triage
- average and median time to close
- cases waiting for citizen
- AI triage success and failure counts
- AI triage failure rate
- AI suggestion acceptance rate
- AI correction rate
- estimated manual minutes saved
- cases per 1,000 inhabitants using SSB population data

Estimated manual minutes saved is a documented estimate, not an exact measurement.

Default assumptions:

- accepted AI suggestion: 5 minutes saved
- corrected AI suggestion: 2 minutes saved

The backend can override these with:

```txt
ACCEPTED_AI_SUGGESTION_MINUTES_SAVED
CORRECTED_AI_SUGGESTION_MINUTES_SAVED
```

Load:

- `analytics_daily_snapshots`
- `analytics_department_daily`
- `analytics_ai_quality_daily`
- `analytics_municipality_daily`

Loads are idempotent. Each target table has a unique key and the loader uses upsert semantics.

## Configuration

The package reads the database URL from:

```txt
KOMMUNEFLOW_DATABASE_URL
```

Fallback:

```txt
DATABASE_URL
```

No secrets are hardcoded.

## CLI

Export cases:

```bash
python -m kommuneflow_elt.cli export-cases --from-date 2026-05-01 --to-date 2026-05-09
```

Rebuild analytics:

```bash
python -m kommuneflow_elt.cli rebuild-analytics --date 2026-05-09
```

Import SSB:

```bash
python -m kommuneflow_elt.cli import-ssb --year 2025
```

By default, `import-ssb` imports SSB population for municipality codes already present in validated case addresses. Codes can also be supplied explicitly:

```bash
python -m kommuneflow_elt.cli import-ssb --year 2025 --municipality-code 4203
```

The live SSB query shape was manually verified on 2026-05-09 with table `07459`, `valueCodes[Region]`, `valueCodes[Tid]=2025`, and `valueCodes[ContentsCode]=Personer1`. The detailed result is documented in [SSB Integration](../integrations/ssb.md).

Run quality checks:

```bash
python -m kommuneflow_elt.cli quality-checks
```

## Data Quality

Quality checks fail when:

- an analytics row is missing `tenant_id`
- case counts are negative
- duration metrics are negative
- cases per 1,000 inhabitants exists without population
- duplicate tenant/date snapshots are produced
- AI correction or acceptance rate is outside `0..1`
- municipality code format is invalid

## Testing

The package includes unit tests for:

- average time to triage
- average time to close
- AI acceptance and correction rates
- cases per 1,000 inhabitants
- negative value quality failures
- duplicate snapshot quality failures
- idempotent loading
- extract query mapping
- database commit/rollback lifecycle
- SSB import success and failure paths
- CLI orchestration

The tests do not call Kartverket, SSB, OpenAI, or the application API.

## Limitations

- The first ELT slice is day-based and intentionally small.
- The loader supports PostgreSQL, but local tests use pure Python in-memory idempotency checks.
- Scheduling is not implemented yet.
- SSB import can be run through the backend API or the Python ELT CLI; CI still uses mocked SSB behavior only.
