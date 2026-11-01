# Testele referințelor de schelet pentru modulul pytest.
# Referințele sunt module de teste: le rulăm cu pytest într-un director nou
# (subproces) și verificăm proprietatea apărată de fiecare punct esențial.
# Pentru ca testele să nu fie un caz fericit, stricăm referința (mutație)
# și cerem ca exact acel test să pice.
import json
import os
import pathlib
import re
import subprocess
import sys

import pytest

SRC = (pathlib.Path(__file__).parent / "skel_pytest.py").read_text(encoding="utf8")
IDS = re.findall(r"^# === (s-[a-z0-9-]+) ===$", SRC, re.M)

CLIENT_STUB = 'def get_user(uid):\n    raise RuntimeError("rețea reală")\n'

# Plugin de spionaj: ține conexiunile create de fixture-ul `conn` și, la
# sfârșitul sesiunii, scrie dacă au fost închise (teardown-ul a rulat).
SPY = '''
import json, os, sqlite3
import pytest

conns = []


@pytest.hookimpl(wrapper=True)
def pytest_fixture_setup(fixturedef, request):
    result = yield
    if fixturedef.argname == "conn":
        conns.append(result)
    return result


def pytest_sessionfinish(session):
    closed = []
    for c in conns:
        try:
            c.execute("select 1")
            closed.append(False)
        except sqlite3.ProgrammingError:
            closed.append(True)
    with open(os.environ["SPY_OUT"], "w") as f:
        json.dump(closed, f)
'''


def section(sid):
    m = re.search(r"^# === %s ===\n(.*?)^# === end ===" % re.escape(sid), SRC, re.S | re.M)
    assert m, sid
    return m.group(1)


def split_files(code, default="test_ref.py"):
    parts = re.split(r"^# --- (\S+) ---\n", code, flags=re.M)
    if len(parts) == 1:
        return {default: code}
    return {parts[i]: parts[i + 1] for i in range(1, len(parts), 2)}


def mutate(text, old, new):
    assert text.count(old) >= 1, "mutația nu se aplică: %r" % old
    return text.replace(old, new)


def run(tmp_path, files, *args, env=None):
    for name, text in files.items():
        (tmp_path / name).write_text(text, encoding="utf8")
    e = {k: v for k, v in os.environ.items() if k not in ("API_HOST", "PYTEST_ADDOPTS")}
    e["PYTHONPATH"] = str(tmp_path)
    e.update(env or {})
    p = subprocess.run(
        [sys.executable, "-m", "pytest", "-p", "no:cacheprovider", "--rootdir", str(tmp_path), *args],
        cwd=tmp_path, env=e, capture_output=True, text=True, timeout=120,
    )
    return p.returncode, p.stdout + p.stderr


def ref_files(sid):
    files = split_files(section(sid))
    if sid == "s-pytest-patch":
        files["client.py"] = CLIENT_STUB
    return files


@pytest.mark.parametrize("sid", IDS)
def test_reference_runs_as_is(tmp_path, sid):
    rc, out = run(tmp_path, ref_files(sid), "-q")
    assert rc == 0, out
    assert "passed" in out and "failed" not in out and "error" not in out.lower().replace("0 errors", "")


def test_all_six_pytest_references_exist():
    assert len(IDS) == 6


# --- fixture cu yield + scope + conftest.py ---

ISOLATION = '''

def test_isolation(db):
    n = db.execute("select count(*) from t").fetchone()
    assert n == (0,)
'''


def run_fixture(tmp_path, files):
    files = dict(files)
    files["test_db.py"] += ISOLATION
    files["spy.py"] = SPY
    out_file = tmp_path / "spy.json"
    rc, out = run(tmp_path, files, "-v", "--setup-show", "-p", "spy", env={"SPY_OUT": str(out_file)})
    closed = json.loads(out_file.read_text()) if out_file.exists() else None
    return rc, out, closed


