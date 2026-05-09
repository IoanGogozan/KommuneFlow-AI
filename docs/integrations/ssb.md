# SSB Integration

## Purpose

KommuneFlow AI imports municipality-level population statistics from Statistics Norway (SSB) so operational analytics can be normalized by population size.

This supports public-sector data platform requirements:

- external data flow from an authoritative Norwegian source
- local storage of imported statistics
- idempotent import behavior
- import run auditability
- analytics enrichment with effect metrics
- clear handling of missing or stale data

## Source Dataset

Initial dataset:

- Source: Statistics Norway (SSB)
- Statbank table: `07459`
- Metric: municipality population
- Statistic key: `population_total`
- Unit: `number`
- API format: JSON-stat2

SSB's PxWebApi v2 documentation states that data can be retrieved from Statbank tables, the default output format is JSON-stat2, and the current API limit is 30 queries per minute per IP address.

Reference:

- https://www.ssb.no/en/api/pxwebapiv2
- https://data.ssb.no/api/pxwebapi/v2/tables/07459/metadata?lang=en

## Local Storage

Imported statistics are stored in `ExternalMunicipalityStatistic`.

Important fields:

- `municipalityCode`
- `municipalityName`
- `statisticKey`
- `statisticLabel`
- `year`
- `value`
- `unit`
- `source`
- `sourceDataset`
- `importedAt`

The table has a unique constraint on:

```txt
municipalityCode + statisticKey + year + sourceDataset
```

This makes imports idempotent. Re-running an import updates the existing row instead of creating duplicates.

## Import Runs

Each import creates an `ExternalDataImportRun` row.

Statuses:

- `started`
- `completed`
- `failed`

The run records:

- source
- dataset
- started/completed timestamps
- imported record count
- safe error message on failure
- metadata JSON with year and municipality count

## API

Internal import endpoint:

```http
POST /api/v1/integrations/ssb/imports/municipality-population
```

Required permission:

```txt
tenant:manage
```

Example payload:

```json
{
  "year": 2025,
  "municipalityCodes": ["4203", "4204", "4205"]
}
```

Example response:

```json
{
  "importRunId": "import_run_id",
  "source": "ssb",
  "dataset": "07459",
  "year": 2025,
  "recordsImported": 3
}
```

## Analytics Enrichment

The analytics aggregation reads local SSB statistics. It does not call SSB while serving dashboards.

When a case has a validated address with municipality code, analytics can calculate:

```txt
casesPer1000Inhabitants = caseCount / municipalityPopulation * 1000
```

Dashboard output includes:

- cases per 1,000 inhabitants
- population basis
- SSB year
- SSB status
- last imported timestamp

If SSB data is missing, analytics still works and reports `missing` enrichment status.

## Operational Notes

- Do not call SSB from CI.
- Mock SSB responses in tests.
- Keep SSB failures safe and generic in API responses.
- Store safe failure messages in import runs and integration health events.
- Respect SSB rate limits and avoid frequent repeated imports.

## Current Limitations

- The first metric is only total municipality population.
- Age groups and other demographics are not imported yet.
- Stale-data thresholds are not yet enforced beyond exposing import timestamps/status.
- Imports are currently triggered through an internal API endpoint, not a scheduled job.
