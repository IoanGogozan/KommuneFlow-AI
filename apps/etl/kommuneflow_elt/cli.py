from __future__ import annotations

import argparse
import json
import logging
from dataclasses import asdict
from datetime import date

from .config import load_config
from .db import connect
from .extract import (
    extract_ai_reviews,
    extract_ai_triage,
    extract_cases,
    extract_population,
)
from .load import load_dataset
from .logging import configure_logging
from .quality import run_quality_checks
from .ssb_import import import_ssb_population
from .transform import parse_date, rebuild_daily_analytics

logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(prog="kommuneflow-elt")
    subparsers = parser.add_subparsers(dest="command", required=True)

    export_cases = subparsers.add_parser("export-cases")
    export_cases.add_argument("--from-date", required=True)
    export_cases.add_argument("--to-date", required=True)

    rebuild = subparsers.add_parser("rebuild-analytics")
    rebuild.add_argument("--date", required=True)

    import_ssb = subparsers.add_parser("import-ssb")
    import_ssb.add_argument("--year", required=True, type=int)
    import_ssb.add_argument(
        "--municipality-code",
        action="append",
        dest="municipality_codes",
        help="Four-digit municipality code. Can be supplied multiple times.",
    )

    subparsers.add_parser("quality-checks")

    args = parser.parse_args()
    config = load_config()
    configure_logging(config.log_level)

    if args.command == "export-cases":
        run_export_cases(parse_date(args.from_date), parse_date(args.to_date), config)
    elif args.command == "rebuild-analytics":
        run_rebuild_analytics(parse_date(args.date), config)
    elif args.command == "import-ssb":
        run_import_ssb(args.year, args.municipality_codes, config)
    elif args.command == "quality-checks":
        run_quality_checks_command(config)


def run_export_cases(from_date: date, to_date: date, config: object) -> None:
    with connect(config) as connection:
        cases = extract_cases(connection, from_date, to_date)
    print(json.dumps([asdict(case) for case in cases], default=str))


def run_rebuild_analytics(snapshot_date: date, config: object) -> None:
    with connect(config) as connection:
        cases = extract_cases(connection, snapshot_date, snapshot_date)
        ai_triage = extract_ai_triage(connection, snapshot_date, snapshot_date)
        ai_reviews = extract_ai_reviews(connection, snapshot_date, snapshot_date)
        population = extract_population(connection, snapshot_date.year)
        dataset = rebuild_daily_analytics(
            cases, ai_triage, ai_reviews, population, snapshot_date
        )
        run_quality_checks(dataset)
        load_dataset(connection, dataset)

    logger.info(
        "analytics_rebuilt",
        extra={"snapshot_date": snapshot_date.isoformat()},
    )


def run_import_ssb(
    year: int, municipality_codes: list[str] | None, config: object
) -> None:
    with connect(config) as connection:
        records_imported = import_ssb_population(
            connection, year, municipality_codes=municipality_codes
        )

    logger.info(
        "ssb_import_completed",
        extra={"year": year, "records_imported": records_imported},
    )


def run_quality_checks_command(config: object) -> None:
    today = date.today()
    with connect(config) as connection:
        cases = extract_cases(connection, today, today)
        ai_triage = extract_ai_triage(connection, today, today)
        ai_reviews = extract_ai_reviews(connection, today, today)
        population = extract_population(connection, today.year)
        dataset = rebuild_daily_analytics(cases, ai_triage, ai_reviews, population, today)
        run_quality_checks(dataset)

    logger.info("quality_checks_passed")


if __name__ == "__main__":
    main()
