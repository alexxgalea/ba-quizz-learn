// Jurnalul de încercări (src/journal.js): proiecția, importul lui S, îmbinarea, depozitul local și coada netrimisă.
// Testul de bază: proiecție(import(S)) = S. Al doilea: pe aceleași operații, proiecția dă la fiecare pas exact ce dădeau vechile updQ / updO / updX / recordOral peste S (oracolul de mai jos).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadData } from "../../lib.mjs";

const Journal = createRequire(import.meta.url)("../../src/journal.js");
const P = loadData(new URL("../../", import.meta.url));

// ---------- oracolul: logica veche din app.js (updQ, leitnerStep, updX, guess, recordOral, gapFix, lecția, planul, setările), copiată ca să rămână martor ----------
const MC_MAX = 9, HMAX = 80;
const clone = x => JSON.parse(JSON.stringify(x));
const empty = () => ({ v: 1, r: 0, q: {}, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [] });
function gapCounts(e) {
  const out = {};
  if (!e) return out;
  if (e.mc && typeof e.mc === "object") { for (const k of Object.keys(e.mc)) { const n = +e.mc[k]; if (n > 0) out[k] = Math.min(MC_MAX, n); } }
  else (e.m || []).forEach(i => { out[i] = 1; });
  return out;
}
const old = {
  q(S, id, ok, assisted, t) {
    const e = Object.assign({ b: 0, n: 0, c: 0 }, S.q[id]);
    e.n++;
    if (ok) { e.c++; const nb = Math.min(5, Math.max(1, e.b) + 1); e.b = assisted ? Math.max(e.b, Math.min(nb, 2)) : nb; } else e.b = 1;
    e.l = ok ? 1 : 0; e.t = t;
    S.q[id] = e;
  },
  step(map, id, p, t) {
    const e = Object.assign({ b: 0, n: 0 }, map[id]);
    e.n++; e.s = Math.round(p * 100);
    if (p >= 0.8) e.b = Math.min(5, Math.max(1, e.b) + 1);
    else if (p >= 0.5) e.b = Math.max(1, e.b);
    else e.b = 1;
    e.t = t;
    map[id] = e;
  },
  x(S, id, g, t) {
    const e = Object.assign({ b: 0, n: 0, c: 0 }, S.x[id]);
    e.n++;
    if (g >= 1) { e.c++; const nb = Math.min(5, Math.max(1, e.b) + 1); e.b = g === 1 ? Math.max(e.b, Math.min(nb, 2)) : nb; } else e.b = 1;
    e.l = g; e.t = t;
    S.x[id] = e;
  },
  guess(S, id, t) { const e = S.q[id]; if (e) { e.b = 1; e.l = 0; e.t = t; } },
  oral(S, c, r, t) {
    const tickW = (run, i) => (run.ticks[i] ? (run.half && run.half[i] ? 0.5 : 1) : 0);
    const run = { ticks: r.ticks || {}, half: r.half || {} };
    const p = c.k.reduce((s, _, i) => s + tickW(run, i), 0) / c.k.length;
    old.step(S.o, c.id, p, t);
    const e = S.o[c.id], prev = gapCounts(e), mc = {}, missed = c.k.map((_, i) => i).filter(i => tickW(run, i) < 1), fx = r.fixed || {}, open = missed.filter(i => !fx[i]);
    c.k.forEach((_, i) => { const n = fx[i] ? 0 : missed.indexOf(i) >= 0 ? Math.min(MC_MAX, (prev[i] || 0) + 1) : Math.max(0, (prev[i] || 0) - 1); if (n) mc[i] = n; });
    e.mc = mc;
    if (open.length) e.m = open; else delete e.m;
    if (r.wrong) { const w = r.wrong.slice(0, 3); if (w.length) e.w = w; else delete e.w; }
    if (r.keep) e.a = r.keep;
    return { p, missed };
  },
  gapFix(S, cid, i, t) {
    const e = S.o[cid]; if (!e) return;
    const mc = gapCounts(e); delete mc[i]; e.mc = mc;
    const m = (e.m || []).filter(x => x !== i); if (m.length) e.m = m; else delete e.m;
    e.gt = t;
  },
  hist(S, row) { S.h.push(row); S.h = S.h.slice(-HMAX); },
  plan(S, id, done, t) { S.p[id] = { d: done ? 1 : 0, t }; },
  cfg(S, d, h, t) { S.c = { d, h, t }; },
  heard(S, id, n, t) { const e = S.l[id] || {}; S.l[id] = Object.assign({}, e, { n, t }); },
  done(S, id, t) { S.l[id] = { n: 0, d: t, t }; },
  lreset(S, id, t) { const e = S.l[id] || {}; S.l[id] = Object.assign({ n: 0, t }, e.d ? { d: e.d } : {}); },
  reset(S, t) { const r = empty(); r.r = t; return r; }
};

