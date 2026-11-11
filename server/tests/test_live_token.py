"""POST /live-token: jetonul Gemini Live, cu un client HTTP fals (fără rețea, fără cheie reală)."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from ba_server.config import Settings
from ba_server.http_client import HttpError, HttpResponse, get_http
from ba_server.main import create_app
from ba_server.routers.live_token import AUTH_TOKENS_URL, get_now
from ba_server.store import MemoryStore
from conftest import AUTH, SECRET

GEMINI_KEY = "fake-gemini-key-for-tests-only-0000000000"
NOW = datetime(2026, 11, 12, 18, 0, 0, tzinfo=timezone.utc)


class FakeHttp:
    """Păstrează cererile primite și răspunde cu ce i s-a pregătit (sau aruncă `HttpError`)."""

    def __init__(self, response=None, error=None):
        self.calls = []
        self.response = response if response is not None else HttpResponse(200, {"name": "auth_tokens/abc123"})
        self.error = error

    def post_json(self, url, headers, payload, timeout):
        self.calls.append({"url": url, "headers": headers, "payload": payload, "timeout": timeout})
        if self.error:
            raise self.error
        return self.response


def make_client(http, key=GEMINI_KEY):
    app = create_app(Settings(app_secret=SECRET, gemini_api_key=key), MemoryStore())
    app.dependency_overrides[get_http] = lambda: http
    app.dependency_overrides[get_now] = lambda: NOW
    return TestClient(app)


def test_returns_the_token_and_when_it_expires():
    http = FakeHttp()
    res = make_client(http).post("/live-token", headers=AUTH)
    assert res.status_code == 200
    assert res.json() == {"token": "auth_tokens/abc123", "expireAt": "2026-11-12T19:00:00Z", "expiresIn": 3600}


def test_asks_gemini_for_a_single_use_token_with_the_documented_windows():
    http = FakeHttp()
    make_client(http).post("/live-token", headers=AUTH)
    (call,) = http.calls
    assert call["url"] == AUTH_TOKENS_URL
    assert call["url"].startswith("https://generativelanguage.googleapis.com/v1beta/")
    assert call["headers"] == {"x-goog-api-key": GEMINI_KEY}
    assert call["payload"] == {"uses": 1, "expireTime": "2026-11-12T19:00:00Z", "newSessionExpireTime": "2026-11-12T18:02:00Z"}


def test_requires_the_secret():
    http = FakeHttp()
    c = make_client(http)
    assert c.post("/live-token").status_code == 401
    assert c.post("/live-token", headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert http.calls == []  # fără secret, Gemini nu e apelat


def test_a_failure_from_gemini_is_a_clear_error_without_leaking_anything():
    leak = HttpResponse(403, {"error": {"message": f"API key {GEMINI_KEY} is not allowed"}})
    res = make_client(FakeHttp(leak)).post("/live-token", headers=AUTH)
    assert res.status_code == 502
    assert res.json() == {"detail": {"error": "gemini_error", "upstream_status": 403}}
    assert GEMINI_KEY not in res.text


def test_gemini_unreachable_is_a_clear_error():
    res = make_client(FakeHttp(error=HttpError("URLError"))).post("/live-token", headers=AUTH)
    assert res.status_code == 502
    assert res.json() == {"detail": {"error": "gemini_unreachable"}}


@pytest.mark.parametrize("body", [None, [], {}, {"name": ""}, {"name": 5}])
def test_a_response_without_a_token_is_an_error(body):
    res = make_client(FakeHttp(HttpResponse(200, body))).post("/live-token", headers=AUTH)
    assert res.status_code == 502
    assert res.json()["detail"]["error"] in {"gemini_error", "gemini_bad_response"}


def test_without_a_gemini_key_on_the_server_it_says_so_and_does_not_call_out():
    http = FakeHttp()
    res = make_client(http, key="").post("/live-token", headers=AUTH)
    assert res.status_code == 503
    assert res.json() == {"detail": {"error": "gemini_key_missing"}}
    assert http.calls == []


def test_the_key_never_appears_in_a_response_or_in_the_settings_repr():
    c = make_client(FakeHttp())
    ok = c.post("/live-token", headers=AUTH)
    assert GEMINI_KEY not in ok.text
    assert GEMINI_KEY not in repr(Settings(app_secret=SECRET, gemini_api_key=GEMINI_KEY))
    assert GEMINI_KEY not in c.get("/health").text


def test_settings_read_the_key_from_the_environment():
    assert Settings.from_env({"GEMINI_API_KEY": "k"}).gemini_api_key == "k"
    assert Settings.from_env({}).gemini_api_key == ""


def test_the_default_client_is_urllib_not_a_third_party_package():
    from ba_server import http_client

    assert isinstance(http_client.get_http(), http_client.UrllibClient)
