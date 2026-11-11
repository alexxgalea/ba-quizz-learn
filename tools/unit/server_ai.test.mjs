import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ServerAi = require("../../src/server_ai.js");
const ServerConn = require("../../src/server_conn.js");

const memStore = (init = {}) => { const m = { ...init }; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m }; };
// Un fetch fals: `reply` e { status, body } sau o funcție (url, init) → același lucru; reține cererile.
function fakeFetch(reply) {
  const f = { calls: [] };
  f.fetch = async (url, init) => {
    f.calls.push({ url, init, body: JSON.parse(init.body) });
    const r = typeof reply === "function" ? reply(url, init) : reply;
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => { if (r.body === undefined) throw new Error("not json"); return r.body; } };
  };
  return f;
}
const ok = text => ({ status: 200, body: { text, model: "gemini" } });
const configured = () => memStore({ [ServerConn.ITEM]: JSON.stringify({ url: "https://srv.example/", secret: " s3cret " }) });
// ServerAi nu ține configurarea: o citește din ServerConn (același accesor ca Jarvis și sincronizarea).
const mk = (f, st = configured(), opts = {}) => ServerAi.create({ fetch: f.fetch, conn: ServerConn.create(st), ...opts });
const code = p => p.then(() => null, e => e.code);

test("configuration: read through ServerConn; needs an https address and a secret; the address loses its trailing slash", () => {
  const st = memStore(), conn = ServerConn.create(st), s = ServerAi.create({ fetch: fakeFetch(ok("x")).fetch, conn });
  assert.equal(s.configured(), false);
  conn.set({ url: "http://evil.example", secret: "abc" });
  assert.equal(s.configured(), false);                                   // adresa fără https nu e acceptată
  conn.set({ url: " https://srv.example/ ", secret: " abc " });
  assert.equal(s.configured(), true);
  assert.deepEqual(s.config(), { url: "https://srv.example", secret: "abc" });
  conn.set({ url: "http://localhost:8080" });
  assert.equal(s.configured(), true);                                    // dezvoltare locală
  conn.clear();
  assert.equal(s.configured(), false);
  assert.equal(st.getItem(ServerConn.ITEM), null);
  assert.equal(ServerAi.normUrl("srv.example"), "");
  assert.equal(ServerAi.normUrl("https://srv.example/"), "https://srv.example");
});

test("configuration: damaged or partial storage reads as not configured; storage failures do not throw", () => {
  for (const raw of ["not json", "null", "{}", JSON.stringify({ url: "https://a.b" }), JSON.stringify({ secret: "x" }), JSON.stringify({ url: "ftp://a.b", secret: "x" })]) {
    assert.equal(mk(fakeFetch(ok("x")), memStore({ [ServerConn.ITEM]: raw })).configured(), false, raw);
  }
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(mk(fakeFetch(ok("x")), broken).configured(), false);
});

test("generate posts the ready-made prompt to <url>/ai with the bearer secret and returns the text", async () => {
  const f = fakeFetch(ok("răspuns"));
  const text = await mk(f).generate({ system: "SYS", user: "USR", kind: "quick", json: true, maxTokens: 700, prefer: "deepseek" });
  const c = f.calls[0];
  assert.equal(text, "răspuns");
  assert.equal(c.url, "https://srv.example/ai");
  assert.equal(c.init.method, "POST");
  assert.equal(c.init.headers.Authorization, "Bearer s3cret");
  assert.deepEqual(c.body, { system: "SYS", user: "USR", kind: "quick", json_mode: true, max_tokens: 700, model: "deepseek" });
});

test("generate defaults: kind default, plain text, no optional fields", async () => {
  const f = fakeFetch(ok("x"));
  await mk(f).generate({ user: "U" });
  assert.deepEqual(f.calls[0].body, { system: "", user: "U", kind: "default", json_mode: false });
});

test("generate without configuration never calls the network", async () => {
  const f = fakeFetch(ok("x"));
  assert.equal(await code(mk(f, memStore()).generate({ user: "U" })), "nokey");
  assert.equal(f.calls.length, 0);
});

