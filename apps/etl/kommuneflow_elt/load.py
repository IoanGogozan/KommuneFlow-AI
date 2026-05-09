from __future__ import annotations

import json
from dataclasses import replace
from typing import Any
from uuid import uuid4

from .models import (
    AiQualityDaily,
    AnalyticsDataset,
    DailySnapshot,
    DepartmentDaily,
    MunicipalityDaily,
)
from .quality import run_quality_checks


class InMemoryAnalyticsStore:
    def __init__(self) -> None:
        self.snapshots: dict[tuple[str, object], DailySnapshot] = {}
        self.departments: dict[tuple[str, object, str], DepartmentDaily] = {}
        self.ai_quality: dict[tuple[str, object], AiQualityDaily] = {}
        self.municipalities: dict[tuple[str, object, str], MunicipalityDaily] = {}

    def load_dataset(self, dataset: AnalyticsDataset) -> None:
        run_quality_checks(dataset)

        for row in dataset.snapshots:
            self.snapshots[(row.tenant_id, row.snapshot_date)] = replace(row)
        for row in dataset.departments:
            self.departments[
                (row.tenant_id, row.snapshot_date, row.department_name)
            ] = replace(row)
        for row in dataset.ai_quality:
            self.ai_quality[(row.tenant_id, row.snapshot_date)] = replace(row)
        for row in dataset.municipalities:
            self.municipalities[
                (row.tenant_id, row.snapshot_date, row.municipality_code)
            ] = replace(row)


def load_dataset(connection: Any, dataset: AnalyticsDataset) -> None:
    run_quality_checks(dataset)
    load_snapshots(connection, dataset.snapshots)
    load_department_daily(connection, dataset.departments)
    load_ai_quality_daily(connection, dataset.ai_quality)
    load_municipality_daily(connection, dataset.municipalities)


def load_snapshots(connection: Any, rows: list[DailySnapshot]) -> None:
    for row in rows:
        connection.execute(
            """
            INSERT INTO analytics_daily_snapshots (
              id,
              "tenantId",
              date,
              "totalCases",
              "casesByStatusJson",
              "casesByCategoryJson",
              "casesByDepartmentJson",
              "aiReviewsTotal",
              "aiCorrectionsTotal",
              "aiCorrectionRate",
              "municipalityPopulation",
              "municipalityPopulationYear",
              "casesPer1000Inhabitants",
              "ssbDataStatus",
              "ssbImportedAt",
              "updatedAt"
            )
            VALUES (
              %(id)s,
              %(tenant_id)s,
              %(snapshot_date)s,
              %(total_cases)s,
              %(cases_by_status)s::jsonb,
              %(cases_by_category)s::jsonb,
              %(cases_by_department)s::jsonb,
              %(ai_reviews_total)s,
              %(ai_corrections_total)s,
              %(ai_correction_rate)s,
              %(municipality_population)s,
              %(municipality_population_year)s,
              %(cases_per_1000_inhabitants)s,
              %(ssb_data_status)s,
              %(ssb_imported_at)s,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT ("tenantId", date)
            DO UPDATE SET
              "totalCases" = EXCLUDED."totalCases",
              "casesByStatusJson" = EXCLUDED."casesByStatusJson",
              "casesByCategoryJson" = EXCLUDED."casesByCategoryJson",
              "casesByDepartmentJson" = EXCLUDED."casesByDepartmentJson",
              "aiReviewsTotal" = EXCLUDED."aiReviewsTotal",
              "aiCorrectionsTotal" = EXCLUDED."aiCorrectionsTotal",
              "aiCorrectionRate" = EXCLUDED."aiCorrectionRate",
              "municipalityPopulation" = EXCLUDED."municipalityPopulation",
              "municipalityPopulationYear" = EXCLUDED."municipalityPopulationYear",
              "casesPer1000Inhabitants" = EXCLUDED."casesPer1000Inhabitants",
              "ssbDataStatus" = EXCLUDED."ssbDataStatus",
              "ssbImportedAt" = EXCLUDED."ssbImportedAt",
              "updatedAt" = CURRENT_TIMESTAMP
            """,
            {
                "tenant_id": row.tenant_id,
                "id": new_id(),
                "snapshot_date": row.snapshot_date,
                "total_cases": row.total_cases,
                "cases_by_status": json.dumps(row.cases_by_status),
                "cases_by_category": json.dumps(row.cases_by_category),
                "cases_by_department": json.dumps(row.cases_by_department),
                "ai_reviews_total": row.ai_reviews_total,
                "ai_corrections_total": row.ai_corrections_total,
                "ai_correction_rate": row.ai_correction_rate,
                "municipality_population": row.municipality_population,
                "municipality_population_year": row.municipality_population_year,
                "cases_per_1000_inhabitants": row.cases_per_1000_inhabitants,
                "ssb_data_status": (
                    "available" if row.municipality_population else "missing"
                ),
                "ssb_imported_at": None,
            },
        )


