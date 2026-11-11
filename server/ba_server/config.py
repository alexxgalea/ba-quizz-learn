"""Setările serverului, citite din variabilele de mediu ale funcției.

Nimic secret nu stă în repo: secretul vine din `APP_SECRET`, pus la lansare
(vezi `deploy.sh`). Ruterele noi (AI, jeton Jarvis) își adaugă aici câmpurile
lor, de exemplu cheile Gemini și DeepSeek.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _int(raw: str | None, default: int) -> int:
    try:
        return int(raw) if raw not in (None, "") else default
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    # Secretul lung al lui Alex. Gol = serverul refuză orice cerere.
    app_secret: str = field(default="", repr=False)
    # Tabelul DynamoDB și partiția (un utilizator; ușa spre mai mulți rămâne deschisă).
    table_name: str = "ba-events"
    user_pk: str = "u#alex"
    # Doar pentru dezvoltare locală: originea permisă de aplicația însăși.
    # În AWS, CORS e configurat o singură dată, pe adresa funcției (template.yaml).
    local_cors_origin: str = ""
    # AI prin server (tichetul 06). Cheile sunt variabile de mediu ale funcției; fără
    # cheie, sursa respectivă se sare. `repr=False`: o cheie nu ajunge într-un jurnal.
    gemini_api_key: str = field(default="", repr=False)
    deepseek_api_key: str = field(default="", repr=False)
    # Numele modelelor: verificate pe 2026-11-11 (research/platforma-facts.md, secțiunea 5).
    gemini_model: str = "gemini-3.5-flash-lite"
    deepseek_model: str = "deepseek-flash"
    # Plafonul zilnic de cereri la /ai (ziua UTC) și mărimea maximă a promptului
    # (system + user, în caractere): un secret scăpat nu trebuie să coste.
    ai_daily_cap: int = 300
    ai_max_prompt_chars: int = 60_000
    # Pe fiecare model; două modele la rând încap în timpul funcției (template.yaml).
    ai_timeout_s: float = 20.0

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        e = os.environ if env is None else env
        return cls(
            app_secret=e.get("APP_SECRET", ""),
            table_name=e.get("TABLE_NAME", cls.table_name),
            user_pk=e.get("USER_PK", cls.user_pk),
            local_cors_origin=e.get("LOCAL_CORS_ORIGIN", ""),
            gemini_api_key=e.get("GEMINI_API_KEY", ""),
            deepseek_api_key=e.get("DEEPSEEK_API_KEY", ""),
            gemini_model=e.get("GEMINI_MODEL") or cls.gemini_model,
            deepseek_model=e.get("DEEPSEEK_MODEL") or cls.deepseek_model,
            ai_daily_cap=_int(e.get("AI_DAILY_CAP"), cls.ai_daily_cap),
            ai_max_prompt_chars=_int(e.get("AI_MAX_PROMPT_CHARS"), cls.ai_max_prompt_chars),
            ai_timeout_s=float(e.get("AI_TIMEOUT_S") or cls.ai_timeout_s),
        )
