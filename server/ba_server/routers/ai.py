"""POST /ai: promptul gata făcut al clientului, textul modelului înapoi (tichetul 06).

Gemini întâi, DeepSeek la eșec. Prompturile și parserele rămân în client; serverul
nu știe ce întreabă. Apărarea, în ordine: secretul (ca la toate rutele), mărimea
promptului, plafonul zilnic. Erorile sunt coduri scurte în `detail`:

- 401 `unauthorized`: secret lipsă sau greșit;
- 413 `prompt_too_large`: system + user depășesc `AI_MAX_PROMPT_CHARS`;
- 429 `daily_cap`: plafonul zilnic (`AI_DAILY_CAP`) e atins;
- 502 `ai_unavailable`: niciun model n-a dat text (sau nu e nicio cheie);
- 422: corp invalid (validarea FastAPI).
"""
from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .. import models
from ..config import Settings
from ..deps import get_settings, get_store
from ..store import EventStore

log = logging.getLogger("ba_server.ai")

router = APIRouter()


class AiRequest(BaseModel):
    system: str = ""
    user: str = Field(min_length=1)
    # `quick` = întrebare scurtă (răspuns plafonat la 500 de tokeni), `default` = verdict sau explicație.
    kind: Literal["quick", "default"] = "default"
    # Răspunsul trebuie să fie JSON (Gemini: responseMimeType; DeepSeek: json_object).
    json_mode: bool = False
    max_tokens: int | None = Field(default=None, ge=1, le=4096)
    # Sugestie de sursă: încercată prima, dacă are cheie.
    model: Literal["gemini", "deepseek"] | None = None


class AiResponse(BaseModel):
    text: str
    model: Literal["gemini", "deepseek"]


def get_http(request: Request) -> models.HttpPost:
    return request.app.state.model_http


def get_today(request: Request):
    return request.app.state.today


@router.post("/ai", response_model=AiResponse)
def ai(
    body: AiRequest,
    settings: Settings = Depends(get_settings),
    store: EventStore = Depends(get_store),
    http: models.HttpPost = Depends(get_http),
    today=Depends(get_today),
) -> AiResponse:
    size = len(body.system) + len(body.user)
    if size > settings.ai_max_prompt_chars:
        raise HTTPException(status_code=413, detail="prompt_too_large")
    if not store.take_ai_slot(today(), settings.ai_daily_cap):
        log.warning("ai daily cap reached")
        raise HTTPException(status_code=429, detail="daily_cap")
    prompt = models.Prompt(
        system=body.system, user=body.user, json_mode=body.json_mode,
        max_tokens=body.max_tokens or (500 if body.kind == "quick" else 1500),
    )
    try:
        text, source = models.generate(http, settings, prompt, body.model)
    except models.AllModelsFailed:
        raise HTTPException(status_code=502, detail="ai_unavailable") from None
    log.info("ai ok source=%s kind=%s chars=%d", source, body.kind, size)
    return AiResponse(text=text, model=source)
