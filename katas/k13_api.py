# Soluția de referință pentru k13 (endpoint FastAPI). Stă separat de katas.py,
# ca restul exercițiilor să nu depindă de FastAPI. Pe CoderPad: proiect multi-file,
# apoi `pip3 install fastapi httpx` din Shell.

# === k13 ===
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field


class AlertIn(BaseModel):
    rule_id: str = Field(min_length=1)
    host: str = Field(min_length=1)
    severity: str = "medium"


class AlertOut(AlertIn):
    id: int


class Page(BaseModel):
    items: list[AlertOut]
    next_cursor: int | None


class Store:
    """„Baza de date”: în memorie, înlocuită în teste."""

    def __init__(self):
        self.alerts: list[AlertOut] = []
        self.by_key: dict[str, tuple[AlertIn, AlertOut]] = {}


_store = Store()


def get_store() -> Store:
    return _store


app = FastAPI()


@app.post("/alerts", status_code=201, response_model=AlertOut)
def create_alert(
    body: AlertIn,
    idempotency_key: str = Header(min_length=1),
    store: Store = Depends(get_store),
):
    seen = store.by_key.get(idempotency_key)
    if seen:
        old_body, old_alert = seen
        if old_body != body:
            # aceeași cheie, alt conținut: conflict
            raise HTTPException(409, "cheia a fost folosită")
        return old_alert  # retry: același răspuns, fără duplicat
    alert = AlertOut(id=len(store.alerts) + 1, **body.model_dump())
    store.alerts.append(alert)
    store.by_key[idempotency_key] = (body, alert)
    return alert


@app.get("/alerts", response_model=Page)
def list_alerts(
    limit: int = Query(20, ge=1, le=100),
    cursor: int = Query(0, ge=0),
    store: Store = Depends(get_store),
):
    # cursor = ultimul id văzut; stabil și când apar alerte noi
    rest = [a for a in store.alerts if a.id > cursor]
    items = rest[:limit]
    more = len(rest) > limit
    return Page(items=items,
                next_cursor=items[-1].id if more else None)


# --- teste (pytest) ---
from fastapi.testclient import TestClient


def make_client():
    store = Store()
    app.dependency_overrides[get_store] = lambda: store
    return TestClient(app)


def test_create_is_idempotent():
    c = make_client()
    body = {"rule_id": "R1", "host": "h1"}
    h = {"Idempotency-Key": "abc"}
    r1 = c.post("/alerts", json=body, headers=h)
    r2 = c.post("/alerts", json=body, headers=h)
    assert r1.status_code == r2.status_code == 201
    assert r1.json() == r2.json()
    assert len(c.get("/alerts").json()["items"]) == 1


def test_same_key_other_body_is_409():
    c = make_client()
    h = {"Idempotency-Key": "abc"}
    c.post("/alerts", json={"rule_id": "R1", "host": "h1"}, headers=h)
    r = c.post("/alerts", json={"rule_id": "R2", "host": "h1"},
               headers=h)
    assert r.status_code == 409


def test_validation_errors_are_422():
    c = make_client()
    no_key = c.post("/alerts", json={"rule_id": "R1", "host": "h"})
    bad = c.post("/alerts", json={"rule_id": "", "host": "h"},
                 headers={"Idempotency-Key": "k"})
    assert no_key.status_code == bad.status_code == 422


def test_cursor_pagination():
    c = make_client()
    for i in range(5):
        c.post("/alerts", json={"rule_id": f"R{i}", "host": "h"},
               headers={"Idempotency-Key": str(i)})
    p1 = c.get("/alerts", params={"limit": 2}).json()
    p2 = c.get("/alerts", params={"limit": 2,
                                  "cursor": p1["next_cursor"]}).json()
    p3 = c.get("/alerts", params={"limit": 2,
                                  "cursor": p2["next_cursor"]}).json()
    ids = [a["id"] for p in (p1, p2, p3) for a in p["items"]]
    assert ids == [1, 2, 3, 4, 5]
    assert p3["next_cursor"] is None
# === end ===
