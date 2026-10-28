import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeLive, fakeAudio, fakeClock, memoryStorage, stubApp, CARD_A, CARD_B, settle } from "./fakes.mjs";

const require = createRequire(import.meta.url);
const Call = require("../../src/call.js");
const Jarvis = require("../../src/jarvis.js");

// O sesiune Jarvis peste Call real, Live și Audio false, un PrepApp în memorie și o stocare în memorie.
function setup(over = {}) {
  const t = { live: fakeLive(), audio: fakeAudio(), clock: fakeClock(), app: stubApp(), storage: memoryStorage({ "onapsis-gemini-v1": "KEY" }), changes: 0 };
  Object.assign(t, over);
  t.jarvis = Jarvis.create({ call: Call, app: t.app, live: t.live, audio: t.audio, storage: t.storage, clock: t.clock, onChange: () => { t.changes++; } });
  t.state = () => t.jarvis.getState();
  t.tool = (name, args = {}) => t.live.cfg.tools.find(x => x.name === name).run(args);      // ce ar face modelul
  return t;
}

test("start without a key asks for one and does not connect", async () => {
  const t = setup({ storage: memoryStorage() });
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual([t.state().needKey, t.state().phase, t.live.cfg], [true, "idle", null]);
});

test("start connects with the stored key, the chosen voice and patience", async () => {
  const t = setup();
  t.jarvis.settings.set({ voice: "Orus", patience: "long" });
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual([t.live.cfg.key, t.live.cfg.voice, t.live.cfg.silenceMs, t.live.cfg.model], ["KEY", "Orus", 2000, "gemini-3.8-live"]);
});

test("once connected it waits for the model to open the conversation", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.equal(t.state().phase, "thinking");
});

test("the defaults are the Charon voice and the normal patience of 1.2 seconds", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual([t.live.cfg.voice, t.live.cfg.silenceMs], ["Charon", 1200]);
});

test("the seven functions are offered to the model, each with a description and parameters", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  const tools = t.live.cfg.tools;
  assert.deepEqual(
    [tools.map(x => x.name).sort(), tools.every(x => x.description && x.parameters.type === "OBJECT")],
    [["end_session", "explain_missed", "next_card", "pause_session", "progress_summary", "record_result", "skip_card"], true]);
});

test("the first message tells the model to begin and says how many days are left", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.match(t.live.sent[0].text, /^Începem.*4 zile/s);
});

test("next_card gives the model the question, the code, the key points and the card's rules", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual(await t.tool("next_card"), { card_id: "o-gil-1", question: CARD_A.q, code: "", key_points: CARD_A.points, model_answer: CARD_A.model, rules: CARD_A.rules, missed_last_time: [] });
});

test("the screen shows the question and the code but never the key points or the model answer", async () => {
  const t = setup({ app: stubApp([CARD_B]) });
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  const shown = JSON.stringify(t.state());
  assert.deepEqual(
    [t.state().card, CARD_B.points.concat([CARD_B.model, CARD_B.missed[0]]).some(secret => shown.includes(secret))],
    [{ id: "o-asy-2", module: "asyncio", q: CARD_B.q, code: CARD_B.code, index: 1 }, false]);
});

test("next_card asks the app for a card of the session's mode and module, skipping the ones already done", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "topic", module: "gil" });
  await t.tool("next_card");
  await t.tool("next_card", { module: "asyncio" });
  assert.deepEqual(t.app.nextCalls, [
    { mode: "topic", module: "gil", done: [], difficulty: undefined },
    { mode: "topic", module: "asyncio", done: [], difficulty: undefined }]);
});

test("when there are no more cards next_card says so", async () => {
  const t = setup({ app: stubApp([CARD_A]) });
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  await t.tool("skip_card");
  const r = await t.tool("next_card");
  assert.deepEqual([r.done, typeof r.message], [true, "string"]);
});