// ---------- ajutoare ----------
function prng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const T0 = Date.UTC(2026, 10, 12, 18, 0, 0);
function clockOf(start = T0) { const c = { t: start, now: () => c.t, tick(ms = 60000) { c.t += ms; return c.t; } }; return c; }
const mk = (o = {}) => { const { clock: c, ...rest } = o, clock = c || clockOf(); return { clock, j: Journal.create(Object.assign({ device: "dev-a", clock: clock.now }, rest)) }; };
const sortedKeys = evs => evs.slice().sort(Journal.cmp).map(e => e.id);

// Evenimentele pe care le scrie aplicația pentru fiecare operație (aceeași formă ca în app.js).
const ev = {
  q: (item, ok, assisted, pick) => ({ type: "answer", form: "q", item, result: Object.assign({ ok: !!ok }, assisted ? { assisted: true } : {}, pick != null ? { pick } : {}) }),
  x: (item, g) => ({ type: "answer", form: "x", item, result: { g } }),
  o: (item, p) => ({ type: "answer", form: "o", item, result: { p } }),
  s: (item, p) => ({ type: "answer", form: "s", item, result: { p } }),
  k: (item, s) => ({ type: "answer", form: "k", item, result: { s } }),
  oral: (c, r) => {
    const w = (i) => (r.ticks && r.ticks[i] ? (r.half && r.half[i] ? 0.5 : 1) : 0);
    const p = c.k.reduce((s, _, i) => s + w(i), 0) / c.k.length;
    const missed = c.k.map((_, i) => i).filter(i => w(i) < 1);
    return { type: "answer", form: "o", item: c.id, result: Object.assign({ p, k: c.k.length, missed, fixed: Object.keys(r.fixed || {}).filter(i => r.fixed[i]).map(Number) }, r.wrong ? { wrong: r.wrong } : {}, r.keep ? { keep: r.keep } : {}) };
  }
};

// ---------- 1. testul de bază: proiecție(import(S)) = S ----------
const STATES = {
  "an empty state": empty(),
  "a state with every map, settings and history": {
    v: 1, r: 0,
    q: { "py-01": { b: 3, n: 4, c: 3, l: 1, t: T0 - 5000 }, "py-02": { b: 1, n: 2, c: 0, l: 0, t: T0 - 4000 } },
    o: { "o-gil-1": { b: 2, n: 3, s: 60, t: T0 - 3000, mc: { 0: 2, 2: 1 }, m: [0, 2], w: ["a spus că GIL e în Java"], a: "versiunea bună" } },
    x: { "py-01": { b: 2, n: 1, c: 1, l: 1, t: T0 - 2000 } },
    k: { k3: { s: "hint", t: T0 - 1000 } },
    s: { "s-x": { b: 4, n: 2, s: 100, t: T0 - 900 } },
    p: { "g2026-11-12-due": { d: 1, t: T0 - 800 }, "g2026-11-12-oral": { d: 0, t: T0 - 700 } },
    l: { asyncio: { n: 3, d: T0 - 9000, t: T0 - 600 }, oop: { n: 0, t: T0 - 500 } },
    h: [{ id: "h1", ts: T0 - 6000, kind: "mcq", mode: "diag", title: "Diagnostic", n: 10, c: 6, dur: 300 }, { id: "h2", ts: T0 - 5500, kind: "oral", mode: "oral", title: "Oral", n: 2, c: 1.5, dur: 200 }],
    c: { d: "2026-11-20", h: 3, t: T0 - 400 }
  },
  "a state after a reset": { v: 1, r: T0 - 100, q: { a: { b: 2, n: 1, c: 1, l: 1, t: T0 - 50 } }, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [{ id: "h9", ts: T0 - 10, kind: "mcq", n: 1, c: 1 }], c: { d: "2026-12-01", h: 2, t: T0 - 20 } },
  "gaps with the old m-only shape and a gt newer than t": { v: 1, r: 0, q: {}, o: { a: { b: 1, n: 1, s: 20, t: T0 - 300, m: [1, 2] }, b: { b: 2, n: 5, s: 80, t: T0 - 900, mc: { 0: 9 }, gt: T0 - 100 } }, x: {}, k: {}, s: {}, p: {}, l: {}, h: [] },
  "a state with entries at time zero": { v: 1, r: 0, q: { z: { b: 1, n: 1, c: 0, l: 0, t: 0 } }, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [], c: { d: "2026-11-20", h: 3, t: 0 } }
};
for (const [name, S] of Object.entries(STATES)) {
  test("projection(import(S)) = S for " + name, () => {
    const events = Journal.importState(S);
    assert.deepEqual(Journal.project(events), S);
    assert.ok(events.every(e => e.imported === true));
    assert.deepEqual(S, clone(S), "the input is not changed");
  });
}

test("importing does not depend on the order the events arrive in", () => {
  const events = Journal.importState(STATES["a state with every map, settings and history"]);
  assert.deepEqual(Journal.project(events.slice().reverse()), STATES["a state with every map, settings and history"]);
});

test("importing the same state twice gives the same ids, so a union has no duplicates", () => {
  const S = STATES["a state with every map, settings and history"];
  const a = Journal.importState(S), b = Journal.importState(clone(S));
  assert.deepEqual(a.map(e => e.id), b.map(e => e.id));
  assert.equal(Journal.union(a, b).length, a.length);
});

