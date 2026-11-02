import asyncio
import re
from pathlib import Path

import pytest

from katas import (
    Engine,
    LRUCache,
    OffHoursLogin,
    Rule,
    parse_duration,
    parse_log,
    register,
    run_jobs,
    summarize,
    test_duration_invalid_raises,
    test_duration_valid,
    TokenBucket,
    batched,
    dedupe_alerts,
    detect_bruteforce,
    failed_logon_batches,
    fetch_all,
    merge_intervals,
    parse_kv,
    retry,
    top_ips,
)


# ---------- k1 brute force ----------
def test_bruteforce_alerts_on_fifth_failure_in_window():
    events = [(t, "jdoe", False) for t in (0, 10, 20, 30, 40)]
    assert list(detect_bruteforce(events)) == [("jdoe", 40)]


def test_bruteforce_window_boundary_is_exclusive_at_start():
    # window is (ts-120, ts]: at ts=120 the failure at t=0 no longer counts
    events = [(t, "jdoe", False) for t in (0, 30, 60, 90, 120)]
    assert list(detect_bruteforce(events)) == []


def test_bruteforce_ignores_successes_and_separates_users():
    events = []
    for t in range(0, 50, 10):
        events.append((t, "a", False))
        events.append((t, "b", t % 20 == 0))  # b fails only at 10, 30
    events.sort()
    assert list(detect_bruteforce(events)) == [("a", 40)]


def test_bruteforce_resets_after_alert():
    events = [(t, "x", False) for t in range(0, 100, 10)]  # 10 failures in 90s
    assert list(detect_bruteforce(events)) == [("x", 40), ("x", 90)]


# ---------- k2 dedupe ----------
def test_dedupe_suppresses_within_cooldown_from_last_emitted():
    alerts = [(0, "R1", "h1"), (200, "R1", "h1"), (400, "R1", "h1")]
    assert list(dedupe_alerts(alerts, cooldown=300)) == [(0, "R1", "h1"), (400, "R1", "h1")]


def test_dedupe_keys_on_rule_and_host():
    alerts = [(0, "R1", "h1"), (1, "R1", "h2"), (2, "R2", "h1"), (3, "R1", "h1")]
    assert list(dedupe_alerts(alerts)) == alerts[:3]


# ---------- k3 retry ----------
def test_retry_succeeds_after_transient_failures():
    calls, sleeps = [], []

    @retry((ConnectionError,), max_attempts=3, base_delay=1, sleep=sleeps.append)
    def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise ConnectionError("down")
        return "ok"

    assert flaky() == "ok"
    assert len(calls) == 3
    assert len(sleeps) == 2
    assert 0 <= sleeps[0] <= 1 and 0 <= sleeps[1] <= 2  # caps 1, 2


def test_retry_reraises_after_max_attempts():
    @retry((ConnectionError,), max_attempts=2, sleep=lambda s: None)
    def always_down():
        raise ConnectionError("down")

    with pytest.raises(ConnectionError):
        always_down()


def test_retry_does_not_retry_other_exceptions():
    calls = []

    @retry((ConnectionError,), max_attempts=5, sleep=lambda s: None)
    def bug():
        calls.append(1)
        raise ValueError("bug")

    with pytest.raises(ValueError):
        bug()
    assert len(calls) == 1


def test_retry_preserves_metadata():
    @retry()
    def documented():
        """doc"""

    assert documented.__name__ == "documented" and documented.__doc__ == "doc"


def test_retry_caps_delay():
    sleeps = []

    @retry((KeyError,), max_attempts=6, base_delay=1, max_delay=4, sleep=sleeps.append)
    def boom():
        raise KeyError

    with pytest.raises(KeyError):
        boom()
    assert all(0 <= s <= 4 for s in sleeps) and len(sleeps) == 5