test("record_result saves the verdict through the app and answers with the score", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  const r = await t.tool("record_result", { card_id: "o-gil-1", points: ["spontan", "dupa", "nu"], wrong: ["a zis că GIL e în Java"], feedback: "Lipsesc procesele." });
  assert.deepEqual(
    [t.app.recorded, r],
    [[{ id: "o-gil-1", v: { points: ["spontan", "dupa", "nu"], wrong: ["a zis că GIL e în Java"], feedback: "Lipsesc procesele." } }],
     { ok: true, score: 0.5, prev: null, box: 2, missed: [CARD_A.points[2]] }]);
});

test("a recorded card is listed in the results and is not asked again", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  await t.tool("record_result", { card_id: "o-gil-1", points: ["spontan", "spontan", "spontan"] });
  const next = await t.tool("next_card");
  assert.deepEqual([t.state().results, next.card_id], [[{ id: "o-gil-1", score: 1 }], "o-asy-2"]);
});

test("an invalid verdict is answered with an error and nothing is saved", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  const r = await t.tool("record_result", { card_id: "o-gil-1", points: ["spontan", "poate"] });
  assert.deepEqual([r.ok, typeof r.error, t.app.recorded, t.state().results], [false, "string", [], []]);
});

test("after a second invalid verdict the card is dropped and the model is told to move on", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  await t.tool("record_result", { card_id: "o-gil-1", points: [] });
  const second = await t.tool("record_result", { card_id: "o-gil-1", points: [] });
  const next = await t.tool("next_card");
  assert.deepEqual([second.give_up, next.card_id, t.state().results], [true, "o-asy-2", []]);
});

test("a verdict for a card that is not the current one is refused", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  const r = await t.tool("record_result", { card_id: "o-asy-2", points: ["spontan", "spontan", "spontan"] });
  assert.deepEqual([r.ok, t.app.recorded], [false, []]);
});

test("in the simulated interview the answer to record_result carries no score", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "mock" });
  await t.tool("next_card");
  const r = await t.tool("record_result", { card_id: "o-gil-1", points: ["spontan", "nu", "nu"] });
  assert.deepEqual([r, t.state().results], [{ ok: true }, [{ id: "o-gil-1", score: 1 / 3 }]]);
});

test("a failed verdict on one card does not count against the next card", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.tool("next_card");
  await t.tool("record_result", { card_id: "o-gil-1", points: [] });
  await t.tool("next_card", { module: "asyncio" });
  const r = await t.tool("record_result", { card_id: "o-asy-2", points: [] });
  assert.deepEqual([r.ok, r.give_up], [false, undefined]);
});

test("explain_missed gives the model the theory for the card, in training only", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual(await t.tool("explain_missed", { card_id: "o-gil-1" }), { text: "Teorie pentru o-gil-1" });
});

test("explain_missed is refused in the simulated interview", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "mock" });
  const r = await t.tool("explain_missed", { card_id: "o-gil-1" });
  assert.deepEqual([typeof r.error, r.text], ["string", undefined]);
});

test("progress_summary gives the model the app's summary", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.deepEqual(await t.tool("progress_summary"), { readiness: 0.42, daysLeft: 4, gaps: ["GIL: costul proceselor"] });
});

test("pause_session pauses the call", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.tool("pause_session");
  assert.equal(t.state().phase, "paused");
});

// Cardul A terminat cu scor 1, cardul B cu scor 0: media 0,5.
async function twoCardsDone(t) {
  await t.tool("next_card");
  await t.tool("record_result", { card_id: "o-gil-1", points: ["spontan", "spontan", "spontan"] });
  await t.tool("next_card");
  await t.tool("record_result", { card_id: "o-asy-2", points: ["nu", "nu"] });
}

test("stop ends the session and logs one history row with the cards done and their total score", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await twoCardsDone(t);
  t.clock.advance(125000);
  await t.jarvis.stop();
  assert.deepEqual([t.state().phase, t.state().endedReason, t.app.logged], ["ended", "user", [{ title: "Jarvis · antrenament", n: 2, c: 1, dur: 125 }]]);
});

test("a session with no cards done logs nothing", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await t.jarvis.stop();
  assert.deepEqual(t.app.logged, []);
});

