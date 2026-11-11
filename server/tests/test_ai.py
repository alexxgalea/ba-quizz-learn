"""POST /ai: Gemini întâi, DeepSeek la eșec, plafon zilnic, limită de mărime, fără scurgeri de chei.

Modelele sunt false (clientul HTTP e injectat), deci testele nu ating rețeaua. Plafonul
trece aceleași teste pe `MemoryStore` și pe `DynamoStore` (fixtura `store`).
"""
import logging
import threading
import urllib.error

import pytest
from fastapi.testclient import TestClient

from ba_server import models
from ba_server.config import Settings
from ba_server.main import create_app
from ba_server.http_client import HttpError, HttpResponse, UrllibClient, get_http
from conftest import AUTH, SECRET

GEM_KEY = "gem-fake-gemini-key-for-tests-0000000"
DS_KEY = "sk-fake-deepseek-key-for-tests-0000000000"
USER_TEXT = "răspunsul-lui-alex-despre-GIL"


def gemini_ok(text):
    return 200, {"candidates": [{"content": {"parts": [{"text": text}]}}]}


def deepseek_ok(text):
    return 200, {"choices": [{"message": {"content": text}}]}


class FakeModels:
    """Clientul HTTP fals: scriptează răspunsul fiecărui model și ține un jurnal de apeluri."""

    def __init__(self, gemini=None, deepseek=None):
        self.script = {"gemini": gemini or [gemini_ok("de la gemini")], "deepseek": deepseek or [deepseek_ok("de la deepseek")]}
        self.calls = []

    def post_json(self, url, headers, body, timeout):
        name = "gemini" if "generativelanguage" in url else "deepseek"
        self.calls.append({"model": name, "url": url, "headers": headers, "body": body, "timeout": timeout})
        r = self.script[name][min(sum(c["model"] == name for c in self.calls) - 1, len(self.script[name]) - 1)]
        if isinstance(r, Exception):
            raise r
        return HttpResponse(*r)

    def names(self):
        return [c["model"] for c in self.calls]


def make(store, fake, **over):
    base = dict(app_secret=SECRET, gemini_api_key=GEM_KEY, deepseek_api_key=DS_KEY)
    base.update(over)
    day = {"d": "2026-11-11"}
    app = create_app(Settings(**base), store, today=lambda: day["d"])
    app.dependency_overrides[get_http] = lambda: fake  # același punct de injectare ca la /live-token
    c = TestClient(app)
    c.day = day
    return c


def post(c, **body):
    body.setdefault("user", USER_TEXT)
    return c.post("/ai", json=body, headers=AUTH)


# ---- calea fericită ---------------------------------------------------------


def test_gemini_answers_first_and_the_request_has_the_expected_shape(store):
    fake = FakeModels()
    c = make(store, fake)
    r = post(c, system="Ești examinator.", user="Întrebare?", json_mode=True, kind="quick")
    assert r.status_code == 200 and r.json() == {"text": "de la gemini", "model": "gemini"}
    assert fake.names() == ["gemini"]
    call = fake.calls[0]
    assert call["url"].endswith("/models/gemini-3.5-flash-lite:generateContent")
    assert call["headers"] == {"x-goog-api-key": GEM_KEY}  # cheia în antet, nu în adresă
    assert GEM_KEY not in call["url"]
    assert call["body"]["systemInstruction"] == {"parts": [{"text": "Ești examinator."}]}
    assert call["body"]["contents"] == [{"role": "user", "parts": [{"text": "Întrebare?"}]}]
    assert call["body"]["generationConfig"]["responseMimeType"] == "application/json"
    assert call["body"]["generationConfig"]["maxOutputTokens"] == 500  # quick
    assert call["timeout"] == 20.0


def test_plain_text_request_asks_for_no_json_and_explicit_max_tokens_wins(store):
    fake = FakeModels()
    post(make(store, fake), system="", user="Explică", max_tokens=900)
    gen = fake.calls[0]["body"]["generationConfig"]
    assert "responseMimeType" not in gen and gen["maxOutputTokens"] == 900
    assert "systemInstruction" not in fake.calls[0]["body"]


def test_default_kind_gets_the_larger_answer_budget(store):
    fake = FakeModels()
    post(make(store, fake))
    assert fake.calls[0]["body"]["generationConfig"]["maxOutputTokens"] == 1500


def test_model_hint_tries_that_source_first(store):
    fake = FakeModels()
    r = post(make(store, fake), model="deepseek")
    assert r.json()["model"] == "deepseek" and fake.names() == ["deepseek"]


# ---- căderea pe DeepSeek ----------------------------------------------------


