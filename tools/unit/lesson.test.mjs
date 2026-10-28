// Lecția live (spec .scratch/lectie-live): Jarvis peste Call real, Live, Audio, ceas și stocare false, PrepApp stub.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeLive, fakeAudio, fakeClock, memoryStorage, stubApp, SHEET } from "./fakes.mjs";

const require = createRequire(import.meta.url);
const Call = require("../../src/call.js");
const Jarvis = require("../../src/jarvis.js");

const MIN = 60000;

function setup(over = {}) {
  const t = { live: fakeLive(), audio: fakeAudio(), clock: fakeClock(), app: stubApp(), storage: memoryStorage({ "onapsis-gemini-v1": "KEY" }), changes: 0 };
  Object.assign(t, over);
  t.make = () => Jarvis.create({ call: Call, app: t.app, live: t.live, audio: t.audio, storage: t.storage, clock: t.clock, onChange: () => { t.changes++; } });
  t.jarvis = t.make();
  t.state = () => t.jarvis.getState();
  // Ca GeminiLive: rulează funcția, apoi anunță `tool` (care încheie restul unei ture tăiate).
  t.tool = async (name, args = {}) => { const result = await t.live.cfg.tools.find(x => x.name === name).run(args); t.live.emit({ type: "tool", name, args, result }); return result; };
  t.texts = () => t.live.sent.filter(x => x.text).map(x => x.text);
  t.audioSent = () => t.live.sent.filter(x => x.audio);
  return t;
}
// Modelul își termină tura: tot audio-ul a venit și s-a redat.
const speak = t => { t.live.emit({ type: "audio", pcm: Int16Array.of(1) }); t.live.emit({ type: "turnComplete" }); t.audio.drain(); };
// Modelul cere o bucată și o spune până la capăt.
async function deliver(t, tool = "next_chunk") { const r = await t.tool(tool); speak(t); return r; }
async function begin(t, module = "asyncio") { await t.jarvis.start({ mode: "lesson", module }); return t; }

// ---------- pornirea ----------

test("a lesson without a key asks for one and does not connect", async () => {
  const t = setup({ storage: memoryStorage() });
  await t.jarvis.start({ mode: "lesson", module: "asyncio" });
  assert.deepEqual([t.state().needKey, t.state().phase, t.live.cfg], [true, "idle", null]);
});

test("a module without a sheet gives an error and does not connect", async () => {
  const t = setup();
  const ok = await t.jarvis.start({ mode: "lesson", module: "nu-exista" });
  assert.deepEqual([ok, t.state().phase, t.live.cfg, typeof t.state().error.message], [false, "idle", null, "string"]);
});

test("the lesson offers the model only the four lesson functions", async () => {
  const t = await begin(setup());
  const tools = t.live.cfg.tools;
  assert.deepEqual([tools.map(x => x.name).sort(), tools.every(x => x.description && x.parameters.type === "OBJECT")], [["end_session", "next_chunk", "pause_session", "repeat_chunk"], true]);
});

test("the other modes do not get the lesson functions", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.equal(t.live.cfg.tools.some(x => x.name === "next_chunk" || x.name === "repeat_chunk"), false);
});

test("the lesson speaks to the model with the same key, voice and patience as the rest of Jarvis", async () => {
  const t = setup();
  t.jarvis.settings.set({ voice: "Orus", patience: "long" });
  await begin(t);
  assert.deepEqual([t.live.cfg.key, t.live.cfg.voice, t.live.cfg.silenceMs, t.live.cfg.model], ["KEY", "Orus", 2000, "gemini-3.8-live"]);
});

test("the lesson asks for a reconnection schedule of about a minute, which the other modes do not", async () => {
  const t = await begin(setup());
  const total = t.live.cfg.retryMs.reduce((a, b) => a + b, 0);
  const o = setup();
  await o.jarvis.start({ mode: "train" });
  assert.deepEqual([total >= 55000 && total <= 65000, o.live.cfg.retryMs], [true, undefined]);
});

