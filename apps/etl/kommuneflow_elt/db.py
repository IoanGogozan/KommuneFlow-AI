from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from .config import EltConfig


@contextmanager
def connect(config: EltConfig) -> Iterator[psycopg.Connection]:
    connection = psycopg.connect(config.database_url, row_factory=dict_row)
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
