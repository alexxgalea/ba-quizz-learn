// Jetonul efemer pentru Jarvis (platforma, tichetul 08): ServerConn, LiveToken, GeminiLive cu jeton și Jarvis fără cheie în browser.
// Ce nu se poate verifica aici: că Gemini acceptă jetonul pe `BidiGenerateContentConstrained` și handle-ul de reluare cu alt jeton (docs/probe-jeton-live.html).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeNetwork, fakeLive, fakeAudio, fakeClock, memoryStorage, stubApp, tick, settle } from "./fakes.mjs";

const require = createRequire(import.meta.url);
const ServerConn = require("../../src/server_conn.js");
const LiveToken = require("../../src/live_token.js");
const GeminiLive = require("../../src/live.js");
const Call = require("../../src/call.js");
const Jarvis = require("../../src/jarvis.js");

const MIN = 60000;

// ---------- ServerConn ----------

test("ServerConn keeps the address and the secret as JSON under onapsis-server-v1 and nowhere else", () => {
  const st = memoryStorage();
  const conn = ServerConn.create(st);
  assert.deepEqual([conn.configured(), conn.get()], [false, { url: "", secret: "" }]);
  conn.set({ url: " https://abc.lambda-url.eu-central-1.on.aws/ ", secret: " s3cret " });
  assert.deepEqual(Object.keys(st.data), ["onapsis-server-v1"]);
  assert.deepEqual(JSON.parse(st.data["onapsis-server-v1"]), { url: "https://abc.lambda-url.eu-central-1.on.aws", secret: "s3cret" });
  assert.deepEqual([conn.configured(), conn.endpoint("/live-token"), conn.headers()], [true, "https://abc.lambda-url.eu-central-1.on.aws/live-token", { authorization: "Bearer s3cret" }]);
});

test("ServerConn needs both the address and the secret, merges partial updates and clears when both are empty", () => {
  const st = memoryStorage();
  const conn = ServerConn.create(st);
  conn.set({ url: "https://x.example" });
  assert.equal(conn.configured(), false);
  conn.set({ secret: "k" });
  assert.deepEqual([conn.configured(), conn.get()], [true, { url: "https://x.example", secret: "k" }]);
  conn.set({ url: "", secret: "" });
  assert.deepEqual([conn.configured(), "onapsis-server-v1" in st.data], [false, false]);
});

test("ServerConn survives a broken JSON entry", () => {
  const conn = ServerConn.create(memoryStorage({ "onapsis-server-v1": "{nu e json" }));
  assert.deepEqual([conn.configured(), conn.get()], [false, { url: "", secret: "" }]);
});

test("ServerConn validation, in one place: https only (http on localhost), no trailing slash, secret printable ASCII without spaces", () => {
  assert.equal(ServerConn.normUrl(" https://srv.example/ "), "https://srv.example");
  assert.equal(ServerConn.normUrl("srv.example"), "");
  assert.equal(ServerConn.normUrl("http://evil.example"), "");
  assert.equal(ServerConn.normUrl("http://localhost:8080/"), "http://localhost:8080");
  assert.equal(ServerConn.normUrl("https://a b.example"), "");
  assert.equal(ServerConn.validSecret("tok-123_ABC"), true);
  assert.equal(ServerConn.validSecret(" tok "), true, "surrounding spaces are trimmed first");
  for (const bad of ["", "a b", "greșit", "tab\there"]) assert.equal(ServerConn.validSecret(bad), false, JSON.stringify(bad));
  const conn = ServerConn.create(memoryStorage());
  conn.set({ url: "http://evil.example", secret: "x" });
  assert.deepEqual([conn.valid(), conn.configured()], [null, false], "a stored pair that does not validate is not configured");
  conn.set({ url: "https://a.test", secret: "greșit" });
  assert.deepEqual([conn.valid(), conn.configured()], [null, false]);
  conn.set({ url: "https://a.test/", secret: "ok" });
  assert.deepEqual([conn.valid(), conn.configured()], [{ url: "https://a.test", secret: "ok" }, true]);
});