test("the first message tells the model to begin the lesson and to ask for the first chunk", async () => {
  const t = await begin(setup());
  assert.match(t.texts()[0], /lecția despre asyncio.*next_chunk/s);
});

// ---------- instrucțiunile de sistem ----------

test("the system instructions ask for examples from Alex's experience, no new facts, no lists, English terms and Jarvis as explainer", async () => {
  const t = await begin(setup());
  const s = t.live.cfg.system;
  assert.match(s, /Jarvis/);
  assert.match(s, /1.{1,3}1,5 minute/);
  assert.match(s, /Django.*Celery.*Keycloak.*Docker Swarm/s);
  assert.match(s, /fără fapte noi/i);
  assert.match(s, /fără liste și fără markdown/);
  assert.match(s, /engleză/);
  assert.match(s, /nu (?:ești|examinezi)/i);
});

test("the system instructions fix the rules for 'mai simplu', examples and free questions", async () => {
  const t = await begin(setup());
  const s = t.live.cfg.system;
  assert.match(s, /mai simplu/);
  assert.match(s, /exemplu/);
  assert.match(s, /30 de secunde/);
  assert.match(s, /nu sunt sigur/);
  assert.match(s, /revii la lecție|revino la lecție/i);
});

test("the sheet's points are not in the system instructions: the app controls the order", async () => {
  const t = await begin(setup());
  assert.equal(SHEET.points.concat([SHEET.lead], SHEET.avoid).some(x => t.live.cfg.system.includes(x)), false);
});

test("without Mut the system instructions tell the model to say that Alex can stop it anytime; on Mut they do not", async () => {
  const a = await begin(setup());
  const b = setup();
  b.jarvis.setMuted(true);
  await begin(b);
  assert.deepEqual([/oricând/.test(a.live.cfg.system), /oricând/.test(b.live.cfg.system)], [true, false]);
});

// ---------- bucățile ----------

test("the first chunk comes with the main idea and the number of chunks, and the next ones with their number and the total", async () => {
  const t = await begin(setup());
  const r1 = await t.tool("next_chunk"), r2 = await t.tool("next_chunk");
  assert.deepEqual(
    [r1.kind, r1.n, r1.total, r1.text, r1.intro.lead, r1.intro.total, r2.kind, r2.n, r2.total, r2.text, "intro" in r2],
    ["chunk", 1, 4, SHEET.points[0], SHEET.lead, 4, "chunk", 2, 4, SHEET.points[1], false]);
});

test("the chunks come in order, one point each, then the closing with the traps to avoid", async () => {
  const t = await begin(setup());
  const seen = [];
  for (let i = 0; i < 4; i++) seen.push((await t.tool("next_chunk")).text);
  const closing = await t.tool("next_chunk");
  assert.deepEqual([seen, closing.kind, closing.traps], [SHEET.points, "closing", SHEET.avoid]);
});

test("a sheet without things to avoid ends with the recap alone", async () => {
  const t = await begin(setup(), "gil");
  await t.tool("next_chunk"); await t.tool("next_chunk");
  const closing = await t.tool("next_chunk");
  assert.deepEqual([closing.kind, "traps" in closing, closing.recap_from.length], ["closing", false, 3]);
});

test("after the closing there is nothing more to give", async () => {
  const t = await begin(setup(), "gil");
  for (let i = 0; i < 3; i++) await t.tool("next_chunk");
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.done, typeof r.message], [true, "string"]);
});

test("repeat_chunk gives the current chunk again, with the same number", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk"); await t.tool("next_chunk");
  const r = await t.tool("repeat_chunk");
  assert.deepEqual([r.n, r.text, r.repeat], [2, SHEET.points[1], true]);
});

test("repeat_chunk before anything was given starts the lesson", async () => {
  const t = await begin(setup());
  const r = await t.tool("repeat_chunk");
  assert.deepEqual([r.n, "intro" in r], [1, true]);
});

