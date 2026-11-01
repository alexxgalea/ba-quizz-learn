# Testele referințelor de schelet pentru modulul asgi (FastAPI).
# Fiecare secțiune se încarcă într-un modul nou și se apelează prin TestClient;
# referințele care sunt ele însele teste (override, lifespan) rulează cu pytest
# într-un director nou. Verificăm proprietatea apărată de fiecare punct
# esențial și stricăm referința (mutație) ca să vedem că testul chiar pică.
import asyncio
import os
import pathlib
import re
import subprocess
import sys
import threading
import time
import warnings

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")

import httpx  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

SRC = (pathlib.Path(__file__).parent / "skel_asgi.py").read_text(encoding="utf8")
IDS = re.findall(r"^# === (s-[a-z0-9-]+) ===$", SRC, re.M)


def section(sid):
    m = re.search(r"^# === %s ===\n(.*?)^# === end ===" % re.escape(sid), SRC, re.S | re.M)
    assert m, sid
    return m.group(1)


def mutate(text, old, new):
    assert text.count(old) >= 1, "mutația nu se aplică: %r" % old
    return text.replace(old, new)


def load(sid, code=None, **inject):
    ns = {"__name__": "skel_ref_" + sid.replace("-", "_"), **inject}
    exec(compile(code if code is not None else section(sid), sid, "exec"), ns)
    return ns


def run_pytest(tmp_path, code, extra=""):
    (tmp_path / "test_ref.py").write_text(code + extra, encoding="utf8")
    env = {k: v for k, v in os.environ.items() if k != "PYTEST_ADDOPTS"}
    p = subprocess.run(
        [sys.executable, "-m", "pytest", "-p", "no:cacheprovider", "-q", "--rootdir", str(tmp_path)],
        cwd=tmp_path, env=env, capture_output=True, text=True, timeout=120,
    )
    return p.returncode, p.stdout + p.stderr


def test_all_five_asgi_references_exist():
    assert len(IDS) == 5


# --- endpoint cu model Pydantic, response_model, coduri, HTTPException ---

GOOD = {"email": "ana@x.ro", "password": "parola-lunga"}


def test_endpoint_create_returns_201_and_hides_the_password():
    c = TestClient(load("s-asgi-endpoint")["app"])
    r = c.post("/users", json=GOOD)
    assert r.status_code == 201
    assert r.json() == {"id": 1, "email": "ana@x.ro"}
    assert "password" not in c.get("/users/1").text


def test_endpoint_without_response_model_leaks_the_password():
    code = mutate(section("s-asgi-endpoint"), "    response_model=UserOut,\n", "")
    r = TestClient(load("s-asgi-endpoint", code)["app"]).post("/users", json=GOOD)
    assert r.json()["password"] == "parola-lunga"


def test_endpoint_status_code_default_is_200_without_the_argument():
    code = mutate(section("s-asgi-endpoint"), "    status_code=201,\n", "")
    r = TestClient(load("s-asgi-endpoint", code)["app"]).post("/users", json=GOOD)
    assert r.status_code == 200


@pytest.mark.parametrize("body", [
    {"email": "ana@x.ro", "password": "scurt"},
    {"password": "parola-lunga"},
    {"email": "ana@x.ro", "password": 12345678},
    {},
])
def test_endpoint_invalid_body_is_422(body):
    r = TestClient(load("s-asgi-endpoint")["app"]).post("/users", json=body)
    assert r.status_code == 422


def test_endpoint_missing_user_is_404_with_detail_and_bad_id_is_422():
    c = TestClient(load("s-asgi-endpoint")["app"])
    r = c.get("/users/99")
    assert r.status_code == 404 and r.json() == {"detail": "user inexistent"}
    assert c.get("/users/abc").status_code == 422


# --- Depends cu yield (sesiune) ---

def fake_session(fail_commit=False):
    log = []

    class Fake:
        def __init__(self):
            log.append("open")

        def add(self, x):
            log.append("add:" + x)

        def commit(self):
            log.append("commit")
            if fail_commit:
                raise RuntimeError("db down")

        def rollback(self):
            log.append("rollback")

        def close(self):
            log.append("close")

    return Fake, log


def load_session(fail_commit=False, code=None):
    cls, log = fake_session(fail_commit)
    return load("s-asgi-depends-yield", code, SessionLocal=cls), log


def test_depends_yield_opens_commits_and_closes_the_session():
    ns, log = load_session()
    r = TestClient(ns["app"]).post("/notes", params={"text": "hi"})
    assert r.status_code == 201
    assert log == ["open", "add:hi", "commit", "close"]


def test_depends_yield_rolls_back_closes_and_reraises_on_error():
    ns, log = load_session(fail_commit=True)
    with pytest.raises(RuntimeError, match="db down"):
        TestClient(ns["app"]).post("/notes", params={"text": "hi"})
    assert log == ["open", "add:hi", "commit", "rollback", "close"]


def test_depends_yield_without_reraise_swallows_the_error():
    code = mutate(section("s-asgi-depends-yield"), "        session.rollback()\n        raise\n", "        session.rollback()\n")
    ns, log = load_session(fail_commit=True, code=code)
    # fără raise, FastAPI nu mai știe de excepție: nu mai ajunge RuntimeError-ul real
    with pytest.raises(Exception) as ei:
        TestClient(ns["app"]).post("/notes", params={"text": "hi"})
    assert type(ei.value).__name__ == "FastAPIError"
    ns, log = load_session(fail_commit=True, code=code)
    r = TestClient(ns["app"], raise_server_exceptions=False).post("/notes", params={"text": "hi"})
    assert r.status_code == 500