// ---------- LiveToken ----------

function tokenHarness(reply) {
  const calls = [], clock = fakeClock(5000);
  const conn = ServerConn.create(memoryStorage({ "onapsis-server-v1": JSON.stringify({ url: "https://srv.example", secret: "SEC" }) }));
  const fetch = async (url, init) => { calls.push({ url, init }); if (reply instanceof Error) throw reply; return reply; };
  const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => { if (body === undefined) throw new Error("fără json"); return body; } });
  return { calls, clock, conn, res, make: () => LiveToken.create({ server: conn, fetch, now: clock.now }) };
}

test("LiveToken posts to /live-token with the secret and returns the token with an expiry on the phone's clock", async () => {
  const h = tokenHarness(null);
  const t = LiveToken.create({ server: h.conn, now: h.clock.now, fetch: async (url, init) => { h.calls.push({ url, init }); return h.res(200, { token: "auth_tokens/T1", expireAt: "2000-01-01T00:00:00Z", expiresIn: 3600 }); } });
  const got = await t.get();
  assert.deepEqual(got, { token: "auth_tokens/T1", expireAt: 5000 + 3600 * 1000 });     // din expiresIn, nu din ora serverului
  assert.deepEqual([h.calls[0].url, h.calls[0].init.method, h.calls[0].init.headers], ["https://srv.example/live-token", "POST", { authorization: "Bearer SEC" }]);
});

test("LiveToken names what went wrong, so the screen can say it in Romanian", async () => {
  const cases = [
    [new TypeError("Failed to fetch"), "offline"],
    [null, "unauthorized", 401, { detail: "unauthorized" }],
    [null, "nokey", 503, { detail: { error: "gemini_key_missing" } }],
    [null, "gemini", 502, { detail: { error: "gemini_unreachable" } }],
    [null, "gemini", 502, { detail: { error: "gemini_error", upstream_status: 403 } }],
    [null, "server", 500, undefined],
    [null, "server", 200, { nope: true }]
  ];
  for (const [err, reason, status, body] of cases) {
    const h = tokenHarness(null);
    const t = LiveToken.create({ server: h.conn, now: h.clock.now, fetch: async () => { if (err) throw err; return h.res(status, body); } });
    await assert.rejects(t.get(), e => e.reason === reason, reason);
  }
});

test("LiveToken without a configured server fails with noserver and does not call out", async () => {
  let called = false;
  const t = LiveToken.create({ server: ServerConn.create(memoryStorage()), fetch: async () => { called = true; } });
  await assert.rejects(t.get(), e => e.reason === "noserver");
  assert.equal(called, false);
});

// ---------- GeminiLive cu jeton ----------

// Un GeminiLive peste socket fals, ceas fals și un getToken numărat. Jetonul n-trăiește `life` ms de la cerere.
function liveHarness({ life = 60 * MIN, getToken } = {}) {
  const net = fakeNetwork(), clock = fakeClock(1000), events = [], sleeps = [];
  const tokens = { calls: 0, fail: null };
  const gt = getToken || (async () => {
    tokens.calls++;
    if (tokens.fail) throw Object.assign(new Error(tokens.fail), { reason: tokens.fail });
    return { token: "T" + tokens.calls, expireAt: clock.now() + life };
  });
  // `gateAt`: a câta pauză așteaptă `release()`, ca testul să schimbe lumea între două încercări.
  const gate = { at: 0, release: () => {}, p: null };
  const api = GeminiLive.create({ WebSocket: net.Socket, now: clock.now, sleep: ms => {
    sleeps.push(ms); clock.advance(ms);
    if (gate.at && sleeps.length === gate.at) { gate.p = new Promise(r => { gate.release = r; }); return gate.p; }
    return Promise.resolve();
  } });
  return { net, clock, events, sleeps, tokens, gate, open: (cfg = {}) => api.open(Object.assign({ model: "gemini-3.8-live", getToken: gt }, cfg), e => events.push(e)) };
}
// Sesiune deschisă cu jeton și cu un handle de reluare primit.
async function liveWithHandle(opts) {
  const t = liveHarness(opts);
  const p = t.open();
  await tick();
  t.sock = t.net.sockets[0];
  t.sock.serverSend({ setupComplete: {} });
  t.session = await p;
  t.sock.serverSend({ sessionResumptionUpdate: { newHandle: "h1", resumable: true } });
  await settle();
  return t;
}
const goAway = async t => { t.net.sockets.at(-1).serverSend({ goAway: { timeLeft: "10s" } }); await settle(); };
const confirm = async (t, i) => { t.net.sockets[i].serverSend({ setupComplete: {} }); await settle(); };
const setupOf = (t, i) => t.net.sockets[i].sent[0].setup;
const tokenOf = (t, i) => new URL(t.net.sockets[i].url).searchParams.get("access_token");

