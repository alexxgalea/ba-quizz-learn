"""Fără secret sau cu secret greșit: același 401, fără detalii și fără scriere."""
import pytest
from fastapi.testclient import TestClient

from ba_server.config import Settings
from ba_server.main import create_app
from ba_server.store import MemoryStore
from conftest import SECRET, ev

BAD_HEADERS = [
    pytest.param({}, id="fara-antet"),
    pytest.param({"Authorization": ""}, id="antet-gol"),
    pytest.param({"Authorization": "Bearer"}, id="fara-valoare"),
    pytest.param({"Authorization": "Bearer wrong"}, id="secret-gresit"),
    pytest.param({"Authorization": "Bearer " + SECRET + "x"}, id="prea-lung"),
    pytest.param({"Authorization": "Bearer " + SECRET[:-1]}, id="prea-scurt"),
    pytest.param({"Authorization": SECRET}, id="fara-schema"),
    pytest.param({"Authorization": "Basic " + SECRET}, id="alta-schema"),
    pytest.param({"Authorization": "Bearer ăâ".encode("utf-8")}, id="non-ascii"),
    pytest.param({"X-Api-Key": SECRET}, id="alt-antet"),
]


@pytest.mark.parametrize("headers", BAD_HEADERS)
def test_refused_with_generic_401(client, store, headers):
    r_post = client.post("/events", json={"events": [ev(1)]}, headers=headers)
    r_get = client.get("/events", headers=headers)
    for r in (r_post, r_get):
        assert r.status_code == 401
        assert r.json() == {"detail": "unauthorized"}
        assert SECRET not in r.text
    assert store.read(0, 10).events == []  # nimic scris


def test_responses_are_identical_for_missing_and_wrong_secret(client):
    a = client.get("/events")
    b = client.get("/events", headers={"Authorization": "Bearer nope"})
    assert (a.status_code, a.content) == (b.status_code, b.content)
    assert dict(a.headers) == dict(b.headers)


def test_broken_body_without_secret_gives_401_not_validation_details(client):
    r = client.post("/events", content=b"{not json", headers={"content-type": "application/json"})
    assert r.status_code == 401 and r.json() == {"detail": "unauthorized"}
    r = client.post("/events", json={"events": "nope"})
    assert r.status_code == 401 and r.json() == {"detail": "unauthorized"}
    r = client.get("/events?limit=abc")
    assert r.status_code == 401 and r.json() == {"detail": "unauthorized"}


def test_unconfigured_secret_refuses_everything():
    c = TestClient(create_app(Settings(app_secret=""), MemoryStore()))
    for headers in ({}, {"Authorization": "Bearer "}, {"Authorization": "Bearer x"}):
        assert c.get("/events", headers=headers).status_code == 401
    assert c.get("/health").status_code == 200


def test_secret_comes_from_the_environment():
    s = Settings.from_env({"APP_SECRET": "abc", "TABLE_NAME": "t", "USER_PK": "u#x"})
    assert (s.app_secret, s.table_name, s.user_pk, s.local_cors_origin) == ("abc", "t", "u#x", "")
    assert Settings.from_env({}).app_secret == ""
