"""Depozitul de evenimente: interfața mică și falsul în memorie.

Implementarea reală (DynamoDB) stă în `dynamo.py`. Contractul, pe care îl
verifică aceleași teste pentru ambele:

- `append` păstrează fiecare id o singură dată, oricâte ori e trimis (în același
  lot, în loturi diferite, din cereri simultane); primul câștigă.
- Evenimentelor noi li se dau numere de secvență 1, 2, 3, ... fără goluri, în
  ordinea sosirii (și în ordinea din lot).
- `read(after, limit)` întoarce evenimentele cu număr > `after`, în ordine, cel
  mult `limit`; `cursor` e numărul ultimului întors (sau `after`, dacă nu e nimic).
"""
from __future__ import annotations

import copy
import json
import secrets
import threading
from dataclasses import dataclass, field
from typing import Any, Iterable, Protocol

# Epoca unui server care n-a fost șters niciodată.
INITIAL_EPOCH = "0"


def new_epoch() -> str:
    return secrets.token_hex(8)


# Un răspuns Lambda sincron are cel mult 6 MB; rămânem mult sub.
PAGE_BYTES = 3_000_000


@dataclass(frozen=True)
class AppendResult:
    accepted: list[str] = field(default_factory=list)  # ids noi, în ordine
    duplicates: list[str] = field(default_factory=list)  # ids deja păstrate
    cursor: int = 0  # cel mai mare număr de secvență de pe server, după scriere


@dataclass(frozen=True)
class Page:
    events: list[dict[str, Any]]
    cursor: int
    more: bool


@dataclass(frozen=True)
class PurgeResult:
    deleted: int  # evenimente șterse
    epoch: str  # epoca nouă


class EventStore(Protocol):
    def append(self, events: list[dict[str, Any]]) -> AppendResult: ...

    def read(self, after: int, limit: int) -> Page: ...

    def epoch(self) -> str: ...

    def purge(self) -> PurgeResult: ...

    def take_ai_slot(self, day: str, cap: int) -> bool:
        """Contor zilnic pentru /ai (tichetul 06): crește atomic numărul cererilor din ziua
        `day` (AAAA-LL-ZZ, UTC) și întoarce True cât timp nu depășește `cap`; altfel False,
        fără să crească. `cap <= 0` refuză mereu (comutator de urgență pentru AI)."""
        ...


def dump(event: dict[str, Any]) -> str:
    """Forma stocată: JSON compact. Evită tipurile DynamoDB (float devine Decimal)."""
    return json.dumps(event, ensure_ascii=False, separators=(",", ":"))


def dedupe(events: Iterable[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    """Scoate id-urile repetate din același lot (primul câștigă)."""
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    repeated: list[str] = []
    for ev in events:
        if ev["id"] in seen:
            repeated.append(ev["id"])
        else:
            seen.add(ev["id"])
            unique.append(ev)
    return unique, repeated


def take_page(rows: Iterable[tuple[int, str]], after: int, limit: int) -> Page:
    """Taie o pagină din rânduri (număr, json) crescătoare: după `limit` și `PAGE_BYTES`."""
    out: list[dict[str, Any]] = []
    cursor = after
    size = 0
    more = False
    for seq, raw in rows:
        if len(out) >= limit or (out and size + len(raw) > PAGE_BYTES):
            more = True
            break
        out.append(json.loads(raw))
        cursor = seq
        size += len(raw)
    return Page(events=out, cursor=cursor, more=more)


class MemoryStore:
    """Falsul din teste și din rularea locală. Sigur la fire de execuție."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._rows: list[tuple[int, str]] = []  # (număr, json); număr = index + 1
        self._ids: set[str] = set()
        self._ai_days: dict[str, int] = {}
        self._epoch = INITIAL_EPOCH

    def epoch(self) -> str:
        with self._lock:
            return self._epoch

    def purge(self) -> PurgeResult:
        with self._lock:
            deleted = len(self._rows)
            self._rows = []
            self._ids = set()
            self._epoch = new_epoch()
            return PurgeResult(deleted, self._epoch)

    def take_ai_slot(self, day: str, cap: int) -> bool:
        with self._lock:
            n = self._ai_days.get(day, 0)
            if cap <= 0 or n >= cap:
                return False
            self._ai_days[day] = n + 1
            return True

    def append(self, events: list[dict[str, Any]]) -> AppendResult:
        unique, repeated = dedupe(copy.deepcopy(events))
        with self._lock:
            accepted: list[str] = []
            duplicates = list(repeated)
            for ev in unique:
                if ev["id"] in self._ids:
                    duplicates.append(ev["id"])
                    continue
                self._ids.add(ev["id"])
                self._rows.append((len(self._rows) + 1, dump(ev)))
                accepted.append(ev["id"])
            return AppendResult(accepted, duplicates, len(self._rows))

    def read(self, after: int, limit: int) -> Page:
        with self._lock:
            rows = self._rows[after:]  # numerele încep de la 1: cele > after
        return take_page(iter(rows), after, limit)