def test_fixture_teardown_runs_and_module_scope_is_shared(tmp_path):
    rc, out, closed = run_fixture(tmp_path, ref_files("s-pytest-fixture"))
    assert rc == 0, out
    # teardown-ul de după yield a rulat: conexiunea e închisă
    assert closed == [True], (closed, out)
    # scope=module: conn se creează o dată pentru ambele teste, iar db la fiecare test
    events = re.findall(r"^\s*(SETUP|TEARDOWN)\s+([A-Z]) (\w+)", out, re.M)
    assert events.count(("SETUP", "M", "conn")) == 1, events
    assert events.count(("SETUP", "F", "db")) == 2, events
    # ordine inversă: db se desface înaintea lui conn, iar conn abia la sfârșit
    assert events[-1] == ("TEARDOWN", "M", "conn"), events
    assert events.index(("TEARDOWN", "F", "db")) < events.index(("TEARDOWN", "M", "conn"))


def test_fixture_isolation_comes_from_the_function_fixture(tmp_path):
    files = ref_files("s-pytest-fixture")
    files["conftest.py"] = mutate(files["conftest.py"], "conn.rollback()  # izolare între teste", "pass")
    rc, out, _ = run_fixture(tmp_path, files)
    assert rc != 0 and "test_isolation" in out and "1 failed" in out, out


def test_fixture_with_return_has_no_teardown(tmp_path):
    files = ref_files("s-pytest-fixture")
    files["conftest.py"] = mutate(files["conftest.py"], "    yield c\n    c.close()", "    return c\n    c.close()")
    rc, out, closed = run_fixture(tmp_path, files)
    assert rc == 0, out
    assert closed == [False], "cu return conexiunea ar fi rămas deschisă"


# --- parametrize cu ids ---

def test_parametrize_ids_name_each_case(tmp_path):
    rc, out = run(tmp_path, ref_files("s-pytest-parametrize"), "-v")
    assert rc == 0, out
    for cid in ("spatiu", "multi", "gol"):
        assert re.search(r"test_slugify\[%s\] PASSED" % cid, out), out


def test_parametrize_one_failing_case_does_not_hide_the_others(tmp_path):
    files = ref_files("s-pytest-parametrize")
    files["test_ref.py"] = mutate(files["test_ref.py"], r're.sub(r"\W+", "-", text)', r're.sub(r"\W", "-", text)')
    rc, out = run(tmp_path, files, "-v")
    assert rc != 0
    assert re.search(r"test_slugify\[multi\] FAILED", out), out
    assert re.search(r"test_slugify\[spatiu\] PASSED", out) and re.search(r"test_slugify\[gol\] PASSED", out), out


def test_parametrize_slugify_edge_cases():
    ns = {}
    exec(section("s-pytest-parametrize"), ns)
    s = ns["slugify"]
    assert s("Hello,  World!") == "hello-world"
    assert s("   ") == ""
    assert s("a") == "a"


# --- raises(match=) ---

def test_raises_reference_detects_a_missing_check(tmp_path):
    files = ref_files("s-pytest-raises")
    files["test_ref.py"] = mutate(files["test_ref.py"], "if not 1 <= port <= 65535:", "if False:")
    rc, out = run(tmp_path, files, "-q")
    assert rc != 0 and "DID NOT RAISE" in out and "test_out_of_range" in out, out


def test_raises_match_checks_the_message(tmp_path):
    files = ref_files("s-pytest-raises")
    files["test_ref.py"] = mutate(files["test_ref.py"], 'raise ValueError("nu e număr")', 'raise ValueError("altceva")')
    rc, out = run(tmp_path, files, "-q")
    assert rc != 0 and "test_not_a_number" in out and "Regex pattern did not match" in out, out


def test_raises_code_after_the_raising_line_inside_with_never_runs():
    ran = []
    with pytest.raises(ValueError):
        raise ValueError("x")
        ran.append("asta nu rulează")  # noqa
    assert ran == []


def test_raises_match_is_a_search_not_a_full_match():
    with pytest.raises(ValueError, match="număr"):
        raise ValueError("nu e număr deloc")


# --- monkeypatch (env, atribut) ---

NO_LEAK = '''

def test_zz_no_leak():
    assert "API_HOST" not in os.environ
    assert Cfg.tries == 3
'''


def test_monkeypatch_undoes_env_and_attribute(tmp_path):
    files = ref_files("s-pytest-monkeypatch")
    files["test_ref.py"] += NO_LEAK
    rc, out = run(tmp_path, files, "-v")
    assert rc == 0, out
    assert "4 passed" in out, out


