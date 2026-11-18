import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ServerAccount = require("../../src/account.js");
const ServerConn = require("../../src/server_conn.js");

const memStore = (init = {}) => { const m = { ...init }; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m }; };
const IOANA = { id: "ioana", name: "Ioana", address: "f", profile: "" };
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
const setup = (reply = { status: 200, body: IOANA }, secret = "ioana-secret") => {
  const st = memStore(), conn = ServerConn.create(st);
  conn.set({ url: "https://srv.example", secret });
  const f = fakeFetch(reply);
  return { st, conn, f, acc: ServerAccount.create({ conn, storage: st, fetch: f.fetch }) };
};
const code = p => p.then(() => null, e => e.code);

test("without a known account: Alex's values (as before ADR 0006)", () => {
  const { acc } = setup();
  assert.equal(acc.known(), false);
  assert.deepEqual(acc.get(), ServerAccount.DEFAULT);
  assert.equal(ServerAccount.DEFAULT.name, "Alex");
  assert.equal(ServerAccount.DEFAULT.address, "m");
});

test("refresh: GET /me with the secret, then cached for this server and secret", async () => {
  const { acc, f, st } = setup();
  const me = await acc.refresh();
  assert.deepEqual(me, IOANA);
  assert.equal(f.calls[0].url, "https://srv.example/me");
  assert.equal(f.calls[0].init.headers.authorization, "Bearer ioana-secret");
  assert.equal(acc.known(), true);
  assert.deepEqual(acc.get(), IOANA);
  assert.ok(!st.getItem(ServerAccount.ITEM).includes("ioana-secret"));   // cache-ul nu ține secretul
});

test("the cache belongs to one server and secret: a new secret falls back to the default", async () => {
  const { acc, conn } = setup();
  await acc.refresh();
  conn.set({ secret: "alt-secret" });
  assert.equal(acc.known(), false);
  assert.deepEqual(acc.get(), ServerAccount.DEFAULT);
  conn.clear();
  assert.deepEqual(acc.get(), ServerAccount.DEFAULT);
});

test("refresh errors: 401 → auth, old server without /me → old, network → network, bad body → format; the cache stays", async () => {
  assert.equal(await code(setup({ status: 401, body: { detail: "unauthorized" } }).acc.refresh()), "auth");
  assert.equal(await code(setup({ status: 404, body: { detail: "Not Found" } }).acc.refresh()), "old");
  assert.equal(await code(setup(new TypeError("fetch failed")).acc.refresh()), "network");
  assert.equal(await code(setup({ status: 200, body: { id: "x" } }).acc.refresh()), "format");
  let n = 0;
  const s = setup(() => (n++ ? { status: 500, body: {} } : { status: 200, body: IOANA }));
  await s.acc.refresh();
  await code(s.acc.refresh());
  assert.deepEqual(s.acc.get(), IOANA);
});

test("not configured: refresh refuses without a request", async () => {
  const st = memStore(), f = fakeFetch({ status: 200, body: IOANA });
  const acc = ServerAccount.create({ conn: ServerConn.create(st), storage: st, fetch: f.fetch });
  assert.equal(await code(acc.refresh()), "nokey");
  assert.equal(f.calls.length, 0);
});

test("prompt lines: Alex's profile line is the one the prompts had before", () => {
  assert.equal(ServerAccount.profileLine(ServerAccount.DEFAULT),
    "Profilul candidatului: dezvoltator cu experiență în Django/DRF, React, Elasticsearch, Docker Swarm, Keycloak, Celery și computer vision. " +
    "Folosește-l doar ca să faci întrebarea concretă („în proiectul tău cu Celery, cum…”); nu inventa detalii despre proiectele lui.");
  assert.equal(ServerAccount.addressLine(ServerAccount.DEFAULT), "");
});

test("prompt lines: a woman's account, with and without a profile", () => {
  assert.equal(ServerAccount.profileLine(IOANA), "");
  const p = ServerAccount.profileLine({ ...IOANA, profile: "frontend cu Vue și Laravel" });
  assert.match(p, /^Profilul candidatei: frontend cu Vue și Laravel\./);
  assert.match(p, /proiectele ei\.$/);
  assert.doesNotMatch(p, /Celery/);
  assert.match(ServerAccount.addressLine(IOANA), /Ioana/);
  assert.match(ServerAccount.addressLine(IOANA), /feminin/);
});
