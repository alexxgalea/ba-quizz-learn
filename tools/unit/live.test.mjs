import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeNetwork, tick, settle } from "./fakes.mjs";

const GeminiLive = createRequire(import.meta.url)("../../src/live.js");

// Un GeminiLive peste un socket fals, cu evenimentele strânse într-o listă.
function harness(opts = {}) {
  const net = fakeNetwork(), events = [];
  const api = GeminiLive.create(Object.assign({ WebSocket: net.Socket }, opts));
  return { net, events, open: cfg => api.open(Object.assign({ key: "KEY" }, cfg), e => events.push(e)) };
}

// Deschide sesiunea și o confirmă ca serverul; `t.session` e sesiunea, `t.sock` socketul curent.
async function opened(cfg, opts) {
  const t = harness(opts);
  const p = t.open(Object.assign({ model: "gemini-3.8-live" }, cfg));
  await tick();
  t.sock = t.net.sockets[0];
  t.sock.serverSend({ setupComplete: {} });
  t.session = await p;
  return t;
}

test("the setup message names the model and the voice and carries the instructions", async () => {
  const t = harness();
  t.open({ model: "gemini-3.8-live", voice: "Charon", system: "Ești Jarvis." });
  await tick();
  const setup = t.net.sockets[0].sent[0].setup;
  assert.deepEqual(
    { model: setup.model, voice: setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, modalities: setup.generationConfig.responseModalities, system: setup.systemInstruction },
    { model: "models/gemini-3.8-live", voice: "Charon", modalities: ["AUDIO"], system: { parts: [{ text: "Ești Jarvis." }] } });
});

test("the setup declares the tools without their run function", async () => {
  const t = harness();
  const params = { type: "OBJECT", properties: { topic: { type: "STRING" } } };
  t.open({ model: "gemini-3.8-live", tools: [{ name: "next_card", description: "Dă următorul card.", parameters: params, run: async () => ({}) }] });
  await tick();
  assert.deepEqual(t.net.sockets[0].sent[0].setup.tools, [{ functionDeclarations: [{ name: "next_card", description: "Dă următorul card.", parameters: params }] }]);
});

test("the setup sets the silence threshold and asks for transcriptions of both sides", async () => {
  const t = harness();
  t.open({ model: "gemini-3.8-live", silenceMs: 1200 });
  await tick();
  const setup = t.net.sockets[0].sent[0].setup;
  assert.deepEqual(
    { vad: setup.realtimeInputConfig, input: setup.inputAudioTranscription, output: setup.outputAudioTranscription },
    { vad: { automaticActivityDetection: { silenceDurationMs: 1200 } }, input: {}, output: {} });
});

test("a session without tools sends no tools field", async () => {
  const t = harness();
  t.open({ model: "gemini-3.8-live" });
  await tick();
  assert.equal("tools" in t.net.sockets[0].sent[0].setup, false);
});

test("open resolves only after the server confirms the setup", async () => {
  const t = harness();
  let session = null;
  const p = t.open({ model: "gemini-3.8-live" }).then(s => { session = s; });
  await tick();
  assert.equal(session, null);
  t.net.sockets[0].serverSend({ setupComplete: {} }, "blob");
  await p;
  assert.equal(typeof session.close, "function");
});

test("audio sends 16 kHz PCM as base64 and says it went out", async () => {
  const t = await opened();
  const sent = t.session.audio(Int16Array.of(1, -2, 256));
  assert.equal(sent, true);
  assert.deepEqual(t.sock.sent[1], { realtimeInput: { audio: { data: "AQD+/wAB", mimeType: "audio/pcm;rate=16000" } } });
});

test("audio from the server arrives as 24 kHz PCM", async () => {
  const t = await opened();
  t.sock.serverSend({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: "AQD+/wAB" } }] } } }, "blob");
  await tick();
  assert.deepEqual(t.events.map(e => [e.type, Array.from(e.pcm)]), [["audio", [1, -2, 256]]]);
});

test("text goes to the model as realtime input", async () => {
  const t = await opened();
  const sent = t.session.text("Stai.");
  assert.equal(sent, true);
  assert.deepEqual(t.sock.sent[1], { realtimeInput: { text: "Stai." } });
});

