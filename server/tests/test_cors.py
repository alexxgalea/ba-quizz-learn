"""CORS: în AWS îl face adresa funcției (template.yaml), nu aplicația.

Aplicația nu pune antete CORS (Lambda le-ar dubla și ar da „multiple values”),
în afară de rularea locală cu `LOCAL_CORS_ORIGIN`. Originea PWA-ului din
șablon e verificată în `test_template.py`.
"""
from fastapi.testclient import TestClient

from ba_server.config import Settings
from ba_server.main import create_app
from ba_server.store import MemoryStore
from conftest import AUTH, PWA_ORIGIN, SECRET


def local_client(origin):
    return TestClient(create_app(Settings(app_secret=SECRET, local_cors_origin=origin), MemoryStore()))


def test_app_adds_no_cors_headers_by_default(client):
    r = client.get("/events", headers={**AUTH, "Origin": PWA_ORIGIN})
    assert r.status_code == 200
    assert not [h for h in r.headers if h.lower().startswith("access-control-")]


def test_local_dev_allows_only_the_configured_origin():
    c = local_client("http://localhost:8000")
    ok = c.get("/events", headers={**AUTH, "Origin": "http://localhost:8000"})
    assert ok.headers["access-control-allow-origin"] == "http://localhost:8000"
    other = c.get("/events", headers={**AUTH, "Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in other.headers


def test_local_dev_preflight():
    c = local_client("http://localhost:8000")
    pre = c.options(
        "/events",
        headers={
            "Origin": "http://localhost:8000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert pre.status_code == 200
    assert pre.headers["access-control-allow-origin"] == "http://localhost:8000"
    bad = c.options(
        "/events",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in bad.headers
