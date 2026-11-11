"""Rulare locală pe depozit în memorie: `APP_SECRET=... make run` (fără AWS)."""
from fastapi import FastAPI

from .config import Settings
from .main import create_app
from .store import MemoryStore


def make_app() -> FastAPI:
    return create_app(Settings.from_env(), MemoryStore())