def load_department_daily(connection: Any, rows: list[DepartmentDaily]) -> None:
    for row in rows:
        connection.execute(
            """
            INSERT INTO analytics_department_daily (
              id,
              "tenantId",
              date,
              "departmentId",
              "departmentName",
              "caseCount",
              "averageTimeToTriageMinutes",
              "averageTimeToCloseHours",
              "updatedAt"
            )
            VALUES (
              %(id)s,
              %(tenant_id)s,
              %(snapshot_date)s,
              %(department_id)s,
              %(department_name)s,
              %(case_count)s,
              %(average_time_to_triage_minutes)s,
              %(average_time_to_close_hours)s,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT ("tenantId", date, "departmentName")
            DO UPDATE SET
              "departmentId" = EXCLUDED."departmentId",
              "caseCount" = EXCLUDED."caseCount",
              "averageTimeToTriageMinutes" = EXCLUDED."averageTimeToTriageMinutes",
              "averageTimeToCloseHours" = EXCLUDED."averageTimeToCloseHours",
              "updatedAt" = CURRENT_TIMESTAMP
            """,
            {
                "tenant_id": row.tenant_id,
                "id": new_id(),
                "snapshot_date": row.snapshot_date,
                "department_id": row.department_id,
                "department_name": row.department_name,
                "case_count": row.case_count,
                "average_time_to_triage_minutes": (
                    row.average_time_to_triage_minutes
                ),
                "average_time_to_close_hours": row.average_time_to_close_hours,
            },
        )


def load_ai_quality_daily(connection: Any, rows: list[AiQualityDaily]) -> None:
    for row in rows:
        connection.execute(
            """
            INSERT INTO analytics_ai_quality_daily (
              id,
              "tenantId",
              date,
              "aiReviewsTotal",
              "aiSuggestionsAccepted",
              "aiCorrectionsTotal",
              "aiAcceptanceRate",
              "aiCorrectionRate",
              "aiTriageSuccessCount",
              "aiTriageFailureCount",
              "aiTriageFailureRate",
              "updatedAt"
            )
            VALUES (
              %(id)s,
              %(tenant_id)s,
              %(snapshot_date)s,
              %(ai_reviews_total)s,
              %(ai_suggestions_accepted)s,
              %(ai_corrections_total)s,
              %(ai_acceptance_rate)s,
              %(ai_correction_rate)s,
              %(ai_triage_success_count)s,
              %(ai_triage_failure_count)s,
              %(ai_triage_failure_rate)s,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT ("tenantId", date)
            DO UPDATE SET
              "aiReviewsTotal" = EXCLUDED."aiReviewsTotal",
              "aiSuggestionsAccepted" = EXCLUDED."aiSuggestionsAccepted",
              "aiCorrectionsTotal" = EXCLUDED."aiCorrectionsTotal",
              "aiAcceptanceRate" = EXCLUDED."aiAcceptanceRate",
              "aiCorrectionRate" = EXCLUDED."aiCorrectionRate",
              "aiTriageSuccessCount" = EXCLUDED."aiTriageSuccessCount",
              "aiTriageFailureCount" = EXCLUDED."aiTriageFailureCount",
              "aiTriageFailureRate" = EXCLUDED."aiTriageFailureRate",
              "updatedAt" = CURRENT_TIMESTAMP
            """,
            {
                "tenant_id": row.tenant_id,
                "id": new_id(),
                "snapshot_date": row.snapshot_date,
                "ai_reviews_total": row.ai_reviews_total,
                "ai_suggestions_accepted": row.ai_suggestions_accepted,
                "ai_corrections_total": row.ai_corrections_total,
                "ai_acceptance_rate": row.ai_acceptance_rate,
                "ai_correction_rate": row.ai_correction_rate,
                "ai_triage_success_count": row.ai_triage_success_count,
                "ai_triage_failure_count": row.ai_triage_failure_count,
                "ai_triage_failure_rate": row.ai_triage_failure_rate,
            },
        )


def load_municipality_daily(
    connection: Any, rows: list[MunicipalityDaily]
) -> None:
    for row in rows:
        connection.execute(
            """
            INSERT INTO analytics_municipality_daily (
              id,
              "tenantId",
              date,
              "municipalityCode",
              "municipalityName",
              "caseCount",
              population,
              "populationYear",
              "casesPer1000Inhabitants",
              "ssbImportedAt",
              "updatedAt"
            )
            VALUES (
              %(id)s,
              %(tenant_id)s,
              %(snapshot_date)s,
              %(municipality_code)s,
              %(municipality_name)s,
              %(case_count)s,
              %(population)s,
              %(population_year)s,
              %(cases_per_1000_inhabitants)s,
              %(ssb_imported_at)s,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT ("tenantId", date, "municipalityCode")
            DO UPDATE SET
              "municipalityName" = EXCLUDED."municipalityName",
              "caseCount" = EXCLUDED."caseCount",
              population = EXCLUDED.population,
              "populationYear" = EXCLUDED."populationYear",
              "casesPer1000Inhabitants" = EXCLUDED."casesPer1000Inhabitants",
              "ssbImportedAt" = EXCLUDED."ssbImportedAt",
              "updatedAt" = CURRENT_TIMESTAMP
            """,
            {
                "tenant_id": row.tenant_id,
                "id": new_id(),
                "snapshot_date": row.snapshot_date,
                "municipality_code": row.municipality_code,
                "municipality_name": row.municipality_name,
                "case_count": row.case_count,
                "population": row.population,
                "population_year": row.population_year,
                "cases_per_1000_inhabitants": row.cases_per_1000_inhabitants,
                "ssb_imported_at": row.ssb_imported_at,
            },
        )


def new_id() -> str:
    return f"elt_{uuid4().hex}"
