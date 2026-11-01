# Testele referințelor de schelet pentru modulul asyncio.
# Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import ast
import asyncio
import inspect
import multiprocessing as mp
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import pytest

import skel_asyncio
from skel_asyncio import (
    cancel, cpu_many, io_many, pipeline, resource, run_limited, ticks,
    worker)

HERE = Path(__file__).parent
V311 = sys.version_info >= (3, 11)
IDS = ["s-asyncio-sem", "s-asyncio-workers", "s-asyncio-tg",
       "s-asyncio-thread", "s-asyncio-cancel", "s-asyncio-agen"]


def section(sid):
    # codul referinței, exact cum ajunge în aplicație
    src = (HERE / "skel_asyncio.py").read_text()
    m = re.search(
        r"^# === %s ===\n(.*?)^# === end ===" % re.escape(sid),
        src, re.S | re.M)
    return m.group(1)


def run(coro, seconds=10):
    # un bug de sincronizare (join care atârnă) pică testul curat
    async def guarded():
        return await asyncio.wait_for(coro, seconds)

    return asyncio.run(guarded())


def others():
    # fără task-ul-gardă din run(): pe 3.11 wait_for rulează coroutina
    # într-un task separat, deci current_task() nu e cel din all_tasks()
    return [t for t in asyncio.all_tasks()
            if t is not asyncio.current_task()
            and not t.get_coro().__qualname__.endswith("guarded")]


# ---------- compatibilitate 3.10 ----------
NEW_API = ("TaskGroup", "timeout(", "ExceptionGroup", "except*")


@pytest.mark.parametrize("sid", [i for i in IDS if i != "s-asyncio-tg"])
def test_referintele_3_10_nu_folosesc_api_3_11(sid):
    code = section(sid)
    ast.parse(code, feature_version=(3, 10))
    assert not [w for w in NEW_API if w in code]


def test_tg_e_singura_referinta_3_11():
    code = section("s-asyncio-tg")
    assert "TaskGroup" in code and "timeout(" in code


# ---------- s-asyncio-sem ----------
def test_sem_cel_mult_limit_in_paralel_si_chiar_limit():
    live, peak = [0], [0]

    async def job():
        live[0] += 1
        peak[0] = max(peak[0], live[0])
        await asyncio.sleep(0.01)
        live[0] -= 1
        return "ok"

    res = run(run_limited([job] * 12, limit=3))
    assert peak[0] == 3 and res == ["ok"] * 12


def test_sem_ordinea_si_exceptiile_pe_pozitia_lor():
    def mk(i):
        async def job():
            await asyncio.sleep(0.03 - i * 0.005)  # terminarea e inversată
            if i % 2:
                raise ValueError(i)
            return i
        return job

    res = run(run_limited([mk(i) for i in range(6)], limit=6))
    assert [r if isinstance(r, int) else "err" for r in res] == [
        0, "err", 2, "err", 4, "err"]
    assert all(isinstance(r, ValueError) for r in res[1::2])


def test_sem_o_exceptie_nu_opreste_celelalte():
    ran = []

    def mk(i):
        async def job():
            await asyncio.sleep(0.01)
            ran.append(i)
            if i == 0:
                raise RuntimeError("boom")
        return job

    run(run_limited([mk(i) for i in range(5)], limit=5))
    assert sorted(ran) == [0, 1, 2, 3, 4]


def test_sem_permisul_se_elibereaza_si_la_exceptie():
    # limit=1: dacă primul eșec ar ține permisul, restul n-ar mai rula
    async def bad():
        raise ValueError

    async def good():
        return 1

    res = run(run_limited([bad, good, good], limit=1), seconds=3)
    assert isinstance(res[0], ValueError) and res[1:] == [1, 1]


# ---------- s-asyncio-workers ----------
def test_workers_toate_procesate_si_erorile_colectate():
    seen = []

    async def handle(x):
        await asyncio.sleep(0.001)
        if x % 7 == 0:
            raise ValueError(x)
        seen.append(x)

    errs = run(pipeline(range(1, 50), handle, n=3))
    assert sorted(seen) == [x for x in range(1, 50) if x % 7]
    assert sorted(e.args[0] for e in errs) == [7, 14, 21, 28, 35, 42, 49]


def test_workers_paralelism_cel_mult_n():
    live, peak = [0], [0]

    async def handle(x):
        live[0] += 1
        peak[0] = max(peak[0], live[0])
        await asyncio.sleep(0.01)
        live[0] -= 1

    run(pipeline(range(30), handle, n=4))
    assert 1 < peak[0] <= 4


