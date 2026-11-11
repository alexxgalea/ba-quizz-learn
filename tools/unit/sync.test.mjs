// Sincronizarea jurnalului (src/sync.js) cu un server fals în memorie (tools/unit/fake_server.mjs), același contract ca serverul real:
// un răspuns apare pe celălalt dispozitiv cu aceeași cutie; răspunsurile date fără semnal pe două dispozitive se regăsesc toate; un reset se aplică pe celălalt;
// același eveniment trimis de două ori se păstrează o dată; secret greșit → stare, fără pierderi; rețea care cade în mijlocul unui lot nu pierde nimic.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeServer } from "./fake_server.mjs";

const require_ = createRequire(import.meta.url);
const Journal = require_("../../src/journal.js"), JournalSync = require_("../../src/sync.js"), ServerConn = require_("../../src/server_conn.js");

const URL1 = "https://fake.test";
const clockOf = (start = 1_800_000_000_000) => { const c = { t: start, now: () => c.t, tick(ms = 1000) { c.t += ms; return c.t; } }; return c; };
// un dispozitiv: jurnal cu depozit în memorie + sincronizare spre `srv`
async function device(name, srv, o = {}) {
  const clock = o.clock || clockOf(), j = Journal.create({ device: name, clock: clock.now, store: Journal.memStore() });
  const link = { url: URL1, secret: srv.secret };
  const statuses = [];
  const sync = JournalSync.create(Object.assign({ journal: j, fetch: srv.fetch, link: () => o.noLink ? null : link, onStatus: s => statuses.push(s.state), random: () => 0 }, o.sync || {}));
  await j.load();
  return { name, clock, j, sync, link, statuses };
}
const answer = (d, item, ok = true) => { d.clock.tick(); return d.j.append({ type: "answer", form: "q", item, result: { ok } }); };
const box = (d, item) => (d.j.state().q[item] || {}).b;
const ids = async d => (await d.j.events()).map(e => e.id).sort();

test("an answer given on the phone shows up on the laptop after sync, in the same box", async () => {
  const srv = fakeServer(), phone = await device("phone", srv), laptop = await device("laptop", srv);
  answer(phone, "py-01"); answer(phone, "py-01"); answer(phone, "py-02", false);
  assert.equal(box(phone, "py-01"), 3);
  await phone.sync.syncNow();
  assert.equal(phone.sync.status().state, "synced");
  assert.equal(phone.sync.status().unsent, 0);
  assert.equal(srv.events.length, 3);
  await laptop.sync.syncNow();
  assert.equal(box(laptop, "py-01"), 3);
  assert.equal(box(laptop, "py-02"), 1);
  assert.deepEqual(laptop.j.state().q, phone.j.state().q);
  assert.equal((await laptop.j.unsent()).length, 0, "what came from the server is not queued back");
});

test("answers given offline on two devices are all present on both after reconnect", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv), b = await device("dev-b", srv);
  srv.down = true;
  answer(a, "py-01"); answer(a, "py-02"); answer(b, "py-03"); answer(b, "py-01", false); answer(b, "py-04");
  await a.sync.syncNow(); await b.sync.syncNow();
  assert.equal(a.sync.status().state, "offline");
  assert.equal(a.sync.status().unsent, 2);
  assert.equal(b.sync.status().unsent, 3);
  assert.equal(srv.events.length, 0);
  srv.down = false;
  await a.sync.syncNow(); await b.sync.syncNow(); await a.sync.syncNow();
  assert.equal(srv.events.length, 5);
  assert.deepEqual(await ids(a), await ids(b));
  assert.equal((await ids(a)).length, 5);
  assert.deepEqual(a.j.state().q, b.j.state().q, "the same projection on both");
  assert.equal(a.sync.status().state, "synced");
  assert.equal((await a.j.unsent()).length + (await b.j.unsent()).length, 0);
});

test("a reset made on one device applies on the other", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv), b = await device("dev-b", srv);
  answer(a, "py-01"); answer(a, "py-02");
  await a.sync.syncNow(); await b.sync.syncNow();
  assert.equal(box(b, "py-01"), 2);
  a.clock.tick(5000); b.clock.t = a.clock.t;
  a.j.append({ type: "reset" });
  await a.sync.syncNow(); await b.sync.syncNow();
  assert.deepEqual(b.j.state().q, {}, "everything older is hidden on the other device");
  assert.ok(b.j.state().r > 0);
  answer(b, "py-03");
  await b.sync.syncNow(); await a.sync.syncNow();
  assert.deepEqual(Object.keys(a.j.state().q), ["py-03"], "and what comes after the reset survives everywhere");
});

