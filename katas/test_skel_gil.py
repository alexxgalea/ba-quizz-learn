# Testele referințelor de schelet pentru modulul gil.
# Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import threading
import time

import pytest

from skel_gil import BoundedQueue


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

    t = threading.Thread(target=producer)
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

    t = threading.Thread(target=consumer)
    t.start()
    time.sleep(0.15)
    assert got == [], "get pe o coadă goală nu a blocat"
    q.put("x")
    t.join(1)
    assert got == ["x"]


def test_bq_multi_produceri_consumatori():
    # Nimic pierdut, nimic dublat, capacitatea nedepășită niciodată.
    cap, producers, per = 3, 4, 500
    q = BoundedQueue(cap)
    out, lock, peak = [], threading.Lock(), [0]
    real_put = q.put

    def put(item):
        real_put(item)
        with lock:
            peak[0] = max(peak[0], len(q))

    def produce(p):
        for i in range(per):
            put((p, i))

    def consume():
        while True:
            item = q.get()
            if item is None:
                return
            with lock:
                out.append(item)

    cs = [threading.Thread(target=consume) for _ in range(3)]
    ps = [threading.Thread(target=produce, args=(p,))
          for p in range(producers)]
    for t in cs + ps:
        t.start()
    for t in ps:
        t.join(10)
    for _ in cs:
        q.put(None)
    for t in cs:
        t.join(10)
    assert sorted(out) == sorted(
        (p, i) for p in range(producers) for i in range(per))
    assert peak[0] <= cap
