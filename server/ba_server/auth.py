"""Recunoașterea: un singur secret, în antetul `Authorization: Bearer <secret>`."""
from __future__ import annotations

import hmac

from fastapi import HTTPException, Request


def require_secret(request: Request) -> None:
    """Dependență pusă pe fiecare ruter care nu e public (vezi `main.py`).

    Același 401, fără detalii, pentru secret lipsă, greșit sau neconfigurat.
    """
    expected = request.app.state.settings.app_secret
    scheme, _, given = request.headers.get("authorization", "").partition(" ")
    given = given.strip()
    # Compară mereu, ca durata să nu spună dacă secretul lipsește sau e greșit.
    same = hmac.compare_digest(given.encode("utf-8"), expected.encode("utf-8"))
    if not (expected and given and scheme.lower() == "bearer" and same):
        raise HTTPException(status_code=401, detail="unauthorized")