test("a changed entry gets a new id, so the newer import adds an event instead of being dropped", () => {
  const S = clone(STATES["a state with every map, settings and history"]);
  const before = Journal.importState(S);
  S.q["py-01"] = { b: 4, n: 5, c: 4, l: 1, t: T0 + 10 };
  const after = Journal.importState(S);
  assert.equal(Journal.union(before, after).length, before.length + 1);
  assert.deepEqual(Journal.project(Journal.union(before, after)), S);
});

test("importState with a current state only emits what differs", () => {
  const S = clone(STATES["a state with every map, settings and history"]);
  assert.deepEqual(Journal.importState(S, { from: S }), []);
  const T = clone(S); T.q["py-01"] = { b: 5, n: 9, c: 9, l: 1, t: T0 + 5 }; T.h.push({ id: "h3", ts: T0 + 6, kind: "mcq", n: 1, c: 1 });
  const evs = Journal.importState(T, { from: S });
  assert.deepEqual(evs.map(e => e.type).sort(), ["hist", "state"]);
  assert.deepEqual(Journal.project(Journal.union(Journal.importState(S), evs)), T);
});

test("a state read from the real data (ids of the real items) survives the round trip", () => {
  const S = empty();
  P.mcq.slice(0, 120).forEach((q, i) => { S.q[q.id] = { b: 1 + (i % 5), n: 1 + (i % 4), c: i % 3, l: i % 2, t: T0 - 1000 * (i + 1) }; });
  P.oral.slice(0, 40).forEach((c, i) => { S.o[c.id] = { b: 1 + (i % 5), n: 2, s: 20 * (i % 6), t: T0 - 500 * (i + 1), mc: { [i % c.k.length]: 1 + (i % 3) }, m: [i % c.k.length] }; });
  P.skel.slice(0, 20).forEach((k, i) => { S.s[k.id] = { b: 2, n: 1, s: 60, t: T0 - 300 * (i + 1) }; });
  assert.deepEqual(Journal.project(Journal.importState(S)), S);
});

// ---------- 2. aceleași operații, aceeași stare ca în codul vechi ----------
function simulate(seed, steps) {
  const rnd = prng(seed), pick = a => a[Math.floor(rnd() * a.length)];
  const clock = clockOf(), { j } = mk({ clock });
  let S = empty();
  // datele vin dintr-un context vm: copiem ca tablourile să fie din același realm cu cele ale jurnalului
  const mcq = P.mcq.slice(0, 60).map(q => ({ id: q.id })), oral = P.oral.slice(0, 25).map(c => ({ id: c.id, k: Array.from(c.k) })), skel = P.skel.slice(0, 15).map(k => ({ id: k.id })), mods = Object.keys(P.sheets).slice(0, 6);
  const all = [];
  const log = e => all.push(e);
  for (let i = 0; i < steps; i++) {
    clock.tick(rnd() < 0.15 ? 0 : Math.floor(rnd() * 3 * 3600000));          // uneori același milisecundă
    const t = clock.t, r = rnd();
    if (r < 0.28) { const q = pick(mcq), ok = rnd() < 0.6, asst = rnd() < 0.3; old.q(S, q.id, ok, asst, t); log(j.append(ev.q(q.id, ok, asst, rnd() < 0.5 ? 1 : null))); }
    else if (r < 0.33) { const ids = Object.keys(S.q); if (!ids.length) continue; const id = pick(ids); old.guess(S, id, t); log(j.append({ type: "guess", form: "q", item: id })); }
    else if (r < 0.40) { const q = pick(mcq), g = Math.floor(rnd() * 3); old.x(S, q.id, g, t); log(j.append(ev.x(q.id, g))); }
    else if (r < 0.50) { const c = pick(oral), p = pick([0, 0.2, 0.5, 0.75, 0.8, 1]); old.step(S.o, c.id, p, t); log(j.append(ev.o(c.id, p))); }
    else if (r < 0.62) {
      const c = pick(oral), ticks = {}, half = {}, fixed = {};
      c.k.forEach((_, i) => { if (rnd() < 0.6) ticks[i] = true; if (rnd() < 0.2) half[i] = true; if (rnd() < 0.15) fixed[i] = true; });
      const run = { ticks, half, fixed, wrong: rnd() < 0.5 ? ["a zis A", "a zis B", "a zis C", "a zis D"].slice(0, Math.floor(rnd() * 5)) : undefined, keep: rnd() < 0.3 ? "răspuns bun " + i : "" };
      old.oral(S, c, run, t); log(j.append(ev.oral(c, run)));
    }
    else if (r < 0.67) { const k = pick(skel), p = pick([0, 0.4, 0.6, 1]); old.step(S.s, k.id, p, t); log(j.append(ev.s(k.id, p))); }
    else if (r < 0.70) { const id = "k" + (1 + Math.floor(rnd() * 16)), s = pick(["solo", "hint", "redo"]); S.k[id] = { s, t }; log(j.append(ev.k(id, s))); }
    else if (r < 0.76) { const id = "g2026-11-1" + Math.floor(rnd() * 5) + "-" + pick(["due", "oral", "smart"]), done = rnd() < 0.5; old.plan(S, id, done, t); log(j.append({ type: "plan", item: id, done })); }
    else if (r < 0.79) { const d = "2026-11-" + (10 + Math.floor(rnd() * 18)), h = 1 + Math.floor(rnd() * 4); old.cfg(S, d, h, t); log(j.append({ type: "cfg", d, h })); }
    else if (r < 0.85) { const m = pick(mods), n = Math.floor(rnd() * 9), k = n; const e = S.l[m] || {}; if (k > (e.n || 0)) { old.heard(S, m, k, t); log(j.append({ type: "lesson", item: m, n: k })); } }
    else if (r < 0.87) { const m = pick(mods); old.done(S, m, t); log(j.append({ type: "lesson", item: m, n: 0, done: true })); }
    else if (r < 0.89) { const m = pick(mods); old.lreset(S, m, t); log(j.append({ type: "lesson", item: m, n: 0 })); }
    else if (r < 0.95) { const row = { id: "h" + t + "-" + i, ts: t, kind: pick(["mcq", "oral", "open", "skel"]), mode: "m", title: "Sesiune " + i, n: 5, c: 3, dur: 120 }; old.hist(S, clone(row)); log(j.append({ type: "hist", row })); }
    else if (r < 0.99) { const ids = Object.keys(S.o); if (!ids.length) continue; const cid = pick(ids), card = oral.find(c => c.id === cid), pt = Math.floor(rnd() * ((card && card.k.length) || 3)); old.gapFix(S, cid, pt, t); log(j.append({ type: "gap", op: "fix", item: cid, point: pt })); }
    else { S = old.reset(S, t); log(j.append({ type: "reset" })); }
    assert.deepEqual(j.state(), S, "step " + i + " (seed " + seed + ")");
  }
  return { j, S, all };
}

