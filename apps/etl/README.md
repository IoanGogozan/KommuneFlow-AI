# KommuneFlow ELT

This package complements the NestJS API with a small Python ELT pipeline for analytics.

It is intentionally not a replacement for the application backend. The API owns operational workflows. The ELT package extracts operational data, transforms it into analytics-ready records, validates data quality, and loads analytics snapshots idempotently.

## Requirements

- Python 3.11+
- PostgreSQL
- `KOMMUNEFLOW_DATABASE_URL` or `DATABASE_URL`

Install locally:

```bash
cd apps/etl
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

On Windows PowerShell:

```powershell
cd apps/etl
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

## Commands

Export operational cases:

```bash
python -m kommuneflow_elt.cli export-cases --from-date 2026-05-01 --to-date 2026-05-09
```

Rebuild analytics for one day:

```bash
python -m kommuneflow_elt.cli rebuild-analytics --date 2026-05-09
```

Import SSB statistics:

```bash
python -m kommuneflow_elt.cli import-ssb --year 2025
```

By default, this imports SSB population for municipality codes already present in validated case addresses. Codes can also be supplied explicitly:

```bash
python -m kommuneflow_elt.cli import-ssb --year 2025 --municipality-code 4203
```

Run data quality checks:

```bash
python -m kommuneflow_elt.cli quality-checks
```

## Data Quality Checks

The package validates:

- no analytics row without `tenant_id`
- no negative case counts
- no negative triage or close durations
- no cases per 1,000 inhabitants when population is missing or zero
- no duplicate analytics snapshot for the same tenant/date
- AI correction rate between 0 and 1
- AI acceptance rate between 0 and 1
- municipality code format where available

## Test Commands

```bash
cd apps/etl
python -m pytest
```

Tests are pure Python and do not call external APIs.