def test_depends_yield_close_needs_finally():
    code = mutate(section("s-asgi-depends-yield"), "    finally:\n        session.close()\n", "")
    ns, log = load_session(fail_commit=True, code=code)
    with pytest.raises(RuntimeError):
        TestClient(ns["app"]).post("/notes", params={"text": "hi"})
    assert "close" not in log


def test_depends_yield_cleanup_runs_after_the_response_is_sent():
    # FastAPI >= 0.118: codul de după yield rulează după ce răspunsul a plecat,
    # deci commit-ul rămâne în endpoint (o eroare de după yield nu mai ajunge la client).
    ns, log = load_session()

    async def go():
        async def receive():
            return {"type": "http.request", "body": b"", "more_body": False}

        async def send(m):
            log.append(m["type"])

        scope = {
            "type": "http", "method": "POST", "path": "/notes", "raw_path": b"/notes",
            "query_string": b"text=hi", "headers": [], "server": ("t", 80), "client": ("c", 1),
            "scheme": "http", "http_version": "1.1", "root_path": "", "asgi": {"version": "3.0"},
        }
        await ns["app"](scope, receive, send)

    asyncio.run(go())
    assert log.index("http.response.body") < log.index("close"), log
    assert log.index("commit") < log.index("http.response.start"), log


# --- TestClient + dependency_overrides ---

LEAK = '''


def test_zz_overrides_are_clean():
    assert app.dependency_overrides == {}
'''


def test_override_reference_passes_and_leaves_no_override_behind(tmp_path):
    rc, out = run_pytest(tmp_path, section("s-asgi-override"), LEAK)
    assert rc == 0 and "2 passed" in out, out


def test_override_without_clear_leaks_into_later_tests(tmp_path):
    code = mutate(section("s-asgi-override"), "    over.clear()\n", "")
    rc, out = run_pytest(tmp_path, code, LEAK)
    assert rc != 0 and "test_zz_overrides_are_clean" in out and "1 failed" in out, out


def test_override_key_is_the_original_function_not_its_name(tmp_path):
    code = mutate(section("s-asgi-override"), "over[get_db] = fake_db", 'over["get_db"] = fake_db')
    rc, out = run_pytest(tmp_path, code)
    assert rc != 0 and "DB reală" in out, out


def test_override_without_override_the_real_dependency_runs():
    ns = load("s-asgi-override")
    with pytest.raises(RuntimeError, match="DB reală"):
        TestClient(ns["app"]).get("/count")


# --- lifespan ---

def test_lifespan_reference_passes_as_a_test(tmp_path):
    rc, out = run_pytest(tmp_path, section("s-asgi-lifespan"))
    assert rc == 0 and "1 passed" in out, out


def test_lifespan_runs_startup_and_shutdown_only_inside_with():
    ns = load("s-asgi-lifespan")
    with pytest.raises(AttributeError):
        TestClient(ns["app"]).get("/pool")      # fără with, startup nu a rulat
    ns = load("s-asgi-lifespan")
    with TestClient(ns["app"]) as c:
        assert c.get("/pool").json() == {"n": 1}
        assert ns["app"].state.pool == ["conn"]
    assert ns["app"].state.pool == []           # shutdown a rulat la ieșirea din with


def test_lifespan_makes_on_event_handlers_inert():
    ns = load("s-asgi-lifespan")
    called = []
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")

        @ns["app"].on_event("startup")
        def startup():
            called.append("startup")

    with TestClient(ns["app"]):
        pass
    assert called == []


# --- async def vs def ---

def load_async(calls, code=None):
    ns = load("s-asgi-async-def", code)

    def record():
        calls.append(threading.get_ident())
        return "gata"

    ns["blocking_io"] = record

    @ns["app"].get("/lt")
    async def loop_thread():
        return {"t": threading.get_ident()}

    return ns


@pytest.mark.parametrize("path", ["/sync", "/async"])
def test_blocking_code_never_runs_on_the_event_loop_thread(path):
    calls = []
    ns = load_async(calls)
    with TestClient(ns["app"]) as c:
        loop_t = c.get("/lt").json()["t"]
        assert c.get(path).json() == {"r": "gata"}
    assert calls and calls[-1] != loop_t


def test_blocking_call_directly_inside_async_def_runs_on_the_loop():
    calls = []
    code = mutate(section("s-asgi-async-def"), "await to_thread(blocking_io)", "blocking_io()")
    ns = load_async(calls, code)
    with TestClient(ns["app"]) as c:
        loop_t = c.get("/lt").json()["t"]
        c.get("/async")
    assert calls[-1] == loop_t


async def burst(app, path, n=5):
    t0 = time.perf_counter()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://t") as c:
        rs = await asyncio.gather(*[c.get(path) for _ in range(n)])
    assert all(r.status_code == 200 for r in rs)
    return time.perf_counter() - t0


@pytest.mark.parametrize("path", ["/sync", "/async"])
def test_five_requests_overlap_when_the_blocking_call_is_off_the_loop(path):
    # 5 x 0,2 s pe rând ar dura 1 s; în paralel durează ~0,2 s
    assert asyncio.run(burst(load("s-asgi-async-def")["app"], path)) < 0.6


def test_five_requests_serialize_when_async_def_blocks_the_loop():
    code = mutate(section("s-asgi-async-def"), "await to_thread(blocking_io)", "blocking_io()")
    assert asyncio.run(burst(load("s-asgi-async-def", code)["app"], "/async")) > 0.9
