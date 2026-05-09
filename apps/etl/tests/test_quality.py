from datetime import date

import pytest

from kommuneflow_elt.models import (
    AiQualityDaily,
    AnalyticsDataset,
    DailySnapshot,
    MunicipalityDaily,
)
from kommuneflow_elt.quality import DataQualityError, run_quality_checks


def test_quality_checks_fail_on_negative_case_counts() -> None:
    dataset = AnalyticsDataset(
        snapshots=[
            snapshot(total_cases=-1),
        ]
    )

    with pytest.raises(DataQualityError, match="negative case count"):
        run_quality_checks(dataset)


def test_quality_checks_fail_on_duplicate_snapshot_rows() -> None:
    dataset = AnalyticsDataset(
        snapshots=[
            snapshot(),
            snapshot(),
        ]
    )

    with pytest.raises(DataQualityError, match="duplicate analytics snapshot"):
        run_quality_checks(dataset)


def test_quality_checks_fail_on_invalid_ai_rates() -> None:
    dataset = AnalyticsDataset(
        ai_quality=[
            AiQualityDaily(
                tenant_id="tenant_1",
                snapshot_date=date(2026, 5, 1),
                ai_reviews_total=1,
                ai_suggestions_accepted=1,
                ai_corrections_total=0,
                ai_acceptance_rate=1.2,
                ai_correction_rate=0,
                ai_triage_success_count=1,
                ai_triage_failure_count=0,
                ai_triage_failure_rate=0,
            )
        ]
    )

    with pytest.raises(DataQualityError, match="AI acceptance rate"):
        run_quality_checks(dataset)


def test_quality_checks_fail_on_invalid_municipality_code() -> None:
    dataset = AnalyticsDataset(
        municipalities=[
            MunicipalityDaily(
                tenant_id="tenant_1",
                snapshot_date=date(2026, 5, 1),
                municipality_code="42A3",
                municipality_name="Arendal",
                case_count=1,
                population=10_000,
                population_year=2026,
                cases_per_1000_inhabitants=0.1,
                ssb_imported_at=None,
            )
        ]
    )

    with pytest.raises(DataQualityError, match="municipalityCode"):
        run_quality_checks(dataset)


def snapshot(total_cases: int = 1) -> DailySnapshot:
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
