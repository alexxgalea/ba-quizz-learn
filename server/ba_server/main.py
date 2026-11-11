"""Fabrica aplicației: `create_app(settings=None, store=None)`.

Pe Lambda pornește `uvicorn ba_server.main:create_app --factory` (vezi `run.sh`).
Testele dau un `Settings` și un `MemoryStore` (sau un `DynamoStore` peste moto).
"""
from __future__ import annotations

import importlib
import pkgutil

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import routers
from .auth import require_secret
from .config import Settings
from .store import EventStore


def _load_routers(app: FastAPI) -> None:
    """Include fiecare modul din `routers/` care are `router`.

    Sigur implicit: o rută are secretul cerut, afară de modulele cu `PUBLIC = True`.
    """
    for info in pkgutil.iter_modules(routers.__path__):
        mod = importlib.import_module(f"{routers.__name__}.{info.name}")
        router = getattr(mod, "router", None)
        if router is None:
            continue
        guard = [] if getattr(mod, "PUBLIC", False) else [Depends(require_secret)]
        app.include_router(router, dependencies=guard)


def create_app(settings: Settings | None = None, store: EventStore | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    if store is None:
        from .dynamo import DynamoStore

        store = DynamoStore.from_settings(settings)

    app = FastAPI(
        title="ba-quizz-learn server",
        # Fără documentație publică: adresa funcției e deschisă, secretul se verifică în cod.
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.settings = settings
    app.state.store = store

    # CORS în AWS: doar pe adresa funcției (template.yaml). Aici, doar pentru
    # rularea locală, când `LOCAL_CORS_ORIGIN` e setat; altfel aplicația nu pune
    # antete CORS (Lambda le-ar dubla).
    if settings.local_cors_origin:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[settings.local_cors_origin],
            allow_methods=["GET", "POST"],
            allow_headers=["authorization", "content-type"],
            max_age=600,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        # Un corp stricat nu trebuie să dea detalii celui fără secret: FastAPI
        # citește corpul înaintea dependențelor, deci verificăm secretul aici.
        try:
            require_secret(request)
        except HTTPException as denied:
            return JSONResponse({"detail": denied.detail}, status_code=denied.status_code)
        return await request_validation_exception_handler(request, exc)

    _load_routers(app)
    return app
