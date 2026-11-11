"""Contractul depozitului, verificat pe MemoryStore și pe DynamoStore (moto)."""
from concurrent.futures import ThreadPoolExecutor

from conftest import ev


def ids(page):
    return [e["id"] for e in page.events]


def test_same_event_twice_in_one_batch_is_stored_once(store):
    res = store.append([ev(1), ev(1), ev(2)])
    assert res.accepted == ["e1", "e2"]
    assert res.duplicates == ["e1"]
    assert ids(store.read(0, 10)) == ["e1", "e2"]


def test_same_event_in_two_batches_is_stored_once(store):
    store.append([ev(1), ev(2)])
    res = store.append([ev(2), ev(3), ev(1)])
    assert res.accepted == ["e3"]
    assert sorted(res.duplicates) == ["e1", "e2"]
    assert ids(store.read(0, 10)) == ["e1", "e2", "e3"]


def test_first_copy_wins(store):
    store.append([ev(1, answer="first")])
    store.append([ev(1, answer="second")])
    assert store.read(0, 10).events[0]["answer"] == "first"


def test_event_content_roundtrips(store):
    e = {"id": "x", "t": 1.5, "text": "ăâîșț ✓", "nested": {"a": [1, 2.25, None, True]}}
    store.append([e])
    assert store.read(0, 10).events == [e]


def test_order_of_arrival_and_gapless_cursor(store):
    store.append([ev(3), ev(1)])
    store.append([ev(2)])
    page = store.read(0, 10)
    assert ids(page) == ["e3", "e1", "e2"]
    assert page.cursor == 3 and page.more is False


def test_empty_store(store):
    page = store.read(0, 10)
    assert page.events == [] and page.cursor == 0 and page.more is False


def test_pagination_follows_cursor_until_done(store):
    store.append([ev(i) for i in range(1, 8)])
    seen, cursor, pages = [], 0, 0
    while True:
        page = store.read(cursor, 3)
        pages += 1
        seen += ids(page)
        cursor = page.cursor
        if not page.more:
            break
    assert seen == [f"e{i}" for i in range(1, 8)]
    assert pages == 3 and cursor == 7


def test_exact_multiple_is_not_more(store):
    store.append([ev(i) for i in range(1, 7)])
    page = store.read(3, 3)
    assert ids(page) == ["e4", "e5", "e6"] and page.more is False


def test_read_past_the_end_keeps_cursor(store):
    store.append([ev(1)])
    page = store.read(5, 10)
    assert page.events == [] and page.cursor == 5 and page.more is False


def test_new_events_show_up_after_old_cursor(store):
    store.append([ev(1)])
    cursor = store.read(0, 10).cursor
    store.append([ev(2), ev(3)])
    assert ids(store.read(cursor, 10)) == ["e2", "e3"]


def test_large_batch_is_gapless_across_transactions(store):
    # 120 de evenimente: peste limita de 49 pe tranzacție DynamoDB.
    res = store.append([ev(i) for i in range(1, 121)])
    assert len(res.accepted) == 120 and res.cursor == 120
    got = store.read(0, 500)
    assert ids(got) == [f"e{i}" for i in range(1, 121)]
    assert got.cursor == 120


def test_concurrent_submits_of_the_same_events_store_each_once(store):
    batch = [ev(i) for i in range(1, 31)]
    with ThreadPoolExecutor(8) as pool:
        results = list(pool.map(lambda _: store.append(batch), range(8)))
    assert sum(len(r.accepted) for r in results) == 30
    got = store.read(0, 500)
    assert sorted(ids(got)) == sorted(e["id"] for e in batch)
    assert got.cursor == 30


def test_concurrent_distinct_submits_get_a_gapless_sequence(store):
    batches = [[ev(w * 100 + i) for i in range(5)] for w in range(6)]
    with ThreadPoolExecutor(6) as pool:
        list(pool.map(store.append, batches))
    got = store.read(0, 500)
    assert len(got.events) == 30 and got.cursor == 30
    # Fiecare lot rămâne contiguu și în ordinea lui.
    order = ids(got)
    for b in batches:
        pos = [order.index(e["id"]) for e in b]
        assert pos == list(range(pos[0], pos[0] + 5))