@pytest.mark.parametrize(
    "failure",
    [
        pytest.param((500, {"error": {"message": "boom"}}), id="500"),
        pytest.param((429, {"error": {"message": "quota"}}), id="429"),
        pytest.param((403, {"error": {"message": "bad key"}}), id="403"),
        pytest.param((200, {"candidates": []}), id="gol"),
        pytest.param((200, {"promptFeedback": {"blockReason": "SAFETY"}}), id="blocat"),
        pytest.param((200, None), id="fara-json"),
        pytest.param(HttpError(), id="retea"),
    ],
)
def test_gemini_failure_falls_back_to_deepseek(store, failure):
    fake = FakeModels(gemini=[failure])
    r = post(make(store, fake), system="S", user="U", json_mode=True)
    assert r.status_code == 200 and r.json() == {"text": "de la deepseek", "model": "deepseek"}
    assert fake.names() == ["gemini", "deepseek"]
    ds = fake.calls[1]
    assert ds["url"] == "https://api.deepseek.com/chat/completions"
    assert ds["headers"] == {"Authorization": f"Bearer {DS_KEY}"}
    b = ds["body"]
    assert b["model"] == "deepseek-flash" and b["stream"] is False and b["thinking"] == {"type": "disabled"}
    assert b["response_format"] == {"type": "json_object"}
    assert b["messages"] == [{"role": "system", "content": "S"}, {"role": "user", "content": "U"}]


def test_deepseek_gets_no_json_format_for_plain_text(store):
    fake = FakeModels(gemini=[(500, None)])
    post(make(store, fake), json_mode=False)
    assert "response_format" not in fake.calls[1]["body"]


def test_no_gemini_key_goes_straight_to_deepseek(store):
    fake = FakeModels()
    r = post(make(store, fake, gemini_api_key=""))
    assert r.json()["model"] == "deepseek" and fake.names() == ["deepseek"]


def test_total_failure_is_a_clear_502_code(store):
    fake = FakeModels(gemini=[(500, None)], deepseek=[HttpError()])
    r = post(make(store, fake))
    assert r.status_code == 502 and r.json() == {"detail": "ai_unavailable"}
    assert fake.names() == ["gemini", "deepseek"]


def test_deepseek_empty_content_counts_as_failure(store):
    fake = FakeModels(gemini=[(500, None)], deepseek=[deepseek_ok("   ")])
    assert post(make(store, fake)).status_code == 502


def test_no_keys_at_all_is_502_without_calls(store):
    fake = FakeModels()
    r = post(make(store, fake, gemini_api_key="", deepseek_api_key=""))
    assert r.status_code == 502 and r.json() == {"detail": "ai_unavailable"} and fake.calls == []


# ---- limita de mărime -------------------------------------------------------


def test_oversized_prompt_is_413_and_never_reaches_a_model_or_the_cap(store):
    fake = FakeModels()
    c = make(store, fake, ai_max_prompt_chars=100, ai_daily_cap=1)
    r = post(c, system="s" * 60, user="u" * 41)
    assert r.status_code == 413 and r.json() == {"detail": "prompt_too_large"}
    assert fake.calls == []
    assert post(c, system="s" * 60, user="u" * 40).status_code == 200  # exact la limită trece; plafonul nu s-a consumat


def test_default_limit_covers_the_biggest_sheet_context():
    assert Settings().ai_max_prompt_chars >= 35_000  # ASK_DZ_MAX = 30.000 + întrebare + instrucțiuni


@pytest.mark.parametrize(
    "body",
    [{}, {"user": ""}, {"user": "x", "kind": "huge"}, {"user": "x", "max_tokens": 0}, {"user": "x", "max_tokens": 99999}, {"user": "x", "model": "gpt"}, {"user": 5}],
)
def test_malformed_body_is_422_and_free(store, body):
    fake = FakeModels()
    c = make(store, fake, ai_daily_cap=1)
    assert c.post("/ai", json=body, headers=AUTH).status_code == 422
    assert fake.calls == []
    assert post(c).status_code == 200  # plafonul nu s-a consumat


# ---- plafonul zilnic --------------------------------------------------------


def test_daily_cap_refuses_after_n_requests_and_resets_next_day(store):
    fake = FakeModels()
    c = make(store, fake, ai_daily_cap=3)
    assert [post(c).status_code for _ in range(3)] == [200, 200, 200]
    r = post(c)
    assert r.status_code == 429 and r.json() == {"detail": "daily_cap"}
    assert len(fake.calls) == 3  # a patra cerere nu a costat nimic
    assert post(c).status_code == 429
    c.day["d"] = "2026-11-12"
    assert post(c).status_code == 200


def test_failed_model_calls_still_count_toward_the_cap(store):
    fake = FakeModels(gemini=[(500, None)], deepseek=[(500, None)])
    c = make(store, fake, ai_daily_cap=2)
    assert [post(c).status_code for _ in range(3)] == [502, 502, 429]


def test_cap_zero_is_a_kill_switch(store):
    fake = FakeModels()
    assert post(make(store, fake, ai_daily_cap=0)).status_code == 429 and fake.calls == []


