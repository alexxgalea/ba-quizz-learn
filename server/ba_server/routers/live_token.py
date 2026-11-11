"""POST /live-token: un jeton de scurtă durată pentru Gemini Live (tichetul 08, ADR 0004).

Cheia Gemini rămâne pe server. Clientul primește doar jetonul și deschide singur
conexiunea WebSocket (`BidiGenerateContentConstrained?access_token=`, doar `v1beta`).
Jetonul nu se prelungește: o sesiune mai lungă decât `expireTime` cere unul nou.
Fără constrângeri de configurare (instrucțiunile sistemului vin din client).

Surse: https://ai.google.dev/gemini-api/docs/ephemeral-tokens (citit 2026-11-11);
detalii în research/platforma-facts.md, secțiunea 4. Funcția e „preview” la Google.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from ..config import Settings
from ..deps import get_settings
from ..http_client import HttpClient, HttpError, get_http

AUTH_TOKENS_URL = "https://generativelanguage.googleapis.com/v1beta/auth_tokens"
TOKEN_LIFE = timedelta(minutes=60)  # acoperă o lecție obișnuită; limita Google e 20 de ore
NEW_SESSION_WINDOW = timedelta(minutes=2)  # cât timp mai poate deschide o sesiune nouă
TIMEOUT_S = 10.0

router = APIRouter()


def get_now() -> datetime:
    """Ceasul serverului; testele îl înlocuiesc prin `dependency_overrides`."""
    return datetime.now(timezone.utc)


def _iso(t: datetime) -> str:
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _fail(code: str, status: int = 502, **extra: Any) -> HTTPException:
    # Doar coduri fixe: nici cheia, nici corpul răspunsului Gemini nu ajung la client.
    return HTTPException(status_code=status, detail={"error": code, **extra})


@router.post("/live-token")
def live_token(
    settings: Settings = Depends(get_settings),
    http: HttpClient = Depends(get_http),
    now: datetime = Depends(get_now),
) -> dict[str, Any]:
    if not settings.gemini_api_key:
        raise _fail("gemini_key_missing", 503)
    expire = now + TOKEN_LIFE
    body = {"uses": 1, "expireTime": _iso(expire), "newSessionExpireTime": _iso(now + NEW_SESSION_WINDOW)}
    try:
        res = http.post_json(AUTH_TOKENS_URL, {"x-goog-api-key": settings.gemini_api_key}, body, TIMEOUT_S)
    except HttpError:
        raise _fail("gemini_unreachable") from None
    if res.status != 200 or not isinstance(res.body, dict):
        raise _fail("gemini_error", upstream_status=res.status)
    token = res.body.get("name")
    if not isinstance(token, str) or not token:
        raise _fail("gemini_bad_response")
    return {"token": token, "expireAt": _iso(expire), "expiresIn": int(TOKEN_LIFE.total_seconds())}
