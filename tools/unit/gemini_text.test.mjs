import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const GeminiText = createRequire(import.meta.url)("../../src/gemini_text.js");

// Un fetch fals: `reply` e { status, body } sau o funcție (url, init) → același lucru; reține cererile.
function fakeFetch(reply) {
  const f = { calls: [] };
  f.fetch = async (url, init) => {
    f.calls.push({ url, init });
    const r = typeof reply === "function" ? reply(url, init) : reply;
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
  return f;
}
const ok = text => ({ status: 200, body: { candidates: [{ content: { parts: [{ text }] } }] } });
const gen = (f, opts = {}) => GeminiText.create(Object.assign({ fetch: f.fetch, getKey: () => "KEY" }, opts));

test("generate sends the system and user text and returns the model's text", async () => {
  const f = fakeFetch(ok('{"on_topic":true,"answer":"ok"}'));
  const text = await gen(f).generate({ system: "Ești tutore.", user: "Ce face GIL?" });
  const call = f.calls[0], body = JSON.parse(call.init.body);
  assert.deepEqual(
    [text, call.url, call.init.method, body.systemInstruction, body.contents, body.generationConfig.responseMimeType],
    ['{"on_topic":true,"answer":"ok"}',
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=KEY",
     "POST",
     { parts: [{ text: "Ești tutore." }] },
     [{ role: "user", parts: [{ text: "Ce face GIL?" }] }],
     "application/json"]);
});

test("the pieces of a multi-part answer are joined", async () => {
  const f = fakeFetch({ status: 200, body: { candidates: [{ content: { parts: [{ text: "Prima " }, { text: "a doua." }] } }] } });
  assert.equal(await gen(f).generate({ system: "s", user: "u" }), "Prima a doua.");
});

const failsWith = async (f, opts) => gen(f, opts).generate({ system: "s", user: "u" }).then(() => null, e => e.code);

for (const [status, body, code] of [
  [400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } }, "auth"],
  [401, { error: { message: "Unauthenticated" } }, "auth"],
  [403, { error: { message: "Permission denied" } }, "auth"],
  [429, { error: { message: "Resource exhausted" } }, "rate"],
  [503, { error: { message: "Overloaded" } }, "server"],
  [400, { error: { message: "Invalid JSON payload" } }, "http"]]) {
  test("HTTP " + status + " (" + (body.error.message || "").slice(0, 20) + ") is reported as " + code, async () => {
    assert.equal(await failsWith(fakeFetch({ status, body })), code);
  });
}

test("without a key it fails with nokey and sends nothing", async () => {
  const f = fakeFetch(ok("x"));
  assert.deepEqual([await failsWith(f, { getKey: () => "" }), f.calls.length], ["nokey", 0]);
});

test("a network failure is reported as network", async () => {
  assert.equal(await failsWith(fakeFetch(new TypeError("Failed to fetch"))), "network");
});

test("an aborted request is reported as timeout", async () => {
  assert.equal(await failsWith(fakeFetch(Object.assign(new Error("aborted"), { name: "AbortError" }))), "timeout");
});

test("an answer blocked by the model is reported as refused", async () => {
  assert.equal(await failsWith(fakeFetch({ status: 200, body: { promptFeedback: { blockReason: "SAFETY" } } })), "refused");
});

test("an answer without text is a format error", async () => {
  assert.equal(await failsWith(fakeFetch({ status: 200, body: { candidates: [{ content: { parts: [] } }] } })), "format");
});

test("a reply that is not JSON is a format error", async () => {
  const f = { fetch: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad"); } }) };
  assert.equal(await failsWith(f), "format");
});

test("a request that takes too long is aborted", async () => {
  let signal = null;
  const f = { fetch: (url, init) => new Promise((_, rej) => { signal = init.signal; init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))); }) };
  const code = await failsWith(f, { timeoutMs: 20 });
  assert.deepEqual([code, signal.aborted], ["timeout", true]);
});

test("the default model is the fast one, and the output budget leaves room for any thinking", async () => {
  const f = fakeFetch(ok("x"));
  await gen(f).generate({ system: "s", user: "u" });
  assert.deepEqual([f.calls[0].url.includes("/gemini-3.5-flash-lite:"), JSON.parse(f.calls[0].init.body).generationConfig.maxOutputTokens], [true, 1500]);
});

const detailOf = async (f, opts) => gen(f, opts).generate({ system: "s", user: "u" }).then(() => null, e => e.detail);

test("an HTTP failure carries the status and the server's message as detail", async () => {
  const d = await detailOf(fakeFetch({ status: 429, body: { error: { message: "Resource exhausted: free tier limit" } } }));
  assert.equal(d, "HTTP 429: Resource exhausted: free tier limit");
});

test("a network failure carries the browser's message as detail", async () => {
  assert.equal(await detailOf(fakeFetch(new TypeError("Failed to fetch"))), "Failed to fetch");
});

test("a timeout says how long it waited", async () => {
  const f = { fetch: (url, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })))) };
  assert.equal(await detailOf(f, { timeoutMs: 20 }), "fără răspuns în 0,02 s");
});

test("an answer cut off before any text says why", async () => {
  const d = await detailOf(fakeFetch({ status: 200, body: { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [] } }] } }));
  assert.equal(d, "răspuns gol (MAX_TOKENS)");
});
