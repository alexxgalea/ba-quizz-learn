# Testele referințelor de schelet pentru modulul gil.
# Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import functools
import multiprocessing as mp
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import pytest

import skel_gil
from skel_gil import (
    STOP, BoundedQueue, Counter, pipeline, run_all, run_threads,
    start_loop)

HERE = Path(__file__).parent


def section(sid):
    # codul referinței, exact cum ajunge în aplicație
    src = (HERE / "skel_gil.py").read_text()
    m = re.search(
        r"^# === %s ===\n(.*?)^# === end ===" % re.escape(sid),
        src, re.S | re.M)
    return m.group(1)


def run_guarded(fn, seconds=10):
    # un bug de sincronizare (deadlock) pică testul curat, nu îl blochează
    err = []

    def target():
        try:
            fn()
        except BaseException as e:  # noqa: BLE001
            err.append(e)

    t = threading.Thread(target=target, daemon=True)
    t.start()
    t.join(seconds)
    assert not t.is_alive(), "blocat (deadlock?)"
    if err:
        raise err[0]


def test_bq_fifo_si_len():
    q = BoundedQueue(3)
    for x in "abc":
        q.put(x)
    assert len(q) == 3
    assert [q.get(), q.get(), q.get()] == list("abc")
    assert len(q) == 0


def test_bq_capacitate_invalida():
    with pytest.raises(ValueError):
        BoundedQueue(0)


def test_bq_put_blocheaza_cand_e_plina():
    q = BoundedQueue(1)
    q.put(1)
    done = threading.Event()

    def producer():
        q.put(2)  # trebuie să aștepte până se face loc
        done.set()

    t = threading.Thread(target=producer, daemon=True)
    t.start()
    assert not done.wait(0.15), "put pe o coadă plină nu a blocat"
    assert q.get() == 1
    assert done.wait(1), "put nu s-a deblocat după get"
    assert q.get() == 2
    t.join(1)


def test_bq_get_blocheaza_cand_e_goala():
    q = BoundedQueue(2)
    got = []

    def consumer():
        got.append(q.get())

    t = threading.Thread(target=consumer, daemon=True)
    t.start()
    time.sleep(0.15)
    assert got == [], "get pe o coadă goală nu a blocat"
    q.put("x")
    t.join(1)
    assert got == ["x"]


def test_bq_multi_produceri_consumatori():
    # Nimic pierdut, nimic dublat, capacitatea nedepășită niciodată.
    # Thread-uri daemon + verificarea join-ului: un bug de lock
    # (deadlock) pică testul curat, nu îl blochează.
    cap, producers, per = 3, 4, 500
    q = BoundedQueue(cap)
    out, lock, peak = [], threading.Lock(), [0]
    done = threading.Event()

    def sample():
        # len() ia lock-ul cozii: un instantaneu consistent
        while not done.is_set():
            peak[0] = max(peak[0], len(q))
            time.sleep(0.0001)

    def produce(p):
        for i in range(per):
            q.put((p, i))

    def consume():
        while True:
            item = q.get()
            if item is None:
                return
            with lock:
                out.append(item)

    def spawn(target, *args):
        t = threading.Thread(target=target, args=args, daemon=True)
        t.start()
        return t

    sampler = spawn(sample)
    cs = [spawn(consume) for _ in range(3)]
    ps = [spawn(produce, p) for p in range(producers)]
    for t in ps:
        t.join(10)
    assert not any(t.is_alive() for t in ps), "produceri blocați"
    for _ in cs:
        q.put(None)
    for t in cs:
        t.join(10)
    assert not any(t.is_alive() for t in cs), "consumatori blocați"
    done.set()
    sampler.join(1)
    assert sorted(out) == sorted(
        (p, i) for p in range(producers) for i in range(per))
    assert peak[0] <= cap


# ---------- s-gil-lock ----------
@pytest.fixture
def tiny_switch():
    old = sys.getswitchinterval()
    sys.setswitchinterval(1e-6)  # schimbări de thread cât mai dese
    yield
    sys.setswitchinterval(old)


class SlowInt(int):
    # eliberează GIL-ul chiar între „citește” și „scrie” din n += 1,
    # deci fără lock actualizările se pierd sigur (pe 3.13 un int simplu
    # abia mai e întrerupt la mijlocul unui n += 1)
    def __add__(self, other):
        time.sleep(0.0002)
        return SlowInt(int(self) + other)


