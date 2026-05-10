from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date, datetime
from statistics import mean, median

from .models import (
    AiQualityDaily,
    AiReviewRecord,
    AiTriageRecord,
    AnalyticsDataset,
    CaseRecord,
    DailySnapshot,
    DepartmentDaily,
    MunicipalityDaily,
    PopulationRecord,
)

ACCEPTED_AI_SUGGESTION_MINUTES_SAVED = 5
CORRECTED_AI_SUGGESTION_MINUTES_SAVED = 2


def rebuild_daily_analytics(
    cases: list[CaseRecord],
    ai_triage: list[AiTriageRecord],
    ai_reviews: list[AiReviewRecord],
    population: list[PopulationRecord],
    snapshot_date: date,
) -> AnalyticsDataset:
    tenant_ids = sorted({case.tenant_id for case in cases})
    tenant_ids.extend(
        tenant_id
        for tenant_id in sorted({review.tenant_id for review in ai_reviews})
        if tenant_id not in tenant_ids
    )
    tenant_ids.extend(
        tenant_id
        for tenant_id in sorted({triage.tenant_id for triage in ai_triage})
        if tenant_id not in tenant_ids
    )

    population_by_code = {record.municipality_code: record for record in population}
    triage_by_case = earliest_triage_by_case(ai_triage)

    snapshots: list[DailySnapshot] = []
    department_rows: list[DepartmentDaily] = []
    ai_quality_rows: list[AiQualityDaily] = []
    municipality_rows: list[MunicipalityDaily] = []

    for tenant_id in tenant_ids:
        tenant_cases = [case for case in cases if case.tenant_id == tenant_id]
        tenant_reviews = [
            review for review in ai_reviews if review.tenant_id == tenant_id
        ]
        tenant_triage = [triage for triage in ai_triage if triage.tenant_id == tenant_id]

        snapshots.append(
            build_snapshot(
                tenant_id,
                snapshot_date,
                tenant_cases,
                tenant_reviews,
                tenant_triage,
                population_by_code,
                triage_by_case,
            )
        )
        department_rows.extend(
            build_department_daily(
                tenant_id, snapshot_date, tenant_cases, triage_by_case
            )
        )
        ai_quality_rows.append(
            build_ai_quality_daily(
                tenant_id, snapshot_date, tenant_reviews, tenant_triage
            )
        )
        municipality_rows.extend(
            build_municipality_daily(
                tenant_id, snapshot_date, tenant_cases, population_by_code
            )
        )

    return AnalyticsDataset(
        snapshots=snapshots,
        departments=department_rows,
        ai_quality=ai_quality_rows,
        municipalities=municipality_rows,
    )


def average_time_to_triage_minutes(
    cases: list[CaseRecord],
    triage_by_case: dict[str, AiTriageRecord],
) -> float | None:
    durations = time_to_triage_minutes(cases, triage_by_case)
    return mean(durations) if durations else None


def average_time_to_close_hours(cases: list[CaseRecord]) -> float | None:
    durations = time_to_close_hours(cases)
    return mean(durations) if durations else None


def median_time_to_triage_minutes(
    cases: list[CaseRecord],
    triage_by_case: dict[str, AiTriageRecord],
) -> float | None:
    durations = time_to_triage_minutes(cases, triage_by_case)
    return median(durations) if durations else None


def median_time_to_close_hours(cases: list[CaseRecord]) -> float | None:
    durations = time_to_close_hours(cases)
    return median(durations) if durations else None


def time_to_triage_minutes(
    cases: list[CaseRecord],
    triage_by_case: dict[str, AiTriageRecord],
) -> list[float]:
    return [
        (triage_by_case[case.id].created_at - case.created_at).total_seconds() / 60
        for case in cases
        if case.id in triage_by_case
        and (triage_by_case[case.id].created_at - case.created_at).total_seconds() >= 0
    ]


def time_to_close_hours(cases: list[CaseRecord]) -> list[float]:
    durations = [
        (case.closed_at - case.created_at).total_seconds() / 3600
        for case in cases
        if case.closed_at is not None
        and (case.closed_at - case.created_at).total_seconds() >= 0
    ]
    return durations


def calculate_ai_rates(ai_reviews: list[AiReviewRecord]) -> tuple[int, int, float, float]:
    total = len(ai_reviews)
    accepted = sum(1 for review in ai_reviews if review.was_ai_suggestion_accepted)
    corrected = total - accepted

    if total == 0:
        return accepted, corrected, 0.0, 0.0

    return accepted, corrected, accepted / total, corrected / total


def calculate_cases_per_1000(case_count: int, population: int | None) -> float | None:
    if population is None or population <= 0:
        return None

    return (case_count / population) * 1000


