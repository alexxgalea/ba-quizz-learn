"""Clientul HTTP al serverului, pentru apeluri către alte servicii (Gemini).

E injectabil: ruterele cer `Depends(get_http)`, iar testele pun un fals în loc
(`app.dependency_overrides[get_http] = lambda: fake`). Implicit: `urllib` din
biblioteca standard, ca pachetul Lambda să rămână mic (fără `httpx`).
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Protocol


class HttpError(Exception):
    """Nu s-a putut ajunge la serviciu (rețea, DNS, timp depășit). Nu poartă adrese sau antete."""


@dataclass(frozen=True)
class HttpResponse:
    status: int
    # Corpul JSON, sau None dacă nu era JSON.
    body: Any = None


class HttpClient(Protocol):
    def post_json(self, url: str, headers: dict[str, str], payload: dict[str, Any], timeout: float) -> HttpResponse: ...


class UrllibClient:
    def post_json(self, url: str, headers: dict[str, str], payload: dict[str, Any], timeout: float) -> HttpResponse:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST", headers={"content-type": "application/json", **headers})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return HttpResponse(res.status, _parse(res.read()))
        except urllib.error.HTTPError as err:
            return HttpResponse(err.code, _parse(err.read()))
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            # Fără textul erorii în mesaj: ar putea purta adresa cererii.
            raise HttpError(type(err).__name__) from None


def _parse(raw: bytes) -> Any:
    try:
        return json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None


_default = UrllibClient()


def get_http() -> HttpClient:
    return _default