def test_lock_counter_exact_sub_thread_uri(tiny_switch):
    c = Counter()

    def work():
        for _ in range(20_000):
            c.inc()

    run_threads(work, 8)
    assert c.n == 8 * 20_000


def test_lock_acopera_tot_citeste_aduna_scrie():
    c = Counter()
    c.n = SlowInt(0)

    def work():
        for _ in range(40):
            c.inc()

    run_threads(work, 8)
    assert c.n == 8 * 40


def test_lock_un_singur_lock_partajat():
    c = Counter()
    assert isinstance(c.lock, type(threading.Lock()))
    assert Counter().lock is not c.lock  # câte unul per instanță


def test_lock_toate_thread_urile_pornesc_inainte_de_join():
    # Barrier(4) trece doar dacă cele 4 thread-uri trăiesc simultan:
    # start+join pe rând le-ar rula serial și bariera ar pica.
    n = 4
    bar = threading.Barrier(n, timeout=2)
    ok = []

    def work():
        try:
            bar.wait()
            ok.append(threading.get_ident())
        except threading.BrokenBarrierError:
            ok.append(None)

    run_threads(work, n)
    assert None not in ok and len(set(ok)) == n


def test_lock_target_fara_paranteze_ruleaza_in_thread():
    main = threading.get_ident()
    seen = []
    run_threads(lambda: seen.append(threading.get_ident()), 3)
    assert len(seen) == 3 and main not in seen


# ---------- s-gil-queue ----------
def test_queue_fiecare_item_o_data_inclusiv_none():
    seen, lock = [], threading.Lock()

    def handle(x):
        with lock:
            seen.append(x)

    items = [None, 0, 1, 2, "a"] + list(range(100))
    run_guarded(lambda: pipeline(items, handle, workers=3))
    assert sorted(map(repr, seen)) == sorted(map(repr, items))


def test_queue_cate_un_sentinel_per_consumator():
    # 5 consumatori, 2 itemi: dacă STOP e pus o singură dată, 4 rămân blocați
    before = threading.active_count()
    run_guarded(lambda: pipeline([1, 2], lambda x: None, workers=5))
    assert threading.active_count() == before


def test_queue_join_asteapta_procesarea_nu_doar_golirea():
    done = []

    def handle(x):
        time.sleep(0.05)
        done.append(x)

    run_guarded(lambda: pipeline(range(6), handle, workers=2))
    assert sorted(done) == list(range(6))


def test_queue_backpressure_produce_blocheaza_cand_e_plina():
    gate = threading.Event()
    produced = [0]

    def gen():
        for i in range(100):
            produced[0] += 1
            yield i

    t = threading.Thread(
        target=pipeline, args=(gen(), lambda x: gate.wait(5)),
        daemon=True)
    t.start()
    time.sleep(0.3)
    # 10 în coadă + 3 în handle + 1 blocat în put()
    assert produced[0] <= 10 + 3 + 1
    gate.set()
    t.join(10)
    assert not t.is_alive() and produced[0] == 100


def test_queue_stop_e_un_obiect_unic_nu_none():
    assert STOP is not None and STOP is skel_gil.STOP


# ---------- s-gil-proc ----------
GUARD = 'if __name__ == "__main__":\n    print(main())'


def run_script(code, tmp_path, timeout=20):
    f = tmp_path / "proc_demo.py"
    f.write_text(code)
    return subprocess.run([sys.executable, str(f)], capture_output=True,
                          text=True, timeout=timeout)


METHODS = [m for m in ("spawn", "forkserver", "fork")
           if m in mp.get_all_start_methods()]


@pytest.mark.parametrize("method", METHODS)
def test_proc_merge_cu_fiecare_start_method(method, tmp_path):
    code = section("s-gil-proc").replace(
        "    print(main())",
        "    mp.set_start_method(%r)\n    print(main())" % method)
    r = run_script(code, tmp_path)
    assert r.returncode == 0, r.stderr
    assert eval(r.stdout) == {0: 0, 1: 1, 2: 4, 3: 9}


def test_proc_fara_garda_pe_spawn_pica_sau_atarna(tmp_path):
    code = section("s-gil-proc").replace(
        GUARD, 'mp.set_start_method("spawn")\nprint(main())')
    assert code != section("s-gil-proc")
    try:
        r = run_script(code, tmp_path, timeout=8)
    except subprocess.TimeoutExpired:
        return  # părintele așteaptă la nesfârșit rezultate care nu vin
    assert r.returncode != 0 or "RuntimeError" in r.stderr