test("an interruption from the server is reported", async () => {
  const t = await opened();
  t.sock.serverSend({ serverContent: { interrupted: true } }, "blob");
  await tick();
  assert.deepEqual(t.events, [{ type: "interrupted" }]);
});

test("the end of the model's turn is reported", async () => {
  const t = await opened();
  t.sock.serverSend({ serverContent: { turnComplete: true } }, "blob");
  await tick();
  assert.deepEqual(t.events, [{ type: "turnComplete" }]);
});

test("transcripts of both sides are reported as they arrive", async () => {
  const t = await opened();
  t.sock.serverSend({ serverContent: { inputTranscription: { text: "Bună seara" } } }, "blob");
  t.sock.serverSend({ serverContent: { outputTranscription: { text: "Bună, Alex." } } }, "blob");
  await tick();
  assert.deepEqual(t.events, [{ type: "transcript", who: "me", text: "Bună seara" }, { type: "transcript", who: "model", text: "Bună, Alex." }]);
});

const NO_PARAMS = { type: "OBJECT", properties: {} };

test("a function call from the model runs the tool and is answered with its result", async () => {
  const t = await opened({ tools: [{ name: "next_card", description: "Dă un card.", parameters: NO_PARAMS, run: async args => ({ card_id: "o-gil-1", topic: args.topic }) }] });
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "c1", name: "next_card", args: { topic: "gil" } }] } }, "blob");
  await settle();
  assert.deepEqual(t.sock.sent[1], { toolResponse: { functionResponses: [{ id: "c1", name: "next_card", response: { result: { card_id: "o-gil-1", topic: "gil" } } }] } });
});

test("a tool that throws is answered with an error instead of a result", async () => {
  const t = await opened({ tools: [{ name: "record_result", description: "d", parameters: NO_PARAMS, run: async () => { throw new Error("puncte lipsă"); } }] });
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "c2", name: "record_result", args: {} }] } }, "blob");
  await settle();
  assert.deepEqual(t.sock.sent[1].toolResponse.functionResponses, [{ id: "c2", name: "record_result", response: { error: "puncte lipsă" } }]);
});

test("a call to a function nobody declared is answered with an error", async () => {
  const t = await opened();
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "c3", name: "fly", args: {} }] } }, "blob");
  await settle();
  assert.deepEqual(t.sock.sent[1].toolResponse.functionResponses, [{ id: "c3", name: "fly", response: { error: "funcție necunoscută: fly" } }]);
});

test("the outcome of each call is reported once the answer has gone out", async () => {
  const t = await opened({ tools: [
    { name: "next_card", description: "d", parameters: NO_PARAMS, run: async () => ({ card_id: "o-1" }) },
    { name: "record_result", description: "d", parameters: NO_PARAMS, run: async () => { throw new Error("greșit"); } }] });
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "a", name: "next_card", args: { x: 1 } }, { id: "b", name: "record_result", args: {} }] } }, "blob");
  await settle();
  assert.deepEqual(t.events, [
    { type: "tool", name: "next_card", args: { x: 1 }, result: { card_id: "o-1" } },
    { type: "tool", name: "record_result", args: {}, error: "greșit" }]);
});

test("a call the server cancels gets no answer", async () => {
  let release;
  const gate = new Promise(r => { release = r; });
  const t = await opened({ tools: [{ name: "next_card", description: "d", parameters: NO_PARAMS, run: async () => { await gate; return { card_id: "o-1" }; } }] });
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "c1", name: "next_card", args: {} }] } }, "blob");
  await settle();
  t.sock.serverSend({ toolCallCancellation: { ids: ["c1"] } }, "blob");
  await settle();
  release();
  await settle();
  assert.deepEqual([t.sock.sent.filter(m => m.toolResponse).length, t.events.filter(e => e.type === "tool").length], [0, 0]);
});