test("the lesson never touches cards, results, scores or gaps", async () => {
  const t = await begin(setup());
  for (let i = 0; i < 5; i++) await deliver(t);
  assert.deepEqual([t.app.nextCalls, t.app.recorded, t.state().results], [[], [], []]);
});

// ---------- fereastra de ascultare ----------

test("the listening window opens only after the chunk has played in full: a tone, then the microphone", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  const during = [t.audio.beeps.length, t.state().lesson.status];
  t.audio.drain();
  assert.deepEqual([during, t.audio.beeps, t.state().lesson.status], [[0, "explaining"], ["window"], "window"]);
});

test("the microphone reaches the server inside the window and nowhere else", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(1));
  t.live.emit({ type: "turnComplete" });
  t.audio.drain();
  t.audio.frame(Int16Array.of(2));
  t.clock.advance(3000);
  t.audio.frame(Int16Array.of(3));
  assert.deepEqual(t.audioSent(), [{ audio: [2] }]);
});

test("when Alex stays silent for about 3 seconds the app asks the model for the next chunk and closes the window", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.clock.advance(2900);
  const early = t.texts().length;
  t.clock.advance(200);
  assert.deepEqual([early, t.texts().length, t.texts().at(-1), t.live.sent.at(-2), t.state().lesson.status], [1, 2, t.texts().at(-1), { audioEnd: true }, "explaining"]);
  assert.match(t.texts().at(-1), /next_chunk/);
});

test("the app, not the model, decides when to move on: it asks only after the clock has run", async () => {
  const t = await begin(setup());
  await deliver(t);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(t.texts().filter(x => /next_chunk/.test(x)).length, 1);
});

test("if Alex starts to speak in the window the automatic move-on is cancelled", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.audio.level(0.2);
  t.clock.advance(10000);
  assert.deepEqual([t.texts().length, t.state().lesson.status], [1, "asking"]);
});

test("after the model answers the question the lesson goes back to the lesson: a new window, then the next chunk", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.audio.level(0.2);
  t.live.emit({ type: "transcript", who: "me", text: "De ce anulează TaskGroup grupul?" });
  speak(t);
  const afterAnswer = [t.audio.beeps.length, t.state().lesson.status, t.texts().length];
  t.clock.advance(3100);
  assert.deepEqual([afterAnswer, t.texts().length], [[2, "window", 1], 2]);
});

test("the microphone closes when the model starts to answer: the question's audio stream is ended", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.audio.level(0.2);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(9));
  assert.deepEqual(t.audioSent(), []);
  assert.deepEqual(t.live.sent.at(-1), { audioEnd: true });
});

test("while Alex is still being transcribed the lesson keeps waiting; if no answer ever starts it moves on after a while", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.audio.level(0.2);
  t.clock.advance(8000);
  t.live.emit({ type: "transcript", who: "me", text: "Stai, de ce" });
  t.clock.advance(8000);
  const waiting = t.texts().length;
  t.clock.advance(5000);
  assert.deepEqual([waiting, t.texts().length], [1, 2]);
});

test("noise outside the window does not stop Jarvis from talking", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.level(0.4);
  t.audio.frame(Int16Array.of(5));
  assert.deepEqual([t.audio.flushes, t.audioSent(), t.state().lesson.status], [0, [], "explaining"]);
});

test("the lesson forces the 'interruptions only with headphones' behaviour whatever the setting says", async () => {
  const t = setup();
  t.jarvis.settings.set({ halfDuplex: false });
  await begin(t);
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(5));
  assert.deepEqual(t.audioSent(), []);
});

// ---------- comenzi ----------

test("Sari interrupts the chunk and asks for the next one, without counting the skipped one as heard", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.skip();
  assert.deepEqual([t.audio.flushes, t.texts().at(-1).includes("next_chunk"), t.app.pos.asyncio || 0], [1, true, 0]);
});

test("after a skipped chunk the next one, heard in full, moves the position to it", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.skip();
  await deliver(t);
  assert.equal(t.app.pos.asyncio, 2);
});

