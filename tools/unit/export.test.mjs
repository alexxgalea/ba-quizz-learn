// Exportul, importul și ștergerea jurnalului (tichetul 09): fișierul de export (Journal.exportDoc / parseExport), importul fără dubluri și fără server, ștergerea de pe server
// cu epoca (JournalSync.purgeServer / resend, server fals în tools/unit/fake_server.mjs) și brief-ul (export/make_brief.js) pe exportul nou.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fakeServer } from "./fake_server.mjs";

const require_ = createRequire(import.meta.url);
const Journal = require_("../../src/journal.js"), JournalSync = require_("../../src/sync.js");
const ROOT = new URL("../../", import.meta.url).pathname;

const URL1 = "https://fake.test";
const clockOf = (start = 1_800_000_000_000) => { const c = { t: start, now: () => c.t, tick(ms = 1000) { c.t += ms; return c.t; } }; return c; };
async function device(name, srv, o = {}) {
  const clock = o.clock || clockOf(), j = Journal.create({ device: name, clock: clock.now, store: Journal.memStore() });
  const link = { url: URL1, secret: srv.secret };
  const sync = JournalSync.create({ journal: j, fetch: srv.fetch, link: () => (o.noLink ? null : link), random: () => 0 });
  await j.load();
  return { name, clock, j, sync, link };
}
const answer = (d, item, ok = true, extra = {}) => { d.clock.tick(); return d.j.append({ type: "answer", form: "q", item, result: { ok }, ...extra }); };
const oral = (d, item, text) => { d.clock.tick(); return d.j.append({ type: "answer", form: "o", item, result: { p: 0.6, missed: [1], k: 3 }, text }); };
const ids = async d => (await d.j.events()).map(e => e.id).sort();
const fileOf = async d => JSON.stringify(Journal.exportDoc(await d.j.events(), { device: d.name }));
const proj = d => JSON.parse(JSON.stringify(d.j.state()));
const unsentN = async d => (await d.j.unsent()).length;
async function populated(srv, name = "phone") {
  const d = await device(name, srv);
  answer(d, "py-01"); answer(d, "py-01"); answer(d, "py-02", false, { text: "Răspunsul meu, cu ăâîșț: GIL blochează thread-urile." });
  oral(d, "o-1", "Un thread pool refolosește workerii.");
  d.clock.tick(); d.j.append({ type: "cfg", d: "2026-12-01", h: 3 });
  d.clock.tick(); d.j.append({ type: "plan", item: "g1-diag", done: true });
  return d;
}

// ---------- formatul fișierului ----------
test("the export is the whole journal, with Alex's text, device ids and a format version", async () => {
  const srv = fakeServer(), a = await populated(srv), b = await device("laptop", srv);
  answer(b, "py-09");
  await a.sync.syncNow(); await b.sync.syncNow(); await a.sync.syncNow();
  const doc = JSON.parse(await fileOf(a));
  assert.equal(doc.format, "ba-journal");
  assert.equal(doc.version, 1);
  assert.equal(doc.device, "phone");
  assert.deepEqual(doc.devices, ["laptop", "phone"]);
  assert.equal(doc.count, 7);
  assert.equal(doc.events.length, 7);
  assert.ok(doc.events.some(e => e.text === "Răspunsul meu, cu ăâîșț: GIL blochează thread-urile."), "the written answer is in the file");
  assert.ok(doc.events.some(e => e.dev === "laptop"), "events from the other device are there too");
  assert.deepEqual(doc.events.map(e => e.id), (await a.j.events()).map(e => e.id), "all of it, in journal order");
});