test("the same event sent twice is stored once on the server and once on the device", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv);
  const e = answer(a, "py-01");
  srv.loseResponse = true;                                   // the server keeps the batch, the answer never arrives
  await a.sync.syncNow();
  assert.equal(srv.events.length, 1);
  assert.equal(a.sync.status().state, "offline");
  assert.equal((await a.j.unsent()).length, 1, "not confirmed, so it stays queued");
  await a.sync.syncNow();                                    // sent again: the server reports it as a duplicate
  assert.equal(srv.events.length, 1);
  assert.deepEqual(srv.events.map(x => x.id), [e.id]);
  assert.equal((await a.j.unsent()).length, 0, "a duplicate counts as received");
  assert.equal((await a.j.events()).length, 1);
  assert.equal(a.sync.status().state, "synced");
});

test("a wrong secret shows in the status, loses nothing and does not retry on its own", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv);
  answer(a, "py-01"); answer(a, "py-02");
  a.link.secret = "wrong";
  await a.sync.syncNow();
  const st = a.sync.status();
  assert.equal(st.state, "auth");
  assert.equal(st.unsent, 2);
  assert.equal(st.retryAt, 0, "no retry timer for a rejected secret");
  assert.equal((await a.j.events()).length, 2);
  assert.match(JournalSync.label(st), /Secret greșit/);
  answer(a, "py-03");                                         // the app keeps working
  assert.equal(box(a, "py-03"), 2);
  a.link.secret = srv.secret;
  await a.sync.syncNow();
  assert.equal(a.sync.status().state, "synced");
  assert.equal(srv.events.length, 3);
});

test("a network that drops in the middle of a send loses nothing", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv, { sync: { batch: 3 } });
  for (let i = 0; i < 10; i++) answer(a, "py-" + String(i).padStart(2, "0"));
  srv.failAfter(2);                                           // the first batch of 3 gets through, the second call fails
  await a.sync.syncNow();
  assert.equal(srv.events.length, 3);
  assert.equal(a.sync.status().state, "offline");
  assert.equal((await a.j.unsent()).length, 7, "only the confirmed batch left the queue");
  await a.sync.syncNow();
  assert.equal(srv.events.length, 10);
  assert.equal(new Set(srv.events.map(e => e.id)).size, 10);
  assert.equal((await a.j.unsent()).length, 0);
  assert.equal(a.sync.status().state, "synced");
  const b = await device("dev-b", srv, { sync: { batch: 3 } });
  await b.sync.syncNow();
  assert.deepEqual(await ids(b), await ids(a));
});

test("a batch lost after the server stored it is recovered by the next send (flaky answer, not flaky request)", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv, { sync: { batch: 2 } });
  for (let i = 0; i < 5; i++) answer(a, "q" + i);
  srv.loseResponse = true;
  await a.sync.syncNow();
  assert.equal(srv.events.length, 2);
  await a.sync.syncNow();
  assert.equal(srv.events.length, 5);
  assert.equal((await a.j.unsent()).length, 0);
});

test("pulls in pages after the stored cursor until `more` is false, and keeps the cursor with the journal", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv), b = await device("dev-b", srv, { sync: { batch: 2 } });
  for (let i = 0; i < 5; i++) answer(a, "q" + i);
  await a.sync.syncNow();
  await b.sync.syncNow();
  const gets = srv.calls.filter(c => c.method === "GET" && c.url.includes("limit=2")).map(c => +/after=(\d+)/.exec(c.url)[1]);
  assert.deepEqual(gets, [0, 2, 4], "three pages of at most 2");
  assert.equal(b.j.state().q.q4.n, 1);
  assert.deepEqual(await b.j.getAux(JournalSync.AUX_KEY), { url: URL1, after: 5, epoch: "0" });
  // a new sync object on the same journal (a restart) continues from the cursor
  const again = JournalSync.create({ journal: b.j, fetch: srv.fetch, link: () => b.link, random: () => 0, batch: 2 });
  const before = srv.calls.length;
  await again.syncNow();
  const mine = srv.calls.slice(before).filter(c => c.method === "GET");
  assert.equal(mine.length, 1);
  assert.match(mine[0].url, /after=5&/);
  // only the new ones come next time
  answer(a, "q9"); await a.sync.syncNow();
  const before2 = srv.calls.length;
  await again.syncNow();
  assert.match(srv.calls.slice(before2).find(c => c.method === "GET").url, /after=5&/);
  assert.equal(b.j.state().q.q9.n, 1);
});

