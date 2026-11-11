"""Ruterele noi (tichetele 06 și 08) se adaugă ca module, fără să atingă evenimentele."""
import sys
import types

from fastapi import APIRouter
from fastapi.testclient import TestClient

from ba_server import routers
from ba_server.config import Settings
from ba_server.main import create_app
from ba_server.store import MemoryStore
from conftest import AUTH, SECRET


def _add_router(monkeypatch, name, router, public=False):
    mod = types.ModuleType(f"ba_server.routers.{name}")
    mod.router = router
    if public:
        mod.PUBLIC = True
    monkeypatch.setitem(sys.modules, mod.__name__, mod)
    monkeypatch.setattr(
        "pkgutil.iter_modules",
        lambda path: [types.SimpleNamespace(name=n) for n in ("events", "health", name)],
    )


def test_a_new_router_module_is_included_and_guarded(monkeypatch):
    r = APIRouter()
    r.post("/ai")(lambda: {"text": "ok"})
    _add_router(monkeypatch, "ai", r)
    c = TestClient(create_app(Settings(app_secret=SECRET), MemoryStore()))
    assert c.post("/ai").status_code == 401
    assert c.post("/ai", headers=AUTH).json() == {"text": "ok"}
    assert c.get("/events", headers=AUTH).status_code == 200  # evenimentele rămân


def test_only_modules_marked_public_skip_the_secret(monkeypatch):
    r = APIRouter()
    r.get("/ping")(lambda: {"pong": True})
    _add_router(monkeypatch, "ping", r, public=True)
    c = TestClient(create_app(Settings(app_secret=SECRET), MemoryStore()))
    assert c.get("/ping").json() == {"pong": True}


def test_real_router_modules_present():
    import pkgutil

    names = {m.name for m in pkgutil.iter_modules(routers.__path__)}
    assert {"events", "health"} <= names