def test_workers_niciun_task_ramas_dupa_return():
    async def main():
        async def handle(x):
            await asyncio.sleep(0)

        await pipeline(range(20), handle, n=5)
        return others()

    assert run(main()) == []


def test_workers_o_eroare_nu_omoara_workerul():
    # 1 singur worker: dacă moare la prima eroare, restul nu se mai consumă
    seen = []

    async def handle(x):
        if x == 0:
            raise RuntimeError
        seen.append(x)

    errs = run(pipeline(range(30), handle, n=1), seconds=3)
    assert len(errs) == 1 and seen == list(range(1, 30))


def test_workers_backpressure_put_asteapta_cand_coada_e_plina():
    produced = [0]
    gate = None

    def gen():
        for i in range(100):
            produced[0] += 1
            yield i

    async def main():
        nonlocal gate
        gate = asyncio.Event()

        async def handle(x):
            await gate.wait()

        t = asyncio.create_task(pipeline(gen(), handle, n=3))
        await asyncio.sleep(0.1)
        stalled = produced[0]
        gate.set()
        await t
        return stalled

    stalled = run(main())
    # 10 în coadă + 3 în handle + 1 blocat în put()
    assert stalled <= 10 + 3 + 1 and produced[0] == 100


def test_workers_anularea_ajunge_la_apelant_fara_workeri_orfani():
    async def main():
        async def handle(x):
            await asyncio.sleep(10)

        t = asyncio.create_task(pipeline(range(50), handle, n=3))
        await asyncio.sleep(0.05)
        t.cancel()
        with pytest.raises(asyncio.CancelledError):
            await t
        return others()

    assert run(main()) == []


# ---------- s-asyncio-tg (3.11+) ----------
pytestmark_tg = pytest.mark.skipif(not V311, reason="TaskGroup e 3.11+")


@pytestmark_tg
def test_tg_rezultatele_in_ordinea_intrarii():
    def mk(i):
        async def job():
            await asyncio.sleep(0.03 - i * 0.01)
            return i
        return job

    assert run(skel_asyncio.run_all([mk(i) for i in range(3)])) == [0, 1, 2]


@pytestmark_tg
def test_tg_prima_eroare_anuleaza_restul_si_iese_ca_exceptiongroup():
    cancelled = []

    async def bad():
        await asyncio.sleep(0.01)
        raise ValueError("x")

    async def slow():
        try:
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            cancelled.append(1)
            raise

    with pytest.raises(ExceptionGroup) as info:
        run(skel_asyncio.run_all([bad, slow, slow]), seconds=3)
    match, rest = info.value.split(ValueError)  # ce ar prinde `except*`
    assert [type(e) for e in match.exceptions] == [ValueError]
    assert rest is None
    assert cancelled == [1, 1]


@pytestmark_tg
def test_tg_un_except_simplu_nu_prinde_grupul():
    # eroarea iese înfășurată: `except ValueError` nu se potrivește,
    # trebuie `except*` (sau `ExceptionGroup`)
    async def bad():
        raise ValueError

    with pytest.raises(ExceptionGroup) as info:
        run(skel_asyncio.run_all([bad]))
    assert not isinstance(info.value, ValueError)


@pytestmark_tg
def test_tg_timeout_global_anuleaza_si_ridica_timeouterror():
    cancelled = []

    async def slow():
        try:
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            cancelled.append(1)
            raise

    t0 = time.monotonic()
    with pytest.raises(TimeoutError):
        run(skel_asyncio.run_all([slow, slow], limit=0.1), seconds=3)
    assert time.monotonic() - t0 < 2 and cancelled == [1, 1]


# ---------- s-asyncio-thread ----------
def blocking(x):
    time.sleep(0.2)
    return x * 2


def square(x):
    return x * x


async def heartbeat(ticks_):
    while True:
        await asyncio.sleep(0.01)
        ticks_.append(1)


def test_thread_loop_ul_nu_e_blocat_si_ruleaza_in_paralel():
    async def main():
        beats = []
        hb = asyncio.create_task(heartbeat(beats))
        t0 = time.monotonic()
        res = await io_many(blocking, [1, 2, 3])
        took = time.monotonic() - t0
        hb.cancel()
        return res, took, len(beats)

    res, took, beats = run(main())
    assert res == [2, 4, 6]
    assert took < 0.5   # 3 × 0.2 s în paralel; serial ar fi 0,6 s
    assert beats >= 8   # loop-ul a continuat să bată cât au așteptat thread-urile


