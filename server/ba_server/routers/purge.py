"""POST /events/purge: șterge tot jurnalul de pe server (tichetul 09, povestea 7 a specului).

Cere secretul (ca toate rutele) și un câmp `confirm` exact: o cerere fără el, sau cu alt
text, e refuzată cu 422 și nu șterge nimic. Șterge evenimentele, contorul și marcajele de
idempotență ale utilizatorului, pe oricare depozit; contorul zilnic al `/ai` rămâne.
Răspuns: `{"deleted": <câte evenimente>, "epoch": "<epoca nouă>"}`. Epoca nouă ajunge la
clienți prin `GET` / `POST /events`: un dispozitiv care o vede diferită își reia cursorul
de la 0 și NU retrimite singur ce era deja trimis (sync.js; copia locală rămâne).

Ruta e POST (nu DELETE): CORS-ul funcției permite doar GET și POST (template.yaml).
"""
from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from ..deps import get_store
from ..store import EventStore

CONFIRM = "purge-all-events"
log = logging.getLogger("ba_server.purge")

router = APIRouter()


class PurgeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirm: Literal["purge-all-events"]


@router.post("/events/purge")
def purge_events(_: PurgeRequest, store: EventStore = Depends(get_store)) -> dict[str, Any]:
    res = store.purge()
    log.warning("events purged count=%d", res.deleted)  # doar numărul: fără ids, fără text
    return {"deleted": res.deleted, "epoch": res.epoch}
