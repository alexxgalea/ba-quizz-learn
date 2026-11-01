# Testele referințelor de schelet pentru modulul redis.
# Rulează pe un redis-server real, pornit pe un port liber și oprit la final.
# Dacă binarul sau pachetul lipsesc, testele sar cu un mesaj clar.
import json
import shutil
import socket
import subprocess
import time
import types

import pytest

redis = pytest.importorskip(
    "redis",
    reason="redis-py lipsește: pip install -r katas/requirements-dev.txt",
)

import skel_redis  # noqa: E402
from skel_redis import (  # noqa: E402
    acquire, allow, get_user, release, save_user)


def _free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def server(tmp_path_factory):
    exe = shutil.which("redis-server")
    if exe is None:
        pytest.skip(
            "redis-server lipsește din PATH: "
            "testele Redis sar (apt install redis-server)")
    port = _free_port()
    proc = subprocess.Popen(
        [exe, "--port", str(port), "--bind", "127.0.0.1",
         "--save", "", "--appendonly", "no",
         "--dir", str(tmp_path_factory.mktemp("redis"))],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    client = redis.Redis(port=port, decode_responses=True)
    try:
        deadline = time.time() + 5
        while True:
            try:
                client.ping()
                break
            except redis.ConnectionError:
                if time.time() > deadline or proc.poll() is not None:
                    pytest.fail("redis-server nu a pornit")
                time.sleep(0.05)
        yield client
    finally:
        client.close()
        proc.terminate()
        try:
            proc.wait(5)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest.fixture
def r(server):
    server.flushall()
    return server


# --- s-redis-cache ---

class Source:
    """Sursa de adevăr: numără câte ori e citită."""

    def __init__(self, data):
        self.data = data
        self.reads = 0
        self.writes = 0

    def load(self, uid):
        self.reads += 1
        return self.data.get(uid)

    def save(self, uid, user):
        self.writes += 1
        self.data[uid] = user


def test_cache_miss_apoi_hit(r):
    src = Source({1: {"name": "Ana"}})
    assert get_user(r, 1, src.load) == {"name": "Ana"}
    assert get_user(r, 1, src.load) == {"name": "Ana"}
    assert src.reads == 1, "al doilea apel trebuia să vină din cache"


def test_cache_valoarea_si_ttl_vin_impreuna(r):
    src = Source({1: {"name": "Ana"}})
    get_user(r, 1, src.load, ttl=60)
    assert json.loads(r.get("user:1")) == {"name": "Ana"}
    assert 0 < r.ttl("user:1") <= 60, "cheia trebuie să aibă TTL"


def test_cache_valori_false_sunt_hit(r):
    # {} și 0 sunt valori valide; un `if cached:` le-ar trata drept miss
    src = Source({1: {}, 2: 0})
    for uid in (1, 2):
        first = get_user(r, uid, src.load)
        assert get_user(r, uid, src.load) == first
    assert src.reads == 2, "valorile false au fost citite din nou"


def test_cache_expira_dupa_ttl(r):
    src = Source({1: {"v": 1}})
    get_user(r, 1, src.load, ttl=1)
    time.sleep(1.2)
    get_user(r, 1, src.load, ttl=1)
    assert src.reads == 2


def test_cache_scrierea_invalideaza_cheia(r):
    src = Source({1: {"v": 1}})
    get_user(r, 1, src.load)
    save_user(r, 1, {"v": 2}, src.save)
    assert src.writes == 1
    assert r.exists("user:1") == 0, "cheia trebuia ștearsă"
    assert get_user(r, 1, src.load) == {"v": 2}


def test_cache_scrie_intai_sursa(r):
    # dacă sursa pică, cache-ul rămâne neatins
    src = Source({1: {"v": 1}})
    get_user(r, 1, src.load)

    def boom(uid, user):
        raise RuntimeError("db jos")

    with pytest.raises(RuntimeError):
        save_user(r, 1, {"v": 2}, boom)
    assert json.loads(r.get("user:1")) == {"v": 1}


# --- s-redis-lock ---

def test_lock_unul_singur_cat_e_tinut(r):
    a = acquire(r, "lock:job")
    assert a
    assert acquire(r, "lock:job") is None
    assert 0 < r.pttl("lock:job") <= 5000, "lock-ul trebuie să aibă TTL"
    assert r.get("lock:job") == a, "valoarea e token-ul proprietarului"


def test_lock_token_unic_pe_proprietar(r):
    a = acquire(r, "lock:a")
    b = acquire(r, "lock:b")
    assert a and b and a != b


def test_lock_eliberat_doar_de_proprietar(r):
    token = acquire(r, "lock:job")
    assert release(r, "lock:job", "token-strain") is False
    assert r.exists("lock:job") == 1, "un străin a șters lock-ul"
    assert release(r, "lock:job", token) is True
    assert r.exists("lock:job") == 0
    assert acquire(r, "lock:job"), "după eliberare, lock-ul e liber"


def test_lock_expirat_nu_sterge_lock_ul_altuia(r):
    old = acquire(r, "lock:job", ttl_ms=100)
    time.sleep(0.2)                       # TTL-ul a trecut
    new = acquire(r, "lock:job")
    assert new, "după expirare, altcineva ia lock-ul"
    assert release(r, "lock:job", old) is False
    assert r.get("lock:job") == new, "vechiul proprietar a șters lock-ul nou"


def test_lock_release_pe_cheie_lipsa(r):
    assert release(r, "lock:nimic", "t") is False


# --- s-redis-ratelimit ---

@pytest.fixture
def clock(monkeypatch):
    now = [1_000_000.0]
    monkeypatch.setattr(
        skel_redis, "time", types.SimpleNamespace(time=lambda: now[0]))
    return now


def test_ratelimit_respinge_peste_limita(r, clock):
    got = [allow(r, "ana", limit=3, window=60) for _ in range(5)]
    assert got == [True, True, True, False, False]


def test_ratelimit_utilizatori_independenti(r, clock):
    for _ in range(3):
        allow(r, "ana", limit=3, window=60)
    assert allow(r, "ana", limit=3, window=60) is False
    assert allow(r, "dan", limit=3, window=60) is True


def test_ratelimit_fereastra_noua_reseteaza(r, clock):
    for _ in range(3):
        allow(r, "ana", limit=3, window=60)
    assert allow(r, "ana", limit=3, window=60) is False
    clock[0] += 60
    assert allow(r, "ana", limit=3, window=60) is True


def test_ratelimit_contorul_are_ttl(r, clock):
    allow(r, "ana", limit=3, window=60)
    keys = r.keys("*")
    assert len(keys) == 1
    assert 0 < r.ttl(keys[0]) <= 60, "contorul trebuie să expire singur"


def test_ratelimit_concurent_nu_pierde_incrementari(server):
    # INCR e atomic: 20 de apeluri din thread-uri diferite, exact 20 de contoare
    import threading
    server.flushall()
    clock_now = 2_000_000.0
    orig = skel_redis.time
    skel_redis.time = types.SimpleNamespace(time=lambda: clock_now)
    try:
        results = []

        def hit():
            results.append(allow(server, "ana", limit=10, window=60))

        ts = [threading.Thread(target=hit) for _ in range(20)]
        for t in ts:
            t.start()
        for t in ts:
            t.join(10)
    finally:
        skel_redis.time = orig
    assert results.count(True) == 10 and results.count(False) == 10