for (const seed of [1, 7, 42]) {
  test("the projection follows the old update rules step by step on a long random session (seed " + seed + ")", () => {
    const { j, S, all } = simulate(seed, 600);
    assert.deepEqual(j.state(), S);
    assert.ok(all.length > 400);
    // și o proiecție făcută de la zero, din toate evenimentele, în orice ordine, dă aceeași stare
    assert.deepEqual(Journal.project(all), S);
    assert.deepEqual(Journal.project(all.slice().reverse()), S);
    assert.deepEqual(Journal.project(Journal.importState(S)), S);
  });
}

test("a long session survives a restart: snapshot + tail = the state, without reading the whole log", async () => {
  const store = Journal.memStore(), mirror = Journal.memMirror();
  const clock = clockOf(), a = Journal.create({ device: "dev-a", clock: clock.now, store, mirror });
  await a.load();
  const rnd = prng(5);
  for (let i = 0; i < 300; i++) { clock.tick(60000); a.append(ev.q("py-" + Math.floor(rnd() * 40), rnd() < 0.5)); if (i % 40 === 0) await a.flush(); }
  await a.flush();
  const S = clone(a.state());
  store.stats.allEvents = 0; store.stats.eventsRead = 0;
  const b = Journal.create({ device: "dev-a", clock: clock.now, store, mirror });
  assert.deepEqual(b.state(), S, "the first paint comes straight from the mirror");
  await b.load();
  assert.deepEqual(b.state(), S);
  assert.equal(store.stats.allEvents, 0, "no full replay");
  assert.equal(store.stats.eventsRead, 0, "nothing after the snapshot, so nothing is read");
});

// ---------- 3. reset ----------
test("a reset hides everything older, and what comes after builds on the empty state", () => {
  const { clock, j } = mk();
  j.append(ev.q("a", true)); clock.tick();
  j.append({ type: "plan", item: "p1", done: true }); clock.tick();
  j.append({ type: "cfg", d: "2026-12-01", h: 2 }); clock.tick();
  const r = j.append({ type: "reset" }); clock.tick();
  assert.deepEqual(j.state(), Object.assign(empty(), { r: r.t }));
  j.append(ev.q("b", false));
  assert.deepEqual(Object.keys(j.state().q), ["b"]);
  assert.equal(j.state().r, r.t);
  assert.equal(j.state().c, undefined);
});

test("an older event that arrives after a reset stays hidden, even if it comes from another device", async () => {
  const store = Journal.memStore(), clock = clockOf();
  const j = Journal.create({ device: "dev-a", clock: clock.now, store }); await j.load();
  const old1 = { id: "dev-b.0000001.00001", t: clock.t - 1000, dev: "dev-b", type: "answer", form: "q", item: "zzz", result: { ok: true } };
  clock.tick(); j.append(ev.q("a", true)); clock.tick(); j.append({ type: "reset" }); clock.tick(); j.append(ev.q("b", true));
  const before = clone(j.state());
  const r = await j.merge([old1], { remote: true });
  assert.equal(r.rebuilt, false, "hidden events do not force a rebuild");
  assert.deepEqual(j.state(), before);
  assert.equal(j.state().q.zzz, undefined);
});