test("the export never contains the server secret or address", async () => {
  const srv = fakeServer("topsecret-" + "z".repeat(30)), a = await populated(srv);
  await a.sync.syncNow();
  const text = await fileOf(a);
  assert.ok(!text.includes(srv.secret), "no secret");
  assert.ok(!text.includes(URL1), "no server address");
  assert.ok(!/secret|authorization|bearer/i.test(text.replace(/Răspunsul meu[^"]*"/, "")), "no credential-looking keys");
});

test("an empty journal exports and parses as an empty list", () => {
  const doc = Journal.exportDoc([], { device: "d1" });
  assert.deepEqual(doc.devices, ["d1"]);
  assert.deepEqual(Journal.parseExport(JSON.stringify(doc)).events, []);
});

// ---------- validare, cu mesaje românești ----------
test("parseExport refuses a bad file with a clear Romanian message and a code", async () => {
  const srv = fakeServer(), a = await populated(srv);
  const good = Journal.exportDoc(await a.j.events(), { device: "phone" });
  const err = input => { try { Journal.parseExport(input); } catch (e) { return e; } return null; };
  assert.equal(err("").code, "empty");
  assert.match(err("").message, /gol/);
  assert.equal(err("nu e json {").code, "json");
  assert.match(err("nu e json {").message, /export valid/);
  assert.equal(err("[1,2]").code, "format");
  assert.equal(err("null").code, "format");
  assert.equal(err(JSON.stringify({ format: "altceva", version: 1, events: [] })).code, "format");
  const old = err(JSON.stringify(a.j.state()));
  assert.equal(old.code, "format");
  assert.match(old.message, /export de progres/, "an old S export is recognised and pointed to the right box");
  assert.equal(err(JSON.stringify({ ...good, version: 2 })).code, "version");
  assert.match(err(JSON.stringify({ ...good, version: 2 })).message, /versiune mai nouă/);
  assert.equal(err(JSON.stringify({ ...good, version: "1" })).code, "version");
  assert.equal(err(JSON.stringify({ ...good, version: 0 })).code, "version");
  assert.equal(err(JSON.stringify({ ...good, events: "nope" })).code, "events");
  const broken = { ...good, events: [good.events[0], { id: "x", t: "azi", type: "answer" }, { t: 1, type: "answer" }, good.events[1]] };
  const e2 = err(JSON.stringify(broken));
  assert.equal(e2.code, "events");
  assert.match(e2.message, /2 evenimente/);
  assert.match(e2.message, /poziția 2/);
  assert.match(e2.message, /Nu s-a importat nimic/);
  assert.equal(err(JSON.stringify(good)), null, "the good file parses");
});

test("a bad file imports nothing: the journal is untouched", async () => {
  const srv = fakeServer(), a = await populated(srv), b = await device("laptop", srv);
  const good = Journal.exportDoc(await a.j.events(), { device: "phone" });
  good.events.push({ id: "broken" });
  assert.throws(() => Journal.parseExport(JSON.stringify(good)));
  assert.equal((await b.j.events()).length, 0);
});

// ---------- import ----------
test("import is a union by id: twice is the same as once, and overlap adds only what is missing", async () => {
  const srv = fakeServer(), a = await populated(srv), b = await device("laptop", srv);
  answer(b, "py-77");                                           // un eveniment doar pe B
  const file = await fileOf(a);
  const r1 = await b.j.merge(Journal.parseExport(file).events);
  assert.equal(r1.added, 6);
  const r2 = await b.j.merge(Journal.parseExport(file).events);
  assert.equal(r2.added, 0, "the second import adds nothing");
  assert.equal((await b.j.events()).length, 7);
  assert.equal(new Set(await ids(b)).size, 7, "no duplicates");
  const r3 = await a.j.merge(Journal.parseExport(await fileOf(b)).events);
  assert.equal(r3.added, 1, "only the missing one comes into A");
  assert.deepEqual(await ids(a), await ids(b));
  assert.deepEqual(proj(a), proj(b), "the same projection");
});

test("import works offline and the new events go through the normal unsent queue (the server ignores what it already has)", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.sync.syncNow();
  assert.equal(srv.events.length, 6);
  const b = await device("laptop", srv);
  answer(b, "py-77");
  srv.down = true;
  const file = await fileOf(a);
  const r = await b.j.merge(Journal.parseExport(file).events);
  assert.equal(r.added, 6);
  assert.equal(await unsentN(b), 7, "the imported events wait in the queue like any local ones, nothing was sent");
  assert.equal(srv.events.length, 6);
  srv.down = false;
  await b.sync.syncNow();
  assert.equal(await unsentN(b), 0);
  assert.equal(srv.events.length, 7, "the server got only the one it was missing");
  assert.equal(new Set(srv.events.map(e => e.id)).size, 7);
  assert.deepEqual(proj(b).q["py-01"], proj(a).q["py-01"]);
});

