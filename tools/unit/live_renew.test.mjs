// GeminiLive: închiderea în timpul reînnoirii jetonului și eșecurile reînnoirii (code review PR #6, punctele 1 și 2).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeNetwork, fakeClock, tick, settle } from "./fakes.mjs";

const require = createRequire(import.meta.url);
const GeminiLive = require("../../src/live.js");
const MIN = 60000;

// Ca în token.test.mjs, cu `getToken` controlat de test: `tokens.fail` aruncă, `tokens.hold` oprește răspunsul până la `release()`.
function harness() {
  const net = fakeNetwork(), clock = fakeClock(1000), events = [];
  const tokens = { calls: 0, fail: null, hold: null };
  const getToken = async () => {
    tokens.calls++;
    const n = tokens.calls;
    if (tokens.hold && n > 1) await tokens.hold;
    if (tokens.fail) throw Object.assign(new Error(tokens.fail), { reason: tokens.fail });
    return { token: "T" + n, expireAt: clock.now() + 60 * MIN };
  };
  const api = GeminiLive.create({ WebSocket: net.Socket, now: clock.now, sleep: ms => { clock.advance(ms); return Promise.resolve(); } });
  return { net, clock, events, tokens, open: () => api.open({ model: "m", getToken }, e => events.push(e)) };
}
async function withHandle() {
  const t = harness();
  const p = t.open();
  await tick();
  t.net.sockets[0].serverSend({ setupComplete: {} });
  t.session = await p;
  t.net.sockets[0].serverSend({ sessionResumptionUpdate: { newHandle: "h1", resumable: true } });
  await settle();
  return t;
}
const goAway = async t => { t.net.sockets.at(-1).serverSend({ goAway: { timeLeft: "10s" } }); await settle(); };
const confirm = async (t, i) => { t.net.sockets[i].serverSend({ setupComplete: {} }); await settle(); };
const tokenOf = (t, i) => new URL(t.net.sockets[i].url).searchParams.get("access_token");
const setupOf = (t, i) => t.net.sockets[i].sent[0].setup;

test("ending the call while the renewal token is being fetched opens no new socket", async () => {
  const t = await withHandle();
  t.clock.advance(55 * MIN);                                   // sub pragul de reînnoire: reconectarea cere un jeton
  let release; t.tokens.hold = new Promise(r => { release = r; });
  await goAway(t);                                             // reconnect() așteaptă getToken
  t.session.close();                                           // Alex închide apelul acum
  release(); await settle(6);
  assert.equal(t.net.sockets.length, 1, "no socket may be opened after the call ended");
  assert.deepEqual(t.events.map(e => e.type), ["reconnecting", "closed"]);
});

test("ending the call during the handshake of a reconnect closes the new socket", async () => {
  const t = await withHandle();
  t.net.holdOpen = true;                                       // socketul nou rămâne în CONNECTING
  await goAway(t); await settle();
  assert.equal(t.net.sockets.length, 2);
  t.session.close(); await settle();
  assert.equal(t.net.sockets[1].readyState, 3, "the socket opened by the reconnect is closed");
});

test("a failed renewal does not end the call while the current token is still valid: same token, same handle", async () => {
  const t = await withHandle();
  t.clock.advance(55 * MIN);                                   // 5 minute de viață rămase
  t.tokens.fail = "server";                                    // POST /live-token → 5xx
  await goAway(t); await settle(4); await confirm(t, 1);
  assert.deepEqual([t.tokens.calls, tokenOf(t, 1), setupOf(t, 1).sessionResumption, t.events.map(e => e.type)], [2, "T1", { handle: "h1" }, ["reconnecting", "live"]]);
});

test("each non-retriable renewal failure (server, unauthorized, nokey) is survived the same way", async () => {
  for (const reason of ["server", "unauthorized", "nokey"]) {
    const t = await withHandle();
    t.clock.advance(55 * MIN);
    t.tokens.fail = reason;
    await goAway(t); await settle(4); await confirm(t, 1);
    assert.deepEqual([tokenOf(t, 1), t.events.at(-1).type], ["T1", "live"], reason);
  }
});

test("a failed renewal with the token about to expire still ends the call, with the reason", async () => {
  const t = await withHandle();
  t.clock.advance(59 * MIN + 50000);                           // 10 s rămase
  t.tokens.fail = "server";
  await goAway(t); await settle(6);
  assert.deepEqual([t.net.sockets.length, t.events.at(-1).type, t.events.at(-1).reason], [1, "closed", "server"]);
});

test("a quota refusal with a fresh token keeps the handle and does not announce a restart", async () => {
  const t = await withHandle();
  t.clock.advance(55 * MIN);                                   // jeton nou la reconectare (T2), handle de la T1
  t.net.plan.push({ close: [1011, "Quota exceeded for this project"] });
  await goAway(t); await settle(6);
  assert.deepEqual([t.net.sockets.length, t.events.map(e => e.type), t.events.at(-1).reason], [2, ["reconnecting", "closed"], "quota"]);
});
