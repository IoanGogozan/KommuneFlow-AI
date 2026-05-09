from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .load import new_id
from .models import PopulationRecord

SSB_BASE_URL = "https://data.ssb.no/api/pxwebapi/v2"
SSB_POPULATION_DATASET = "07459"
SSB_POPULATION_CONTENT_CODE = "Personer1"


def import_ssb_population(
    connection: Any,
    year: int,
    municipality_codes: list[str] | None = None,
) -> int:
    codes = municipality_codes or extract_distinct_municipality_codes(connection)
    import_run_id = new_id()
    started_at = datetime.now(timezone.utc)

    connection.execute(
        """
        INSERT INTO external_data_import_runs (
          id,
          source,
          dataset,
          status,
          "startedAt",
          "recordsImported",
          "metadataJson",
          "updatedAt"
        )
        VALUES (
          %(id)s,
          'ssb',
          %(dataset)s,
          'started',
          %(started_at)s,
          0,
          %(metadata)s::jsonb,
          CURRENT_TIMESTAMP
        )
        """,
        {
            "id": import_run_id,
            "dataset": SSB_POPULATION_DATASET,
            "started_at": started_at,
            "metadata": json.dumps(
                {"year": year, "municipalityCount": len(codes)}
            ),
        },
    )

    try:
        records = fetch_population(year, codes)
        imported_at = datetime.now(timezone.utc)

        for record in records:
            upsert_population_record(connection, record, imported_at)

        connection.execute(
            """
            UPDATE external_data_import_runs
            SET
              status = 'completed',
              "completedAt" = %(completed_at)s,
              "recordsImported" = %(records_imported)s,
              "metadataJson" = %(metadata)s::jsonb,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = %(id)s
            """,
            {
                "id": import_run_id,
                "completed_at": imported_at,
                "records_imported": len(records),
                "metadata": json.dumps(
                    {
                        "year": year,
                        "municipalityCount": len(codes),
                        "recordsImported": len(records),
                    }
                ),
            },
        )
        return len(records)
    except Exception as exc:
        connection.execute(
            """
            UPDATE external_data_import_runs
            SET
              status = 'failed',
              "completedAt" = %(completed_at)s,
              "errorMessage" = %(error_message)s,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = %(id)s
            """,
            {
                "id": import_run_id,
                "completed_at": datetime.now(timezone.utc),
                "error_message": str(exc)[:240],
            },
        )
        raise


def fetch_population(year: int, municipality_codes: list[str]) -> list[PopulationRecord]:
    if not municipality_codes:
        return []

    query = urlencode(
        {
            "lang": "en",
            "outputFormat": "json-stat2",
            "valueCodes[Region]": ",".join(
                f"K-{code}" for code in sorted(set(municipality_codes))
            ),
            "valueCodes[Tid]": str(year),
            "valueCodes[ContentsCode]": SSB_POPULATION_CONTENT_CODE,
            "codelist[Region]": "agg_KommSummer",
            "outputValues[Region]": "aggregated",
        }
    )
    request = Request(
        f"{SSB_BASE_URL}/tables/{SSB_POPULATION_DATASET}/data?{query}",
        headers={"Accept": "application/json", "User-Agent": "KommuneFlowAI-ELT/1.0"},
    )

    with urlopen(request, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))

    return parse_population_jsonstat(payload, year)


def parse_population_jsonstat(payload: dict[str, Any], expected_year: int) -> list[PopulationRecord]:
    dimensions = payload.get("dimension")
    values = payload.get("value")

    if not isinstance(dimensions, dict) or not isinstance(values, list):
        raise ValueError("Malformed SSB population response.")

    region_category = dimensions["Region"]["category"]
    region_index = region_category["index"]
    region_labels = region_category.get("label", {})

    if not isinstance(region_index, dict):
        raise ValueError("Malformed SSB region index.")

    records: list[PopulationRecord] = []
    for region_code, flat_index in sorted(region_index.items(), key=lambda item: item[1]):
        value = values[flat_index]

        if not isinstance(value, int) or value < 0:
            raise ValueError("Malformed SSB population value.")

        records.append(
            PopulationRecord(
                municipality_code=region_code.replace("K-", ""),
                municipality_name=region_labels.get(region_code),
                year=expected_year,
                value=value,
                imported_at=datetime.now(timezone.utc),
            )
        )

    return records


def extract_distinct_municipality_codes(connection: Any) -> list[str]:
    rows = connection.execute(
        """
        SELECT DISTINCT "municipalityCode" AS municipality_code
        FROM case_addresses
        WHERE "municipalityCode" IS NOT NULL
        ORDER BY "municipalityCode"
        """
    ).fetchall()
    return [row["municipality_code"] for row in rows]


def upsert_population_record(
    connection: Any, record: PopulationRecord, imported_at: datetime
) -> None:
    connection.execute(
        """
        INSERT INTO external_municipality_statistics (
          id,
          "municipalityCode",
          "municipalityName",
          "statisticKey",
          "statisticLabel",
          year,
          value,
          unit,
          source,
          "sourceDataset",
          "importedAt",
          "updatedAt"
        )
        VALUES (
          %(id)s,
          %(municipality_code)s,
          %(municipality_name)s,
          'population_total',
          'Population total',
          %(year)s,
          %(value)s,
          'number',
          'ssb',
          %(source_dataset)s,
          %(imported_at)s,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("municipalityCode", "statisticKey", year, "sourceDataset")
        DO UPDATE SET
          "municipalityName" = EXCLUDED."municipalityName",
          value = EXCLUDED.value,
          unit = EXCLUDED.unit,
          "importedAt" = EXCLUDED."importedAt",
          "updatedAt" = CURRENT_TIMESTAMP
        """,
        {
            "id": new_id(),
            "municipality_code": record.municipality_code,
            "municipality_name": record.municipality_name,
            "year": record.year,
            "value": record.value,
            "source_dataset": SSB_POPULATION_DATASET,
            "imported_at": imported_at,
        },
    )