test("a reset that arrives late removes what was applied before it, on every device", async () => {
  const clock = clockOf(), A = { store: Journal.memStore() }, B = { store: Journal.memStore() };
  A.j = Journal.create({ device: "dev-a", clock: clock.now, store: A.store }); B.j = Journal.create({ device: "dev-b", clock: clock.now, store: B.store });
  await A.j.load(); await B.j.load();
  A.j.append(ev.q("a", true)); clock.tick();
  B.j.append(ev.q("b", true)); clock.tick();
  const reset = A.j.append({ type: "reset" }); clock.tick();
  B.j.append(ev.q("c", true)); clock.tick();                      // B nu a văzut resetul
  await A.j.flush(); await B.j.flush();
  await B.j.merge(await A.j.events(), { remote: true });
  await A.j.merge(await B.j.events(), { remote: true });
  assert.deepEqual(A.j.state(), B.j.state());
  assert.deepEqual(Object.keys(A.j.state().q), ["c"], "only what came after the reset survives");
  assert.equal(A.j.state().r, reset.t);
});

// ---------- 4. doua dispozitive ----------
test("two devices: the union by id is idempotent, commutative and ordered by time, then id", async () => {
  const clock = clockOf(), mem = () => Journal.memStore();
  const a = Journal.create({ device: "dev-a", clock: clock.now, store: mem() }), b = Journal.create({ device: "dev-b", clock: clock.now, store: mem() });
  await a.load(); await b.load();
  const rnd = prng(11);
  for (let i = 0; i < 80; i++) {
    clock.tick(Math.floor(rnd() * 90000));
    const who = rnd() < 0.5 ? a : b;
    who.append(rnd() < 0.7 ? ev.q("py-" + Math.floor(rnd() * 10), rnd() < 0.5) : ev.o("o-" + Math.floor(rnd() * 5), rnd()));
  }
  await a.flush(); await b.flush();
  const ea = await a.events(), eb = await b.events();
  await a.merge(eb, { remote: true }); await b.merge(ea, { remote: true });
  assert.deepEqual(a.state(), b.state());
  const all = Journal.union(ea, eb);
  assert.deepEqual(a.state(), Journal.project(all));
  assert.deepEqual((await a.events()).map(e => e.id), sortedKeys(all));
  const again = await a.merge(eb, { remote: true });
  assert.equal(again.added, 0, "the same events a second time change nothing");
  assert.deepEqual(a.state(), Journal.project(all));
  assert.deepEqual(Journal.union(ea, eb).map(e => e.id), Journal.union(eb, ea).map(e => e.id));
});

test("events with the same time are ordered by id, the same on both devices", () => {
  const x = { id: "dev-a.1", t: 5, type: "answer", form: "q", item: "i", result: { ok: true } };
  const y = { id: "dev-b.1", t: 5, type: "answer", form: "q", item: "i", result: { ok: false } };
  assert.deepEqual(Journal.project([x, y]), Journal.project([y, x]));
  assert.equal(Journal.project([x, y]).q.i.l, 0, "dev-b sorts last, so its answer is the one that stays");
});

test("what the other device sent last in time decides a settings clash", async () => {
  const clock = clockOf(), a = Journal.create({ device: "dev-a", clock: clock.now, store: Journal.memStore() });
  await a.load();
  a.append({ type: "cfg", d: "2026-11-20", h: 3 }); clock.tick(10);
  const remote = { id: "dev-b.0000099.00001", t: clock.t, dev: "dev-b", type: "cfg", d: "2026-11-25", h: 2 };
  await a.merge([remote], { remote: true });
  assert.deepEqual(a.state().c, { d: "2026-11-25", h: 2, t: clock.t });
});

test("a late answer from another device is folded in order, so the boxes match a replay", async () => {
  const clock = clockOf(), a = Journal.create({ device: "dev-a", clock: clock.now, store: Journal.memStore() });
  await a.load();
  const t0 = clock.t;
  a.append(ev.q("q1", true)); clock.tick(); a.append(ev.q("q1", true)); clock.tick(); a.append(ev.q("q1", true));
  const late = { id: "dev-b.0000001.00001", t: t0 + 1, dev: "dev-b", type: "answer", form: "q", item: "q1", result: { ok: false } };
  const r = await a.merge([late], { remote: true });
  assert.equal(r.rebuilt, true);
  assert.deepEqual(a.state(), Journal.project(await a.events()));
  assert.equal(a.state().q.q1.n, 4);
});

// ---------- 5. goluri ----------
test("a card answer updates the gap counters, the last missed points, the wrong claims and the good version", () => {
  const { j } = mk(), c = { id: "o-x", k: ["a", "b", "c", "d"] };
  j.append(ev.oral(c, { ticks: { 0: true }, wrong: ["greșit 1"], keep: "varianta bună" }));
  assert.deepEqual(j.state().o["o-x"].mc, { 1: 1, 2: 1, 3: 1 });
  assert.deepEqual(j.state().o["o-x"].m, [1, 2, 3]);
  assert.deepEqual([j.state().o["o-x"].w, j.state().o["o-x"].a], [["greșit 1"], "varianta bună"]);
  j.append(ev.oral(c, { ticks: { 0: true, 1: true, 2: true }, wrong: [] }));
  const e = j.state().o["o-x"];
  assert.deepEqual(e.mc, { 3: 2 });
  assert.deepEqual(e.m, [3]);
  assert.equal(e.w, undefined, "an empty wrong list clears w");
  assert.equal(e.a, "varianta bună", "no new good version keeps the old one");
  j.append(ev.oral(c, { ticks: { 0: true, 1: true, 2: true }, fixed: { 3: true } }));
  assert.deepEqual(j.state().o["o-x"].mc, {});
  assert.equal(j.state().o["o-x"].m, undefined);
});