test("events already on the device are not queued again by an import", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.sync.syncNow();
  assert.equal(await unsentN(a), 0);
  await a.j.merge(Journal.parseExport(await fileOf(a)).events);
  assert.equal(await unsentN(a), 0);
});

// ---------- export → ștergere → import ----------
test("export → purge on the server → import gives the same projection, and the journal reaches the server again", async () => {
  const srv = fakeServer(), a = await populated(srv);
  answer(a, "py-03", false);
  await a.sync.syncNow();
  const before = proj(a), file = await fileOf(a), n = (await a.j.events()).length;
  assert.equal(srv.events.length, n);
  const res = await a.sync.purgeServer();
  assert.equal(res.deleted, n);
  assert.equal(srv.events.length, 0, "the server is empty");
  // un dispozitiv nou, gol, încarcă fișierul
  const fresh = await device("tablet", srv);
  const imp = await fresh.j.merge(Journal.parseExport(file).events);
  assert.equal(imp.added, n);
  assert.deepEqual(proj(fresh), before, "same projection");
  assert.deepEqual(await ids(fresh), await ids(a));
  // imported events are queued: the normal sync puts them on the (empty) server
  await fresh.sync.syncNow();
  assert.equal(srv.events.length, n);
  assert.deepEqual(srv.events.map(e => e.id).sort(), await ids(a));
  // și un dispozitiv care nu a șters nimic vede același lucru
  await a.sync.syncNow();
  assert.deepEqual(proj(a), before);
});

test("export → purge → import over the SAME device (local copy wiped by hand) also restores the projection", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.sync.syncNow();
  const before = proj(a), file = await fileOf(a);
  await a.sync.purgeServer();
  const store = Journal.memStore();                                  // „am golit datele browserului”
  const j2 = Journal.create({ device: "phone2", clock: a.clock.now, store });
  await j2.load();
  await j2.merge(Journal.parseExport(file).events);
  assert.deepEqual(JSON.parse(JSON.stringify(j2.state())), before);
});

// ---------- epoca ----------
test("a purge made on the phone: the laptop resets its cursor, keeps its data, and re-uploads nothing on its own", async () => {
  const srv = fakeServer(), phone = await populated(srv), laptop = await device("laptop", srv);
  await phone.sync.syncNow(); await laptop.sync.syncNow();
  assert.equal(laptop.j.state().q["py-01"].b, 3);
  assert.equal(laptop.sync.status().wiped, 0);
  const aux0 = await laptop.j.getAux(JournalSync.AUX_KEY);
  assert.equal(aux0.after, 6); assert.equal(aux0.epoch, "0");

  await phone.sync.purgeServer();
  assert.equal(srv.events.length, 0);
  await laptop.sync.syncNow();
  assert.equal(laptop.sync.status().state, "synced");
  assert.ok(laptop.sync.status().wiped > 0, "the laptop knows the server was wiped");
  assert.equal(laptop.j.state().q["py-01"].b, 3, "local data intact");
  assert.equal((await laptop.j.events()).length, 6);
  assert.equal(srv.events.length, 0, "nothing was silently re-uploaded");
  assert.equal(await unsentN(laptop), 0);
  const aux1 = await laptop.j.getAux(JournalSync.AUX_KEY);
  assert.equal(aux1.after, 0); assert.equal(aux1.epoch, srv.epoch);
});

