from datetime import date, datetime, timezone

from kommuneflow_elt.models import (
    AiReviewRecord,
    AiTriageRecord,
    CaseRecord,
    PopulationRecord,
)
from kommuneflow_elt.transform import rebuild_daily_analytics


def test_transform_calculates_average_time_to_triage() -> None:
    dataset = rebuild_daily_analytics(
        cases=[
            case_record("case_1", created_at=dt("2026-05-01T08:00:00+00:00")),
            case_record("case_2", created_at=dt("2026-05-01T09:00:00+00:00")),
        ],
        ai_triage=[
            triage_record("triage_1", "case_1", dt("2026-05-01T08:10:00+00:00")),
            triage_record("triage_2", "case_2", dt("2026-05-01T09:20:00+00:00")),
        ],
        ai_reviews=[],
        population=[],
        snapshot_date=date(2026, 5, 1),
    )

    assert dataset.snapshots[0].average_time_to_triage_minutes == 15


def test_transform_calculates_average_time_to_close() -> None:
    dataset = rebuild_daily_analytics(
        cases=[
            case_record(
                "case_1",
                created_at=dt("2026-05-01T08:00:00+00:00"),
                closed_at=dt("2026-05-01T12:00:00+00:00"),
            ),
            case_record(
                "case_2",
                created_at=dt("2026-05-01T09:00:00+00:00"),
                closed_at=dt("2026-05-01T15:00:00+00:00"),
            ),
        ],
        ai_triage=[],
        ai_reviews=[],
        population=[],
        snapshot_date=date(2026, 5, 1),
    )

    assert dataset.snapshots[0].average_time_to_close_hours == 5


def test_transform_calculates_ai_acceptance_and_correction_rates() -> None:
    dataset = rebuild_daily_analytics(
        cases=[case_record("case_1")],
        ai_triage=[],
        ai_reviews=[
            review_record("review_1", "case_1", accepted=True),
            review_record("review_2", "case_1", accepted=False),
        ],
        population=[],
        snapshot_date=date(2026, 5, 1),
    )

    assert dataset.ai_quality[0].ai_acceptance_rate == 0.5
    assert dataset.ai_quality[0].ai_correction_rate == 0.5
    assert dataset.snapshots[0].ai_correction_rate == 0.5


def test_transform_calculates_cases_per_1000_inhabitants() -> None:
    dataset = rebuild_daily_analytics(
        cases=[
            case_record("case_1", municipality_code="4203"),
            case_record("case_2", municipality_code="4203"),
        ],
        ai_triage=[],
        ai_reviews=[],
        population=[
            PopulationRecord(
                municipality_code="4203",
                municipality_name="Arendal",
                year=2026,
                value=10_000,
                imported_at=dt("2026-05-01T00:00:00+00:00"),
            )
        ],
        snapshot_date=date(2026, 5, 1),
    )

    assert dataset.snapshots[0].cases_per_1000_inhabitants == 0.2
    assert dataset.municipalities[0].cases_per_1000_inhabitants == 0.2


def case_record(
    case_id: str,
    *,
    created_at: datetime | None = None,
    closed_at: datetime | None = None,
    municipality_code: str | None = None,
) -> CaseRecord:
    return CaseRecord(
        id=case_id,
        tenant_id="tenant_1",
        created_at=created_at or dt("2026-05-01T08:00:00+00:00"),
        updated_at=dt("2026-05-01T08:00:00+00:00"),
        closed_at=closed_at,
        status="new",
        category="building_case",
        department_id="department_1",
        department_name="Technical Department",
        municipality_code=municipality_code,
        municipality_name="Arendal" if municipality_code else None,
    )


def triage_record(
    triage_id: str, case_id: str, created_at: datetime
) -> AiTriageRecord:
    return AiTriageRecord(
        id=triage_id,
        tenant_id="tenant_1",
        case_id=case_id,
        created_at=created_at,
        status="completed",
    )


def review_record(
    review_id: str, case_id: str, *, accepted: bool
) -> AiReviewRecord:
    return AiReviewRecord(
        id=review_id,
        tenant_id="tenant_1",
        case_id=case_id,
        created_at=dt("2026-05-01T10:00:00+00:00"),
        was_ai_suggestion_accepted=accepted,
    )


def dt(value: str) -> datetime:
    return datetime.fromisoformat(value).astimezone(timezone.utc)
