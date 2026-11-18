"""Recunoașterea: un secret pe cont (ADR 0006), în antetul `Authorization: Bearer <secret>`."""
from __future__ import annotations

from fastapi import HTTPException, Request

from .accounts import find


def require_secret(request: Request) -> None:
    """Dependență pusă pe fiecare ruter care nu e public (vezi `main.py`).

    Găsește contul după secret și îl pune în `request.state.account` (de aici își iau
    ruterele depozitul, prin `get_store`). Același 401, fără detalii, pentru secret
    lipsă, greșit sau neconfigurat.
    """
    accounts = request.app.state.settings.accounts
    scheme, _, given = request.headers.get("authorization", "").partition(" ")
    given = given.strip()
    # Compară mereu, cu toate conturile, ca durata să nu spună dacă secretul lipsește sau e greșit.
    account = find(accounts, given)
    if not (given and scheme.lower() == "bearer" and account is not None):
        raise HTTPException(status_code=401, detail="unauthorized")
    request.state.account = account