test("without the epoch reset, new events written after a purge would be missed: with it, they arrive", async () => {
  const srv = fakeServer(), phone = await populated(srv), laptop = await device("laptop", srv);
  await phone.sync.syncNow(); await laptop.sync.syncNow();          // cursor 6 pe laptop
  await phone.sync.purgeServer();
  for (let i = 0; i < 3; i++) answer(phone, "new-" + i);             // 3 evenimente noi: numerele 1..3 pe server, sub cursorul 6 al laptopului
  await phone.sync.syncNow();
  assert.equal(srv.events.length, 3);
  await laptop.sync.syncNow();
  for (let i = 0; i < 3; i++) assert.equal(box(laptop, "new-" + i), 2, "new-" + i + " reached the laptop");
});

const box = (d, item) => (d.j.state().q[item] || {}).b;

test("the device that purges keeps syncing new answers afterwards, and keeps its local copy", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.sync.syncNow();
  const n = (await a.j.events()).length;
  await a.sync.purgeServer();
  assert.equal((await a.j.events()).length, n);
  assert.ok(a.sync.status().wiped > 0);
  await a.sync.syncNow();
  assert.equal(srv.events.length, 0, "syncing after the purge does not bring the old events back");
  answer(a, "py-50");
  await a.sync.syncNow();
  assert.equal(srv.events.length, 1);
  assert.equal(srv.events[0].item, "py-50");
});

test("events that never reached the server still go up after a purge (only what the server had is gone)", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.sync.syncNow();
  srv.down = true; answer(a, "py-60"); await a.sync.syncNow(); srv.down = false;
  assert.equal(await unsentN(a), 1);
  await a.sync.purgeServer();
  await a.sync.syncNow();
  assert.deepEqual(srv.events.map(e => e.item), ["py-60"]);
});

test("a device that was offline with unsent events pushes into a wiped server: they land, the cursor resets", async () => {
  const srv = fakeServer(), phone = await populated(srv), laptop = await device("laptop", srv);
  await phone.sync.syncNow(); await laptop.sync.syncNow();
  srv.down = true; answer(laptop, "off-1"); await laptop.sync.syncNow(); srv.down = false;
  await phone.sync.purgeServer();
  await laptop.sync.syncNow();
  assert.deepEqual(srv.events.map(e => e.item), ["off-1"]);
  assert.ok(laptop.sync.status().wiped > 0);
  assert.equal((await laptop.j.getAux(JournalSync.AUX_KEY)).epoch, srv.epoch);
  await phone.sync.syncNow();
  assert.equal(box(phone, "off-1"), 2);
});

test("'Retrimite jurnalul local' puts the whole local journal back on the wiped server, once, and clears the notice", async () => {
  const srv = fakeServer(), phone = await populated(srv), laptop = await device("laptop", srv);
  await phone.sync.syncNow(); await laptop.sync.syncNow();
  const n = (await phone.j.events()).length;
  await phone.sync.purgeServer();
  const count = await phone.sync.resend();
  assert.equal(count, n);
  assert.equal(phone.sync.status().wiped, 0);
  await phone.sync.syncNow();
  assert.equal(srv.events.length, n);
  assert.equal(new Set(srv.events.map(e => e.id)).size, n, "each event once");
  assert.equal(await unsentN(phone), 0);
  await laptop.sync.syncNow();
  assert.deepEqual(proj(laptop), proj(phone));
  await phone.sync.resend(); await phone.sync.syncNow();
  assert.equal(srv.events.length, n, "resending twice changes nothing: the server ignores ids it has");
});

test("the first epoch ever seen is only remembered (no reset, no notice)", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.j.setAux(JournalSync.AUX_KEY, { url: URL1, after: 0 });     // cursor dinainte de tichetul 09: fără epocă
  await a.sync.syncNow();
  assert.equal(a.sync.status().wiped, 0);
  const aux = await a.j.getAux(JournalSync.AUX_KEY);
  assert.equal(aux.epoch, "0"); assert.equal(aux.after, 6);
});

test("a server that sends no epoch (older) changes nothing", async () => {
  const srv = fakeServer(); srv.legacy = true;
  const a = await populated(srv), b = await device("laptop", srv);
  await a.sync.syncNow(); await b.sync.syncNow();
  assert.equal(b.sync.status().wiped, 0);
  assert.equal(box(b, "py-01"), 3);
  const aux = await b.j.getAux(JournalSync.AUX_KEY);
  assert.equal(aux.after, 6); assert.ok(!aux.epoch);
});