# ---------- k4 LRU ----------
def test_lru_evicts_least_recently_used():
    c = LRUCache(2)
    c.put("a", 1)
    c.put("b", 2)
    assert c.get("a") == 1      # a becomes most recent
    c.put("c", 3)               # evicts b
    assert c.get("b") is None
    assert c.get("a") == 1 and c.get("c") == 3
    c.put("a", 10)              # update moves a to the end
    c.put("d", 4)               # evicts c
    assert c.get("c") is None and c.get("a") == 10 and len(c) == 2


def test_lru_rejects_bad_capacity():
    with pytest.raises(ValueError):
        LRUCache(0)


# ---------- k5 token bucket ----------
def test_token_bucket_burst_then_refill():
    t = [0.0]
    b = TokenBucket(rate=2, capacity=3, clock=lambda: t[0])
    assert [b.allow() for _ in range(4)] == [True, True, True, False]
    t[0] = 0.5                  # +1 token
    assert b.allow() is True and b.allow() is False
    t[0] = 10                   # refill capped at capacity
    assert [b.allow() for _ in range(4)] == [True, True, True, False]


# ---------- k6 top IPs ----------
def test_top_ips():
    lines = [
        '10.0.0.1 - - "GET /"', '10.0.0.2 - - "GET /"', '10.0.0.1 - - "POST /login"',
        'garbage line', '10.0.0.3 - - "GET /"', '10.0.0.1 - - "GET /x"', '10.0.0.2 - - "GET /y"',
    ]
    assert top_ips(lines, k=2) == [("10.0.0.1", 3), ("10.0.0.2", 2)]


# ---------- k7 pipeline ----------
def test_parse_kv():
    assert parse_kv("TS=1|USER=JDOE|EVENT=LOGON_FAILED") == {
        "TS": "1", "USER": "JDOE", "EVENT": "LOGON_FAILED"}
    assert parse_kv("broken line") is None
    assert parse_kv("") is None
    assert parse_kv("=x|A=1") is None


def test_batched():
    assert list(batched("ABCDE", 2)) == [("A", "B"), ("C", "D"), ("E",)]
    assert list(batched([], 3)) == []
    with pytest.raises(ValueError):
        list(batched([1], 0))


def test_failed_logon_batches_is_lazy_and_filters():
    consumed = []

    def lines():
        for i in range(10):
            consumed.append(i)
            ev = "LOGON_FAILED" if i % 2 == 0 else "LOGON_OK"
            yield f"TS={i}|USER=u{i}|EVENT={ev}"
        yield "corrupted"

    gen = failed_logon_batches(lines(), size=2)
    first = next(gen)
    assert [e["TS"] for e in first] == ["0", "2"]
    assert len(consumed) == 3          # only read what the first batch needed
    rest = list(gen)
    assert [[e["TS"] for e in b] for b in rest] == [["4", "6"], ["8"]]


# ---------- k8 async ----------
def test_fetch_all_limits_concurrency_and_keeps_order():
    state = {"now": 0, "peak": 0}

    async def fake_fetch(url):
        state["now"] += 1
        state["peak"] = max(state["peak"], state["now"])
        await asyncio.sleep(0.01)
        state["now"] -= 1
        if url == "bad":
            raise RuntimeError("boom")
        return url.upper()

    urls = [f"u{i}" for i in range(20)] + ["bad"]
    result = asyncio.run(fetch_all(urls, fake_fetch, limit=4))
    assert state["peak"] <= 4
    assert result[:3] == ["U0", "U1", "U2"]
    assert isinstance(result[-1], RuntimeError)


# ---------- k9 intervals ----------
def test_merge_intervals():
    assert merge_intervals([(8, 10), (1, 3), (2, 6), (15, 18)]) == [(1, 6), (8, 10), (15, 18)]
    assert merge_intervals([(1, 4), (4, 5)]) == [(1, 5)]
    assert merge_intervals([]) == []


# ---------- every section is standalone ----------
def test_each_section_runs_on_its_own():
    src = Path(__file__).with_name("katas.py").read_text()
    sections = re.findall(r"# === (k\d+) ===\n(.*?)# === end ===", src, re.S)
    assert [n for n, _ in sections] == [f"k{i}" for i in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14)]
    for name, code in sections:
        exec(compile(code, name, "exec"), {})


