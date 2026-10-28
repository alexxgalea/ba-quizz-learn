# Soluțiile de referință pentru exercițiile de live coding din aplicație.
# Fiecare secțiune dintre "# === kN ===" și "# === end ===" e afișată exact așa,
# deci fiecare secțiune e independentă (își are propriile importuri).

# === k1 ===
from collections import defaultdict, deque


def detect_bruteforce(events, threshold=5, window=120):
    """Emite (user, ts) când un user ajunge la `threshold` login-uri eșuate în `window` secunde.

    events: tupluri (ts_secunde, user, ok), sortate după ts.
    Fereastra e (ts - window, ts]. După o alertă, fereastra userului se golește,
    ca o rafală să producă o singură alertă.
    """
    failures = defaultdict(deque)          # user -> momentele eșecurilor recente
    for ts, user, ok in events:
        if ok:
            continue
        q = failures[user]
        q.append(ts)
        while q and q[0] <= ts - window:   # scoate ce a ieșit din fereastră
            q.popleft()
        if len(q) >= threshold:
            yield user, ts
            q.clear()
# === end ===


# === k2 ===
def dedupe_alerts(alerts, cooldown=300):
    """Emite alertele (ts, rule_id, host), suprimând o repetare a aceleiași perechi
    (rule_id, host) în `cooldown` secunde de la ultima alertă *emisă*.
    Intrarea e sortată după ts."""
    last_emitted = {}
    for ts, rule_id, host in alerts:
        key = (rule_id, host)
        prev = last_emitted.get(key)
        if prev is None or ts - prev >= cooldown:
            last_emitted[key] = ts
            yield ts, rule_id, host
# === end ===


# === k3 ===
import functools
import random
import time


def retry(exceptions=(Exception,), max_attempts=3, base_delay=0.5,
          max_delay=10.0, sleep=time.sleep):
    """Reîncearcă la `exceptions`, cu backoff exponențial și full jitter."""
    if max_attempts < 1:
        raise ValueError("max_attempts must be >= 1")

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == max_attempts:
                        raise                      # păstrează traceback-ul original
                    cap = min(max_delay, base_delay * 2 ** (attempt - 1))
                    sleep(random.uniform(0, cap))  # full jitter
        return wrapper
    return decorator
# === end ===


# === k4 ===
from collections import OrderedDict


class LRUCache:
    """get/put în O(1); când e plin, scoate cheia folosită cel mai demult."""

    def __init__(self, capacity):
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self._data = OrderedDict()

    def get(self, key, default=None):
        if key not in self._data:
            return default
        self._data.move_to_end(key)           # devine cea mai recent folosită
        return self._data[key]

    def put(self, key, value):
        if key in self._data:
            self._data.move_to_end(key)
        self._data[key] = value
        if len(self._data) > self.capacity:
            self._data.popitem(last=False)    # scoate cea mai veche

    def __len__(self):
        return len(self._data)
# === end ===


# === k5 ===
import time


class TokenBucket:
    """Permite rafale de până la `capacity` cereri; se reumple cu `rate` tokeni pe secundă."""

    def __init__(self, rate, capacity, clock=time.monotonic):
        if rate <= 0 or capacity <= 0:
            raise ValueError("rate and capacity must be positive")
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)
        self.clock = clock                    # injectabil, pentru teste
        self.last = clock()

    def allow(self, cost=1.0):
        now = self.clock()
        elapsed = max(0.0, now - self.last)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False
# === end ===


# === k6 ===
import re
from collections import Counter

IP_RE = re.compile(r"^(\d{1,3}(?:\.\d{1,3}){3})\s")


def top_ips(lines, k=3):
    """Întoarce cele mai frecvente k IP-uri, ca perechi (ip, count), descrescător."""
    counts = Counter()
    for line in lines:                        # merge și pe un fișier: citește linie cu linie
        m = IP_RE.match(line)
        if m:
            counts[m.group(1)] += 1
    return counts.most_common(k)              # cu heap: O(n log k)
# === end ===


# === k7 ===
from itertools import islice


def parse_kv(line):
    """Transformă 'K1=v1|K2=v2' într-un dict; None pentru o linie stricată."""
    line = line.strip()
    if not line:
        return None
    event = {}
    for part in line.split("|"):
        key, sep, value = part.partition("=")
        if not sep or not key.strip():
            return None
        event[key.strip()] = value.strip()
    return event


def batched(iterable, n):
    """batched('ABCDE', 2) -> ('A','B') ('C','D') ('E',)  (itertools.batched din 3.12)."""
    if n < 1:
        raise ValueError("n must be >= 1")
    it = iter(iterable)
    while batch := tuple(islice(it, n)):
        yield batch


def failed_logon_batches(lines, size=500):
    """linii -> evenimente parsate -> doar login-uri eșuate -> loturi pentru bulk insert.
    Fiecare etapă e un generator, deci memoria rămâne constantă pentru orice fișier."""
    events = (parse_kv(line) for line in lines)
    failed = (e for e in events if e and e.get("EVENT") == "LOGON_FAILED")
    yield from batched(failed, size)
# === end ===


# === k8 ===
import asyncio