test("the counter stops at 9 and a half-covered point counts as missed", () => {
  const { j } = mk(), c = { id: "o-y", k: ["a", "b"] };
  for (let i = 0; i < 12; i++) j.append(ev.oral(c, { ticks: { 0: true }, half: { 0: true } }));
  assert.equal(j.state().o["o-y"].mc[0], 9);
});

test("fixing a gap keeps the box and the due time, only moves gt", () => {
  const { clock, j } = mk(), c = { id: "o-z", k: ["a", "b", "c"] };
  const a = j.append(ev.oral(c, { ticks: { 0: true } })); clock.tick(1000);
  const before = clone(j.state().o["o-z"]);
  const f = j.append({ type: "gap", op: "fix", item: "o-z", point: 1 });
  const e = j.state().o["o-z"];
  assert.deepEqual([e.b, e.n, e.t, e.gt], [before.b, before.n, a.t, f.t]);
  assert.deepEqual(e.mc, { 2: 1 });
  assert.deepEqual(e.m, [2]);
  j.append({ type: "gap", op: "fix", item: "nu-exista", point: 0 });
  assert.equal(j.state().o["nu-exista"], undefined);
});

test("'Am ghicit' sends the answer back to box 1 without counting a new attempt", () => {
  const { clock, j } = mk();
  j.append(ev.q("g1", true)); clock.tick();
  const g = j.append({ type: "guess", form: "q", item: "g1" });
  assert.deepEqual(j.state().q.g1, { b: 1, n: 1, c: 1, l: 0, t: g.t });
});

// ---------- 6. lecția, planul, setările ----------
test("lesson position: heard moves it, done resets it and keeps the date, reset keeps the date", () => {
  const { clock, j } = mk();
  j.append({ type: "lesson", item: "asyncio", n: 4 }); clock.tick();
  assert.deepEqual(j.state().l.asyncio, { n: 4, t: clock.t - 60000 });
  const d = j.append({ type: "lesson", item: "asyncio", n: 0, done: true }); clock.tick();
  assert.deepEqual(j.state().l.asyncio, { n: 0, d: d.t, t: d.t });
  j.append({ type: "lesson", item: "asyncio", n: 2 }); clock.tick();
  assert.equal(j.state().l.asyncio.d, d.t, "the finishing date stays while a new lesson moves on");
  j.append({ type: "lesson", item: "asyncio", n: 0 });
  assert.deepEqual([j.state().l.asyncio.n, j.state().l.asyncio.d], [0, d.t]);
});

test("a plan tick, a settings change and a history row land where the app reads them", () => {
  const { j } = mk();
  const p = j.append({ type: "plan", item: "g2026-11-12-due", done: true });
  assert.deepEqual(j.state().p["g2026-11-12-due"], { d: 1, t: p.t });
  j.append({ type: "plan", item: "g2026-11-12-due", done: false });
  assert.equal(j.state().p["g2026-11-12-due"].d, 0);
  const c = j.append({ type: "cfg", d: "2026-11-30", h: 2 });
  assert.deepEqual(j.state().c, { d: "2026-11-30", h: 2, t: c.t });
  const row = { id: "h1", ts: c.t, kind: "mcq", mode: "diag", title: "T", n: 3, c: 2, dur: 10 };
  j.append({ type: "hist", row });
  row.title = "schimbat după";
  assert.equal(j.state().h[0].title, "T", "the state does not share objects with the event the caller holds");
});

test("the history keeps the last 80 rows", () => {
  const { clock, j } = mk();
  for (let i = 0; i < 95; i++) { clock.tick(1000); j.append({ type: "hist", row: { id: "h" + i, ts: clock.t, kind: "mcq", n: 1, c: 1 } }); }
  assert.equal(j.state().h.length, 80);
  assert.equal(j.state().h[0].id, "h15");
});

// ---------- 7. forma evenimentului ----------
test("an answer event has the shape from the spec: unique id, time, device, item, points, form, result, interval", () => {
  const { clock, j } = mk();
  const a = j.append(ev.q("py-01", true)); clock.tick(5000);
  const b = j.append(Object.assign(ev.q("py-01", false), { conf: 2, dur: 14, text: "ce a scris" }));
  assert.match(a.id, /^dev-a\./);
  assert.notEqual(a.id, b.id);
  assert.deepEqual([a.type, a.form, a.item, a.dev, a.points, a.interval], ["answer", "q", "py-01", "dev-a", [], null]);
  assert.deepEqual([b.interval, b.conf, b.dur, b.text], [5000, 2, 14, "ce a scris"]);
  assert.ok(Number.isFinite(a.t) && b.t > a.t);
  assert.deepEqual(JSON.parse(JSON.stringify(b)), b, "events are plain JSON");
});