def test_monkeypatch_direct_assignment_leaks(tmp_path):
    base = ref_files("s-pytest-monkeypatch")["test_ref.py"] + NO_LEAK
    env_leak = mutate(base, 'monkeypatch.setenv("API_HOST", "prod")', 'os.environ["API_HOST"] = "prod"')
    rc, out = run(tmp_path, {"test_ref.py": env_leak}, "-q")
    assert rc != 0 and "test_zz_no_leak" in out, out
    attr_leak = mutate(base, 'monkeypatch.setattr(Cfg, "tries", 0)', "Cfg.tries = 0")
    rc, out = run(tmp_path, {"test_ref.py": attr_leak}, "-q")
    assert rc != 0 and "test_zz_no_leak" in out, out


def test_monkeypatch_delenv_needs_raising_false_when_the_variable_is_missing(tmp_path):
    files = ref_files("s-pytest-monkeypatch")
    # cu raising=False trece și când mediul mașinii are, și când nu are variabila
    for env in ({}, {"API_HOST": "masina"}):
        rc, out = run(tmp_path, files, "-q", env=env)
        assert rc == 0, out
    strict = mutate(files["test_ref.py"], '"API_HOST", raising=False', '"API_HOST"')
    rc, out = run(tmp_path, {"test_ref.py": strict}, "-q")
    assert rc != 0 and "KeyError" in out, out


# --- patch acolo unde e folosit + autospec + side_effect ---

def test_patch_where_the_name_is_looked_up(tmp_path):
    files = ref_files("s-pytest-patch")
    files["test_svc.py"] = mutate(files["test_svc.py"], '"svc.get_user"', '"client.get_user"')
    rc, out = run(tmp_path, files, "-q")
    # svc a luat deja propria referință la get_user: patch-ul pe client nu o schimbă
    assert rc != 0 and "rețea reală" in out, out


def test_autospec_catches_a_wrong_call_signature(tmp_path):
    files = ref_files("s-pytest-patch")
    files["svc.py"] = mutate(files["svc.py"], "get_user(uid)", "get_user(uid, True)")
    rc, out = run(tmp_path, files, "-q")
    # cu autospec, ambele teste pică cu TypeError, inclusiv cel care nu verifică argumentele
    assert rc != 0 and "2 failed" in out and out.count("TypeError") >= 2, out
    # fără autospec, un MagicMock primește orice: testul fără aserție pe argumente trece
    files["test_svc.py"] = mutate(files["test_svc.py"], ", autospec=True", "")
    rc, out = run(tmp_path, files, "-q")
    assert "1 failed, 1 passed" in out and "test_network_error" not in out.split("short test summary")[-1], out


def test_side_effect_exception_is_raised_and_a_list_gives_values_in_order():
    from unittest.mock import MagicMock
    m = MagicMock(side_effect=[TimeoutError, {"name": "Ana"}])
    with pytest.raises(TimeoutError):
        m()
    assert m() == {"name": "Ana"}


# --- tmp_path + caplog ---

def test_caplog_needs_at_level_for_info(tmp_path):
    files = ref_files("s-pytest-tmp-caplog")
    files["test_ref.py"] = mutate(files["test_ref.py"], "caplog.at_level(logging.INFO)", "caplog.at_level(logging.WARNING)")
    rc, out = run(tmp_path, files, "-q")
    assert rc != 0 and "citit 2 chei" in out, out


def test_tmp_path_is_a_fresh_directory_per_test(tmp_path):
    files = ref_files("s-pytest-tmp-caplog")
    files["test_ref.py"] += '''

def test_fresh_dir(tmp_path):
    assert list(tmp_path.iterdir()) == []
'''
    rc, out = run(tmp_path, files, "-q")
    assert rc == 0 and "2 passed" in out, out


def test_read_config_parses_pairs_and_skips_lines_without_equals():
    ns = {}
    exec(section("s-pytest-tmp-caplog"), ns)
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        p = pathlib.Path(d) / "c.cfg"
        p.write_text("x=1\n\n y = 2 \nfără\n")
        assert ns["read_config"](p) == {"x": "1", "y": "2"}
