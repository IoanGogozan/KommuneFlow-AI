from datetime import date, datetime, timezone

from kommuneflow_elt.load import InMemoryAnalyticsStore
from kommuneflow_elt.load import load_snapshots
from kommuneflow_elt.models import AnalyticsDataset, DailySnapshot


def test_load_operation_is_idempotent() -> None:
    store = InMemoryAnalyticsStore()
    dataset = AnalyticsDataset(snapshots=[snapshot(total_cases=2)])

    store.load_dataset(dataset)
    store.load_dataset(dataset)

    assert len(store.snapshots) == 1
    assert store.snapshots[("tenant_1", date(2026, 5, 1))].total_cases == 2


def test_idempotent_load_replaces_existing_snapshot() -> None:
    store = InMemoryAnalyticsStore()

    store.load_dataset(AnalyticsDataset(snapshots=[snapshot(total_cases=1)]))
    store.load_dataset(AnalyticsDataset(snapshots=[snapshot(total_cases=3)]))

    assert len(store.snapshots) == 1
    assert store.snapshots[("tenant_1", date(2026, 5, 1))].total_cases == 3


def test_load_snapshots_writes_current_analytics_schema_fields() -> None:
    connection = RecordingConnection()
    load_snapshots(connection, [snapshot(total_cases=2)])

    sql, params = connection.calls[0]

    expected_columns = [
        '"averageTimeToTriageMinutes"',
        '"medianTimeToTriageMinutes"',
        '"averageTimeToCloseHours"',
        '"medianTimeToCloseHours"',
        '"casesWaitingForCitizen"',
        '"aiTriageSuccessCount"',
        '"aiTriageFailureCount"',
        '"aiTriageFailureRate"',
        '"aiSuggestionsAccepted"',
        '"aiSuggestionAcceptanceRate"',
        '"estimatedManualMinutesSaved"',
        '"analyticsRebuiltAt"',
        '"ssbDataStatus"',
        '"ssbImportedAt"',
    ]

    for column in expected_columns:
        assert column in sql

    assert params["average_time_to_triage_minutes"] == 12.5
    assert params["median_time_to_triage_minutes"] == 10
    assert params["average_time_to_close_hours"] == 4.5
    assert params["median_time_to_close_hours"] == 4
    assert params["cases_waiting_for_citizen"] == 1
    assert params["ai_triage_success_count"] == 3
    assert params["ai_triage_failure_count"] == 1
    assert params["ai_triage_failure_rate"] == 0.25
    assert params["ai_suggestions_accepted"] == 2
    assert params["ai_suggestion_acceptance_rate"] == 0.5
    assert params["estimated_manual_minutes_saved"] == 14
    assert params["analytics_rebuilt_at"] == dt("2026-05-01T11:00:00+00:00")
    assert params["ssb_data_status"] == "available"
    assert params["ssb_imported_at"] == dt("2026-05-01T10:00:00+00:00")


def snapshot(total_cases: int) -> DailySnapshot:
    return DailySnapshot(
        tenant_id="tenant_1",
        snapshot_date=date(2026, 5, 1),
        total_cases=total_cases,
        cases_by_status={"new": total_cases},
        cases_by_category={"building_case": total_cases},
        cases_by_department={"Technical Department": total_cases},
        ai_reviews_total=0,
        ai_corrections_total=0,
        ai_correction_rate=0,
        municipality_population=None,
        municipality_population_year=None,
        cases_per_1000_inhabitants=None,
        average_time_to_triage_minutes=12.5,
        median_time_to_triage_minutes=10,
        average_time_to_close_hours=4.5,
        median_time_to_close_hours=4,
        cases_waiting_for_citizen=1,
        ai_triage_success_count=3,
        ai_triage_failure_count=1,
        ai_triage_failure_rate=0.25,
        ai_suggestions_accepted=2,
        ai_suggestion_acceptance_rate=0.5,
        estimated_manual_minutes_saved=14,
        analytics_rebuilt_at=dt("2026-05-01T11:00:00+00:00"),
        ssb_data_status="available",
        ssb_imported_at=dt("2026-05-01T10:00:00+00:00"),
    )


class RecordingConnection:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, object]]] = []

    def execute(self, sql: str, params: dict[str, object]) -> None:
        self.calls.append((sql, params))


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value).astimezone(timezone.utc)