test("end_session gives the model the results and ends the call once the model has said goodbye", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await twoCardsDone(t);
  const r = await t.tool("end_session");
  const before = t.state().phase;
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  const whileSpeaking = t.state().phase;
  t.live.emit({ type: "turnComplete" });
  t.audio.drain();
  await settle();
  assert.deepEqual([r.results, r.average, before !== "ended", whileSpeaking, t.state().phase, t.app.logged.length], [[{ id: "o-gil-1", score: 1 }, { id: "o-asy-2", score: 0 }], 0.5, true, "speaking", "ended", 1]);
});

test("the title of the history row follows the mode", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "mock" });
  await twoCardsDone(t);
  await t.jarvis.stop();
  assert.equal(t.app.logged[0].title, "Jarvis · interviu tehnic simulat");
});

test("transcript pieces from the call appear in the state, growing in place", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  t.live.emit({ type: "transcript", who: "me", text: "Bună" });
  t.live.emit({ type: "transcript", who: "me", text: " seara" });
  t.live.emit({ type: "transcript", who: "model", text: "Salut, Alex." });
  assert.deepEqual(t.state().transcript, [{ id: 1, who: "me", text: "Bună seara" }, { id: 2, who: "model", text: "Salut, Alex." }]);
});

test("only the last eight utterances are kept", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  for (let i = 1; i <= 10; i++) { t.live.emit({ type: "transcript", who: i % 2 ? "me" : "model", text: "r" + i }); }
  assert.deepEqual(t.state().transcript.map(u => u.text), ["r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10"]);
});

// Sesiunea după salutul modelului: așteaptă răspunsul lui Alex.
async function listening(t) {
  await t.jarvis.start({ mode: "train" });
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.audio.drain();
}

test("the microphone level is passed to the screen", async () => {
  const t = setup();
  await listening(t);
  t.audio.level(0.2);
  assert.equal(t.state().level, 0.2);
});

test("a dead microphone raises the warning on the screen", async () => {
  const t = setup();
  await listening(t);
  t.clock.advance(5000);
  t.audio.level(0);
  assert.equal(t.state().warn, "mic-silent");
});

test("when the live session cannot be opened the error is shown and it goes back to idle", async () => {
  const t = setup();
  t.live.failOpen = "auth";
  const ok = await t.jarvis.start({ mode: "train" });
  assert.deepEqual([ok, t.state().phase, t.state().error.code, typeof t.state().error.message], [false, "idle", "auth", "string"]);
});

test("a refused microphone is reported with its own message", async () => {
  const t = setup();
  t.audio.failStart = "denied";
  await t.jarvis.start({ mode: "train" });
  assert.match(t.state().error.message, /icrofon/);
});

test("a call that drops because of the network shows an error and still logs what was done", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await twoCardsDone(t);
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  await settle();
  assert.deepEqual([t.state().phase, t.state().endedReason, t.state().error.code, t.app.logged.length], ["ended", "network", "network", 1]);
});

test("starting again clears the previous error", async () => {
  const t = setup();
  t.live.failOpen = "auth";
  await t.jarvis.start({ mode: "train" });
  t.live.failOpen = null;
  await t.jarvis.start({ mode: "train" });
  assert.equal(t.state().error, null);
});

test("interrupt and say go to the call", async () => {
  const t = setup();
  await listening(t);
  t.jarvis.interrupt();
  t.jarvis.say("Folosesc procese.");
  assert.deepEqual(t.live.sent.slice(1), [{ text: "Stai." }, { text: "Folosesc procese." }]);
});

test("pause and resume move the session between paused and listening", async () => {
  const t = setup();
  await listening(t);
  t.jarvis.pause();
  const paused = t.state().phase;
  t.jarvis.resume();
  assert.deepEqual([paused, t.state().phase], ["paused", "listening"]);
});

test("mics lists the microphones the audio device offers", async () => {
  const t = setup();
  assert.deepEqual(await t.jarvis.mics(), [{ id: "m1", label: "Microfon de test" }]);
});

test("checkKey opens a session with the stored key and closes it again", async () => {
  const t = setup();
  const r = await t.jarvis.checkKey();
  assert.deepEqual([r, t.live.cfg.key, t.live.closed], [{ ok: true }, "KEY", true]);
});