# ---------- k10 audit log ----------
LOG = """2026-10-28T10:00:00Z user=ana action=login result=fail
2026-10-28T10:00:05Z user=ana action=login result=ok
garbage line

2026-10-28T10:01:00Z user=bob action=export result=fail
2026-13-28T10:01:00Z user=bob action=login result=ok
2026-10-28T10:02:00Z user=bob action=login
2026-10-28T09:00:00Z user=ana action=logout result=ok
""".splitlines()


def test_parse_log_skips_broken_lines_and_reports_them():
    errors = []
    events = list(parse_log(LOG, errors))
    assert len(events) == 4
    assert errors == [3, 6, 7]  # garbage, lună 13, fără result


def test_parse_log_is_lazy():
    def boom():
        yield LOG[0]
        raise AssertionError("citit prea mult")
    gen = parse_log(boom())
    assert next(gen).user == "ana"


def test_summarize_counts_failures_and_uses_latest_timestamp():
    out = summarize(parse_log(LOG))
    # ultima acțiune după timp, nu după ordinea liniilor
    assert out == {"ana": (1, "login"), "bob": (1, "export")}


def test_timestamp_is_timezone_aware():
    ev = next(parse_log(LOG))
    assert ev.ts.utcoffset().total_seconds() == 0


# ---------- k12 rule engine ----------
def test_engine_emits_alerts_from_registered_rules():
    events = [
        {"type": "profile_grant", "user": "x", "profile": "SAP_ALL"},
        {"type": "login", "user": "y", "hour": 3},
        {"type": "login", "user": "z", "hour": 10},
    ]
    alerts = list(Engine.default().run(events))
    assert [(a.rule_id, a.severity) for a in alerts] == [
        ("PRIV-001", "high"), ("LOGIN-002", "medium")]


def test_new_rule_needs_no_engine_change():
    @register
    class Debug(Rule):
        rule_id = "TEST-999"

        def match(self, event):
            return event.get("type") == "debug"
    try:
        alerts = list(Engine.default().run([{"type": "debug"}]))
        assert [a.rule_id for a in alerts] == ["TEST-999"]
    finally:
        from katas import RULES
        RULES.pop("TEST-999")


def test_broken_rule_does_not_stop_engine(caplog):
    class Broken(Rule):
        rule_id = "BAD"

        def match(self, event):
            raise KeyError("hour")
    engine = Engine([Broken(), OffHoursLogin()])
    alerts = list(engine.run([{"type": "login", "hour": 23}]))
    assert [a.rule_id for a in alerts] == ["LOGIN-002"]
    assert "BAD" in caplog.text


def test_rule_is_abstract():
    with pytest.raises(TypeError):
        Rule()


# ---------- k14 async worker pool ----------
def test_run_jobs_keeps_order_limits_concurrency_and_times_out():
    running = peak = 0

    async def handler(job):
        nonlocal running, peak
        running += 1
        peak = max(peak, running)
        try:
            if job == "boom":
                raise ValueError(job)
            await asyncio.sleep(1 if job == "slow" else 0.01)
            return job.upper()
        finally:
            running -= 1

    async def main():
        jobs = ["a", "boom", "slow", "b", "c", "d"]
        res = await run_jobs(jobs, handler, workers=2, timeout=0.2)
        left = [t for t in asyncio.all_tasks()
                if t is not asyncio.current_task()]
        return res, left

    res, left = asyncio.run(main())
    assert res[0] == "A" and res[3:] == ["B", "C", "D"]
    assert isinstance(res[1], ValueError)
    assert isinstance(res[2], asyncio.TimeoutError)
    assert peak == 2
    assert left == []  # niciun worker rămas agățat


def test_run_jobs_with_no_jobs():
    assert asyncio.run(run_jobs([], None)) == []
