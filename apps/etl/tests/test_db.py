from __future__ import annotations

import pytest

from kommuneflow_elt.config import EltConfig
from kommuneflow_elt.db import connect


class FakeConnection:
    def __init__(self) -> None:
        self.committed = False
        self.rolled_back = False
        self.closed = False

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True

    def close(self) -> None:
        self.closed = True


def test_connect_commits_and_closes_on_success(monkeypatch):
    fake_connection = FakeConnection()
    connect_mock = lambda *args, **kwargs: fake_connection
    monkeypatch.setattr("kommuneflow_elt.db.psycopg.connect", connect_mock)

    with connect(EltConfig(database_url="postgresql://example")) as connection:
        assert connection is fake_connection

    assert fake_connection.committed is True
    assert fake_connection.rolled_back is False
    assert fake_connection.closed is True


def test_connect_rolls_back_and_closes_on_failure(monkeypatch):
    fake_connection = FakeConnection()
    monkeypatch.setattr(
        "kommuneflow_elt.db.psycopg.connect",
        lambda *args, **kwargs: fake_connection,
    )

    with pytest.raises(RuntimeError, match="boom"):
        with connect(EltConfig(database_url="postgresql://example")):
            raise RuntimeError("boom")

    assert fake_connection.committed is False
    assert fake_connection.rolled_back is True
    assert fake_connection.closed is True