test("events are stamped so they sort after everything already applied, even if the clock goes back", () => {
  const { clock, j } = mk();
  const a = j.append(ev.q("c1", true));
  clock.t -= 3600000;
  const b = j.append(ev.q("c1", true));
  assert.ok(Journal.cmp(a, b) < 0);
  assert.equal(j.state().q.c1.n, 2);
});

test("two events in the same millisecond keep the order they were appended in", () => {
  const { j } = mk();
  const ids = []; for (let i = 0; i < 30; i++) ids.push(j.append(ev.q("same", i % 2 === 0)).id);
  assert.deepEqual(ids.slice().sort(), ids);
  assert.equal(j.state().q.same.n, 30);
  assert.equal(j.state().q.same.l, 0, "the last one appended (an odd index, wrong) is the one that stays");
});

// ---------- 8. depozitul local, coada netrimisă ----------
test("append is synchronous and persists in the background: events, snapshot and the unsent queue go in one commit", async () => {
  const store = Journal.memStore(), { j } = mk({ store });
  await j.load();
  const e1 = j.append(ev.q("a", true)), e2 = j.append(ev.q("b", false));
  assert.equal(store.stats.commits, 0, "nothing is awaited by the caller");
  await j.flush();
  assert.equal(store.stats.commits, 1, "both events in one commit");
  const stored = await store.allEvents();
  assert.deepEqual(stored.map(e => e.id), [e1.id, e2.id]);
  assert.deepEqual((await j.unsent()).map(e => e.id), [e1.id, e2.id]);
  assert.deepEqual((await store.load()).snapshot.state, j.state());
});

test("the unsent queue: markSent removes events, events that came from the server are never queued", async () => {
  const store = Journal.memStore(), { j, clock } = mk({ store });
  await j.load();
  const e1 = j.append(ev.q("a", true)), e2 = j.append(ev.q("b", true));
  await j.flush();
  await j.markSent([e1.id]);
  assert.deepEqual((await j.unsent()).map(e => e.id), [e2.id]);
  clock.tick();
  await j.merge([{ id: "dev-b.0000001.00001", t: clock.t, dev: "dev-b", type: "answer", form: "q", item: "c", result: { ok: true } }], { remote: true });
  assert.deepEqual((await j.unsent()).map(e => e.id), [e2.id]);
  await j.markSent([e2.id]);
  assert.deepEqual(await j.unsent(), []);
});

test("a failed commit is retried and nothing is lost", async () => {
  const store = Journal.memStore(), { j } = mk({ store });
  await j.load();
  j.append(ev.q("a", true));
  store.failing = true;
  await j.flush();
  assert.equal((await store.allEvents()).length, 0);
  assert.equal(j.info().pending, 1, "still waiting, and still in the mirror");
  store.failing = false;
  await j.flush();
  assert.equal((await store.allEvents()).length, 1);
  assert.equal(j.state().q.a.n, 1);
});

test("a crash after the mirror was written but before the store committed loses nothing on the next start", async () => {
  const store = Journal.memStore(), mirror = Journal.memMirror();
  const clock = clockOf(), a = Journal.create({ device: "dev-a", clock: clock.now, store, mirror });
  await a.load();
  a.append(ev.q("a", true)); await a.flush();
  clock.tick(); a.append(ev.q("b", true)); clock.tick(); a.append({ type: "plan", item: "p", done: true });       // fără flush: procesul „moare” aici
  const S = clone(a.state());
  const b = Journal.create({ device: "dev-a", clock: clock.now, store, mirror });
  assert.deepEqual(b.state(), S, "the mirror has the state");
  await b.load();
  assert.deepEqual(b.state(), S);
  assert.equal((await store.allEvents()).length, 3, "the events that only the mirror knew are now in the store");
  assert.equal((await b.unsent()).length, 3, "and still waiting to be sent");
});

test("the store is ahead of the mirror (the mirror was cleared): the snapshot and the events after it give the state back", async () => {
  const store = Journal.memStore(), clock = clockOf();
  const a = Journal.create({ device: "dev-a", clock: clock.now, store });
  await a.load();
  for (let i = 0; i < 10; i++) { clock.tick(); a.append(ev.q("q" + (i % 3), true)); }
  await a.flush();
  const evs = await store.allEvents(), older = Journal.projectFull(evs.slice(0, -2));          // instantaneul rămas cu două evenimente în urmă
  store.setSnapshot({ v: 1, state: older.state, last: older.last, reset: older.reset, n: older.n });
  store.stats.allEvents = 0;
  const b = Journal.create({ device: "dev-b", clock: clock.now, store });
  assert.deepEqual(b.state(), Journal.emptyState());
  await b.load();
  assert.deepEqual(b.state(), a.state());
  assert.equal(store.stats.allEvents, 0, "only the two events after the snapshot were read");
});

