from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime


@dataclass(frozen=True)
class CaseRecord:
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None
    status: str
    category: str
    department_id: str | None
    department_name: str | None
    municipality_code: str | None = None
    municipality_name: str | None = None


@dataclass(frozen=True)
class AiTriageRecord:
    id: str
    tenant_id: str
    case_id: str
    created_at: datetime
    status: str


@dataclass(frozen=True)
class AiReviewRecord:
    id: str
    tenant_id: str
    case_id: str
    created_at: datetime
    was_ai_suggestion_accepted: bool


@dataclass(frozen=True)
class PopulationRecord:
    municipality_code: str
    municipality_name: str | None
    year: int
    value: int
    imported_at: datetime | None = None


@dataclass(frozen=True)
class DailySnapshot:
    tenant_id: str
    snapshot_date: date
    total_cases: int
    cases_by_status: dict[str, int]
    cases_by_category: dict[str, int]
    cases_by_department: dict[str, int]
    ai_reviews_total: int
    ai_corrections_total: int
    ai_correction_rate: float
    municipality_population: int | None
    municipality_population_year: int | None
    cases_per_1000_inhabitants: float | None
    average_time_to_triage_minutes: float | None
    average_time_to_close_hours: float | None
    median_time_to_triage_minutes: float | None = None
    median_time_to_close_hours: float | None = None
    cases_waiting_for_citizen: int = 0
    ai_triage_success_count: int = 0
    ai_triage_failure_count: int = 0
    ai_triage_failure_rate: float = 0.0
    ai_suggestions_accepted: int = 0
    ai_suggestion_acceptance_rate: float = 0.0
    estimated_manual_minutes_saved: int = 0
    analytics_rebuilt_at: datetime | None = None
    ssb_data_status: str = "missing"
    ssb_imported_at: datetime | None = None


@dataclass(frozen=True)
class DepartmentDaily:
    tenant_id: str
    snapshot_date: date
    department_id: str | None
    department_name: str
    case_count: int
    average_time_to_triage_minutes: float | None
    average_time_to_close_hours: float | None


@dataclass(frozen=True)
class AiQualityDaily:
    tenant_id: str
    snapshot_date: date
    ai_reviews_total: int
    ai_suggestions_accepted: int
    ai_corrections_total: int
    ai_acceptance_rate: float
    ai_correction_rate: float
    ai_triage_success_count: int
    ai_triage_failure_count: int
    ai_triage_failure_rate: float


@dataclass(frozen=True)
class MunicipalityDaily:
    tenant_id: str
    snapshot_date: date
    municipality_code: str
    municipality_name: str | None
    case_count: int
    population: int | None
    population_year: int | None
    cases_per_1000_inhabitants: float | None
    ssb_imported_at: datetime | None


@dataclass(frozen=True)
class AnalyticsDataset:
    snapshots: list[DailySnapshot] = field(default_factory=list)
    departments: list[DepartmentDaily] = field(default_factory=list)
    ai_quality: list[AiQualityDaily] = field(default_factory=list)
    municipalities: list[MunicipalityDaily] = field(default_factory=list)
