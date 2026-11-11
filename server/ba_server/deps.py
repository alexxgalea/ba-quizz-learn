"""Dependențe FastAPI pentru rutere: `Depends(get_store)`, `Depends(get_settings)`."""
from __future__ import annotations

from fastapi import Request

from .config import Settings
from .store import EventStore


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_store(request: Request) -> EventStore:
    return request.app.state.store