test("Repetă interrupts and asks the model to give the current chunk again", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.repeat();
  assert.deepEqual([t.audio.flushes, /repeat_chunk/.test(t.texts().at(-1))], [1, true]);
});

test("Repetă in the window cancels the move-on and replays the chunk", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.jarvis.repeat();
  t.clock.advance(5000);
  assert.deepEqual([t.texts().filter(x => /repeat_chunk/.test(x)).length, t.texts().filter(x => /next_chunk/.test(x)).length], [1, 1]);
});

test("the model calling next_chunk by a spoken 'sari' closes the window and cancels the move-on", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.audio.level(0.2);
  await t.tool("next_chunk");
  t.clock.advance(20000);
  assert.deepEqual([t.state().lesson.n, t.texts().length], [2, 1]);
});

test("end_session lets the model say goodbye and the lesson ends when it has finished speaking", async () => {
  const t = await begin(setup());
  await deliver(t);
  const r = await t.tool("end_session");
  assert.notEqual(t.state().phase, "ended");
  speak(t);
  assert.deepEqual([r.heard, t.state().phase, t.state().endedReason], [1, "ended", "user"]);
});

test("Gata ends the lesson at once", async () => {
  const t = await begin(setup());
  await deliver(t);
  await t.jarvis.stop();
  assert.deepEqual([t.state().phase, t.state().endedReason], ["ended", "user"]);
});

// ---------- Mut și Vorbește ----------

test("on Mut no window opens: no tone, no microphone, and the chunks follow one another", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await deliver(t);
  t.audio.frame(Int16Array.of(4));
  assert.deepEqual([t.audio.beeps, t.audioSent(), t.texts().length, /next_chunk/.test(t.texts().at(-1))], [[], [], 2, true]);
});

test("on Mut the second chunk follows the first without any wait", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await deliver(t);
  await deliver(t);
  assert.deepEqual([t.state().lesson.n, t.texts().length, t.app.pos.asyncio], [2, 3, 2]);
});

test("Vorbește held on Mut stops Jarvis and opens the microphone only while it is held", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(1));
  t.jarvis.talk(true);
  t.audio.frame(Int16Array.of(2));
  t.jarvis.talk(false);
  t.audio.frame(Int16Array.of(3));
  assert.deepEqual([t.audio.flushes, t.audioSent(), t.live.sent.at(-1)], [1, [{ audio: [2] }], { audioEnd: true }]);
});

test("after a question asked with Vorbește in the middle of a chunk, the chunk is replayed from its start, and it is not counted as heard", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.talk(true);
  t.jarvis.talk(false);
  t.live.emit({ type: "interrupted" });
  speak(t);
  assert.deepEqual([t.app.pos.asyncio || 0, /repeat_chunk/.test(t.texts().at(-1))], [0, true]);
});

test("after a question asked with Vorbește between chunks, the lesson moves on to the next chunk", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await deliver(t);
  t.jarvis.talk(true);
  t.jarvis.talk(false);
  t.live.emit({ type: "interrupted" });
  speak(t);
  assert.equal(/next_chunk/.test(t.texts().at(-1)), true);
});

test("Mut is remembered in the Jarvis settings, not in the progress, and survives a new session", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  const again = t.make();
  assert.deepEqual([again.settings.get().muted, JSON.parse(t.storage.data["onapsis-jarvis-v1"]).muted, "muted" in t.app], [true, true, false]);
});

test("switching Mut on in the window closes it and moves on at once; switching it off brings the windows back", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.jarvis.setMuted(true);
  const moved = t.texts().length;
  await deliver(t);
  const beepsOnMut = t.audio.beeps.length;
  t.jarvis.setMuted(false);
  await deliver(t);
  assert.deepEqual([moved, beepsOnMut, t.audio.beeps.length], [2, 1, 2]);
});

