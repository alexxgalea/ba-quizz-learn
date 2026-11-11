"""POST /events (lot, idempotent după id) și GET /events?after=&limit= (paginat).

Serverul nu cunoaște forma evenimentului: cere doar un `id` și păstrează restul
neschimbat (ADR 0003). Clientul îmbină prin reuniune după id. Fiecare răspuns poartă
`epoch`: șirul se schimbă când jurnalul de pe server e șters (`routers/purge.py`).
"""
from __future__ import annotations

import json
import re
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from ..deps import get_store
from ..store import EventStore

MAX_BATCH = 500
MAX_EVENT_BYTES = 100_000
MAX_LIMIT = 500
DEFAULT_LIMIT = 100
ID_RE = re.compile(r"^[A-Za-z0-9_.:~-]{1,128}$")

router = APIRouter()


class Event(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str

    @field_validator("id")
    @classmethod
    def _id_ok(cls, v: str) -> str:
        if not ID_RE.fullmatch(v):  # `$` ar lăsa să treacă un newline final
            raise ValueError("id invalid")
        return v


class EventBatch(BaseModel):
    events: list[dict[str, Any]] = Field(min_length=1, max_length=MAX_BATCH)

    @field_validator("events")
    @classmethod
    def _each_ok(cls, events: list[dict[str, Any]]) -> list[dict[str, Any]]:
        for ev in events:
            Event.model_validate(ev)
            if len(json.dumps(ev, ensure_ascii=False)) > MAX_EVENT_BYTES:
                raise ValueError("eveniment prea mare")
        return events


@router.post("/events")
def post_events(batch: EventBatch, store: EventStore = Depends(get_store)) -> dict[str, Any]:
    res = store.append(batch.events)
    # Epoca se citește după scriere: un client care primește o epoca nouă își reia cursorul de la 0.
    return {"accepted": res.accepted, "duplicates": res.duplicates, "cursor": res.cursor, "epoch": store.epoch()}


@router.get("/events")
def get_events(
    after: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    store: EventStore = Depends(get_store),
) -> dict[str, Any]:
    epoch = store.epoch()  # înaintea paginii: dacă o ștergere vine între ele, clientul vede epoca veche și o corectează data viitoare
    page = store.read(after, limit)
    return {"events": page.events, "cursor": page.cursor, "more": page.more, "epoch": epoch}