test("a session opens with the token on the Constrained endpoint, v1beta, as access_token and never as key", async () => {
  const t = await liveWithHandle();
  const url = new URL(t.net.sockets[0].url);
  assert.deepEqual([url.pathname.endsWith("v1beta.GenerativeService.BidiGenerateContentConstrained"), url.searchParams.get("access_token"), url.searchParams.has("key"), t.tokens.calls], [true, "T1", false, 1]);
});

test("the token is requested at start, once", async () => {
  const t = await liveWithHandle();
  assert.equal(t.tokens.calls, 1);
});

test("a reconnect with plenty of life left keeps the same token and resumes with the handle", async () => {
  const t = await liveWithHandle();
  t.clock.advance(10 * MIN);                           // 50 de minute rămase
  await goAway(t); await confirm(t, 1);
  assert.deepEqual([t.tokens.calls, tokenOf(t, 1), setupOf(t, 1).sessionResumption, t.events], [1, "T1", { handle: "h1" }, [{ type: "reconnecting" }, { type: "live" }]]);
});

test("a session longer than the token life continues: the reconnect asks for a new token before the old one runs out", async () => {
  const t = await liveWithHandle();
  t.clock.advance(55 * MIN);                           // jetonul ține încă 5 minute: sub pragul de reînnoire
  await goAway(t); await confirm(t, 1);
  assert.deepEqual([t.tokens.calls, tokenOf(t, 1), setupOf(t, 1).sessionResumption, t.events], [2, "T2", { handle: "h1" }, [{ type: "reconnecting" }, { type: "live" }]]);
  // și mai târziu, după încă o oră, tot așa: nicio expirare nu oprește sesiunea
  t.net.sockets[1].serverSend({ sessionResumptionUpdate: { newHandle: "h2", resumable: true } }); await settle();
  t.clock.advance(58 * MIN);
  await goAway(t); await confirm(t, 2);
  assert.deepEqual([t.tokens.calls, tokenOf(t, 2), setupOf(t, 2).sessionResumption.handle, t.events.at(-1)], [3, "T3", "h2", { type: "live" }]);
});

test("the live session still takes audio after the token was renewed", async () => {
  const t = await liveWithHandle();
  t.clock.advance(55 * MIN);
  await goAway(t); await confirm(t, 1);
  assert.equal(t.session.audio(Int16Array.of(1, 2)), true);
  assert.equal(t.net.sockets[1].sent.some(m => m.realtimeInput && m.realtimeInput.audio), true);
});

test("if Gemini refuses the old handle with the new token, the session restarts cleanly and says so", async () => {
  const t = await liveWithHandle();
  t.clock.advance(55 * MIN);
  t.net.plan.push({ close: [1007, "Invalid session handle."] });         // socketul 1 (jeton nou + handle vechi) e refuzat
  await goAway(t); await settle(6);
  await confirm(t, 2);
  assert.deepEqual([t.net.sockets.length, tokenOf(t, 1), tokenOf(t, 2), setupOf(t, 2).sessionResumption, t.tokens.calls, t.events],
    [3, "T2", "T2", {}, 2, [{ type: "reconnecting" }, { type: "restarted" }, { type: "live" }]]);
});

