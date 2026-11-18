"""Dependențe FastAPI pentru rutere: `Depends(get_store)`, `Depends(get_settings)`, `Depends(get_account)`."""
from __future__ import annotations

from fastapi import Request

from .accounts import Account
from .config import Settings
from .store import EventStore


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_account(request: Request) -> Account:
    """Contul recunoscut de `require_secret` (pus pe fiecare ruter nepublic)."""
    return request.state.account


def get_store(request: Request) -> EventStore:
    """Depozitul contului care a făcut cererea: partiția lui, cu jurnalul și plafonul AI ale lui."""
    return request.app.state.store_for(request.state.account)