test("pause, repeat, skip and end work the same on Mut", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await t.tool("next_chunk");
  t.jarvis.repeat();
  t.jarvis.skip();
  t.jarvis.pause();
  assert.deepEqual([t.state().phase, t.texts().filter(x => /repeat_chunk/.test(x)).length], ["paused", 1]);
  await t.jarvis.stop();
  assert.equal(t.state().phase, "ended");
});

// ---------- pauza ----------

test("Pauză keeps the audio already received and stops the microphone and the window", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.audio.frame(Int16Array.of(2));
  assert.deepEqual([t.state().phase, t.audio.pauses, t.audio.flushes, t.audioSent(), t.state().lesson.status], ["paused", 1, 0, [], "paused"]);
});

test("a short pause resumes exactly where it stopped: the audio goes on and nothing is asked again", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.clock.advance(9 * MIN);
  await t.jarvis.resume();
  assert.deepEqual([t.audio.resumes, t.audio.flushes, t.texts().length, t.state().phase], [1, 0, 1, "speaking"]);
});

test("after a pause the chunk that went on playing is counted as heard once it has played in full", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  t.live.emit({ type: "turnComplete" });
  await t.jarvis.resume();
  t.audio.drain();
  assert.deepEqual([t.app.pos.asyncio, t.audio.beeps], [1, ["window"]]);
});

test("a chunk interrupted by Pauză is not heard until it has played in full", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  assert.deepEqual([t.app.pos.asyncio || 0, t.state().lesson.heard], [0, 0]);
});

test("after a pause of more than ten minutes the chunk starts again from the beginning", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.clock.advance(11 * MIN);
  await t.jarvis.resume();
  assert.deepEqual([t.audio.flushes, t.audio.resumes, /repeat_chunk/.test(t.texts().at(-1))], [1, 1, true]);
});

test("a pause taken in the window comes back with a fresh window; after ten minutes the lesson moves on to the next chunk", async () => {
  const a = await begin(setup());
  await deliver(a);
  a.jarvis.pause();
  a.clock.advance(5000);
  const quiet = a.texts().length;
  await a.jarvis.resume();
  const b = await begin(setup());
  await deliver(b);
  b.jarvis.pause();
  b.clock.advance(11 * MIN);
  await b.jarvis.resume();
  assert.deepEqual([quiet, a.audio.beeps.length, a.state().lesson.status, /next_chunk/.test(b.texts().at(-1))], [1, 2, "window", true]);
});

test("the spoken word 'pauză' reaches the same pause", async () => {
  const t = await begin(setup());
  await deliver(t);
  await t.tool("pause_session");
  assert.deepEqual([t.state().phase, t.audio.pauses], ["paused", 1]);
});

test("the pause does not count in the duration written in the history", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.clock.advance(60000);
  t.jarvis.pause();
  t.clock.advance(30 * MIN);
  await t.jarvis.resume();
  t.clock.advance(30000);
  await t.jarvis.stop();
  assert.equal(t.app.logged[0].dur, 90);
});

// ---------- semnalul pierdut ----------

test("when the connection is being restored the chunk in progress is dropped and, once back, the model resumes it with 'Reiau de unde am rămas'", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "reconnecting" });
  const flushed = t.audio.flushes;
  t.live.emit({ type: "live" });
  assert.deepEqual([flushed, t.app.pos.asyncio || 0, t.texts().at(-1)], [1, 0, t.texts().at(-1)]);
  assert.match(t.texts().at(-1), /Reiau de unde am rămas.*repeat_chunk/s);
});

test("a connection lost in the window brings back the next chunk instead of repeating one already heard", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.live.emit({ type: "reconnecting" });
  t.live.emit({ type: "live" });
  assert.match(t.texts().at(-1), /Reiau de unde am rămas.*next_chunk/s);
});

test("a connection that does not come back puts the lesson on pause with a warning tone, and the lesson stays alive", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  assert.deepEqual([t.state().phase, t.audio.beeps, t.state().lesson.status, t.audio.stopped, t.app.pos.asyncio || 0], ["paused", ["warn"], "lost", false, 0]);
});