test("a handle refusal with the SAME token is not retried without the handle (the token is not the cause)", async () => {
  const t = await liveWithHandle();
  t.net.plan.push({ close: [1007, "Invalid session handle."] });
  await goAway(t); await settle(6);
  assert.deepEqual([t.net.sockets.length, t.events.at(-1).type, t.events.at(-1).reason], [2, "closed", "rejected"]);
});

test("if Gemini says the token is no good, one new token is requested and the connection is retried once", async () => {
  const t = await liveWithHandle();
  t.clock.advance(5 * MIN);                            // pe hârtie jetonul e bun
  t.net.plan.push({ close: [1008, "Request had invalid authentication credentials."] });
  await goAway(t); await settle(6);
  await confirm(t, 2);
  assert.deepEqual([t.tokens.calls, tokenOf(t, 1), tokenOf(t, 2), t.events.at(-1)], [2, "T1", "T2", { type: "live" }]);
});

test("a token refused twice in a row ends the session with auth instead of looping", async () => {
  const t = await liveWithHandle();
  t.clock.advance(5 * MIN);
  // vechi, nou, apoi nou fără handle: toate refuzate
  t.net.plan.push({ close: [1008, "invalid authentication credentials"] }, { close: [1008, "invalid authentication credentials"] }, { close: [1008, "invalid authentication credentials"] });
  await goAway(t); await settle(8);
  assert.deepEqual([t.tokens.calls, t.net.sockets.length, t.events.at(-1).reason], [2, 4, "auth"]);
});

test("no signal at start: the open fails with offline, before any socket is created", async () => {
  const t = liveHarness();
  t.tokens.fail = "offline";
  await assert.rejects(t.open(), e => e.reason === "offline");
  assert.deepEqual([t.net.sockets.length, t.tokens.calls], [0, 1]);
});

test("no signal while reconnecting to renew the token: it retries, then ends with offline", async () => {
  const t = await liveWithHandle();
  t.clock.advance(55 * MIN);
  t.tokens.fail = "offline";
  await goAway(t); await settle(10);
  assert.deepEqual([t.sleeps, t.net.sockets.length, t.events.map(e => e.type), t.events.at(-1).reason], [[500, 1000, 2000], 1, ["reconnecting", "closed"], "offline"]);
});

test("the token comes back after a blip: the retry renews and the session goes on", async () => {
  const t = await liveWithHandle();
  t.clock.advance(55 * MIN);
  t.tokens.fail = "offline";
  t.gate.at = 2;                                       // prima încercare pică (offline), a doua așteaptă
  await goAway(t); await settle(4);
  t.tokens.fail = null; t.gate.release();
  await settle(6); await confirm(t, 1);
  assert.deepEqual([t.events.at(-1), tokenOf(t, 1), t.tokens.calls], [{ type: "live" }, "T3", 3]);     // cererea 2 a picat, a 3-a a mers
});

test("the old key path still works when no token source is given", async () => {
  const net = fakeNetwork();
  const api = GeminiLive.create({ WebSocket: net.Socket });
  const p = api.open({ model: "gemini-3.8-live", key: "KEY" }, () => {});
  await tick();
  net.sockets[0].serverSend({ setupComplete: {} });
  await p;
  const url = new URL(net.sockets[0].url);
  assert.deepEqual([url.pathname.endsWith("v1beta.GenerativeService.BidiGenerateContent"), url.searchParams.get("key"), url.searchParams.has("access_token")], [true, "KEY", false]);
});

// ---------- Jarvis fără cheie în browser ----------

