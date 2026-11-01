# Referințele de schelet pentru modulul asyncio.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_asyncio.py.
# Toate merg pe Python 3.10, în afară de s-asyncio-tg (3.11+).

# === s-asyncio-sem ===
import asyncio


async def run_limited(fns, limit=5):
    sem = asyncio.Semaphore(limit)

    async def one(fn):
        async with sem:
            return await fn()

    return await asyncio.gather(
        *(one(fn) for fn in fns),
        return_exceptions=True)
# === end ===


# === s-asyncio-workers ===
import asyncio


async def pipeline(items, handle, n=3):
    q = asyncio.Queue(maxsize=10)
    errors = []

    async def worker():
        while True:
            item = await q.get()
            try:
                await handle(item)
            except Exception as exc:
                errors.append(exc)
            finally:
                q.task_done()

    ws = [asyncio.create_task(worker())
          for _ in range(n)]
    try:
        for item in items:
            await q.put(item)
        await q.join()
    finally:
        for w in ws:
            w.cancel()
        await asyncio.gather(
            *ws, return_exceptions=True)
    return errors
# === end ===


# === s-asyncio-tg ===
from asyncio import TaskGroup, timeout


async def run_all(fns, limit=2.0):
    out = [None] * len(fns)

    async def one(i, fn):
        out[i] = await fn()

    async with timeout(limit):
        async with TaskGroup() as tg:
            for i, fn in enumerate(fns):
                tg.create_task(one(i, fn))
    return out
# === end ===


# === s-asyncio-thread ===
import asyncio


async def io_many(fn, items):
    # fn blocantă: câte un thread
    return await asyncio.gather(*(
        asyncio.to_thread(fn, x)
        for x in items))


async def cpu_many(fn, items, pool):
    # CPU-bound: procese, nu thread-uri
    loop = asyncio.get_running_loop()
    return await asyncio.gather(*(
        loop.run_in_executor(pool, fn, x)
        for x in items))
# === end ===


# === s-asyncio-cancel ===
import asyncio


async def worker(res):
    try:
        await asyncio.sleep(3600)
    except asyncio.CancelledError:
        res.append("anulat")
        raise
    finally:
        res.append("curat")


async def cancel(task):
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
# === end ===


# === s-asyncio-agen ===
import asyncio
from contextlib import (
    aclosing, asynccontextmanager)


@asynccontextmanager
async def resource(log):
    log.append("open")
    try:
        yield "res"
    finally:
        log.append("close")


async def ticks(n, log):
    try:
        for i in range(n):
            await asyncio.sleep(0)
            yield i
    finally:
        log.append("ticks gata")


async def main(log):
    async with resource(log) as r:
        async with aclosing(
                ticks(10, log)) as it:
            async for i in it:
                if i == 2:
                    break
    return r
# === end ===