def test_cap_is_atomic_under_concurrent_requests(store):
    fake = FakeModels()
    c = make(store, fake, ai_daily_cap=5)
    codes, lock = [], threading.Lock()

    def go():
        code = post(c).status_code
        with lock:
            codes.append(code)

    threads = [threading.Thread(target=go) for _ in range(14)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(codes) == [200] * 5 + [429] * 9
    assert len(fake.calls) == 5


def test_the_counter_does_not_disturb_the_event_log(store):
    c = make(store, FakeModels())
    post(c)
    assert c.post("/events", json={"events": [{"id": "e1"}]}, headers=AUTH).json()["cursor"] == 1
    got = c.get("/events", headers=AUTH).json()
    assert [e["id"] for e in got["events"]] == ["e1"] and got["cursor"] == 1


# ---- recunoașterea ----------------------------------------------------------


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer nope"}, {"Authorization": "Basic " + SECRET}])
def test_no_secret_is_401_and_nothing_is_spent(store, headers):
    fake = FakeModels()
    c = make(store, fake, ai_daily_cap=1)
    r = c.post("/ai", json={"user": "x"}, headers=headers)
    assert r.status_code == 401 and r.json() == {"detail": "unauthorized"}
    assert fake.calls == []
    assert post(c).status_code == 200  # plafonul e intact


def test_broken_body_without_secret_is_401_not_validation_details(store):
    c = make(store, FakeModels())
    for kw in ({"content": b"{nu e json", "headers": {"content-type": "application/json"}}, {"json": {"user": 5}}):
        r = c.post("/ai", **kw)
        assert r.status_code == 401 and r.json() == {"detail": "unauthorized"}


# ---- fără scurgeri ----------------------------------------------------------


def test_no_key_secret_or_prompt_in_responses_or_logs(store, caplog):
    caplog.set_level(logging.DEBUG)
    fake = FakeModels(
        gemini=[(403, {"error": {"message": f"API key {GEM_KEY} not valid"}})],
        deepseek=[(401, {"error": {"message": f"bad {DS_KEY}"}})],
    )
    c = make(store, fake, ai_daily_cap=3)
    r1 = post(c, system="SYS-" + USER_TEXT)  # ambele pică: 502
    c.get("/health")
    r2 = c.post("/ai", json={"user": "x"}, headers={"Authorization": "Bearer wrong"})
    fake.script["gemini"] = [gemini_ok("text-ok")]
    r3 = post(c)
    post(c)
    r4 = post(c)  # peste plafon
    everything = "\n".join([r.text + str(dict(r.headers)) for r in (r1, r2, r3, r4)] + [rec.getMessage() + str(rec.args) for rec in caplog.records])
    for secret in (GEM_KEY, DS_KEY, SECRET, USER_TEXT):
        assert secret not in everything
    assert any("ai source=gemini failed reason=auth" in rec.getMessage() for rec in caplog.records)  # jurnalul spune doar motivul


def test_settings_repr_hides_keys_and_secret():
    s = Settings(app_secret=SECRET, gemini_api_key=GEM_KEY, deepseek_api_key=DS_KEY)
    text = repr(s)
    assert GEM_KEY not in text and DS_KEY not in text and SECRET not in text


def test_transport_errors_carry_no_url_or_key(monkeypatch):
    def boom(req, timeout):
        raise urllib.error.URLError(f"cannot reach {req.full_url} with {GEM_KEY}")

    monkeypatch.setattr("urllib.request.urlopen", boom)
    with pytest.raises(HttpError) as e:
        UrllibClient().post_json("https://generativelanguage.googleapis.com/x", {"x-goog-api-key": GEM_KEY}, {"a": 1}, 1.0)
    assert GEM_KEY not in str(e.value) and "googleapis" not in str(e.value)


def test_the_http_client_maps_http_errors_to_status(monkeypatch):
    import io

    def err(req, timeout):
        raise urllib.error.HTTPError(req.full_url, 429, "Too Many", {}, io.BytesIO(b'{"error": 1}'))

    monkeypatch.setattr("urllib.request.urlopen", err)
    assert UrllibClient().post_json("https://x.test/", {}, {}, 1.0) == HttpResponse(429, {"error": 1})


def test_config_from_env():
    s = Settings.from_env({"GEMINI_API_KEY": "g", "DEEPSEEK_API_KEY": "d", "AI_DAILY_CAP": "7", "AI_MAX_PROMPT_CHARS": "bad", "GEMINI_MODEL": ""})
    assert (s.gemini_api_key, s.deepseek_api_key, s.ai_daily_cap) == ("g", "d", 7)
    assert s.ai_max_prompt_chars == 60_000 and s.gemini_model == "gemini-3.5-flash-lite" and s.deepseek_model == "deepseek-flash"
    assert Settings.from_env({}).gemini_api_key == ""
