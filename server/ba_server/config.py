"""Setările serverului, citite din variabilele de mediu ale funcției.

Nimic secret nu stă în repo: secretul vine din `APP_SECRET`, pus la lansare
(vezi `deploy.sh`). Ruterele noi (AI, jeton Jarvis) își adaugă aici câmpurile
lor, de exemplu cheile Gemini și DeepSeek.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    # Secretul lung al lui Alex. Gol = serverul refuză orice cerere.
    app_secret: str = ""
    # Tabelul DynamoDB și partiția (un utilizator; ușa spre mai mulți rămâne deschisă).
    table_name: str = "ba-events"
    user_pk: str = "u#alex"
    # Doar pentru dezvoltare locală: originea permisă de aplicația însăși.
    # În AWS, CORS e configurat o singură dată, pe adresa funcției (template.yaml).
    local_cors_origin: str = ""
    # Cheia Gemini (tichetele 06 și 08). Gol = rutele care o cer răspund 503. Nu apare în `repr`.
    gemini_api_key: str = field(default="", repr=False)

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "Settings":
        e = os.environ if env is None else env
        return cls(
            app_secret=e.get("APP_SECRET", ""),
            table_name=e.get("TABLE_NAME", cls.table_name),
            user_pk=e.get("USER_PK", cls.user_pk),
            local_cors_origin=e.get("LOCAL_CORS_ORIGIN", ""),
            gemini_api_key=e.get("GEMINI_API_KEY", ""),
        )
