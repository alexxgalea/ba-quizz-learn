# Referințele de schelet pentru modulul asgi (FastAPI).
# Fiecare secțiune „=== s-… ===” ajunge în aplicație (build.mjs).
# Testele lor sunt în test_skel_asgi.py: încarcă fiecare secțiune într-un
# modul nou și o apelează prin TestClient, sau o rulează cu pytest
# când referința însăși e un test. Pe CoderPad: `pip3 install fastapi httpx`.

# === s-asgi-endpoint ===
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()
USERS: dict[int, dict] = {}


class UserIn(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: int
    email: str


@app.post(
    "/users",
    status_code=201,
    response_model=UserOut,
)
def create_user(body: UserIn):
    uid = len(USERS) + 1
    user = body.model_dump()
    user["id"] = uid
    USERS[uid] = user
    return user


@app.get("/users/{uid}",
         response_model=UserOut)
def get_user(uid: int):
    if uid not in USERS:
        raise HTTPException(
            404, "user inexistent"
        )
    return USERS[uid]
# === end ===

# === s-asgi-depends-yield ===
from fastapi import Depends, FastAPI

app = FastAPI()


def get_session():
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@app.post("/notes", status_code=201)
def add_note(
    text: str, s=Depends(get_session)
):
    s.add(text)
    s.commit()
    return {"ok": True}
# === end ===

# === s-asgi-override ===
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

app = FastAPI()


def get_db():
    raise RuntimeError("DB reală")


@app.get("/count")
def count(db=Depends(get_db)):
    return {"n": len(db)}


def fake_db():
    return [1, 2]


@pytest.fixture
def client():
    over = app.dependency_overrides
    over[get_db] = fake_db
    yield TestClient(app)
    over.clear()


def test_count(client):
    r = client.get("/count")
    assert r.status_code == 200
    assert r.json() == {"n": 2}
# === end ===

# === s-asgi-lifespan ===
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = ["conn"]  # startup
    yield
    app.state.pool.clear()  # shutdown


app = FastAPI(lifespan=lifespan)


@app.get("/pool")
def pool(request: Request):
    n = len(request.app.state.pool)
    return {"n": n}


def test_lifespan_runs():
    with TestClient(app) as client:
        r = client.get("/pool")
        assert r.json() == {"n": 1}
    assert app.state.pool == []
# === end ===

# === s-asgi-async-def ===
import time
from asyncio import to_thread

from fastapi import FastAPI

app = FastAPI()


def blocking_io():
    time.sleep(0.2)  # client sync, fișier
    return "gata"


@app.get("/sync")
def sync_ep():
    # def: FastAPI îl pune în threadpool
    return {"r": blocking_io()}


@app.get("/async")
async def async_ep():
    # async def e pe event loop: nu bloca
    r = await to_thread(blocking_io)
    return {"r": r}
# === end ===