function jarvisSetup(over = {}) {
  const t = { live: fakeLive(), audio: fakeAudio(), clock: fakeClock(), app: stubApp(), storage: memoryStorage(), tokens: { calls: 0, fail: null }, configured: true };
  Object.assign(t, over);
  t.getToken = async () => {
    t.tokens.calls++;
    if (t.tokens.fail) throw Object.assign(new Error(t.tokens.fail), { reason: t.tokens.fail });
    return { token: "T" + t.tokens.calls, expireAt: t.clock.now() + 60 * MIN };
  };
  t.jarvis = Jarvis.create({ call: Call, app: t.app, live: t.live, audio: t.audio, storage: t.storage, clock: t.clock, server: { configured: () => t.configured }, getToken: t.getToken });
  t.state = () => t.jarvis.getState();
  t.tool = async (name, args = {}) => { const r = await t.live.cfg.tools.find(x => x.name === name).run(args); t.live.emit({ type: "tool", name, args, result: r }); return r; };
  t.texts = () => t.live.sent.filter(x => x.text).map(x => x.text);
  return t;
}

test("training and lesson start with no Gemini key in localStorage", async () => {
  for (const opts of [{ mode: "train" }, { mode: "lesson", module: "django" }]) {
    const t = jarvisSetup();
    const ok = await t.jarvis.start(opts);
    assert.deepEqual([ok, t.state().needKey, t.state().phase !== "idle", "key" in t.live.cfg, typeof t.live.cfg.getToken, t.storage.data], [true, false, true, false, "function", {}], opts.mode);
  }
});

test("the token asked for before the microphone is the one the session opens with, and the next one is fresh", async () => {
  const t = jarvisSetup();
  await t.jarvis.start({ mode: "train" });
  const first = await t.live.cfg.getToken(), second = await t.live.cfg.getToken();
  assert.deepEqual([first.token, second.token, t.tokens.calls], ["T1", "T2", 2]);
});

test("no signal at start: a clear message in Romanian, no microphone, no connection", async () => {
  const t = jarvisSetup();
  t.tokens.fail = "offline";
  const ok = await t.jarvis.start({ mode: "train" });
  assert.deepEqual([ok, t.state().phase, t.state().error.code, t.audio.started, t.live.cfg], [false, "idle", "offline", false, null]);
  assert.match(t.state().error.message, /Fără conexiune la server.*internet/);
});

test("the other token failures each have their own message and none leaves the screen busy", async () => {
  const want = { noserver: /Serverul nu e configurat/, unauthorized: /refuzat secretul/, nokey: /lipsește cheia Gemini/, gemini: /jeton de la Gemini/, server: /nu răspunde/ };
  for (const [reason, re] of Object.entries(want)) {
    const t = jarvisSetup();
    t.tokens.fail = reason;
    await t.jarvis.start({ mode: "lesson", module: "django" });
    assert.deepEqual([t.state().phase, t.state().error.code, re.test(t.state().error.message)], ["idle", reason, true], reason);
  }
});

test("a lesson that cannot get a token can be started again once the signal is back", async () => {
  const t = jarvisSetup();
  t.tokens.fail = "offline";
  await t.jarvis.start({ mode: "lesson", module: "django" });
  t.tokens.fail = null;
  assert.equal(await t.jarvis.start({ mode: "lesson", module: "django" }), true);
});

test("with a server set, the old key is dropped from the browser once a session has started", async () => {
  const t = jarvisSetup({ storage: memoryStorage({ "onapsis-gemini-v1": "OLDKEY" }) });
  await t.jarvis.start({ mode: "train" });
  assert.equal(t.storage.getItem("onapsis-gemini-v1"), null);
});

test("the old key stays if the token could not be had (nothing proved the server works)", async () => {
  const t = jarvisSetup({ storage: memoryStorage({ "onapsis-gemini-v1": "OLDKEY" }) });
  t.tokens.fail = "offline";
  await t.jarvis.start({ mode: "train" });
  assert.equal(t.storage.getItem("onapsis-gemini-v1"), "OLDKEY");
});

