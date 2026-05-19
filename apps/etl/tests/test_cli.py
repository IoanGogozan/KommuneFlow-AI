from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from kommuneflow_elt import cli
from kommuneflow_elt.models import CaseRecord


@dataclass(frozen=True)
class FakeConfig:
    database_url: str = "postgresql://example"
    log_level: str = "INFO"


class FakeConnection:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False


def test_main_export_cases_prints_safe_json(monkeypatch, capsys):
    monkeypatch.setattr(
        "sys.argv",
        [
            "kommuneflow-elt",
            "export-cases",
            "--from-date",
            "2026-05-01",
            "--to-date",
            "2026-05-31",
        ],
    )
    monkeypatch.setattr(cli, "load_config", lambda: FakeConfig())
    monkeypatch.setattr(cli, "configure_logging", lambda _level: None)
    monkeypatch.setattr(cli, "connect", lambda _config: FakeConnection())
    monkeypatch.setattr(
        cli,
        "extract_cases",
        lambda _connection, _from_date, _to_date: [
            CaseRecord(
                id="case_1",
                tenant_id="tenant_1",
                created_at=date(2026, 5, 9),
                updated_at=date(2026, 5, 9),
                closed_at=None,
                status="new",
                category="road_transport",
                department_id=None,
                department_name=None,
                municipality_code=None,
                municipality_name=None,
            )
        ],
    )

    cli.main()

    assert '"id": "case_1"' in capsys.readouterr().out


def test_rebuild_analytics_runs_extract_transform_quality_and_load(monkeypatch):
    calls: list[str] = []
    monkeypatch.setattr(cli, "connect", lambda _config: FakeConnection())
    monkeypatch.setattr(cli, "extract_cases", lambda *_: calls.append("cases") or [])
    monkeypatch.setattr(cli, "extract_ai_triage", lambda *_: calls.append("triage") or [])
    monkeypatch.setattr(cli, "extract_ai_reviews", lambda *_: calls.append("reviews") or [])
    monkeypatch.setattr(cli, "extract_population", lambda *_: calls.append("population") or [])
    monkeypatch.setattr(
        cli,
        "rebuild_daily_analytics",
        lambda *_: calls.append("transform") or ["snapshot"],
    )
    monkeypatch.setattr(cli, "run_quality_checks", lambda _dataset: calls.append("quality"))
    monkeypatch.setattr(cli, "load_dataset", lambda *_: calls.append("load"))

    cli.run_rebuild_analytics(date(2026, 5, 9), FakeConfig())

    assert calls == [
        "cases",
        "triage",
        "reviews",
        "population",
        "transform",
        "quality",
        "load",
    ]