test("purgeServer failures: wrong secret, no signal, no server; nothing local changes and syncing resumes", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.sync.syncNow();
  const kinds = async () => { try { await a.sync.purgeServer(); return "ok"; } catch (e) { return e.kind; } };
  a.link.secret = "gresit";
  assert.equal(await kinds(), "auth");
  a.link.secret = srv.secret;
  srv.down = true;
  assert.equal(await kinds(), "offline");
  srv.down = false; srv.status = 503;
  assert.equal(await kinds(), "server");
  srv.status = 0;
  assert.equal(srv.events.length, 6, "nothing was deleted by the failures");
  assert.equal((await a.j.events()).length, 6);
  answer(a, "py-70"); await a.sync.syncNow();
  assert.equal(srv.events.length, 7, "syncing works again (not left paused)");
  const none = await device("x", srv, { noLink: true });
  await assert.rejects(() => none.sync.purgeServer(), e => e.kind === "none");
});

test("the fake server refuses a purge without the exact confirmation (like the real one) and without the secret", async () => {
  const srv = fakeServer(), a = await populated(srv);
  await a.sync.syncNow();
  const post = (body, auth = "Bearer " + srv.secret) => srv.fetch(URL1 + "/events/purge", { method: "POST", headers: { Authorization: auth }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal((await post({})).status, 422);
  assert.equal((await post({ confirm: "yes" })).status, 422);
  assert.equal((await post({ confirm: "purge-all-events", extra: 1 })).status, 422);
  assert.equal((await post(undefined)).status, 422);
  assert.equal((await post({ confirm: "purge-all-events" }, "Bearer nope")).status, 401);
  assert.equal(srv.events.length, 6);
  assert.equal(JournalSync.PURGE_CONFIRM, "purge-all-events");
});

// ---------- brief ----------
test("make_brief reads the new export and gives the same brief as the old S export of the same progress", async () => {
  const srv = fakeServer(), a = await device("phone", srv);
  for (const id of ["py-01", "py-02", "gil-03", "asgi-02"]) { answer(a, id); }
  answer(a, "py-02", false); answer(a, "pg-01", false); answer(a, "gil-04");
  a.clock.tick(); a.j.append({ type: "hist", row: { id: "h1", ts: a.clock.t, kind: "mcq", mode: "module", title: "Python", n: 5, c: 3, dur: 300 } });
  const dir = mkdtempSync(join(tmpdir(), "brief-"));
  const exp = join(dir, "jurnal.json"), old = join(dir, "progress.json"), outNew = join(dir, "new.md"), outOld = join(dir, "old.md");
  writeFileSync(exp, await fileOf(a));
  writeFileSync(old, JSON.stringify(a.j.state()));
  execFileSync("node", [ROOT + "export/make_brief.js", exp, outNew], { cwd: ROOT });
  execFileSync("node", [ROOT + "export/make_brief.js", old, outOld], { cwd: ROOT });
  const mdNew = readFileSync(outNew, "utf8"), mdOld = readFileSync(outOld, "utf8");
  assert.equal(mdNew, mdOld, "the journal export and the S export give the same brief");
  assert.match(mdNew, /grile răspunse/);
  assert.match(mdNew, /6 de grile răspunse/, "the six answered MCQs are counted from the journal projection");
  assert.match(mdNew, /greșită de Alex la ultimul răspuns/, "the last-wrong marker comes through");
});

test("make_brief refuses a broken journal export with the message and writes nothing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "brief-"));
  const exp = join(dir, "jurnal.json"), out = join(dir, "x.md");
  writeFileSync(exp, JSON.stringify({ format: "ba-journal", version: 1, events: [{ id: "x" }] }));
  assert.throws(() => execFileSync("node", [ROOT + "export/make_brief.js", exp, out], { cwd: ROOT, stdio: "pipe" }), e => /Fișierul e stricat/.test(String(e.stderr)));
  assert.throws(() => readFileSync(out));
});
