from __future__ import annotations

from datetime import date, datetime, timezone

from kommuneflow_elt.extract import (
    extract_ai_reviews,
    extract_ai_triage,
    extract_cases,
    extract_population,
)


class FakeConnection:
    def __init__(self, rows: list[dict[str, object]]) -> None:
        self.rows = rows
        self.calls: list[tuple[str, dict[str, object] | None]] = []

    def execute(self, sql: str, params: dict[str, object] | None = None):
        self.calls.append((sql, params))
        return self

    def fetchall(self):
        return self.rows


def test_extract_cases_maps_rows_and_uses_inclusive_date_window():
    created_at = datetime(2026, 5, 9, 8, tzinfo=timezone.utc)
    connection = FakeConnection(
        [
            {
                "id": "case_1",
                "tenant_id": "tenant_1",
                "created_at": created_at,
                "updated_at": created_at,
                "closed_at": None,
                "status": "new",
                "category": "road_transport",
                "department_id": "department_1",
                "department_name": "Technical Department",
                "municipality_code": "4203",
                "municipality_name": "Arendal",
            }
        ]
    )

    records = extract_cases(connection, date(2026, 5, 1), date(2026, 5, 31))

    assert records[0].id == "case_1"
    assert records[0].municipality_code == "4203"
    sql, params = connection.calls[0]
    assert 'c."createdAt" >= %(from_date)s' in sql
    assert 'c."createdAt" < (%(to_date)s::date + INTERVAL' in sql
    assert params == {"from_date": date(2026, 5, 1), "to_date": date(2026, 5, 31)}


def test_extract_ai_triage_reviews_and_population_map_database_aliases():
    now = datetime(2026, 5, 9, 8, tzinfo=timezone.utc)
    date_from = date(2026, 5, 9)
    date_to = date(2026, 5, 9)

    triage = extract_ai_triage(
        FakeConnection(
            [
                {
                    "id": "ai_1",
                    "tenant_id": "tenant_1",
                    "case_id": "case_1",
                    "created_at": now,
                    "status": "completed",
                }
            ]
        ),
        date_from,
        date_to,
    )
    reviews = extract_ai_reviews(
        FakeConnection(
            [
                {
                    "id": "review_1",
                    "tenant_id": "tenant_1",
                    "case_id": "case_1",
                    "created_at": now,
                    "was_ai_suggestion_accepted": False,
                }
            ]
        ),
        date_from,
        date_to,
    )
    population = extract_population(
        FakeConnection(
            [
                {
                    "municipality_code": "4203",
                    "municipality_name": "Arendal",
                    "year": 2026,
                    "value": 46_000,
                    "imported_at": now,
                }
            ]
        ),
        2026,
    )

    assert triage[0].status == "completed"
    assert reviews[0].was_ai_suggestion_accepted is False
    assert population[0].value == 46_000