test("Reia after a lost connection opens a new session and the model resumes the chunk", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  await t.jarvis.resume();
  assert.deepEqual([t.live.opens, t.state().phase], [2, "thinking"]);
  assert.match(t.texts().at(-1), /Reiau de unde am rămas.*repeat_chunk/s);
});

test("Reia while the network is still down warns again and stays on pause", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  t.live.failOpenOnce = "network";
  await t.jarvis.resume();
  assert.deepEqual([t.audio.beeps, t.state().phase, t.state().lesson.status], [["warn", "warn"], "paused", "lost"]);
});

test("a refused key still ends the lesson with the error", async () => {
  const t = await begin(setup());
  t.live.emit({ type: "closed", reason: "auth", code: 1008, detail: "" });
  assert.deepEqual([t.state().phase, t.state().error.code], ["ended", "auth"]);
});

test("the session reconnection after a goAway replays the interrupted chunk", async () => {
  const t = await begin(setup());
  await deliver(t); await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "reconnecting" });
  t.live.emit({ type: "live" });
  assert.deepEqual([t.state().lesson.n, t.app.pos.asyncio], [2, 1]);
  assert.match(t.texts().at(-1), /repeat_chunk/);
});

// ---------- poziția lecției ----------

test("the position advances only when a chunk has played in full", async () => {
  const t = await begin(setup());
  await deliver(t);
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.skip();
  assert.equal(t.app.pos.asyncio, 1);
});

test("hearing the closing finishes the lesson: the position goes back to zero, the date is noted and the call ends", async () => {
  const t = await begin(setup());
  for (let i = 0; i < 4; i++) { await deliver(t); t.clock.advance(3100); }
  const before = t.app.pos.asyncio;
  await deliver(t);
  assert.deepEqual([before, t.app.pos.asyncio, t.app.doneLessons, t.state().phase], [4, 0, ["asyncio"], "ended"]);
});

test("stopping before the closing keeps the position where it was", async () => {
  const t = await begin(setup());
  await deliver(t); t.clock.advance(3100); await deliver(t);
  await t.jarvis.stop();
  assert.deepEqual([t.app.pos.asyncio, t.app.doneLessons], [2, []]);
});

test("from a saved position the lesson starts with a recap of the last chunk heard and continues with the next", async () => {
  const t = setup();
  t.app.pos.asyncio = 2;
  await begin(t);
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.n, r.text, r.recap.n, r.recap.text, "intro" in r], [3, SHEET.points[2], 2, SHEET.points[1], false]);
});

test("a lesson that has heard every point but not the closing starts with the closing", async () => {
  const t = setup();
  t.app.pos.asyncio = 4;
  await begin(t);
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.kind, r.recap.n], ["closing", 4]);
});

test("the screen state shows the current chunk's number, the total, its position and the text from the sheet", async () => {
  const t = setup();
  t.app.pos.asyncio = 1;
  await begin(t);
  await t.tool("next_chunk");
  const l = t.state().lesson;
  assert.deepEqual([l.module, l.name, l.n, l.total, l.text, l.muted], ["asyncio", "asyncio", 2, 4, SHEET.points[1], false]);
});

// ---------- istoric ----------

test("ending after at least one chunk heard logs one row marked as a lesson, with the chunks heard and the duration", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.clock.advance(125000);
  await t.jarvis.stop();
  assert.deepEqual(t.app.logged, [{ title: "Jarvis · Lecție · asyncio", n: 1, c: 0, dur: 125, lesson: true }]);
});

test("a lesson in which nothing was heard to the end logs nothing", async () => {
  const t = await begin(setup());
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  await t.jarvis.stop();
  assert.deepEqual(t.app.logged, []);
});

test("free questions are not written anywhere: not in the history row, not in the app", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.audio.level(0.2);
  t.live.emit({ type: "transcript", who: "me", text: "Întrebare secretă despre TaskGroup" });
  speak(t);
  await t.jarvis.stop();
  assert.equal(JSON.stringify([t.app.logged, t.app.pos, t.app.recorded, t.storage.data]).includes("secretă"), false);
});

