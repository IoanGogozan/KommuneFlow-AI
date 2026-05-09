from datetime import date

from kommuneflow_elt.load import InMemoryAnalyticsStore
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
        average_time_to_triage_minutes=None,
        average_time_to_close_hours=None,
    )