test("calls from separate messages run one at a time, in arrival order", async () => {
  const log = [];
  let release;
  const gate = new Promise(r => { release = r; });
  const t = await opened({ tools: [
    { name: "slow", description: "d", parameters: NO_PARAMS, run: async () => { log.push("start slow"); await gate; log.push("end slow"); return {}; } },
    { name: "fast", description: "d", parameters: NO_PARAMS, run: async () => { log.push("start fast"); return {}; } }] });
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "1", name: "slow", args: {} }] } }, "blob");
  await settle();
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "2", name: "fast", args: {} }] } }, "blob");
  await settle();
  release();
  await settle();
  assert.deepEqual(log, ["start slow", "end slow", "start fast"]);
});

test("closing the session reports a user close once and silences the session", async () => {
  const t = await opened();
  t.session.close();
  t.session.close();
  t.sock.serverSend({ serverContent: { turnComplete: true } }, "blob");
  await settle();
  assert.deepEqual([t.events, t.session.audio(Int16Array.of(1)), t.session.text("x")], [[{ type: "closed", reason: "user", code: 1000, detail: "" }], false, false]);
});

for (const [code, detail, reason] of [
  [1007, "API key not valid. Please pass a valid API key.", "auth"],
  [1011, "Resource has been exhausted (e.g. check quota).", "quota"],
  [1007, "Invalid JSON payload received. Unknown name.", "rejected"],
  [1006, "", "network"]]) {
  test("a server close with code " + code + " is reported as " + reason, async () => {
    const t = await opened();
    t.sock.serverClose(code, detail);
    await settle();
    assert.deepEqual(t.events, [{ type: "closed", reason, code, detail }]);
  });
}

test("open rejects with the reason when the server closes before confirming the setup", async () => {
  const t = harness();
  const p = t.open({ model: "gemini-3.8-live" });
  await tick();
  t.net.sockets[0].serverClose(1007, "API key not valid. Please pass a valid API key.");
  await assert.rejects(p, err => err.reason === "auth" && err.code === 1007);
});

test("open rejects as auth when there is no key", async () => {
  const t = harness();
  await assert.rejects(t.open({ model: "gemini-3.8-live", key: "" }), err => err.reason === "auth");
});

test("a tool that finishes after the session closed emits nothing", async () => {
  let release;
  const gate = new Promise(r => { release = r; });
  const t = await opened({ tools: [{ name: "next_card", description: "d", parameters: NO_PARAMS, run: async () => { await gate; return {}; } }] });
  t.sock.serverSend({ toolCall: { functionCalls: [{ id: "c1", name: "next_card", args: {} }] } }, "blob");
  await settle();
  t.session.close();
  release();
  await settle();
  assert.deepEqual(t.events, [{ type: "closed", reason: "user", code: 1000, detail: "" }]);
});

test("the setup asks for resumption handles and sliding-window compression", async () => {
  const t = harness();
  t.open({ model: "gemini-3.8-live" });
  await tick();
  const setup = t.net.sockets[0].sent[0].setup;
  assert.deepEqual([setup.sessionResumption, setup.contextWindowCompression], [{}, { slidingWindow: {} }]);
});

test("after a network drop it reconnects with the last resumption handle", async () => {
  const t = await opened({}, { sleep: async () => {} });
  t.sock.serverSend({ sessionResumptionUpdate: { newHandle: "h1", resumable: true } }, "blob");
  await settle();
  t.sock.serverClose(1006, "");
  await settle();
  assert.equal(t.net.sockets[1].sent[0].setup.sessionResumption.handle, "h1");
});

// O sesiune cu handle-ul h1 primit deja; `sleeps` păstrează pauzele cerute între încercări de reluare.
async function withHandle(cfg) {
  const sleeps = [];
  const t = await opened(cfg, { sleep: async ms => { sleeps.push(ms); } });
  t.sleeps = sleeps;
  t.sock.serverSend({ sessionResumptionUpdate: { newHandle: "h1", resumable: true } }, "blob");
  await settle();
  return t;
}

test("a reconnect is reported as reconnecting and then live", async () => {
  const t = await withHandle();
  t.sock.serverClose(1006, "");
  await settle();
  t.net.sockets[1].serverSend({ setupComplete: {} }, "blob");
  await settle();
  assert.deepEqual(t.events, [{ type: "reconnecting" }, { type: "live" }]);
});