test("checkKey reports why the key was refused", async () => {
  const t = setup();
  t.live.failOpen = "auth";
  assert.deepEqual(await t.jarvis.checkKey(), { ok: false, reason: "auth" });
});

test("the settings are saved in the storage, the key apart from the rest", () => {
  const t = setup();
  t.jarvis.settings.set({ voice: "Puck", key: "  K2  ", halfDuplex: true });
  assert.deepEqual(
    [t.storage.data["onapsis-gemini-v1"], JSON.parse(t.storage.data["onapsis-jarvis-v1"]), t.jarvis.settings.get()],
    ["K2", { voice: "Puck", patience: "normal", halfDuplex: true, micId: "", muted: false }, { voice: "Puck", patience: "normal", halfDuplex: true, micId: "", muted: false, key: "K2" }]);
});

test("an empty key removes the stored one", () => {
  const t = setup();
  t.jarvis.settings.set({ key: "" });
  assert.deepEqual([t.storage.getItem("onapsis-gemini-v1"), t.jarvis.settings.get().key], [null, ""]);
});

test("a broken settings entry falls back to the defaults", () => {
  const t = setup({ storage: memoryStorage({ "onapsis-jarvis-v1": "{nu e json" }) });
  assert.deepEqual(t.jarvis.settings.get(), { voice: "Charon", patience: "normal", halfDuplex: false, micId: "", muted: false, key: "" });
});

test("the key is never part of the screen state", async () => {
  const t = setup();
  await listening(t);
  assert.equal(JSON.stringify(t.state()).includes("KEY"), false);
});

const SUMMARY = stubApp().summary();
const words = (text, list) => list.filter(w => !text.includes(w));

test("the instructions name Jarvis, the language, the functions, the verdict values and the candidate's profile", () => {
  const text = Jarvis.buildSystem({ mode: "train", summary: SUMMARY });
  assert.deepEqual(words(text, ["Jarvis", "română", "next_card", "record_result", "end_session", "spontan", "dupa", "nu", "Software Engineer – Python", "Profilul candidatului: Django, Celery."]), []);
});

test("training keeps the dry humour and offers the explanation of what was missed", () => {
  const text = Jarvis.buildSystem({ mode: "train", summary: SUMMARY });
  assert.deepEqual(words(text, ["umor discret", "explain_missed"]), []);
});

test("the simulated interview is neutral, with no feedback and no explanations between cards", () => {
  const text = Jarvis.buildSystem({ mode: "mock", summary: SUMMARY });
  assert.deepEqual([words(text, ["neutru", "fără feedback"]), text.includes("umor discret"), text.includes("explain_missed")], [[], false, false]);
});

test("a topic session stays on its module", () => {
  const text = Jarvis.buildSystem({ mode: "topic", module: "asyncio", summary: SUMMARY });
  assert.ok(text.includes("module=asyncio"));
});

test("the key points of a card never appear in the instructions", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.equal(CARD_A.points.concat([CARD_A.model, CARD_A.q]).some(x => t.live.cfg.system.includes(x)), false);
});

test("the session is started with the instructions for its mode", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "mock" });
  assert.equal(t.live.cfg.system, Jarvis.buildSystem({ mode: "mock", module: undefined, summary: SUMMARY }));
});

test("the state says when the session started", async () => {
  const t = setup();
  t.clock.advance(5000);
  await t.jarvis.start({ mode: "train" });
  assert.equal(t.state().startedAt, 6000);
});

test("reset after the end brings the screen back to idle with the results cleared", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  await twoCardsDone(t);
  await t.jarvis.stop();
  t.jarvis.reset();
  assert.deepEqual([t.state().phase, t.state().results, t.state().endedReason], ["idle", [], null]);
});

test("reset does nothing while a session is running", async () => {
  const t = setup();
  await listening(t);
  t.jarvis.reset();
  assert.equal(t.state().phase, "listening");
});

test("the state tells the mode and the module of the session", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "topic", module: "asyncio" });
  assert.deepEqual([t.state().mode, t.state().module], ["topic", "asyncio"]);
});