def build_snapshot(
    tenant_id: str,
    snapshot_date: date,
    cases: list[CaseRecord],
    ai_reviews: list[AiReviewRecord],
    ai_triage: list[AiTriageRecord],
    population_by_code: dict[str, PopulationRecord],
    triage_by_case: dict[str, AiTriageRecord],
) -> DailySnapshot:
    accepted, corrected, acceptance_rate, correction_rate = calculate_ai_rates(
        ai_reviews
    )
    successes = sum(1 for item in ai_triage if item.status in {"completed", "reviewed"})
    failures = sum(1 for item in ai_triage if item.status == "failed")
    triage_total = successes + failures
    municipality_codes = {
        case.municipality_code for case in cases if case.municipality_code
    }
    population_records = [
        population_by_code[code] for code in municipality_codes if code in population_by_code
    ]
    population_total = (
        sum(record.value for record in population_records)
        if population_records
        else None
    )
    population_year = population_records[0].year if population_records else None
    latest_imported_at = (
        max(
            (record.imported_at for record in population_records if record.imported_at),
            default=None,
        )
        if population_records
        else None
    )
    ssb_data_status = get_ssb_data_status(municipality_codes, population_records)

    return DailySnapshot(
        tenant_id=tenant_id,
        snapshot_date=snapshot_date,
        total_cases=len(cases),
        cases_by_status=dict(Counter(case.status for case in cases)),
        cases_by_category=dict(Counter(case.category for case in cases)),
        cases_by_department=dict(
            Counter(case.department_name or "Unassigned" for case in cases)
        ),
        ai_reviews_total=len(ai_reviews),
        ai_corrections_total=corrected,
        ai_correction_rate=correction_rate,
        municipality_population=population_total,
        municipality_population_year=population_year,
        cases_per_1000_inhabitants=calculate_cases_per_1000(
            len(cases), population_total
        ),
        average_time_to_triage_minutes=average_time_to_triage_minutes(
            cases, triage_by_case
        ),
        average_time_to_close_hours=average_time_to_close_hours(cases),
        median_time_to_triage_minutes=median_time_to_triage_minutes(
            cases, triage_by_case
        ),
        median_time_to_close_hours=median_time_to_close_hours(cases),
        cases_waiting_for_citizen=sum(
            1 for case in cases if case.status == "waiting_for_citizen"
        ),
        ai_triage_success_count=successes,
        ai_triage_failure_count=failures,
        ai_triage_failure_rate=failures / triage_total if triage_total else 0.0,
        ai_suggestions_accepted=accepted,
        ai_suggestion_acceptance_rate=acceptance_rate,
        estimated_manual_minutes_saved=(
            accepted * ACCEPTED_AI_SUGGESTION_MINUTES_SAVED
            + corrected * CORRECTED_AI_SUGGESTION_MINUTES_SAVED
        ),
        analytics_rebuilt_at=datetime.now().astimezone(),
        ssb_data_status=ssb_data_status,
        ssb_imported_at=latest_imported_at,
    )


def build_department_daily(
    tenant_id: str,
    snapshot_date: date,
    cases: list[CaseRecord],
    triage_by_case: dict[str, AiTriageRecord],
) -> list[DepartmentDaily]:
    grouped: dict[str, list[CaseRecord]] = defaultdict(list)

    for case in cases:
        grouped[case.department_name or "Unassigned"].append(case)

    return [
        DepartmentDaily(
            tenant_id=tenant_id,
            snapshot_date=snapshot_date,
            department_id=department_cases[0].department_id,
            department_name=department_name,
            case_count=len(department_cases),
            average_time_to_triage_minutes=average_time_to_triage_minutes(
                department_cases, triage_by_case
            ),
            average_time_to_close_hours=average_time_to_close_hours(
                department_cases
            ),
        )
        for department_name, department_cases in sorted(grouped.items())
    ]


def build_ai_quality_daily(
    tenant_id: str,
    snapshot_date: date,
    ai_reviews: list[AiReviewRecord],
    ai_triage: list[AiTriageRecord],
) -> AiQualityDaily:
    accepted, corrected, acceptance_rate, correction_rate = calculate_ai_rates(
        ai_reviews
    )
    successes = sum(1 for item in ai_triage if item.status in {"completed", "reviewed"})
    failures = sum(1 for item in ai_triage if item.status == "failed")
    triage_total = successes + failures

    return AiQualityDaily(
        tenant_id=tenant_id,
        snapshot_date=snapshot_date,
        ai_reviews_total=len(ai_reviews),
        ai_suggestions_accepted=accepted,
        ai_corrections_total=corrected,
        ai_acceptance_rate=acceptance_rate,
        ai_correction_rate=correction_rate,
        ai_triage_success_count=successes,
        ai_triage_failure_count=failures,
        ai_triage_failure_rate=failures / triage_total if triage_total else 0.0,
    )


def build_municipality_daily(
    tenant_id: str,
    snapshot_date: date,
    cases: list[CaseRecord],
    population_by_code: dict[str, PopulationRecord],
) -> list[MunicipalityDaily]:
    grouped: dict[str, list[CaseRecord]] = defaultdict(list)

    for case in cases:
        if case.municipality_code:
            grouped[case.municipality_code].append(case)

    rows: list[MunicipalityDaily] = []
    for municipality_code, municipality_cases in sorted(grouped.items()):
        population = population_by_code.get(municipality_code)
        rows.append(
            MunicipalityDaily(
                tenant_id=tenant_id,
                snapshot_date=snapshot_date,
                municipality_code=municipality_code,
                municipality_name=(
                    population.municipality_name
                    if population
                    else municipality_cases[0].municipality_name
                ),
                case_count=len(municipality_cases),
                population=population.value if population else None,
                population_year=population.year if population else None,
                cases_per_1000_inhabitants=calculate_cases_per_1000(
                    len(municipality_cases), population.value if population else None
                ),
                ssb_imported_at=population.imported_at if population else None,
            )
        )

    return rows


def earliest_triage_by_case(
    ai_triage: list[AiTriageRecord],
) -> dict[str, AiTriageRecord]:
    result: dict[str, AiTriageRecord] = {}

    for item in sorted(ai_triage, key=lambda record: record.created_at):
        if item.status in {"completed", "reviewed"} and item.case_id not in result:
            result[item.case_id] = item

    return result


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def get_ssb_data_status(
    municipality_codes: set[str | None],
    population_records: list[PopulationRecord],
) -> str:
    if not municipality_codes:
        return "missing"

    if not population_records:
        return "missing"

    return "available" if len(population_records) == len(municipality_codes) else "partial"
