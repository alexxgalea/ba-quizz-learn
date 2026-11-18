"""Conturile (ADR 0006): un secret pe persoană, fiecare cont cu partiția lui.

Contul principal vine din `APP_SECRET` + `USER_PK` (Alex, neschimbat); celelalte din
`ACCOUNTS` (JSON), citit de `deploy.sh` din `server/.accounts.json`.
"""
import json

import pytest
from fastapi.testclient import TestClient

from ba_server.accounts import AccountsError, parse_accounts
from ba_server.config import Settings
from ba_server.main import create_app
from conftest import AUTH, SECRET, ev

IOANA_SECRET = "ioana-secret-not-a-real-one-0123456789abcd"
IOANA = {"Authorization": f"Bearer {IOANA_SECRET}"}
ACCOUNTS = json.dumps([{"id": "ioana", "secret": IOANA_SECRET, "name": "Ioana", "address": "f", "profile": ""}])


@pytest.fixture
def settings():
    return Settings.from_env({"APP_SECRET": SECRET, "ACCOUNTS": ACCOUNTS})


def test_each_account_sees_only_its_own_journal(client):
    client.post("/events", json={"events": [ev(1), ev(2)]}, headers=AUTH)
    r = client.post("/events", json={"events": [ev(1), ev(7)]}, headers=IOANA)
    # același id în alt cont nu e duplicat: idempotența e pe cont
    assert r.json()["accepted"] == ["e1", "e7"] and r.json()["cursor"] == 2
    mine = client.get("/events", headers=AUTH).json()["events"]
    hers = client.get("/events", headers=IOANA).json()["events"]
    assert [e["id"] for e in mine] == ["e1", "e2"]
    assert [e["id"] for e in hers] == ["e1", "e7"]


def test_purge_wipes_only_the_callers_account(client):
    client.post("/events", json={"events": [ev(1)]}, headers=AUTH)
    client.post("/events", json={"events": [ev(2), ev(3)]}, headers=IOANA)
    r = client.post("/events/purge", json={"confirm": "purge-all-events"}, headers=IOANA)
    assert r.json()["deleted"] == 2
    assert [e["id"] for e in client.get("/events", headers=AUTH).json()["events"]] == ["e1"]
    assert client.get("/events", headers=AUTH).json()["epoch"] == "0"
    assert client.get("/events", headers=IOANA).json()["events"] == []


def test_me_tells_who_is_connected(client):
    me = client.get("/me", headers=AUTH).json()
    assert me["id"] == "alex" and me["name"] == "Alex" and me["address"] == "m"
    assert "Django" in me["profile"]
    assert client.get("/me", headers=IOANA).json() == {"id": "ioana", "name": "Ioana", "address": "f", "profile": ""}
    assert client.get("/me").status_code == 401
    assert SECRET not in client.get("/me", headers=AUTH).text


def test_ai_cap_is_per_account(settings, store):
    app = create_app(Settings.from_env({"APP_SECRET": SECRET, "ACCOUNTS": ACCOUNTS, "AI_DAILY_CAP": "1"}), store, today=lambda: "2026-11-18")
    s_alex, s_ioana = app.state.store_for(app.state.settings.accounts[0]), app.state.store_for(app.state.settings.accounts[1])
    assert s_alex.take_ai_slot("2026-11-18", 1) is True
    assert s_alex.take_ai_slot("2026-11-18", 1) is False
    assert s_ioana.take_ai_slot("2026-11-18", 1) is True  # ziua lui Alex nu o consumă pe a ei


def test_unknown_secret_is_refused(client):
    r = client.get("/events", headers={"Authorization": "Bearer " + IOANA_SECRET + "x"})
    assert r.status_code == 401 and r.json() == {"detail": "unauthorized"}


def test_bad_accounts_json_keeps_the_main_account_working():
    s = Settings.from_env({"APP_SECRET": SECRET, "ACCOUNTS": "{not json"})
    assert [a.id for a in s.accounts] == ["alex"]
    c = TestClient(create_app(s, __import__("ba_server.store", fromlist=["MemoryStore"]).MemoryStore()))
    assert c.get("/events", headers=AUTH).status_code == 200


def test_no_main_secret_still_serves_other_accounts():
    from ba_server.store import MemoryStore

    c = TestClient(create_app(Settings.from_env({"ACCOUNTS": ACCOUNTS}), MemoryStore()))
    assert c.get("/events", headers=IOANA).status_code == 200
    assert c.get("/events", headers={"Authorization": "Bearer "}).status_code == 401


@pytest.mark.parametrize("raw, why", [
    ('[{"id": "Ioana", "secret": "%s"}]' % IOANA_SECRET, "id"),
    ('[{"id": "ioana", "secret": "scurt"}]', "secret"),
    ('[{"id": "ioana", "secret": "%s", "address": "x"}]' % IOANA_SECRET, "address"),
    ('[{"id": "ioana", "secret": "%s"}, {"id": "ioana", "secret": "%s"}]' % (IOANA_SECRET, IOANA_SECRET + "2"), "id"),
    ('[{"id": "a", "secret": "%s"}, {"id": "b", "secret": "%s"}]' % (IOANA_SECRET, IOANA_SECRET), "secret"),
    ('[{"id": "ioana", "secret": "%s", "profile": "%s"}]' % (IOANA_SECRET, "x" * 801), "profile"),
    ('{"id": "ioana"}', "listă"),
])
def test_parse_rejects_bad_accounts(raw, why):
    with pytest.raises(AccountsError) as e:
        parse_accounts(raw)
    assert why in str(e.value)
    assert IOANA_SECRET not in str(e.value)  # mesajul de eroare nu scapă secretul


def test_parse_rejects_a_secret_reused_from_the_main_account():
    with pytest.raises(AccountsError):
        parse_accounts(json.dumps([{"id": "ioana", "secret": SECRET}]), reserved_ids={"alex"}, reserved_secrets={SECRET})
    with pytest.raises(AccountsError):
        parse_accounts(json.dumps([{"id": "alex", "secret": IOANA_SECRET}]), reserved_ids={"alex"})


def test_parse_defaults():
    (a,) = parse_accounts(json.dumps([{"id": "ioana", "secret": IOANA_SECRET}]))
    assert (a.id, a.name, a.address, a.profile, a.pk) == ("ioana", "ioana", "m", "", "u#ioana")
    assert IOANA_SECRET not in repr(a)
    assert parse_accounts("") == () and parse_accounts("[]") == ()


def test_accounts_also_come_as_base64_from_deploy():
    import base64

    s = Settings.from_env({"APP_SECRET": SECRET, "ACCOUNTS": base64.b64encode(ACCOUNTS.encode()).decode()})
    assert [a.id for a in s.accounts] == ["alex", "ioana"]
    with pytest.raises(AccountsError):
        parse_accounts("nu-e-base64!")
