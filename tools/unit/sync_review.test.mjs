// JournalSync: ce lipsea după review-ul PR #6 (punctele 3 și 10). Evenimentele aduse de la server anunță aplicația (`onMerged`);
// ștergerea serverului nu pierde sincronizarea celor puse în coadă între timp și nu se suprapune cu ea însăși.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeServer } from "./fake_server.mjs";

const require_ = createRequire(import.meta.url);
const Journal = require_("../../src/journal.js"), JournalSync = require_("../../src/sync.js");

const clockOf = (start = 1_800_000_000_000) => { const c = { t: start, now: () => c.t, tick(ms = 1000) { c.t += ms; return c.t; } }; return c; };
async function device(name, srv, o = {}) {
  const clock = clockOf(), j = Journal.create({ device: name, clock: clock.now, store: Journal.memStore() });
  const link = { url: "https://fake.test", secret: srv.secret };
  const sync = JournalSync.create(Object.assign({ journal: j, fetch: o.fetch || srv.fetch, link: () => link, random: () => 0, debounceMs: 5 }, o.sync || {}));
  await j.load();
  return { name, clock, j, sync };
}
const answer = (d, item, ok = true) => { d.clock.tick(); return d.j.append({ type: "answer", form: "q", item, result: { ok } }); };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- punctul 3: ce vine de la server anunță aplicația ----------

test("events merged from the server call onMerged once per pull, with how many were new", async () => {
  const srv = fakeServer(), seen = [];
  const phone = await device("phone", srv), laptop = await device("laptop", srv, { sync: { onMerged: n => seen.push(n), batch: 2 } });
  for (let i = 1; i <= 5; i++) answer(phone, "py-0" + i);
  await phone.sync.syncNow();
  await laptop.sync.syncNow();
  assert.deepEqual(seen, [5], "one call for the whole pull (three pages), with the total");
  await laptop.sync.syncNow();
  assert.deepEqual(seen, [5], "nothing new, nothing announced");
});

test("a device's own events coming back from the server do not call onMerged", async () => {
  const srv = fakeServer(), seen = [];
  const a = await device("dev-a", srv, { sync: { onMerged: n => seen.push(n) } });
  answer(a, "py-01"); answer(a, "py-02");
  await a.sync.syncNow();
  assert.deepEqual(seen, []);
});

test("a reset made elsewhere is announced too", async () => {
  const srv = fakeServer(), seen = [];
  const a = await device("dev-a", srv), b = await device("dev-b", srv, { sync: { onMerged: n => seen.push(n) } });
  answer(a, "py-01");
  await a.sync.syncNow(); await b.sync.syncNow();
  seen.length = 0;
  a.clock.tick(5000); a.j.append({ type: "reset" });
  await a.sync.syncNow(); await b.sync.syncNow();
  assert.deepEqual(seen, [1]);
});

test("a throwing onMerged does not break the sync", async () => {
  const srv = fakeServer();
  const phone = await device("phone", srv), laptop = await device("laptop", srv, { sync: { onMerged: () => { throw new Error("ecran"); } } });
  answer(phone, "py-01");
  await phone.sync.syncNow(); await laptop.sync.syncNow();
  assert.equal(laptop.sync.status().state, "synced");
});

// ---------- punctul 10: ștergerea serverului ----------

// Un fetch care oprește cererea de ștergere până la `release()`.
function gatedPurge(srv) {
  const gate = { hold: true, release: () => {}, started: null };
  let started; gate.started = new Promise(r => { started = r; });
  const fetch = async (url, req = {}) => {
    if (gate.hold && req.method === "POST" && url.endsWith("/events/purge")) {
      started();
      await new Promise(r => { gate.release = r; });
    }
    return srv.fetch(url, req);
  };
  return { gate, fetch };
}

test("what was queued during a purge is sent right after it, without a manual sync", async () => {
  const srv = fakeServer(), g = gatedPurge(srv);
  const a = await device("dev-a", srv, { fetch: g.fetch });
  answer(a, "py-01");
  await a.sync.syncNow();
  const p = a.sync.purgeServer();
  await g.gate.started;
  const late = answer(a, "py-02");           // în aplicație: `add` → JSync.poke()
  a.sync.poke();
  g.gate.release();
  await p;
  await wait(60);
  assert.deepEqual(srv.events.map(e => e.id), [late.id], "the late answer reached the (new) server journal on its own");
  assert.equal(a.sync.status().unsent, 0);
});

test("a sync timer cleared by the purge is not lost", async () => {
  const srv = fakeServer(), g = gatedPurge(srv);
  g.gate.hold = false;                       // ștergerea trece direct
  const a = await device("dev-a", srv, { fetch: g.fetch, sync: { debounceMs: 1000 } });
  const e = answer(a, "py-01");
  a.sync.poke();                             // un ciclu e programat peste 1 s
  await a.sync.purgeServer();                // ștergerea oprește cronometrul
  await wait(1100);
  assert.deepEqual(srv.events.map(x => x.id), [e.id], "the queued answer still goes out");
});

test("a second purge started while one is running joins it: one request, one result, no early resume", async () => {
  const srv = fakeServer(), g = gatedPurge(srv);
  const a = await device("dev-a", srv, { fetch: g.fetch });
  const p1 = a.sync.purgeServer();
  await g.gate.started;
  const p2 = a.sync.purgeServer();
  g.gate.hold = false;
  const before = srv.calls.length;
  await a.sync.syncNow();                    // cât ține ștergerea, ciclurile stau
  assert.equal(srv.calls.length, before, "no cycle runs while a purge is in flight");
  g.gate.release();
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(srv.purges, 1, "the server was purged once");
  assert.deepEqual(r1, r2);
});

test("after a purge finished the next one runs normally", async () => {
  const srv = fakeServer();
  const a = await device("dev-a", srv);
  answer(a, "py-01"); await a.sync.syncNow();
  await a.sync.purgeServer(); await a.sync.purgeServer();
  assert.equal(srv.purges, 2);
});
