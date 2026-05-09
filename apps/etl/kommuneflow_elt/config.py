from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class EltConfig:
    database_url: str
    log_level: str = "INFO"
    accepted_ai_minutes_saved: int = 5
    corrected_ai_minutes_saved: int = 2


def load_config() -> EltConfig:
    database_url = os.environ.get("KOMMUNEFLOW_DATABASE_URL") or os.environ.get(
        "DATABASE_URL"
    )

    if not database_url:
        raise RuntimeError(
            "Set KOMMUNEFLOW_DATABASE_URL or DATABASE_URL before running ELT."
        )

    return EltConfig(
        database_url=database_url,
        log_level=os.environ.get("KOMMUNEFLOW_ELT_LOG_LEVEL", "INFO"),
        accepted_ai_minutes_saved=int(
            os.environ.get("KOMMUNEFLOW_ACCEPTED_AI_MINUTES_SAVED", "5")
        ),
        corrected_ai_minutes_saved=int(
            os.environ.get("KOMMUNEFLOW_CORRECTED_AI_MINUTES_SAVED", "2")
        ),
    )
