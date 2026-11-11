"""purge() față de append() concurent și față de o ștergere întreruptă (code review PR #6, punctul 5)."""
import pytest
from boto3.dynamodb.conditions import Key
from fastapi.testclient import TestClient

from ba_server.config import Settings
from ba_server.dynamo import DynamoStore
from ba_server.main import create_app
from conftest import AUTH, SECRET, ev


def sks(table, pk="u#alex"):
    return sorted(i["sk"] for i in table.query(KeyConditionExpression=Key("pk").eq(pk), ConsistentRead=True)["Items"])


def test_an_append_racing_a_purge_does_not_leave_an_orphan_event(dynamo_table):
    """Append-ul a citit contorul (100), apoi purge șterge tot; tranzacția lui nu mai are voie
    să scrie S#101 sub epoca nouă: se reia și scrie S#1."""
    other = DynamoStore(dynamo_table, sleep=lambda s: None)
    other.append([ev(i) for i in range(100, 200)])

    class Racing(DynamoStore):
        fired = False

        def _before_write(self):
            if not Racing.fired:
                Racing.fired = True
                other.purge()

    mine = Racing(dynamo_table, sleep=lambda s: None)
    old_epoch = mine.epoch()
    res = mine.append([ev(1), ev(2)])
    assert res.accepted == ["e1", "e2"] and res.cursor == 2
    page = mine.read(0, 10)
    assert [e["id"] for e in page.events] == ["e1", "e2"] and page.cursor == 2
    assert mine.epoch() != old_epoch
    assert sks(dynamo_table) == ["E", "I#e1", "I#e2", "N", "S#000000000001", "S#000000000002"]


def test_the_epoch_is_not_published_before_the_data_is_gone(dynamo_table):
    """Un cititor din mijlocul ștergerii vede epoca veche: nu-și mută cursorul pe date pe jumătate șterse."""
    store = DynamoStore(dynamo_table, sleep=lambda s: None)
    store.append([ev(1), ev(2)])
    old = store.epoch()
    seen = []

    class Spy(DynamoStore):
        def _wipe(self, *a, **kw):
            seen.append(self.epoch())
            return super()._wipe(*a, **kw)

    spy = Spy(dynamo_table, sleep=lambda s: None)
    res = spy.purge()
    assert seen == [old] and res.epoch != old and store.epoch() == res.epoch


class Interrupted(RuntimeError):
    pass


def _interrupting(table):
    class Client:
        def __init__(self, inner):
            self._inner = inner
            self.fail = True

        def __getattr__(self, name):
            return getattr(self._inner, name)

        def batch_write_item(self, **kw):
            if self.fail:
                raise Interrupted("cădere la jumătatea ștergerii")
            return self._inner.batch_write_item(**kw)

    class Table:
        def __init__(self, inner):
            self._inner = inner
            self.client = Client(inner.meta.client)
            self.name = inner.name

        @property
        def meta(self):
            return self

        def __getattr__(self, name):
            return getattr(self._inner, name)

    return Table(table)


def test_a_purge_that_fails_midway_is_detectable_and_can_be_finished(dynamo_table):
    t = _interrupting(dynamo_table)
    store = DynamoStore(t, sleep=lambda s: None)
    store.append([ev(1), ev(2), ev(3)])
    old = store.epoch()
    with pytest.raises(Interrupted):
        store.purge()
    # epoca nu s-a schimbat, deci clienții nu resetează nimic; jurnalul e încă acolo
    assert store.epoch() == old
    assert store.is_purging() is True
    # cât timp ștergerea e neterminată, scrierile sunt refuzate (nu ajung orfane)
    from ba_server.store import PurgeInProgress

    with pytest.raises(PurgeInProgress):
        store.append([ev(9)])
    # o a doua încercare o termină
    t.client.fail = False
    res = store.purge()
    assert res.epoch != old and store.is_purging() is False and store.epoch() == res.epoch
    assert sks(dynamo_table) == ["E"]
    assert store.append([ev(9)]).cursor == 1


def test_a_write_during_a_purge_is_answered_503_not_500(dynamo_table):
    t = _interrupting(dynamo_table)
    store = DynamoStore(t, sleep=lambda s: None)
    store.append([ev(1)])
    with pytest.raises(Interrupted):
        store.purge()
    c = TestClient(create_app(Settings(app_secret=SECRET), store))
    r = c.post("/events", json={"events": [ev(2)]}, headers=AUTH)
    assert r.status_code == 503 and r.json()["detail"] == "purge_in_progress"
    assert c.get("/events", headers=AUTH).status_code == 200  # citirea merge
