"""POST /events și GET /events, prin API, pe ambele depozite."""
from conftest import AUTH, ev


def post(client, events):
    return client.post("/events", json={"events": events}, headers=AUTH)


def test_post_then_get(client):
    r = post(client, [ev(1), ev(2)])
    assert r.status_code == 200
    assert r.json() == {"accepted": ["e1", "e2"], "duplicates": [], "cursor": 2}
    r = client.get("/events", headers=AUTH)
    assert r.json() == {"events": [ev(1), ev(2)], "cursor": 2, "more": False}


def test_same_event_twice_is_kept_once(client):
    post(client, [ev(1)])
    r = post(client, [ev(1), ev(2)])
    assert r.json()["accepted"] == ["e2"] and r.json()["duplicates"] == ["e1"]
    got = client.get("/events", headers=AUTH).json()
    assert [e["id"] for e in got["events"]] == ["e1", "e2"]


def test_pagination_with_after_and_limit(client):
    post(client, [ev(i) for i in range(1, 6)])
    first = client.get("/events?limit=2", headers=AUTH).json()
    assert [e["id"] for e in first["events"]] == ["e1", "e2"]
    assert first["cursor"] == 2 and first["more"] is True
    second = client.get(f"/events?after={first['cursor']}&limit=2", headers=AUTH).json()
    assert [e["id"] for e in second["events"]] == ["e3", "e4"] and second["more"] is True
    last = client.get(f"/events?after={second['cursor']}&limit=2", headers=AUTH).json()
    assert [e["id"] for e in last["events"]] == ["e5"] and last["more"] is False
    assert last["cursor"] == 5


def test_default_limit_and_bounds(client):
    assert client.get("/events?limit=0", headers=AUTH).status_code == 422
    assert client.get("/events?limit=501", headers=AUTH).status_code == 422
    assert client.get("/events?after=-1", headers=AUTH).status_code == 422
    assert client.get("/events?after=abc", headers=AUTH).status_code == 422


def test_invalid_batches_are_rejected(client):
    assert client.post("/events", json={"events": []}, headers=AUTH).status_code == 422
    assert client.post("/events", json={"events": [{"x": 1}]}, headers=AUTH).status_code == 422
    assert client.post("/events", json={"events": [{"id": "has space"}]}, headers=AUTH).status_code == 422
    assert client.post("/events", json={"events": [{"id": 5}]}, headers=AUTH).status_code == 422
    assert client.post("/events", json={"events": [{"id": "a" * 129}]}, headers=AUTH).status_code == 422
    assert client.post("/events", json={"events": "nope"}, headers=AUTH).status_code == 422
    too_big = {"id": "big", "text": "x" * 100_001}
    assert client.post("/events", json={"events": [too_big]}, headers=AUTH).status_code == 422
    assert client.post("/events", json={"events": [ev(i) for i in range(501)]}, headers=AUTH).status_code == 422
    assert client.get("/events", headers=AUTH).json()["events"] == []


def test_health_needs_no_secret_and_shows_nothing(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json() == {"ok": True}


def test_no_public_docs(client):
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert client.get(path, headers=AUTH).status_code == 404