test("the cursor does not move past events that could not be merged", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv), b = await device("dev-b", srv);
  answer(a, "py-01"); await a.sync.syncNow();
  const realMerge = b.j.merge;
  b.j.merge = async () => { throw new Error("IndexedDB full"); };
  await b.sync.syncNow();
  assert.equal(b.sync.status().state, "error");
  assert.equal(((await b.j.getAux(JournalSync.AUX_KEY)) || { after: 0 }).after, 0, "the cursor stays at zero (only the epoch may have been kept)");
  b.j.merge = realMerge;
  await b.sync.syncNow();
  assert.equal(box(b, "py-01"), 2);
  assert.equal((await b.j.getAux(JournalSync.AUX_KEY)).after, 1);
});

test("a different server address starts the pull from zero", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv);
  answer(a, "py-01"); await a.sync.syncNow();
  await a.j.setAux(JournalSync.AUX_KEY, { url: "https://other.test", after: 99 });
  const before = srv.calls.length;
  await a.sync.syncNow();
  assert.match(srv.calls.slice(before).find(c => c.method === "GET").url, /after=0&/);
  assert.equal((await a.j.getAux(JournalSync.AUX_KEY)).url, URL1);
});

test("an event the server refuses does not block the others; it stays queued and is counted", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv, { sync: { batch: 8 } });
  const evs = [1, 2, 3, 4, 5].map(i => answer(a, "q" + i));
  srv.poison.add(evs[2].id);
  await a.sync.syncNow();
  assert.equal(srv.events.length, 4);
  const st = a.sync.status();
  assert.equal(st.state, "error");
  assert.equal(st.stuck, 1);
  assert.equal(st.unsent, 1);
  assert.match(JournalSync.label(st), /1 evenimente refuzate/);
  assert.equal(a.sync.status().retryAt, 0, "a refused event is not retried in a loop");
});

test("no server configured: the journal keeps working and the status says so", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv, { noLink: true });
  answer(a, "py-01");
  await a.sync.start();
  assert.equal(a.sync.status().state, "off");
  assert.equal(a.sync.status().unsent, 1);
  assert.equal(srv.calls.length, 0);
  assert.match(JournalSync.label(a.sync.status()), /nu e configurată · 1 netrimis/);
});

test("other HTTP failures (5xx, 429) retry with growing pauses; the status is `error`, nothing is lost", async () => {
  const srv = fakeServer(), timers = fakeTimers(), a = await device("dev-a", srv, { sync: { setTimeout: timers.set, clearTimeout: timers.clear, now: timers.now, backoff: { base: 1000, max: 8000 }, random: () => 1 } });
  answer(a, "py-01");
  srv.status = 503;
  await a.sync.syncNow();
  assert.equal(a.sync.status().state, "error");
  const waits = [];
  for (let i = 0; i < 5; i++) { const w = timers.nextDelay(); waits.push(w); timers.advance(w); await timers.settle(a.sync); }
  assert.deepEqual(waits, [1000, 2000, 4000, 8000, 8000], "doubles up to the cap");
  srv.status = 0;
  timers.advance(timers.nextDelay()); await timers.settle(a.sync);
  assert.equal(a.sync.status().state, "synced");
  assert.equal(srv.events.length, 1);
  assert.equal(timers.pending(), 0, "no timer left after success");
});

test("poke is debounced: several answers in a row make one sync; a poke during a sync asks for another after it", async () => {
  const srv = fakeServer(), timers = fakeTimers(), a = await device("dev-a", srv, { sync: { setTimeout: timers.set, clearTimeout: timers.clear, now: timers.now, debounceMs: 1500 } });
  answer(a, "py-01"); a.sync.poke(); timers.advance(500);
  answer(a, "py-02"); a.sync.poke(); timers.advance(500);
  answer(a, "py-03"); a.sync.poke();
  assert.equal(srv.calls.length, 0, "nothing sent before the pause");
  timers.advance(1500); await timers.settle(a.sync);
  assert.equal(srv.calls.filter(c => c.method === "POST").length, 1, "one batch with all three");
  assert.equal(srv.events.length, 3);
  // a poke while a sync is running
  answer(a, "py-04");
  const running = a.sync.syncNow();
  answer(a, "py-05"); a.sync.poke();
  await running;
  assert.equal(srv.events.length, 5, "the answer given during the sync went out right after it");
});