test("no mirror, no snapshot, but a log: one full replay and then the snapshot is written", async () => {
  const store = Journal.memStore(), clock = clockOf();
  const a = Journal.create({ device: "dev-a", clock: clock.now, store });
  await a.load();
  for (let i = 0; i < 6; i++) { clock.tick(); a.append(ev.q("q" + i, i % 2 === 0)); }
  await a.flush();
  store.clearSnapshot();
  const b = Journal.create({ device: "dev-a", clock: clock.now, store });
  await b.load();
  assert.deepEqual(b.state(), a.state());
  assert.ok((await store.load()).snapshot, "snapshot written back");
});

test("an old state kept by the app (the legacy key) becomes imported events the first time the store is empty", async () => {
  const store = Journal.memStore(), S = STATES["a state with every map, settings and history"];
  const j = Journal.create({ device: "dev-a", store, legacy: () => clone(S) });
  assert.deepEqual(j.state(), S, "first paint shows the legacy state at once");
  const r = await j.load();
  assert.equal(r.fresh, false);
  assert.deepEqual(Journal.project(await store.allEvents()), S);
  assert.ok((await store.allEvents()).every(e => e.imported));
  assert.deepEqual((await j.unsent()).map(e => e.id), (await store.allEvents()).map(e => e.id), "the server does not have the old state yet, so the synthetic events are queued (their ids are deterministic: a copy from another device is ignored)");
  const k = Journal.create({ device: "dev-a", store, legacy: () => ({ v: 1, r: 0, q: { stale: { b: 1, n: 1, c: 0, l: 0, t: 1 } }, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [] }) });
  await k.load();
  assert.deepEqual(k.state(), S, "once the store has a journal, the old key is no longer the truth");
});

test("an empty start reports fresh", async () => {
  const j = Journal.create({ device: "dev-a", store: Journal.memStore() });
  assert.equal((await j.load()).fresh, true);
});

test("importing a state through merge: the missing entries come in as events, existing ones stay", async () => {
  const store = Journal.memStore(), clock = clockOf();
  const j = Journal.create({ device: "dev-a", clock: clock.now, store }); await j.load();
  j.append(ev.q("q1", true));
  const T = clone(j.state()); T.q.q2 = { b: 3, n: 2, c: 2, l: 1, t: T0 - 99999 }; T.p.x = { d: 1, t: T0 - 5 };
  const r = await j.importState(T);
  assert.equal(r.added, 2);
  assert.deepEqual(j.state(), T);
  const again = await j.importState(T);
  assert.equal(again.added, 0);
});

test("importing a state with a newer reset replaces what was there", async () => {
  const store = Journal.memStore(), clock = clockOf();
  const j = Journal.create({ device: "dev-a", clock: clock.now, store }); await j.load();
  j.append(ev.q("old", true));
  clock.tick(5000);
  const T = Object.assign(empty(), { r: clock.t, q: { fresh: { b: 2, n: 1, c: 1, l: 1, t: clock.t + 1 } } });
  await j.importState(T);
  assert.deepEqual(j.state(), T);
});

// ---------- 9. fără depozit (artifactul) ----------
test("without a store the journal still projects, so the artifact keeps using the same rules", () => {
  const { j } = mk();
  j.append(ev.q("a", true));
  assert.equal(j.state().q.a.b, 2);
  const S = { v: 1, r: 0, q: { z: { b: 5, n: 9, c: 9, l: 1, t: 1 } }, o: {}, x: {}, k: {}, s: {}, p: {}, l: {}, h: [] };
  let seen = null;
  const k = Journal.create({ device: "dev-a", onState: s => { seen = s; } });
  k.replaceState(S);
  assert.equal(k.state(), S, "the state object the caller handed in is the live one");
  assert.equal(seen, S);
  k.append(ev.q("z", true));
  assert.equal(S.q.z.n, 10, "updates land in the same object the app holds");
});

test("the mirror: the state and the events not yet in the store are written on every append", () => {
  const mirror = Journal.memMirror(), { j } = mk({ mirror, store: Journal.memStore() });
  j.append(ev.q("a", true));
  const m = mirror.read();
  assert.equal(m.snap.state.q.a.n, 1);
  assert.equal(m.tail.length, 1);
  assert.equal(m.tail[0].ev.item, "a");
});

test("localMirror survives a storage that throws", () => {
  const bad = { getItem() { throw new Error("x"); }, setItem() { throw new Error("quota"); } };
  const m = Journal.localMirror(bad, "k");
  assert.equal(m.read(), null);
  assert.equal(m.write({ a: 1 }), false);
  const mem = {}; const ok = Journal.localMirror({ getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = v; } }, "k");
  assert.equal(ok.write({ a: 1 }), true);
  assert.deepEqual(ok.read(), { a: 1 });
});

test("the events a caller reads back do not alias the state or the log", async () => {
  const store = Journal.memStore(), { j } = mk({ store });
  await j.load();
  const e = j.append(ev.oral({ id: "c", k: ["a", "b"] }, { ticks: {}, wrong: ["w"] }));
  await j.flush();
  e.result.missed.push(99);
  assert.deepEqual((await store.allEvents())[0].result.missed, [0, 1]);
  j.state().o.c.m.push(7);
  assert.deepEqual((await store.allEvents())[0].result.missed, [0, 1]);
});