test("server errors map to codes the app can show", async () => {
  const cases = [
    [{ status: 401, body: { detail: "unauthorized" } }, "srv_auth"],
    [{ status: 413, body: { detail: "prompt_too_large" } }, "srv_big"],
    [{ status: 429, body: { detail: "daily_cap" } }, "srv_cap"],
    [{ status: 429, body: {} }, "rate"],
    [{ status: 502, body: { detail: "ai_unavailable" } }, "srv_ai"],
    [{ status: 500, body: { detail: "x" } }, "server"],
    [{ status: 503 }, "server"],
    [{ status: 422, body: { detail: [{ msg: "x" }] } }, "http"],
    [{ status: 404 }, "http"],
    [{ status: 200, body: { model: "gemini" } }, "format"],
    [{ status: 200, body: { text: "   " } }, "format"],
    [{ status: 200, body: { text: 5 } }, "format"],
    [{ status: 200 }, "format"],
    [new TypeError("Failed to fetch"), "network"],
  ];
  for (const [reply, want] of cases) assert.equal(await code(mk(fakeFetch(reply)).generate({ user: "U" })), want, JSON.stringify(reply));
});

test("a network error detail never carries the secret", async () => {
  const f = fakeFetch(new TypeError("Failed to fetch https://srv.example/ai"));
  const err = await mk(f).generate({ user: "U" }).catch(e => e);
  assert.equal(err.code, "network");
  assert.ok(!JSON.stringify(err.detail).includes("s3cret"));
});

test("a request that takes too long ends with timeout", async () => {
  const f = { calls: [], fetch: (url, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })))) };
  assert.equal(await code(mk(f, configured(), { timeoutMs: 20 }).generate({ user: "U" })), "timeout");
});

test("an abort signal from the caller ends the request with cancelled (not timeout) and the chain stops", async () => {
  const hang = { calls: [], fetch: (url, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })))) };
  const ctl = new AbortController(), srv = mk(hang, configured(), { timeoutMs: 5000 });
  const p = code(srv.generate({ user: "U", signal: ctl.signal }));
  ctl.abort();
  assert.equal(await p, "cancelled");
  const late = new AbortController(); late.abort();
  assert.equal(await code(srv.generate({ user: "U", signal: late.signal })), "cancelled");        // deja oprit: nu se mai trimite nimic
  const called = [];
  const fell = await ServerAi.run([{ generate: async () => { throw Object.assign(new Error("c"), { code: "cancelled" }); } }, { generate: async () => { called.push(1); return "x"; } }], null).then(() => null, e => e.code);
  assert.equal(fell, "cancelled"); assert.deepEqual(called, []);
});

test("an abort signal does not stop a request that already finished, and its listener is removed", async () => {
  const f = fakeFetch(ok("ceva"));
  let removed = 0; const sig = { aborted: false, addEventListener() {}, removeEventListener() { removed++; } };
  assert.equal(await mk(f).generate({ user: "U", signal: sig }), "ceva");
  assert.equal(removed, 1);
});

test("order: with a server nothing goes straight to Gemini or DeepSeek; without one the old order holds", () => {
  assert.deepEqual(ServerAi.order({ server: true, sample: false, gemini: true, deepseek: true }), ["server"]);
  assert.deepEqual(ServerAi.order({ server: true, sample: true, gemini: true, deepseek: true }), ["server", "sample"]);
  assert.deepEqual(ServerAi.order({ server: false, sample: true, gemini: true, deepseek: true }), ["sample", "gemini", "deepseek"]);
  assert.deepEqual(ServerAi.order({ server: false, sample: false, gemini: true, deepseek: true }), ["gemini", "deepseek"]);
  assert.deepEqual(ServerAi.order({ server: false, sample: false, gemini: false, deepseek: true }), ["deepseek"]);
  assert.deepEqual(ServerAi.order({}), []);
});

test("run: first source that answers wins; later ones are not called", async () => {
  const calls = [];
  const src = (name, fn) => ({ name, generate: async r => { calls.push(name); return fn(r); } });
  assert.equal(await ServerAi.run([src("a", () => "A"), src("b", () => "B")], { user: "U" }), "A");
  assert.deepEqual(calls, ["a"]);
});

test("run: a failing source falls through to the next; when all fail the first error is thrown", async () => {
  const bad = c => ({ generate: async () => { throw Object.assign(new Error(c), { code: c }); } });
  assert.equal(await ServerAi.run([bad("srv_ai"), { generate: async () => "B" }], {}), "B");
  assert.equal(await code(ServerAi.run([bad("srv_cap"), bad("unavail")], {})), "srv_cap");
  assert.equal(await code(ServerAi.run([], {})), "nokey");
});

test("run: a cancellation stops the chain", async () => {
  let second = 0;
  const cancelled = { generate: async () => { throw Object.assign(new Error("c"), { code: "cancelled" }); } };
  assert.equal(await code(ServerAi.run([cancelled, { generate: async () => { second++; return "B"; } }], {})), "cancelled");
  assert.equal(second, 0);
});
