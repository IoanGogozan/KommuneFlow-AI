from __future__ import annotations

from datetime import date
from typing import Any

from .models import AiReviewRecord, AiTriageRecord, CaseRecord, PopulationRecord


def extract_cases(connection: Any, from_date: date, to_date: date) -> list[CaseRecord]:
    rows = connection.execute(
        """
        SELECT
          c.id,
          c."tenantId" AS tenant_id,
          c."createdAt" AS created_at,
          c."updatedAt" AS updated_at,
          c."closedAt" AS closed_at,
          c.status,
          c.category,
          c."assignedDepartmentId" AS department_id,
          d.name AS department_name,
          ca."municipalityCode" AS municipality_code,
          ca."municipalityName" AS municipality_name
        FROM cases c
        LEFT JOIN departments d ON d.id = c."assignedDepartmentId"
        LEFT JOIN LATERAL (
          SELECT "municipalityCode", "municipalityName"
          FROM case_addresses
          WHERE "caseId" = c.id AND "tenantId" = c."tenantId"
          ORDER BY "createdAt" DESC
          LIMIT 1
        ) ca ON TRUE
        WHERE c."createdAt" >= %(from_date)s
          AND c."createdAt" < (%(to_date)s::date + INTERVAL '1 day')
        """,
        {"from_date": from_date, "to_date": to_date},
    ).fetchall()
    return [CaseRecord(**row) for row in rows]


def extract_ai_triage(
    connection: Any, from_date: date, to_date: date
) -> list[AiTriageRecord]:
    rows = connection.execute(
        """
        SELECT
          id,
          "tenantId" AS tenant_id,
          "caseId" AS case_id,
          "createdAt" AS created_at,
          status
        FROM ai_triage_results
        WHERE "createdAt" >= %(from_date)s
          AND "createdAt" < (%(to_date)s::date + INTERVAL '1 day')
        """,
        {"from_date": from_date, "to_date": to_date},
    ).fetchall()
    return [AiTriageRecord(**row) for row in rows]


def extract_ai_reviews(
    connection: Any, from_date: date, to_date: date
) -> list[AiReviewRecord]:
    rows = connection.execute(
        """
        SELECT
          id,
          "tenantId" AS tenant_id,
          "caseId" AS case_id,
          "createdAt" AS created_at,
          "wasAiSuggestionAccepted" AS was_ai_suggestion_accepted
        FROM ai_reviews
        WHERE "createdAt" >= %(from_date)s
          AND "createdAt" < (%(to_date)s::date + INTERVAL '1 day')
        """,
        {"from_date": from_date, "to_date": to_date},
    ).fetchall()
    return [AiReviewRecord(**row) for row in rows]


def extract_population(connection: Any, year: int) -> list[PopulationRecord]:
    rows = connection.execute(
        """
        SELECT
          "municipalityCode" AS municipality_code,
          "municipalityName" AS municipality_name,
          year,
          value,
          "importedAt" AS imported_at
        FROM external_municipality_statistics
        WHERE "statisticKey" = 'population_total'
          AND source = 'ssb'
          AND year = %(year)s
        """,
        {"year": year},
    ).fetchall()
    return [PopulationRecord(**row) for row in rows]