def test_thread_control_apelul_blocant_direct_ingheata_loop_ul():
    # confirmă că măsurătoarea de mai sus prinde un loop blocat
    async def main():
        beats = []
        hb = asyncio.create_task(heartbeat(beats))
        await asyncio.sleep(0)
        blocking(1)          # direct în corutină
        n = len(beats)
        hb.cancel()
        return n

    assert run(main()) <= 1


def test_thread_functia_ruleaza_in_alt_thread():
    import threading
    main_id = []

    def who(_):
        return threading.get_ident()

    async def main():
        main_id.append(threading.get_ident())
        return await io_many(who, [1, 2])

    ids = run(main())
    assert main_id[0] not in ids


def test_thread_cpu_in_procese_cu_functie_picklable():
    async def main():
        with ProcessPoolExecutor(
                2, mp_context=mp.get_context("spawn")) as pool:
            return await cpu_many(square, [1, 2, 3, 4], pool)

    assert run(main(), seconds=30) == [1, 4, 9, 16]


def test_thread_cpu_nu_blocheaza_loop_ul():
    async def main():
        beats = []
        hb = asyncio.create_task(heartbeat(beats))
        with ProcessPoolExecutor(
                2, mp_context=mp.get_context("spawn")) as pool:
            await cpu_many(sleepy, [0.2, 0.2], pool)
        n = len(beats)
        hb.cancel()
        return n

    assert run(main(), seconds=30) >= 5


def sleepy(x):
    time.sleep(x)
    return x


# ---------- s-asyncio-cancel ----------
def test_cancel_curatenia_ruleaza_si_taskul_e_marcat_anulat():
    async def main():
        res = []
        t = asyncio.create_task(worker(res))
        await asyncio.sleep(0.01)
        await cancel(t)
        return res, t.cancelled()

    res, was_cancelled = run(main())
    assert res == ["anulat", "curat"]
    assert was_cancelled   # CancelledError re-ridicat, nu înghițit


def test_cancel_wait_for_se_bazeaza_pe_anulare():
    async def main():
        res = []
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(worker(res), 0.05)
        return res

    assert run(main(), seconds=3) == ["anulat", "curat"]


def test_cancel_anularea_apelantului_ajunge_la_el():
    async def main():
        res = []

        async def caller():
            await worker(res)

        t = asyncio.create_task(caller())
        await asyncio.sleep(0.01)
        t.cancel()
        with pytest.raises(asyncio.CancelledError):
            await t
        return res, t.cancelled()

    res, was_cancelled = run(main())
    assert res == ["anulat", "curat"] and was_cancelled


def test_cancel_nu_e_prinsa_de_except_exception():
    assert not issubclass(asyncio.CancelledError, Exception)
    assert issubclass(asyncio.CancelledError, BaseException)


def test_cancel_task_ul_terminat_se_poate_anula_fara_eroare():
    async def main():
        t = asyncio.create_task(asyncio.sleep(0))
        await t
        await cancel(t)     # deja gata: nu trebuie să ridice
        return t.done()

    assert run(main())


# ---------- s-asyncio-agen ----------
def test_agen_ordinea_deschidere_generator_inchidere():
    log = []
    assert run(skel_asyncio.main(log)) == "res"
    assert log == ["open", "ticks gata", "close"]


def test_agen_resursa_se_inchide_si_cand_blocul_arunca():
    async def main(log):
        try:
            async with resource(log):
                raise ValueError("x")
        except ValueError:
            log.append("prins")

    log = []
    run(main(log))
    assert log == ["open", "close", "prins"]


def test_agen_generator_async_consumat_cu_async_for():
    assert inspect.isasyncgenfunction(ticks)

    async def main():
        log = []
        return [i async for i in ticks(4, log)], log

    out, log = run(main())
    assert out == [0, 1, 2, 3] and log == ["ticks gata"]


def test_agen_fara_aclosing_finally_nu_ruleaza_la_break():
    # controlul care arată de ce contează aclosing: după break,
    # generatorul rămâne deschis și finally-ul lui n-a rulat încă
    async def main():
        log = []
        async for i in ticks(10, log):
            if i == 2:
                break
        return list(log)

    assert run(main()) == []


def test_agen_aclosing_inchide_determinist_la_break():
    async def main():
        log = []
        from contextlib import aclosing
        async with aclosing(ticks(10, log)) as it:
            async for i in it:
                if i == 2:
                    break
        return list(log)

    assert run(main()) == ["ticks gata"]


def test_agen_cm_nu_merge_cu_with_simplu():
    with pytest.raises((TypeError, AttributeError)):
        with resource([]):
            pass
