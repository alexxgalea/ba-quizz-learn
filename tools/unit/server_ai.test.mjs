import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const ServerAi = createRequire(import.meta.url)("../../src/server_ai.js");

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
const configured = () => memStore({ [ServerAi.KEY]: JSON.stringify({ url: "https://srv.example/", secret: " s3cret " }) });
const mk = (f, st = configured(), opts = {}) => ServerAi.create({ fetch: f.fetch, storage: st, ...opts });
const code = p => p.then(() => null, e => e.code);

test("configuration: needs an https address and a secret; the address loses its trailing slash", () => {
  const st = memStore(), s = mk(fakeFetch(ok("x")), st);
  assert.equal(s.configured(), false);
  assert.deepEqual(s.save("srv.example", "abc"), { ok: false, error: "url" });
  assert.deepEqual(s.save("http://evil.example", "abc"), { ok: false, error: "url" });
  assert.deepEqual(s.save("https://srv.example/", "  "), { ok: false, error: "secret" });
  assert.equal(s.configured(), false);
  assert.deepEqual(s.save(" https://srv.example/ ", " abc "), { ok: true });
  assert.deepEqual(s.config(), { url: "https://srv.example", secret: "abc" });
  assert.deepEqual(s.save("http://localhost:8080", "abc"), { ok: true });          // dezvoltare locală
  s.clear();
  assert.equal(s.configured(), false);
  assert.equal(st.getItem(ServerAi.KEY), null);
});

test("configuration: damaged or partial storage reads as not configured; storage failures do not throw", () => {
  for (const raw of ["not json", "null", "{}", JSON.stringify({ url: "https://a.b" }), JSON.stringify({ secret: "x" }), JSON.stringify({ url: "ftp://a.b", secret: "x" })]) {
    assert.equal(mk(fakeFetch(ok("x")), memStore({ [ServerAi.KEY]: raw })).configured(), false, raw);
  }
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  const s = mk(fakeFetch(ok("x")), broken);
  assert.equal(s.configured(), false);
  assert.deepEqual(s.save("https://a.b", "x"), { ok: false, error: "storage" });
  assert.equal(s.clear(), false);
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