test("audio is refused until the new connection is confirmed, and goes to it afterwards", async () => {
  const t = await withHandle();
  t.net.holdOpen = true;
  t.sock.serverClose(1006, "");
  await settle();
  const next = t.net.sockets[1];
  const whileClosed = t.session.audio(Int16Array.of(1, -2, 256));
  next.open();
  const beforeSetup = t.session.audio(Int16Array.of(1, -2, 256));
  next.serverSend({ setupComplete: {} }, "blob");
  await settle();
  const after = t.session.audio(Int16Array.of(1, -2, 256));
  assert.deepEqual([whileClosed, beforeSetup, after, next.sent[1].realtimeInput.audio.data], [false, false, true, "AQD+/wAB"]);
});

test("a handle marked not resumable does not replace the last good one", async () => {
  const t = await withHandle();
  t.sock.serverSend({ sessionResumptionUpdate: { newHandle: "", resumable: false } }, "blob");
  await settle();
  t.sock.serverClose(1006, "");
  await settle();
  assert.equal(t.net.sockets[1].sent[0].setup.sessionResumption.handle, "h1");
});

test("a goAway from the server makes it reconnect at once, and the old socket's late close is ignored", async () => {
  const t = await withHandle();
  t.sock.serverSend({ goAway: { timeLeft: "10s" } }, "blob");
  await settle();
  const atOnce = [t.net.sockets.length, t.net.sockets[1] && t.net.sockets[1].sent[0].setup.sessionResumption.handle];
  t.net.sockets[1].serverSend({ setupComplete: {} }, "blob");
  await settle();
  t.sock.serverClose(1000, "");
  await settle();
  assert.deepEqual([atOnce, t.net.sockets.length, t.events], [[2, "h1"], 2, [{ type: "reconnecting" }, { type: "live" }]]);
});

test("it gives up after three failed attempts, pausing 0.5, 1 and 2 seconds", async () => {
  const t = await withHandle();
  t.net.plan.push({ close: [1006] }, { close: [1006] }, { close: [1006] });
  t.sock.serverClose(1006, "");
  await settle(8);
  assert.deepEqual([t.sleeps, t.net.sockets.length, t.events], [[500, 1000, 2000], 4, [{ type: "reconnecting" }, { type: "closed", reason: "network", code: 1006, detail: "" }]]);
});

test("a reconnect refused for a reason other than the network stops retrying", async () => {
  const t = await withHandle();
  t.net.plan.push({ close: [1007, "Invalid session handle."] });
  t.sock.serverClose(1006, "");
  await settle(8);
  assert.deepEqual([t.sleeps, t.events], [[500], [{ type: "reconnecting" }, { type: "closed", reason: "rejected", code: 1007, detail: "Invalid session handle." }]]);
});

test("closing while it waits to retry stops the reconnect", async () => {
  let release;
  const gate = new Promise(r => { release = r; });
  const t = await opened({}, { sleep: () => gate });
  t.sock.serverSend({ sessionResumptionUpdate: { newHandle: "h1", resumable: true } }, "blob");
  await settle();
  t.sock.serverClose(1006, "");
  await settle();
  t.session.close();
  release();
  await settle(8);
  assert.deepEqual([t.net.sockets.length, t.events], [1, [{ type: "reconnecting" }, { type: "closed", reason: "user", code: 1000, detail: "" }]]);
});

test("closing while the new connection is being set up stops the reconnect", async () => {
  const t = await withHandle();
  t.net.holdOpen = true;
  t.sock.serverClose(1006, "");
  await settle();
  t.session.close();
  await settle(8);
  assert.deepEqual([t.net.sockets.length, t.net.sockets[1].readyState, t.events], [2, 3, [{ type: "reconnecting" }, { type: "closed", reason: "user", code: 1000, detail: "" }]]);
});

test("a message that is not JSON is ignored", async () => {
  const t = await opened();
  t.sock.onmessage({ data: new Blob(["nu e json"]) });
  t.sock.serverSend({ serverContent: { turnComplete: true } }, "blob");
  await settle();
  assert.deepEqual(t.events, [{ type: "turnComplete" }]);
});
