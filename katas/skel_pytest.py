# Referințele de schelet pentru modulul pytest.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație (build.mjs).
# Referința e chiar un modul de teste; secțiunile cu mai multe fișiere
# au separatori „# --- nume.py ---”. Testele lor sunt în
# test_skel_pytest.py, care le rulează cu pytest într-un director nou.

# === s-pytest-fixture ===
# --- conftest.py ---
import sqlite3

import pytest


@pytest.fixture(scope="module")
def conn():
    c = sqlite3.connect(":memory:")
    c.execute("create table t (x int)")
    yield c
    c.close()  # teardown, și la eșec


@pytest.fixture
def db(conn):
    yield conn
    conn.rollback()  # izolare între teste


# --- test_db.py ---
def test_insert(db):
    db.execute("insert into t values (1)")
    q = "select count(*) from t"
    n = db.execute(q).fetchone()
    assert n == (1,)
# === end ===

# === s-pytest-parametrize ===
import re

from pytest import mark, param


def slugify(text):
    text = text.strip().lower()
    text = re.sub(r"\W+", "-", text)
    return text.strip("-")


@mark.parametrize(
    "text, expected",
    [
        param("A B", "a-b", id="spatiu"),
        param("a  b", "a-b", id="multi"),
        param("", "", id="gol"),
    ],
)
def test_slugify(text, expected):
    assert slugify(text) == expected
# === end ===

# === s-pytest-raises ===
import pytest


def parse_port(text):
    if not text.isdigit():
        raise ValueError("nu e număr")
    port = int(text)
    if not 1 <= port <= 65535:
        raise ValueError(f"port {port}")
    return port


def test_not_a_number():
    with pytest.raises(
        ValueError, match="număr"
    ):
        parse_port("abc")


def test_out_of_range():
    with pytest.raises(ValueError) as ei:
        parse_port("70000")
    # după with, nu înăuntru
    assert "70000" in str(ei.value)
# === end ===

# === s-pytest-monkeypatch ===
import os


class Cfg:
    tries = 3


def api_url():
    host = os.getenv("API_HOST", "local")
    return f"https://{host}"


def attempts():
    return Cfg.tries + 1


def test_env_set(monkeypatch):
    monkeypatch.setenv("API_HOST", "prod")
    assert api_url() == "https://prod"


def test_env_missing(monkeypatch):
    monkeypatch.delenv(
        "API_HOST", raising=False
    )
    assert api_url() == "https://local"


def test_attribute(monkeypatch):
    monkeypatch.setattr(Cfg, "tries", 0)
    assert attempts() == 1
# === end ===

# === s-pytest-patch ===
# --- svc.py ---
from client import get_user


def greeting(uid):
    user = get_user(uid)
    return "Salut, " + user["name"]


# --- test_svc.py ---
from unittest.mock import patch

import pytest
import svc


@patch("svc.get_user", autospec=True)
def test_greeting(mock):
    mock.return_value = {"name": "Ana"}
    assert svc.greeting(7) == "Salut, Ana"
    mock.assert_called_once_with(7)


@patch("svc.get_user", autospec=True)
def test_network_error(mock):
    mock.side_effect = TimeoutError
    with pytest.raises(TimeoutError):
        svc.greeting(7)
# === end ===

# === s-pytest-tmp-caplog ===
import logging
from pathlib import Path

log = logging.getLogger(__name__)


def read_config(path):
    cfg = {}
    text = Path(path).read_text()
    for line in text.splitlines():
        key, eq, val = line.partition("=")
        if not eq:
            log.warning("sărit: %r", line)
            continue
        cfg[key.strip()] = val.strip()
    log.info("citit %d chei", len(cfg))
    return cfg


def test_read_config(tmp_path, caplog):
    f = tmp_path / "app.cfg"
    f.write_text("a = 1\nbroken\nb=2\n")
    with caplog.at_level(logging.INFO):
        cfg = read_config(f)
    assert cfg == {"a": "1", "b": "2"}
    assert caplog.messages == [
        "sărit: 'broken'",
        "citit 2 chei",
    ]
# === end ===