def _big(out):
    out.put(b"x" * 2_000_000)


def test_proc_join_inainte_de_get_blocheaza_copilul():
    # copilul nu se termină cât timp datele puse în coadă nu sunt citite
    ctx = mp.get_context("spawn")
    q = ctx.Queue()
    p = ctx.Process(target=_big, args=(q,))
    p.start()
    p.join(1.5)
    assert p.is_alive(), "join înainte de get ar fi blocat"
    assert len(q.get(timeout=10)) == 2_000_000
    p.join(10)
    assert not p.is_alive() and p.exitcode == 0


def test_proc_main_returneaza_rezultatele(tmp_path):
    # varianta rapidă, în proces: ca să fie prinsă și în pytest
    assert skel_gil.square.__module__ == "skel_gil"  # picklable, nivel înalt


# ---------- s-gil-pool ----------
def work(x):
    if x % 5 == 0:
        raise ValueError(x)
    return x * x


def slow_first(x):
    time.sleep(0.3 if x == 0 else 0)
    return x


def test_pool_rezultate_si_esecuri_pe_input():
    done, failed = run_all(work, range(1, 11))
    assert done == {x: x * x for x in range(1, 11) if x % 5}
    assert set(failed) == {5, 10}
    assert all(isinstance(e, ValueError) for e in failed.values())


def test_pool_un_esec_nu_pierde_restul():
    done, failed = run_all(work, [5, 1, 2, 3])
    assert set(done) == {1, 2, 3} and set(failed) == {5}


def test_pool_as_completed_nu_pastreaza_ordinea_intrarii():
    order = []

    def fn(x):
        r = slow_first(x)
        order.append(x)
        return r

    done, _ = run_all(fn, range(4))
    assert order[-1] == 0 and done == {0: 0, 1: 1, 2: 2, 3: 3}


def test_pool_chiar_ruleaza_in_paralel():
    live, peak, lock = [0], [0], threading.Lock()

    def fn(x):
        with lock:
            live[0] += 1
            peak[0] = max(peak[0], live[0])
        time.sleep(0.1)
        with lock:
            live[0] -= 1

    run_all(fn, range(8))
    assert 1 < peak[0] <= 4


def test_pool_with_asteapta_toate_task_urile():
    done = []

    def fn(x):
        time.sleep(0.05)
        done.append(x)

    run_all(fn, range(6))
    assert len(done) == 6  # nimic rămas în urmă după return


def test_pool_cu_procese_functie_de_nivel_inalt():
    pool = functools.partial(ProcessPoolExecutor,
                             mp_context=mp.get_context("spawn"))
    done, failed = run_all(work, range(1, 7), pool=pool)
    assert done == {x: x * x for x in range(1, 7) if x % 5}
    assert set(failed) == {5}


# ---------- s-gil-event ----------
def test_event_opreste_imediat_chiar_cu_pauza_mare():
    calls = []
    stop, t = start_loop(lambda: calls.append(1), every=30)
    time.sleep(0.1)
    t0 = time.monotonic()
    stop.set()
    t.join(2)
    assert not t.is_alive()
    assert time.monotonic() - t0 < 1  # sleep(30) ar fi ținut 30 s
    assert calls == [1]


def test_event_repeta_pasul_periodic():
    calls = []
    stop, t = start_loop(lambda: calls.append(1), every=0.02)
    time.sleep(0.3)
    stop.set()
    t.join(2)
    assert len(calls) >= 5


def test_event_nimic_dupa_join():
    calls = []
    stop, t = start_loop(lambda: calls.append(1), every=0.01)
    time.sleep(0.1)
    stop.set()
    t.join(2)
    n = len(calls)
    time.sleep(0.1)
    assert len(calls) == n and not t.is_alive()


def test_event_pasul_curent_se_termina_inainte_de_join():
    # set() singur nu oprește pasul în curs; join() îl așteaptă
    started, finished = threading.Event(), []

    def step():
        started.set()
        time.sleep(0.2)
        finished.append(1)

    stop, t = start_loop(step, every=0.01)
    assert started.wait(2)
    stop.set()
    t.join(2)
    assert finished == [1]