test("it runs at start, when the connection comes back and when the app returns to the foreground", async () => {
  const srv = fakeServer(), a = await device("dev-a", srv);
  const win = new EventTarget(), doc = Object.assign(new EventTarget(), { hidden: false });
  const detach = a.sync.attach(win, doc);
  srv.down = true;
  answer(a, "py-01");
  await a.sync.start();
  assert.equal(a.sync.status().state, "offline");
  srv.down = false;
  win.dispatchEvent(new Event("online"));
  await a.sync.syncNow();
  assert.equal(a.sync.status().state, "synced");
  assert.equal(srv.events.length, 1);
  answer(a, "py-02");
  doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange"));
  await a.sync.syncNow();                                    // hidden: no sync of its own, the call above is the only one
  doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange"));
  await a.sync.syncNow();
  assert.equal(srv.events.length, 2);
  win.dispatchEvent(new Event("offline"));
  assert.equal(a.sync.status().state, "offline");
  detach();
  const n = srv.calls.length;
  win.dispatchEvent(new Event("online")); doc.dispatchEvent(new Event("visibilitychange"));
  await a.sync.syncNow();
  assert.equal(srv.calls.length > n, true);
  const m = srv.calls.length;
  win.dispatchEvent(new Event("online"));
  assert.equal(srv.calls.length, m, "after detach the events do nothing");
});

test("a request that never answers times out instead of blocking", async () => {
  const srv = fakeServer(), timers = fakeTimers();
  const a = await device("dev-a", srv, { sync: { setTimeout: timers.set, clearTimeout: timers.clear, now: timers.now, timeoutMs: 5000, fetch: () => new Promise(() => {}) } });
  answer(a, "py-01");
  const p = a.sync.syncNow();
  await new Promise(r => setImmediate(r));
  timers.advance(5000);
  await p;
  assert.equal(a.sync.status().state, "offline");
  assert.equal((await a.j.unsent()).length, 1);
  assert.equal(box(a, "py-01"), 2, "the app is untouched");
});

test("the requests carry the secret in the Authorization header and nothing else of the user's", async () => {
  const seen = [];
  const srv = fakeServer(), a = await device("dev-a", srv, { sync: { fetch: (u, r) => { seen.push({ u, r }); return srv.fetch(u, r); } } });
  answer(a, "py-01");
  await a.sync.syncNow();
  assert.ok(seen.length >= 2);
  for (const s of seen) assert.equal(s.r.headers.Authorization, "Bearer " + srv.secret);
  assert.equal(seen[0].u, URL1 + "/events");
  assert.equal(seen[0].r.method, "POST");
  assert.equal(seen[0].r.headers["Content-Type"], "application/json");
  assert.ok(!seen[0].r.body.includes(srv.secret), "the secret is never in the body");
});

test("label: la zi / N netrimise / fără semnal / secret greșit", () => {
  const L = JournalSync.label;
  assert.equal(L({ state: "synced", unsent: 0 }), "La zi.");
  assert.equal(L({ state: "synced", unsent: 3 }), "3 netrimise.");
  assert.equal(L({ state: "idle", unsent: 1 }), "1 netrimis.");
  assert.match(L({ state: "offline", unsent: 4 }), /^Fără semnal · 4 netrimise/);
  assert.match(L({ state: "auth", unsent: 0 }), /^Secret greșit/);
  assert.match(L({ state: "syncing", unsent: 2 }), /Se sincronizează/);
});

test("link: JournalSync reads the one shared ServerConn (valid() = null while the pair is missing or invalid)", async () => {
  const m = new Map(), st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); } };
  const conn = ServerConn.create(st), srv = fakeServer(), a = await device("conn", srv);
  const sync = JournalSync.create({ journal: a.j, fetch: srv.fetch, link: () => conn.valid(), random: () => 0 });
  await sync.start();
  assert.equal(sync.status().state, "off", "nothing saved: sync is off");
  conn.set({ url: "http://evil.example", secret: srv.secret });
  await sync.syncNow();
  assert.equal(sync.status().state, "off", "plain http (not localhost) does not count as configured");
  conn.set({ url: URL1 + "/", secret: srv.secret });
  await sync.syncNow();
  assert.equal(sync.status().state, "synced");
  conn.clear();
  await sync.syncNow();
  assert.equal(sync.status().state, "off", "deleting the server turns sync off");
});

// ---------- cronometre false ----------
function fakeTimers() {
  const t = { t: 0, seq: 0, list: [] };
  t.now = () => 1_800_000_000_000 + t.t;
  t.set = (fn, ms) => { const id = ++t.seq; t.list.push({ id, at: t.t + ms, fn, ms }); return id; };
  t.clear = id => { t.list = t.list.filter(x => x.id !== id); };
  t.pending = () => t.list.length;
  t.nextDelay = () => { const x = t.list.slice().sort((p, q) => p.at - q.at)[0]; return x ? x.ms : -1; };
  t.advance = ms => {
    const end = t.t + ms;
    for (;;) {
      const due = t.list.filter(x => x.at <= end).sort((p, q) => p.at - q.at || p.id - q.id)[0];
      if (!due) break;
      t.list = t.list.filter(x => x !== due); t.t = Math.max(t.t, due.at); due.fn();
    }
    t.t = end;
  };
  t.settle = async () => { for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)); };
  return t;
}
