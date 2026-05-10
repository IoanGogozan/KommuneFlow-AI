from __future__ import annotations

import re
from collections import Counter

from .models import AnalyticsDataset

MUNICIPALITY_CODE_PATTERN = re.compile(r"^\d{4}$")


class DataQualityError(ValueError):
    pass


def run_quality_checks(dataset: AnalyticsDataset) -> None:
    errors: list[str] = []
    errors.extend(check_snapshots(dataset))
    errors.extend(check_department_rows(dataset))
    errors.extend(check_ai_quality_rows(dataset))
    errors.extend(check_municipality_rows(dataset))

    if errors:
        raise DataQualityError("; ".join(errors))


def check_snapshots(dataset: AnalyticsDataset) -> list[str]:
    errors: list[str] = []
    keys = Counter((row.tenant_id, row.snapshot_date) for row in dataset.snapshots)

    for row in dataset.snapshots:
        if not row.tenant_id:
            errors.append("analytics snapshot missing tenant_id")
        if row.total_cases < 0:
            errors.append("analytics snapshot has negative case count")
        if (
            row.average_time_to_triage_minutes is not None
            and row.average_time_to_triage_minutes < 0
        ):
            errors.append("analytics snapshot has negative triage duration")
        if (
            row.average_time_to_close_hours is not None
            and row.average_time_to_close_hours < 0
        ):
            errors.append("analytics snapshot has negative close duration")
        if not 0 <= row.ai_correction_rate <= 1:
            errors.append("analytics snapshot has invalid AI correction rate")
        if not 0 <= row.ai_suggestion_acceptance_rate <= 1:
            errors.append("analytics snapshot has invalid AI acceptance rate")
        if not 0 <= row.ai_triage_failure_rate <= 1:
            errors.append("analytics snapshot has invalid AI triage failure rate")
        if row.cases_waiting_for_citizen < 0:
            errors.append("analytics snapshot has negative waiting count")
        if row.ai_triage_success_count < 0 or row.ai_triage_failure_count < 0:
            errors.append("analytics snapshot has negative AI triage count")
        if row.ai_suggestions_accepted < 0:
            errors.append("analytics snapshot has negative AI acceptance count")
        if row.estimated_manual_minutes_saved < 0:
            errors.append("analytics snapshot has negative estimated time saved")
        if row.cases_per_1000_inhabitants is not None and (
            row.municipality_population is None or row.municipality_population <= 0
        ):
            errors.append("analytics snapshot has normalized metric without population")

    for key, count in keys.items():
        if count > 1:
            errors.append(f"duplicate analytics snapshot for {key[0]} on {key[1]}")

    return errors


def check_department_rows(dataset: AnalyticsDataset) -> list[str]:
    errors: list[str] = []

    for row in dataset.departments:
        if not row.tenant_id:
            errors.append("department analytics row missing tenant_id")
        if row.case_count < 0:
            errors.append("department analytics row has negative case count")
        if (
            row.average_time_to_triage_minutes is not None
            and row.average_time_to_triage_minutes < 0
        ):
            errors.append("department analytics row has negative triage duration")
        if (
            row.average_time_to_close_hours is not None
            and row.average_time_to_close_hours < 0
        ):
            errors.append("department analytics row has negative close duration")

    return errors


def check_ai_quality_rows(dataset: AnalyticsDataset) -> list[str]:
    errors: list[str] = []

    for row in dataset.ai_quality:
        if not row.tenant_id:
            errors.append("AI quality row missing tenant_id")
        if row.ai_reviews_total < 0 or row.ai_corrections_total < 0:
            errors.append("AI quality row has negative counts")
        if not 0 <= row.ai_acceptance_rate <= 1:
            errors.append("AI acceptance rate outside 0..1")
        if not 0 <= row.ai_correction_rate <= 1:
            errors.append("AI correction rate outside 0..1")
        if not 0 <= row.ai_triage_failure_rate <= 1:
            errors.append("AI triage failure rate outside 0..1")

    return errors


def check_municipality_rows(dataset: AnalyticsDataset) -> list[str]:
    errors: list[str] = []

    for row in dataset.municipalities:
        if not row.tenant_id:
            errors.append("municipality analytics row missing tenant_id")
        if row.case_count < 0:
            errors.append("municipality analytics row has negative case count")
        if not MUNICIPALITY_CODE_PATTERN.match(row.municipality_code):
            errors.append("municipalityCode must be four digits")
        if row.cases_per_1000_inhabitants is not None and (
            row.population is None or row.population <= 0
        ):
            errors.append("municipality normalized metric without population")

    return errors
