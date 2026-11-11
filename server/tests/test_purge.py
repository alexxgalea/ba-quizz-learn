"""POST /events/purge (tichetul 09): ștergerea jurnalului de pe server și epoca, pe ambele depozite."""
from boto3.dynamodb.conditions import Key

from ba_server.dynamo import DynamoStore
from conftest import AUTH, ev

OK = {"confirm": "purge-all-events"}


def post(client, events):
    return client.post("/events", json={"events": events}, headers=AUTH)


def purge(client, body=OK, headers=AUTH):
    return client.post("/events/purge", json=body, headers=headers)


def test_purge_wipes_events_and_the_cursor_restarts(client):
    post(client, [ev(1), ev(2), ev(3)])
    r = purge(client)
    assert r.status_code == 200
    assert r.json()["deleted"] == 3
    got = client.get("/events", headers=AUTH).json()
    assert got["events"] == [] and got["cursor"] == 0 and got["more"] is False
    # numerele pornesc din nou de la 1
    assert post(client, [ev(9)]).json()["cursor"] == 1


def test_idempotency_markers_are_wiped_too(client):
    post(client, [ev(1)])
    purge(client)
    r = post(client, [ev(1)])  # același id: nu mai e duplicat, serverul l-a uitat
    assert r.json()["accepted"] == ["e1"] and r.json()["duplicates"] == []


def test_epoch_changes_on_purge_and_rides_on_both_routes(client):
    first = client.get("/events", headers=AUTH).json()["epoch"]
    assert first == "0" and post(client, [ev(1)]).json()["epoch"] == first
    new = purge(client).json()["epoch"]
    assert new != first and len(new) >= 8
    assert client.get("/events", headers=AUTH).json()["epoch"] == new
    assert post(client, [ev(2)]).json()["epoch"] == new
    assert purge(client).json()["epoch"] not in (first, new)  # fiecare ștergere, o epocă nouă


def test_purge_of_an_empty_journal_works(client):
    r = purge(client)
    assert r.status_code == 200 and r.json()["deleted"] == 0


def test_purge_needs_the_secret(client):
    post(client, [ev(1)])
    assert purge(client, headers={}).status_code == 401
    assert purge(client, headers={"Authorization": "Bearer nu-e-asta"}).status_code == 401
    assert client.get("/events", headers=AUTH).json()["cursor"] == 1  # nimic șters


def test_purge_needs_the_explicit_confirmation_and_deletes_nothing_without_it(client):
    post(client, [ev(1), ev(2)])
    for body in ({}, {"confirm": "yes"}, {"confirm": True}, {"confirm": "purge-all-events", "x": 1}, {"confirm": ""}):
        assert purge(client, body).status_code == 422, body
    assert client.post("/events/purge", headers=AUTH).status_code == 422  # fără corp
    got = client.get("/events", headers=AUTH).json()
    assert got["cursor"] == 2 and got["epoch"] == "0"


def test_unauthenticated_malformed_purge_does_not_leak_details(client):
    r = client.post("/events/purge", json={"confirm": "x"})
    assert r.status_code == 401 and r.json() == {"detail": "unauthorized"}


def test_purge_leaves_the_daily_ai_counter(store):
    assert store.take_ai_slot("2026-11-12", 2)
    store.append([ev(1)])
    store.purge()
    assert store.take_ai_slot("2026-11-12", 2)
    assert not store.take_ai_slot("2026-11-12", 2)  # plafonul a rămas la 2: ștergerea nu-l resetează


def test_a_large_journal_is_wiped_completely(store):
    store.append([ev(i) for i in range(1, 121)])
    res = store.purge()
    assert res.deleted == 120
    assert store.read(0, 500).events == [] and store.epoch() == res.epoch


def test_purge_only_touches_this_user_in_dynamo(dynamo_table):
    mine = DynamoStore(dynamo_table, user_pk="u#a", sleep=lambda s: None)
    other = DynamoStore(dynamo_table, user_pk="u#b", sleep=lambda s: None)
    mine.append([ev(1), ev(2)])
    other.append([ev(7)])
    mine.purge()
    assert [e["id"] for e in other.read(0, 10).events] == ["e7"] and other.epoch() == "0"
    left = {i["sk"] for i in dynamo_table.query(KeyConditionExpression=Key("pk").eq("u#a"))["Items"]}
    assert left == {"E"}  # doar epoca


def test_events_written_after_a_purge_are_a_fresh_journal(store):
    store.append([ev(1)])
    store.purge()
    res = store.append([ev(5), ev(6)])
    assert res.cursor == 2 and [e["id"] for e in store.read(0, 10).events] == ["e5", "e6"]
