"""Apelurile către modele (tichetul 06): Gemini întâi, DeepSeek la eșec.

Clientul HTTP e cel comun al serverului (`http_client.HttpClient`, același ca la
`/live-token`): testele pun un fals prin `app.dependency_overrides[get_http]`.
Cheile pleacă doar în antete,
niciodată în adresă, și nu se scriu în jurnale. Fapte verificate pe 2026-11-11
(`research/platforma-facts.md`, secțiunea 5): `gemini-3.5-flash-lite` prin
`generateContent`; `deepseek-flash` pe `/chat/completions`, cu `response_format`
`json_object` și `thinking: {type: disabled}`.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from .config import Settings
from .http_client import HttpClient, HttpError

log = logging.getLogger("ba_server.ai")

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
PROVIDERS = ("gemini", "deepseek")
TEMPERATURE = 0.3

class ModelError(Exception):
    """Un model nu a dat text. `reason` e o etichetă scurtă, sigură pentru jurnal."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class AllModelsFailed(Exception):
    """Nicio sursă n-a dat text (sau nu e configurată nicio cheie)."""


@dataclass(frozen=True)
class Prompt:
    system: str
    user: str
    json_mode: bool = False
    max_tokens: int = 1500


def _status_reason(status: int) -> str:
    return "auth" if status in (401, 403) else "rate" if status in (402, 429) else "server" if status >= 500 else "http"


def call_gemini(http: HttpClient, s: Settings, p: Prompt) -> str:
    gen: dict[str, Any] = {"temperature": TEMPERATURE, "maxOutputTokens": p.max_tokens}
    if p.json_mode:
        gen["responseMimeType"] = "application/json"
    body: dict[str, Any] = {"contents": [{"role": "user", "parts": [{"text": p.user}]}], "generationConfig": gen}
    if p.system:
        body["systemInstruction"] = {"parts": [{"text": p.system}]}
    res = http.post_json(f"{GEMINI_BASE}{s.gemini_model}:generateContent", {"x-goog-api-key": s.gemini_api_key}, body, s.ai_timeout_s)
    status, data = res.status, res.body
    if status != 200:
        raise ModelError(_status_reason(status))
    try:
        parts = data["candidates"][0]["content"]["parts"]
        text = "".join(x["text"] for x in parts if isinstance(x.get("text"), str))
    except (KeyError, IndexError, TypeError, AttributeError):
        text = ""
    if not text.strip():
        raise ModelError("empty")
    return text


def call_deepseek(http: HttpClient, s: Settings, p: Prompt) -> str:
    body: dict[str, Any] = {
        "model": s.deepseek_model,
        "messages": ([{"role": "system", "content": p.system}] if p.system else []) + [{"role": "user", "content": p.user}],
        "thinking": {"type": "disabled"},
        "temperature": TEMPERATURE,
        "max_tokens": p.max_tokens,
        "stream": False,
    }
    if p.json_mode:
        body["response_format"] = {"type": "json_object"}
    res = http.post_json(DEEPSEEK_URL, {"Authorization": f"Bearer {s.deepseek_api_key}"}, body, s.ai_timeout_s)
    status, data = res.status, res.body
    if status != 200:
        raise ModelError(_status_reason(status))
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        text = None
    if not isinstance(text, str) or not text.strip():
        raise ModelError("empty")
    return text


_CALLS = {"gemini": call_gemini, "deepseek": call_deepseek}


def generate(http: HttpClient, s: Settings, p: Prompt, prefer: str | None = None) -> tuple[str, str]:
    """Întoarce (text, sursa). Încearcă sursele cu cheie, în ordine (`prefer` primul);
    eșecul uneia (HTTP, rețea, răspuns gol) trece la următoarea. Jurnalul spune doar sursa și motivul."""
    keys = {"gemini": s.gemini_api_key, "deepseek": s.deepseek_api_key}
    order = list(dict.fromkeys(x for x in (prefer, *PROVIDERS) if x in keys))
    tried = 0
    for name in order:
        if not keys[name]:
            continue
        tried += 1
        try:
            return _CALLS[name](http, s, p), name
        except ModelError as e:
            log.warning("ai source=%s failed reason=%s", name, e.reason)
        except HttpError:
            log.warning("ai source=%s failed reason=network", name)
    if not tried:
        log.error("ai no source configured")
    raise AllModelsFailed()
