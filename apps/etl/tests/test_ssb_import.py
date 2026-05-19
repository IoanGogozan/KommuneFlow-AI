from __future__ import annotations

from datetime import datetime, timezone

import pytest

from kommuneflow_elt.models import PopulationRecord
from kommuneflow_elt.ssb_import import (
    extract_distinct_municipality_codes,
    import_ssb_population,
    parse_population_jsonstat,
)


class FakeConnection:
    def __init__(self, rows: list[dict[str, object]] | None = None) -> None:
        self.rows = rows or []
        self.calls: list[tuple[str, dict[str, object] | None]] = []

    def execute(self, sql: str, params: dict[str, object] | None = None):
        self.calls.append((sql, params))
        return self

    def fetchall(self):
        return self.rows


def test_parse_population_jsonstat_rejects_malformed_values():
    with pytest.raises(ValueError, match="Malformed SSB population response"):
        parse_population_jsonstat({"dimension": {}, "value": "bad"}, 2026)

    with pytest.raises(ValueError, match="Malformed SSB population value"):
        parse_population_jsonstat(
            {
                "dimension": {
                    "Region": {
                        "category": {
                            "index": {"K-4203": 0},
                            "label": {"K-4203": "Arendal"},
                        }
                    }
                },
                "value": [-1],
            },
            2026,
        )


def test_extract_distinct_municipality_codes_returns_sorted_codes():
    connection = FakeConnection(
        [{"municipality_code": "4203"}, {"municipality_code": "4204"}]
    )

    assert extract_distinct_municipality_codes(connection) == ["4203", "4204"]
    assert 'SELECT DISTINCT "municipalityCode"' in connection.calls[0][0]


def test_import_ssb_population_records_started_completed_and_upserts(monkeypatch):
    connection = FakeConnection()
    imported_at = datetime(2026, 5, 9, tzinfo=timezone.utc)
    record = PopulationRecord(
        municipality_code="4203",
        municipality_name="Arendal",
        year=2026,
        value=46_000,
        imported_at=imported_at,
    )
    monkeypatch.setattr("kommuneflow_elt.ssb_import.fetch_population", lambda *_: [record])
    upsert = lambda connection, record, imported_at: connection.calls.append(
        ("UPSERT", {"municipality_code": record.municipality_code})
    )
    monkeypatch.setattr("kommuneflow_elt.ssb_import.upsert_population_record", upsert)

    assert import_ssb_population(connection, 2026, municipality_codes=["4203"]) == 1

    executed_sql = "\n".join(call[0] for call in connection.calls)
    assert "INSERT INTO external_data_import_runs" in executed_sql
    assert "status = 'completed'" in executed_sql
    assert any(call[0] == "UPSERT" for call in connection.calls)


def test_import_ssb_population_marks_import_failed_before_reraising(monkeypatch):
    connection = FakeConnection()

    def fail_fetch(*_):
        raise RuntimeError("upstream unavailable with details")

    monkeypatch.setattr("kommuneflow_elt.ssb_import.fetch_population", fail_fetch)

    with pytest.raises(RuntimeError, match="upstream unavailable"):
        import_ssb_population(connection, 2026, municipality_codes=["4203"])

    failed_update = connection.calls[-1]
    assert "status = 'failed'" in failed_update[0]
    assert failed_update[1]["error_message"] == "upstream unavailable with details"