test("the first row of the lesson is not a card result and an invalid mode is not a lesson", async () => {
  const t = setup();
  await t.jarvis.start({ mode: "train" });
  assert.equal("lesson" in t.state() && t.state().lesson !== null, false);
});

// ---------- din code-review ----------

test("hearing the whole sheet counts the points, not the closing: the screen and the history row say 4 of 4", async () => {
  const t = await begin(setup());
  for (let i = 0; i < 4; i++) { await deliver(t); t.clock.advance(3100); }
  const heardBefore = t.state().lesson.heard;
  await deliver(t);
  assert.deepEqual([heardBefore, t.state().lesson.heard, t.app.logged.map(x => x.n)], [4, 4, [4]]);
});

test("a lesson that only hears the closing still logs one row", async () => {
  const t = setup();
  t.app.pos.asyncio = 4;
  await begin(t);
  await deliver(t);
  assert.deepEqual([t.app.logged.length, t.app.logged[0].n, t.app.doneLessons], [1, 1, ["asyncio"]]);
});

test("releasing Vorbește during a pause is not lost: after Reia the microphone stays closed", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await deliver(t);
  t.jarvis.talk(true);
  t.jarvis.pause();
  t.jarvis.talk(false);
  await t.jarvis.resume();
  t.audio.frame(Int16Array.of(6));
  assert.deepEqual([t.audioSent(), t.state().lesson.talking], [[], false]);
});

test("a chunk cut by a question is still replayed when the lesson resumes after a long pause", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await t.tool("next_chunk");
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.talk(true);
  t.jarvis.talk(false);
  t.jarvis.pause();
  t.clock.advance(11 * MIN);
  await t.jarvis.resume();
  assert.match(t.texts().at(-1), /repeat_chunk/);
});

test("Sari and Repetă do the same housekeeping and differ only in what they ask the model", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.jarvis.skip();
  const skip = t.texts().at(-1);
  await deliver(t);
  t.jarvis.repeat();
  assert.deepEqual([/next_chunk/.test(skip), /repeat_chunk/.test(t.texts().at(-1)), t.audio.flushes], [true, true, 2]);
});

// ---------- Reset în lecție: de la început ----------

test("Reset in the middle of a lesson sends the position back to zero and asks the model to begin again", async () => {
  const t = await begin(setup());
  await deliver(t); t.clock.advance(3100); await deliver(t);
  t.jarvis.restart();
  assert.deepEqual([t.app.pos.asyncio, t.app.resets, /next_chunk/.test(t.texts().at(-1)), /început/.test(t.texts().at(-1)), t.audio.flushes], [0, 1, true, true, 1]);
});

test("after Reset the model gets the main idea and the first chunk again", async () => {
  const t = await begin(setup());
  await deliver(t); t.clock.advance(3100); await deliver(t);
  t.jarvis.restart();
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.n, r.text, r.intro.total, "recap" in r, t.state().lesson.n], [1, SHEET.points[0], 4, false, 1]);
});

test("Reset cancels the listening window, so the old move-on does not fire", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.jarvis.restart();
  const n = t.texts().length;
  t.clock.advance(10000);
  assert.deepEqual([t.texts().length, t.state().lesson.status], [n, "idle"]);
});

test("a chunk heard after Reset moves the position from zero again", async () => {
  const t = await begin(setup());
  await deliver(t); t.clock.advance(3100); await deliver(t);
  t.jarvis.restart();
  await deliver(t);
  assert.equal(t.app.pos.asyncio, 1);
});

test("Reset does nothing while the lesson is paused", async () => {
  const t = await begin(setup());
  await deliver(t);
  t.jarvis.pause();
  t.jarvis.restart();
  assert.deepEqual([t.app.resets || 0, t.app.pos.asyncio], [0, 1]);
});