async def fetch_all(urls, fetch, limit=10):
    """Rulează await fetch(url) pentru fiecare url, cu cel mult `limit` în paralel.
    Rezultatele păstrează ordinea; o excepție apare în locul rezultatului ei."""
    sem = asyncio.Semaphore(limit)

    async def one(url):
        async with sem:
            return await fetch(url)

    return await asyncio.gather(*(one(u) for u in urls), return_exceptions=True)
# === end ===


# === k9 ===
def merge_intervals(intervals):
    """[(1, 3), (2, 6), (8, 10)] -> [(1, 6), (8, 10)]"""
    merged = []
    for start, end in sorted(intervals):
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [tuple(pair) for pair in merged]
# === end ===


# === k10 ===
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Event:
    ts: datetime
    user: str
    action: str
    ok: bool


def parse_line(line):
    """'2026-10-28T10:00:00Z user=ana action=login result=fail'"""
    stamp, *pairs = line.split()
    kv = dict(p.split("=", 1) for p in pairs)
    # Python 3.10 nu acceptă sufixul Z în fromisoformat
    ts = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    return Event(ts, kv["user"], kv["action"], kv["result"] == "ok")


def parse_log(lines, errors=None):
    """Generator: sare peste liniile goale, notează în `errors`
    numerele liniilor stricate și merge mai departe."""
    for n, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            yield parse_line(line)
        except (ValueError, KeyError):
            if errors is not None:
                errors.append(n)


def summarize(events):
    """{user: (eșecuri, ultima acțiune)}"""
    fails, last = {}, {}
    for e in events:
        fails[e.user] = fails.get(e.user, 0) + (not e.ok)
        if e.user not in last or e.ts >= last[e.user].ts:
            last[e.user] = e
    return {u: (fails[u], last[u].action) for u in fails}
# === end ===


# === k11 ===
import re

import pytest

_DURATION = re.compile(r"(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?")


def parse_duration(text):
    """'1h30m' -> 5400. Ordinea h, m, s, fiecare cel mult o dată."""
    m = _DURATION.fullmatch(text.strip())
    if not m or not any(m.groups()):
        raise ValueError(f"durată invalidă: {text!r}")
    h, mi, s = (int(g or 0) for g in m.groups())
    return h * 3600 + mi * 60 + s


@pytest.mark.parametrize("text, expected", [
    ("90s", 90),
    ("1h", 3600),
    ("2m30s", 150),
    ("1h0m5s", 3605),
    (" 5m ", 300),
])
def test_duration_valid(text, expected):
    assert parse_duration(text) == expected


@pytest.mark.parametrize("text", [
    "", "abc", "1x", "1h30x", "30m1h", "h", "1h1h",
])
def test_duration_invalid_raises(text):
    with pytest.raises(ValueError):
        parse_duration(text)
# === end ===


# === k12 ===
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Alert:
    rule_id: str
    severity: str
    event: dict


class Rule(ABC):
    rule_id: str
    severity = "medium"

    @abstractmethod
    def match(self, event): ...


RULES = {}


def register(cls):
    """Decorator: o regulă nouă se înregistrează singură,
    fără să modifici motorul."""
    RULES[cls.rule_id] = cls
    return cls


@register
class CriticalProfileGranted(Rule):
    rule_id = "PRIV-001"
    severity = "high"
    CRITICAL = {"SAP_ALL", "SAP_NEW"}

    def match(self, event):
        return (event.get("type") == "profile_grant"
                and event.get("profile") in self.CRITICAL)


@register
class OffHoursLogin(Rule):
    rule_id = "LOGIN-002"

    def __init__(self, start=8, end=20):
        self.start, self.end = start, end

    def match(self, event):
        return (event.get("type") == "login"
                and not self.start <= event["hour"] < self.end)


class Engine:
    def __init__(self, rules):
        self.rules = list(rules)

    @classmethod
    def default(cls):
        return cls(rule() for rule in RULES.values())

    def run(self, events):
        for event in events:
            for rule in self.rules:
                try:
                    hit = rule.match(event)
                except Exception:
                    # o regulă stricată nu oprește motorul
                    log.exception("regula %s a eșuat", rule.rule_id)
                    continue
                if hit:
                    yield Alert(rule.rule_id, rule.severity, event)
# === end ===


# === k14 ===
import asyncio


async def run_jobs(jobs, handler, workers=4, timeout=5.0):
    """Rulează `await handler(job)` cu cel mult `workers` în paralel
    și un timeout per job. Întoarce rezultatele în ordinea jobs;
    o excepție (inclusiv TimeoutError) apare în locul rezultatului.
    Merge și pe Python 3.10 (fără TaskGroup și asyncio.timeout)."""
    queue = asyncio.Queue()
    for i, job in enumerate(jobs):
        queue.put_nowait((i, job))
    results = [None] * len(jobs)

    async def worker():
        while True:
            i, job = await queue.get()
            try:
                results[i] = await asyncio.wait_for(handler(job), timeout)
            except Exception as exc:
                results[i] = exc
            finally:
                queue.task_done()

    tasks = [asyncio.create_task(worker()) for _ in range(workers)]
    try:
        await queue.join()
    finally:
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
    return results
# === end ===