test("without a server the old key is the way in, and it is not touched", async () => {
  const t = jarvisSetup({ configured: false, storage: memoryStorage({ "onapsis-gemini-v1": "OLDKEY" }) });
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual([t.live.cfg.key, "getToken" in t.live.cfg, t.tokens.calls, t.storage.getItem("onapsis-gemini-v1")], ["OLDKEY", false, 0, "OLDKEY"]);
});

test("without a server and without a key Jarvis still asks for one", async () => {
  const t = jarvisSetup({ configured: false });
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual([t.state().needKey, t.live.cfg], [true, null]);
});

test("the connection test goes through a token when a server is set", async () => {
  const t = jarvisSetup();
  const r = await t.jarvis.checkKey();
  assert.deepEqual([r, t.tokens.calls, typeof t.live.cfg.getToken], [{ ok: true }, 0, "function"]);     // open-ul fals nu apelează getToken; cfg-ul îl poartă
});

test("a lesson whose session restarted without history recaps the last chunk heard and says it is a continuation", async () => {
  const t = jarvisSetup();
  await t.jarvis.start({ mode: "lesson", module: "django" });
  for (let i = 0; i < 2; i++) { await t.tool("next_chunk"); t.live.emit({ type: "audio", pcm: Int16Array.of(1) }); t.live.emit({ type: "turnComplete" }); t.audio.drain(); }
  t.live.emit({ type: "reconnecting" }); t.live.emit({ type: "restarted" }); t.live.emit({ type: "live" });
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.n, r.recap, "intro" in r], [3, { n: 2, text: "create_task programează o corutină.", continuare: true }, false]);
});

test("a chunk cut by the restart is repeated with the recap of the one before it", async () => {
  const t = jarvisSetup();
  await t.jarvis.start({ mode: "lesson", module: "django" });
  await t.tool("next_chunk"); t.live.emit({ type: "audio", pcm: Int16Array.of(1) }); t.live.emit({ type: "turnComplete" }); t.audio.drain();
  await t.tool("next_chunk"); t.live.emit({ type: "audio", pcm: Int16Array.of(1) });          // bucata 2 e în curs
  t.live.emit({ type: "reconnecting" }); t.live.emit({ type: "restarted" }); t.live.emit({ type: "live" });
  const r = await t.tool("repeat_chunk");
  assert.deepEqual([r.n, r.recap.n, r.recap.continuare], [2, 1, true]);
  assert.equal(t.state().lesson.pos, 0);                     // poziția salvată a lecției nu s-a mișcat
});

test("a restart before anything was heard gives the introduction again, not a recap", async () => {
  const t = jarvisSetup();
  await t.jarvis.start({ mode: "lesson", module: "django" });
  t.live.emit({ type: "restarted" });
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.n, "intro" in r, "recap" in r], [1, true, false]);
});

test("a training session whose model lost its thread is told to ask for a card again", async () => {
  const t = jarvisSetup();
  await t.jarvis.start({ mode: "train" });
  t.live.emit({ type: "restarted" });
  assert.match(t.texts().at(-1), /nu mai ții minte.*next_card/s);
});

test("after a lost connection, the reopened session recaps too (the model has no history either)", async () => {
  const t = jarvisSetup();
  await t.jarvis.start({ mode: "lesson", module: "django" });
  await t.tool("next_chunk"); t.live.emit({ type: "audio", pcm: Int16Array.of(1) }); t.live.emit({ type: "turnComplete" }); t.audio.drain();
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  await t.jarvis.resume();
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.n, r.recap && r.recap.n], [2, 1]);
});

test("a call that loses the signal while renewing the token goes on pause like any lost connection, and Reia reopens it", async () => {
  const t = jarvisSetup();
  await t.jarvis.start({ mode: "lesson", module: "django" });
  t.live.emit({ type: "closed", reason: "offline", code: 0, detail: "nu ajung la server" });
  assert.deepEqual([t.state().phase, t.state().lesson.status], ["paused", "lost"]);
  assert.equal(await t.jarvis.resume(), true);
});
