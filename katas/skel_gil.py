# Referințele de schelet pentru modulul gil.
# Fiecare secțiune „=== s-… ===” ajunge în aplicație
# (build.mjs); testele sunt în test_skel_gil.py.

# === s-gil-bq ===
from collections import deque
from threading import Condition, Lock


class BoundedQueue:
    def __init__(self, cap):
        if cap < 1:
            raise ValueError(cap)
        self.cap = cap
        self.q = deque()
        lock = Lock()
        # două condiții, același lock
        self.not_full = Condition(lock)
        self.not_empty = Condition(lock)

    def put(self, item):
        with self.not_full:
            # while, nu if: altul poate
            # lua locul cât dormi
            while len(self.q) >= self.cap:
                self.not_full.wait()
            self.q.append(item)
            self.not_empty.notify()

    def get(self):
        with self.not_empty:
            while not self.q:
                self.not_empty.wait()
            item = self.q.popleft()
            self.not_full.notify()
            return item

    def __len__(self):
        with self.not_full:
            return len(self.q)
# === end ===


# === s-gil-lock ===
import threading


class Counter:
    def __init__(self):
        self.n = 0
        self.lock = threading.Lock()

    def inc(self):
        # n += 1 = citește, adună, scrie
        with self.lock:
            self.n += 1


def run_threads(fn, count):
    ts = [threading.Thread(target=fn)
          for _ in range(count)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
# === end ===


# === s-gil-queue ===
import queue
import threading

STOP = object()


def pipeline(items, handle, workers=3):
    q = queue.Queue(maxsize=10)

    def work():
        while True:
            item = q.get()
            try:
                if item is STOP:
                    return
                handle(item)
            finally:
                q.task_done()

    ts = [threading.Thread(target=work)
          for _ in range(workers)]
    for t in ts:
        t.start()
    for item in items:
        q.put(item)
    for _ in ts:
        q.put(STOP)
    q.join()
    for t in ts:
        t.join()
# === end ===


# === s-gil-proc ===
import multiprocessing as mp


def square(n, out):
    out.put((n, n * n))


def main():
    out = mp.Queue()
    ps = [mp.Process(target=square,
                     args=(n, out))
          for n in range(4)]
    for p in ps:
        p.start()
    # citești ÎNAINTE de join
    res = dict(out.get() for _ in ps)
    for p in ps:
        p.join()
    return res


if __name__ == "__main__":
    print(main())
# === end ===


# === s-gil-pool ===
from concurrent.futures import (
    ThreadPoolExecutor, as_completed)


def run_all(fn, items,
            pool=ThreadPoolExecutor):
    done, failed = {}, {}
    with pool(max_workers=4) as ex:
        futs = {ex.submit(fn, x): x
                for x in items}
        for f in as_completed(futs):
            x = futs[f]
            try:
                done[x] = f.result()
            except Exception as exc:
                failed[x] = exc
    return done, failed
# === end ===


# === s-gil-event ===
import threading


def start_loop(step, every=0.5):
    stop = threading.Event()

    def loop():
        while not stop.is_set():
            step()
            stop.wait(every)

    t = threading.Thread(target=loop)
    t.start()
    return stop, t
# === end ===
