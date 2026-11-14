// Lecția live (spec .scratch/lectie-live): Jarvis peste Call real, Live, Audio, ceas și stocare false, PrepApp stub.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeLive, fakeAudio, fakeClock, memoryStorage, stubApp, SHEET, SHEET_DZ, SHEET_AS } from "./fakes.mjs";
import { loadData, buildDesf, readDesfFiles } from "../../lib.mjs";

const require = createRequire(import.meta.url);
const Call = require("../../src/call.js");
const Jarvis = require("../../src/jarvis.js");

const MIN = 60000;
const GAP = Jarvis.SEQ_GAP_MS;

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
// O bucată întreagă, pe secvențe: toate se spun până la capăt; întoarce ultimul rezultat, cu `.seqs` = toate rezultatele.
async function play(t, tool = "next_chunk") { const all = [await deliver(t, tool)]; while (all.at(-1).k < all.at(-1).of) all.push(await deliver(t)); return Object.assign({}, all.at(-1), { seqs: all }); }
// La fel, dar ultima secvență a bucății nu se spune încă (testele o spun ele, ca să vadă fereastra).
async function chunk(t, tool = "next_chunk") { const all = [await t.tool(tool)]; while (all.at(-1).k < all.at(-1).of) { speak(t); t.clock.advance(GAP); all.push(await t.tool("next_chunk")); } return Object.assign({}, all.at(-1), { seqs: all }); }
// Mesajele aplicației către model, fără cererea de secvență următoare din mijlocul unei bucăți.
const moves = t => t.texts().filter(x => !/^Continuă:/.test(x));
async function begin(t, module = "django") { await t.jarvis.start({ mode: "lesson", module }); return t; }

// ---------- pornirea ----------

test("a lesson without a key asks for one and does not connect", async () => {
  const t = setup({ storage: memoryStorage() });
  await t.jarvis.start({ mode: "lesson", module: "django" });
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
  assert.match(moves(t)[0], /lecția despre django.*next_chunk/s);
});

// ---------- instrucțiunile de sistem ----------

test("the system instructions ask for no examples from outside the material, no new facts, no lists, English terms and Jarvis as explainer", async () => {
  const t = await begin(setup());
  const s = t.live.cfg.system;
  assert.match(s, /Jarvis/);
  assert.match(s, /1.{1,3}1,5 minute/);
  assert.match(s, /fără exemple din afara materialului/);
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

test("the first chunk opens with the main idea and the number of chunks, then its point; the next ones are their point alone", async () => {
  const t = await begin(setup());
  const r1 = await chunk(t), r2 = await chunk(t);
  const [open, point] = r1.seqs;
  assert.deepEqual(
    [open.kind, open.n, open.total, open.k, open.of, open.tip, open.continut, /în 4 idei/.test(open.instruction), point.tip, point.continut, r2.kind, r2.n, r2.total, r2.of, r2.continut],
    ["chunk", 1, 4, 1, 2, "harta", SHEET.lead, true, "punct", SHEET.points[0], "chunk", 2, 4, 1, SHEET.points[1]]);
});

test("the chunks come in order, one point each, then the closing with the traps to avoid and the recap", async () => {
  const t = await begin(setup());
  const seen = [];
  for (let i = 0; i < 4; i++) seen.push((await chunk(t)).continut);
  const closing = await chunk(t);
  assert.deepEqual([seen, closing.kind, closing.seqs.map(x => x.tip), closing.seqs[0].continut.split("\n")], [SHEET.points, "closing", ["capcane", "recap"], SHEET.avoid]);
});

test("a sheet without things to avoid ends with the recap alone", async () => {
  const t = await begin(setup(), "gil");
  await chunk(t); await chunk(t);
  const closing = await chunk(t);
  assert.deepEqual([closing.kind, closing.seqs.map(x => x.tip), closing.of], ["closing", ["recap"], 1]);
});

test("after the closing there is nothing more to give", async () => {
  const t = await begin(setup(), "gil");
  for (let i = 0; i < 3; i++) await chunk(t);
  const r = await chunk(t);
  assert.deepEqual([r.done, typeof r.message], [true, "string"]);
});

test("repeat_chunk gives the current chunk again, with the same number, from its first sequence", async () => {
  const t = await begin(setup());
  await chunk(t); await chunk(t);
  const r = await chunk(t, "repeat_chunk");
  assert.deepEqual([r.n, r.continut, r.repeat, r.k], [2, SHEET.points[1], true, 1]);
});

test("repeat_chunk before anything was given starts the lesson with the opening", async () => {
  const t = await begin(setup());
  const r = await t.tool("repeat_chunk");
  assert.deepEqual([r.n, r.k, r.tip], [1, 1, "harta"]);
});

test("the lesson never touches cards, results, scores or gaps", async () => {
  const t = await begin(setup());
  for (let i = 0; i < 5; i++) await play(t);
  assert.deepEqual([t.app.nextCalls, t.app.recorded, t.state().results], [[], [], []]);
});

// ---------- fereastra de ascultare ----------

test("the listening window opens only after the chunk has played in full: a tone, then the microphone", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  const during = [t.audio.beeps.length, t.state().lesson.status];
  t.audio.drain();
  assert.deepEqual([during, t.audio.beeps, t.state().lesson.status], [[0, "explaining"], ["window"], "window"]);
});

test("the microphone reaches the server inside the window and nowhere else", async () => {
  const t = await begin(setup());
  await chunk(t);
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
  await play(t);
  t.clock.advance(2900);
  const early = moves(t).length;
  t.clock.advance(200);
  assert.deepEqual([early, moves(t).length, moves(t).at(-1), t.live.sent.at(-2), t.state().lesson.status], [1, 2, moves(t).at(-1), { audioEnd: true }, "explaining"]);
  assert.match(moves(t).at(-1), /next_chunk/);
});

test("the app, not the model, decides when to move on: it asks only after the clock has run", async () => {
  const t = await begin(setup());
  await play(t);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(moves(t).filter(x => /next_chunk/.test(x)).length, 1);
});

test("if Alex starts to speak in the window the automatic move-on is cancelled", async () => {
  const t = await begin(setup());
  await play(t);
  t.audio.level(0.2);
  t.clock.advance(10000);
  assert.deepEqual([moves(t).length, t.state().lesson.status], [1, "asking"]);
});

test("after the model answers the question the lesson goes back to the lesson: a new window, then the next chunk", async () => {
  const t = await begin(setup());
  await play(t);
  t.audio.level(0.2);
  t.live.emit({ type: "transcript", who: "me", text: "De ce anulează TaskGroup grupul?" });
  speak(t);
  const afterAnswer = [t.audio.beeps.length, t.state().lesson.status, moves(t).length];
  t.clock.advance(3100);
  assert.deepEqual([afterAnswer, moves(t).length], [[2, "window", 1], 2]);
});

test("the microphone closes when the model starts to answer: the question's audio stream is ended", async () => {
  const t = await begin(setup());
  await play(t);
  t.audio.level(0.2);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(9));
  assert.deepEqual(t.audioSent(), []);
  assert.deepEqual(t.live.sent.at(-1), { audioEnd: true });
});

test("while Alex is still being transcribed the lesson keeps waiting; if no answer ever starts it moves on after a while", async () => {
  const t = await begin(setup());
  await play(t);
  t.audio.level(0.2);
  t.clock.advance(8000);
  t.live.emit({ type: "transcript", who: "me", text: "Stai, de ce" });
  t.clock.advance(8000);
  const waiting = moves(t).length;
  t.clock.advance(5000);
  assert.deepEqual([waiting, moves(t).length], [1, 2]);
});

test("noise outside the window does not stop Jarvis from talking", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.level(0.4);
  t.audio.frame(Int16Array.of(5));
  assert.deepEqual([t.audio.flushes, t.audioSent(), t.state().lesson.status], [0, [], "explaining"]);
});

test("the lesson forces the 'interruptions only with headphones' behaviour whatever the setting says", async () => {
  const t = setup();
  t.jarvis.settings.set({ halfDuplex: false });
  await begin(t);
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(5));
  assert.deepEqual(t.audioSent(), []);
});

// ---------- comenzi ----------

test("Sari interrupts the chunk and asks for the next one, without counting the skipped one as heard", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.skip();
  assert.deepEqual([t.audio.flushes, moves(t).at(-1).includes("next_chunk"), t.app.pos.django || 0], [1, true, 0]);
});

test("after a skipped chunk the next one, heard in full, moves the position to it", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.skip();
  await play(t);
  assert.equal(t.app.pos.django, 2);
});

test("Repetă interrupts and asks the model to give the current chunk again", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.repeat();
  assert.deepEqual([t.audio.flushes, /repeat_chunk/.test(moves(t).at(-1))], [1, true]);
});

test("Repetă in the window cancels the move-on and replays the chunk", async () => {
  const t = await begin(setup());
  await play(t);
  t.jarvis.repeat();
  t.clock.advance(5000);
  assert.deepEqual([moves(t).filter(x => /repeat_chunk/.test(x)).length, moves(t).filter(x => /next_chunk/.test(x)).length], [1, 1]);
});

test("the model calling next_chunk by a spoken 'sari' closes the window and cancels the move-on", async () => {
  const t = await begin(setup());
  await play(t);
  t.audio.level(0.2);
  await chunk(t); sound(t);
  t.clock.advance(20000);
  assert.deepEqual([t.state().lesson.n, moves(t).length], [2, 1]);
});

test("end_session lets the model say goodbye and the lesson ends when it has finished speaking", async () => {
  const t = await begin(setup());
  await play(t);
  const r = await t.tool("end_session");
  assert.notEqual(t.state().phase, "ended");
  speak(t);
  assert.deepEqual([r.heard, t.state().phase, t.state().endedReason], [1, "ended", "user"]);
});

test("Gata ends the lesson at once", async () => {
  const t = await begin(setup());
  await play(t);
  await t.jarvis.stop();
  assert.deepEqual([t.state().phase, t.state().endedReason], ["ended", "user"]);
});

// ---------- Mut și Vorbește ----------

test("on Mut no window opens: no tone, no microphone, and the chunks follow one another", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await play(t);
  t.audio.frame(Int16Array.of(4));
  assert.deepEqual([t.audio.beeps, t.audioSent(), moves(t).length, /next_chunk/.test(moves(t).at(-1))], [[], [], 2, true]);
});

test("on Mut the second chunk follows the first without any wait", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await play(t);
  await play(t);
  assert.deepEqual([t.state().lesson.n, moves(t).length, t.app.pos.django], [2, 3, 2]);
});

test("Vorbește held on Mut stops Jarvis and opens the microphone only while it is held", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await chunk(t);
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
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.talk(true);
  t.jarvis.talk(false);
  t.live.emit({ type: "interrupted" });
  speak(t);
  assert.deepEqual([t.app.pos.django || 0, /repeat_chunk/.test(moves(t).at(-1))], [0, true]);
});

test("after a question asked with Vorbește between chunks, the lesson moves on to the next chunk", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await play(t);
  t.jarvis.talk(true);
  t.jarvis.talk(false);
  t.live.emit({ type: "interrupted" });
  speak(t);
  assert.equal(/next_chunk/.test(moves(t).at(-1)), true);
});

test("Mut is remembered in the Jarvis settings, not in the progress, and survives a new session", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  const again = t.make();
  assert.deepEqual([again.settings.get().muted, JSON.parse(t.storage.data["onapsis-jarvis-v1"]).muted, "muted" in t.app], [true, true, false]);
});

test("switching Mut on in the window closes it and moves on at once; switching it off brings the windows back", async () => {
  const t = await begin(setup());
  await play(t);
  t.jarvis.setMuted(true);
  const moved = moves(t).length;
  await play(t);
  const beepsOnMut = t.audio.beeps.length;
  t.jarvis.setMuted(false);
  await play(t);
  assert.deepEqual([moved, beepsOnMut, t.audio.beeps.length], [2, 1, 2]);
});

test("pause, repeat, skip and end work the same on Mut", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await chunk(t);
  t.jarvis.repeat();
  t.jarvis.skip();
  t.jarvis.pause();
  assert.deepEqual([t.state().phase, moves(t).filter(x => /repeat_chunk/.test(x)).length], ["paused", 1]);
  await t.jarvis.stop();
  assert.equal(t.state().phase, "ended");
});

// ---------- pauza ----------

test("Pauză keeps the audio already received and stops the microphone and the window", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.audio.frame(Int16Array.of(2));
  assert.deepEqual([t.state().phase, t.audio.pauses, t.audio.flushes, t.audioSent(), t.state().lesson.status], ["paused", 1, 0, [], "paused"]);
});

test("a short pause resumes exactly where it stopped: the audio goes on and nothing is asked again", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.clock.advance(9 * MIN);
  await t.jarvis.resume();
  assert.deepEqual([t.audio.resumes, t.audio.flushes, moves(t).length, t.state().phase], [1, 0, 1, "speaking"]);
});

test("after a pause the chunk that went on playing is counted as heard once it has played in full", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  t.live.emit({ type: "turnComplete" });
  await t.jarvis.resume();
  t.audio.drain();
  assert.deepEqual([t.app.pos.django, t.audio.beeps], [1, ["window"]]);
});

test("a chunk interrupted by Pauză is not heard until it has played in full", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  assert.deepEqual([t.app.pos.django || 0, t.state().lesson.heard], [0, 0]);
});

test("after a pause of more than ten minutes the chunk starts again from the beginning", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.pause();
  t.clock.advance(11 * MIN);
  await t.jarvis.resume();
  assert.deepEqual([t.audio.flushes, t.audio.resumes, /repeat_chunk/.test(moves(t).at(-1))], [1, 1, true]);
});

test("a pause taken in the window comes back with a fresh window; after ten minutes the lesson moves on to the next chunk", async () => {
  const a = await begin(setup());
  await play(a);
  a.jarvis.pause();
  a.clock.advance(5000);
  const quiet = moves(a).length;
  await a.jarvis.resume();
  const b = await begin(setup());
  await play(b);
  b.jarvis.pause();
  b.clock.advance(11 * MIN);
  await b.jarvis.resume();
  assert.deepEqual([quiet, a.audio.beeps.length, a.state().lesson.status, /next_chunk/.test(moves(b).at(-1))], [1, 2, "window", true]);
});

test("the spoken word 'pauză' reaches the same pause", async () => {
  const t = await begin(setup());
  await play(t);
  await t.tool("pause_session");
  assert.deepEqual([t.state().phase, t.audio.pauses], ["paused", 1]);
});

test("the pause does not count in the duration written in the history", async () => {
  const t = await begin(setup());
  await play(t);
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
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "reconnecting" });
  const flushed = t.audio.flushes;
  t.live.emit({ type: "live" });
  assert.deepEqual([flushed, t.app.pos.django || 0, moves(t).at(-1)], [1, 0, moves(t).at(-1)]);
  assert.match(moves(t).at(-1), /Reiau de unde am rămas.*repeat_chunk/s);
});

test("a connection lost in the window brings back the next chunk instead of repeating one already heard", async () => {
  const t = await begin(setup());
  await play(t);
  t.live.emit({ type: "reconnecting" });
  t.live.emit({ type: "live" });
  assert.match(moves(t).at(-1), /Reiau de unde am rămas.*next_chunk/s);
});

test("a connection that does not come back puts the lesson on pause with a warning tone, and the lesson stays alive", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  assert.deepEqual([t.state().phase, t.audio.beeps, t.state().lesson.status, t.audio.stopped, t.app.pos.django || 0], ["paused", ["warn"], "lost", false, 0]);
});

test("Reia after a lost connection opens a new session and the model resumes the chunk", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  await t.jarvis.resume();
  assert.deepEqual([t.live.opens, t.state().phase], [2, "thinking"]);
  assert.match(moves(t).at(-1), /Reiau de unde am rămas.*repeat_chunk/s);
});

test("Reia while the network is still down warns again and stays on pause", async () => {
  const t = await begin(setup());
  await chunk(t);
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
  await play(t); await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "reconnecting" });
  t.live.emit({ type: "live" });
  assert.deepEqual([t.state().lesson.n, t.app.pos.django], [2, 1]);
  assert.match(moves(t).at(-1), /repeat_chunk/);
});

// ---------- poziția lecției ----------

test("the position advances only when a chunk has played in full", async () => {
  const t = await begin(setup());
  await play(t);
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.skip();
  assert.equal(t.app.pos.django, 1);
});

test("hearing the closing finishes the lesson: the position goes back to zero, the date is noted and the call ends", async () => {
  const t = await begin(setup());
  for (let i = 0; i < 4; i++) { await play(t); t.clock.advance(3100); }
  const before = t.app.pos.django;
  await play(t);
  assert.deepEqual([before, t.app.pos.django, t.app.doneLessons, t.state().phase], [4, 0, ["django"], "ended"]);
});

// Capcanele au început să se audă, dar nu s-au terminat.
async function toClosingPlaying(t) {
  for (let i = 0; i < 4; i++) { await play(t); t.clock.advance(3100); }
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
}

test("a next_chunk asked after the end gets the goodbye and the app ends the lesson by itself, instead of asking for more chunks", async () => {
  const t = await begin(setup());
  await toClosingPlaying(t);
  t.jarvis.skip();                                       // Sari taie capcanele: nu s-au auzit toate
  const asked = moves(t).length;
  const r = await chunk(t);
  speak(t);                                              // rămas-bunul
  t.clock.advance(10000);
  assert.deepEqual([r.done, t.state().phase, t.state().endedReason, moves(t).length], [true, "ended", "user", asked]);
});

test("ending past the end does not count the skipped closing as heard: the position stays and the date is not noted", async () => {
  const t = await begin(setup());
  await toClosingPlaying(t);
  t.jarvis.skip();
  await chunk(t);
  speak(t);
  assert.deepEqual([t.app.pos.django, t.app.doneLessons], [4, []]);
});

test("on Mut, a next_chunk asked after the end also ends the lesson after the goodbye", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await toClosingPlaying(t);
  t.jarvis.skip();
  const asked = moves(t).length;
  await chunk(t);
  speak(t);
  assert.deepEqual([t.state().phase, moves(t).length], ["ended", asked]);
});

test("a question asked with Vorbește during the closing, answered with 'mai departe', ends the lesson instead of replaying the closing", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await toClosingPlaying(t);
  t.jarvis.talk(true);
  t.jarvis.talk(false);
  t.live.emit({ type: "interrupted" });
  const asked = moves(t).length;
  await chunk(t);
  speak(t);
  assert.deepEqual([t.state().phase, moves(t).length], ["ended", asked]);
});

test("stopping before the closing keeps the position where it was", async () => {
  const t = await begin(setup());
  await play(t); t.clock.advance(3100); await play(t);
  await t.jarvis.stop();
  assert.deepEqual([t.app.pos.django, t.app.doneLessons], [2, []]);
});

test("from a saved position the lesson starts with a recap of the last chunk heard and continues with the next", async () => {
  const t = setup();
  t.app.pos.django = 2;
  await begin(t);
  const r = await chunk(t);
  assert.deepEqual([r.n, r.continut, r.seqs[0].tip, r.seqs[0].continut, /Data trecută/.test(r.seqs[0].instruction), r.seqs.some(x => x.tip === "harta")], [3, SHEET.points[2], "punct", SHEET.points[1], true, false]);
});

test("a lesson that has heard every point but not the closing starts with the closing", async () => {
  const t = setup();
  t.app.pos.django = 4;
  await begin(t);
  const r = await chunk(t);
  assert.deepEqual([r.kind, r.seqs.map(x => x.tip), r.seqs[0].continut], ["closing", ["punct", "capcane", "recap"], SHEET.points[3]]);
});

test("the screen state shows the current chunk's number, the total, its position and the card from the sheet", async () => {
  const t = setup();
  t.app.pos.django = 1;
  await begin(t);
  await chunk(t); sound(t);
  const l = t.state().lesson;
  assert.deepEqual([l.module, l.name, l.n, l.total, l.card.continut, l.muted], ["django", "django", 2, 4, SHEET.points[1], false]);
});

// ---------- istoric ----------

test("ending after at least one chunk heard logs one row marked as a lesson, with the chunks heard and the duration", async () => {
  const t = await begin(setup());
  await play(t);
  t.clock.advance(125000);
  await t.jarvis.stop();
  assert.deepEqual(t.app.logged, [{ title: "Jarvis · Lecție · django", n: 1, c: 0, dur: 125, lesson: true }]);
});

test("a lesson in which nothing was heard to the end logs nothing", async () => {
  const t = await begin(setup());
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  await t.jarvis.stop();
  assert.deepEqual(t.app.logged, []);
});

test("free questions are not written anywhere: not in the history row, not in the app", async () => {
  const t = await begin(setup());
  await play(t);
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
  for (let i = 0; i < 4; i++) { await play(t); t.clock.advance(3100); }
  const heardBefore = t.state().lesson.heard;
  await play(t);
  assert.deepEqual([heardBefore, t.state().lesson.heard, t.app.logged.map(x => x.n)], [4, 4, [4]]);
});

test("a lesson that only hears the closing still logs one row", async () => {
  const t = setup();
  t.app.pos.django = 4;
  await begin(t);
  await play(t);
  assert.deepEqual([t.app.logged.length, t.app.logged[0].n, t.app.doneLessons], [1, 1, ["django"]]);
});

test("releasing Vorbește during a pause is not lost: after Reia the microphone stays closed", async () => {
  const t = setup();
  t.jarvis.setMuted(true);
  await begin(t);
  await play(t);
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
  await chunk(t);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.talk(true);
  t.jarvis.talk(false);
  t.jarvis.pause();
  t.clock.advance(11 * MIN);
  await t.jarvis.resume();
  assert.match(moves(t).at(-1), /repeat_chunk/);
});

test("Sari and Repetă do the same housekeeping and differ only in what they ask the model", async () => {
  const t = await begin(setup());
  await play(t);
  t.jarvis.skip();
  const skip = moves(t).at(-1);
  await play(t);
  t.jarvis.repeat();
  assert.deepEqual([/next_chunk/.test(skip), /repeat_chunk/.test(moves(t).at(-1)), t.audio.flushes], [true, true, 2]);
});

// ---------- Reset în lecție: de la început ----------

test("Reset in the middle of a lesson sends the position back to zero and asks the model to begin again", async () => {
  const t = await begin(setup());
  await play(t); t.clock.advance(3100); await play(t);
  t.jarvis.restart();
  assert.deepEqual([t.app.pos.django, t.app.resets, /next_chunk/.test(moves(t).at(-1)), /început/.test(moves(t).at(-1)), t.audio.flushes], [0, 1, true, true, 1]);
});

test("after Reset the model gets the main idea and the first chunk again", async () => {
  const t = await begin(setup());
  await play(t); t.clock.advance(3100); await play(t);
  t.jarvis.restart();
  const r = await chunk(t); sound(t);
  assert.deepEqual([r.n, r.continut, r.seqs[0].tip, /în 4 idei/.test(r.seqs[0].instruction), r.seqs.some(x => /Data trecută|Reiau/.test(x.instruction)), t.state().lesson.n], [1, SHEET.points[0], "harta", true, false, 1]);
});

test("Reset cancels the listening window, so the old move-on does not fire", async () => {
  const t = await begin(setup());
  await play(t);
  t.jarvis.restart();
  const n = moves(t).length;
  t.clock.advance(10000);
  assert.deepEqual([moves(t).length, t.state().lesson.status], [n, "idle"]);
});

test("a chunk heard after Reset moves the position from zero again", async () => {
  const t = await begin(setup());
  await play(t); t.clock.advance(3100); await play(t);
  t.jarvis.restart();
  await play(t);
  assert.equal(t.app.pos.django, 1);
});

test("Reset does nothing while the lesson is paused", async () => {
  const t = await begin(setup());
  await play(t);
  t.jarvis.pause();
  t.jarvis.restart();
  assert.deepEqual([t.app.resets || 0, t.app.pos.django], [0, 1]);
});

// ---------- desfășurările (spec .scratch/desfasurari, tichet 10) ----------

test("a chunk of a module with unfoldings goes sequence by sequence from its unfolding, in order", async () => {
  const t = await begin(setup(), "oop");
  const r1 = await chunk(t), r2 = await chunk(t), r3 = await chunk(t);
  const d = SHEET_DZ.desf;
  assert.deepEqual(r1.seqs.map(x => x.tip), ["harta", "problema", "ideea", "exemplu", "cpp", "punct"]);
  assert.deepEqual(r1.seqs.slice(1, 3).map(x => x.continut), [d[0].p, d[0].i]);
  assert.deepEqual(r2.seqs.map(x => x.tip), ["problema", "ideea", "analogie", "punct"]);
  assert.deepEqual(r3.seqs.map(x => x.tip), ["problema", "ideea", "exemplu", "pas", "punct"]);
  assert.equal(r3.seqs[3].continut, "clasa S se definește: rules = []\ns1.rules -> nu e pe s1 -> S.rules");
  assert.equal(r1.seqs[4].continut, d[0].cpp + "\nUnde nu ține: " + d[0].nu);
});

test("the sequences of an unfolding ask for the example from the card and for the code to be told, not read out", async () => {
  const t = await begin(setup(), "oop");
  const r = await chunk(t), ex = r.seqs.find(x => x.tip === "exemplu");
  assert.match(ex.instruction, /exemplul de pe cartonaș/);
  assert.match(ex.instruction, /Nu citi codul/);
  assert.match(ex.instruction, /fără fapte noi/i);
});

test("a module without unfoldings has a single sequence per chunk, the point, and no desf material", async () => {
  const t = await begin(setup());
  const r = await chunk(t), r2 = await chunk(t);
  assert.deepEqual([r.seqs.map(x => x.tip), r2.seqs.map(x => x.tip), "desf" in r2, "text" in r2, "intro" in r], [["harta", "punct"], ["punct"], false, false, false]);
});

test("the first chunk opens with the module map when there is one, in place of the main idea", async () => {
  const t = await begin(setup(), "oop");
  const r = await chunk(t), open = r.seqs[0];
  assert.deepEqual([open.tip, open.continut, /în 3 idei/.test(open.instruction)],
    ["harta", [SHEET_DZ.map.p, "1–2: cum se naște un obiect", "3: unde stă starea"].join("\n"), true]);
});

test("a lesson continued from a saved position recaps the last chunk and does not repeat the map", async () => {
  const t = setup();
  t.app.pos.oop = 1;
  await begin(t, "oop");
  const r = await chunk(t);
  assert.deepEqual([r.n, r.seqs[0].tip, r.seqs[0].continut, r.seqs.some(x => x.tip === "harta"), r.seqs[1].continut], [2, "punct", SHEET_DZ.points[0], false, SHEET_DZ.desf[1].p]);
});

test("the system instructions tell the model how to use the unfolding and the map, keep 'no new facts' and tell it to narrate code", async () => {
  const t = await begin(setup(), "oop");
  const s = t.live.cfg.system;
  assert.match(s, /desf[^\n]*problem[^\n]*ide[^\n]*exemplu/i);
  assert.match(s, /exemplul din desfășurare/i);
  assert.match(s, /caracter cu caracter/);
  assert.match(s, /harta/i);
  assert.match(s, /fără fapte noi[^\n]*desfășurare|desfășurare[^\n]*fără fapte noi/i);
});

test("the unfoldings and the map are not in the system instructions: the app gives them chunk by chunk", async () => {
  const t = await begin(setup(), "oop");
  const all = [SHEET_DZ.map.p].concat(SHEET_DZ.desf.map(x => x.p), SHEET_DZ.desf.map(x => x.i));
  assert.equal(all.some(x => t.live.cfg.system.includes(x)), false);
});

test("the number of chunks and the lesson position do not change when a module has unfoldings", async () => {
  const t = await begin(setup(), "oop");
  const r1 = await play(t);
  await play(t);
  const posAfterTwo = t.app.pos.oop;
  await play(t);
  const closing = await play(t);
  assert.deepEqual([r1.total, posAfterTwo, closing.kind, "desf" in closing, t.app.doneLessons], [3, 2, "closing", false, ["oop"]]);
});

test("repeat_chunk in the middle of a chunk of a module with unfoldings starts it again from its first sequence", async () => {
  const t = await begin(setup(), "oop");
  await play(t);
  await t.tool("next_chunk"); speak(t); await t.tool("next_chunk"); speak(t);
  const again = await t.tool("repeat_chunk");
  assert.deepEqual([again.n, again.k, again.tip, again.continut, again.repeat], [2, 1, "problema", SHEET_DZ.desf[1].p, true]);
});

test("after Reset on a module with a map the model is told to begin again with the introduction it gets, and that introduction has the map", async () => {
  const t = await begin(setup(), "oop");
  await play(t); t.clock.advance(3100); await play(t);
  t.jarvis.restart();
  const msg = moves(t).at(-1), r = await chunk(t);
  assert.deepEqual([/ideea principală/.test(msg), /intro/.test(msg), r.n, r.seqs[0].tip, r.seqs.some(x => /Data trecută|Reiau/.test(x.instruction))], [false, true, 1, "harta", false]);
});

// ---------- secvențe și cartonașe (asyncio) ----------

const seqSheet = (over = {}) => Object.assign({ points: SHEET_AS.points, desf: SHEET_AS.desf }, over);
const tips = (sh, n) => Jarvis.lessonSequences(sh, n).map(x => x.tip);

test("lessonSequences gives the sequences in order, skips the missing fields and has none for Legătură", () => {
  assert.deepEqual([1, 2, 3].map(n => tips(seqSheet(), n)), [
    ["problema", "ideea", "exemplu", "cpp", "punct"],
    ["problema", "ideea", "analogie", "pas", "punct"],
    ["ideea", "punct"]]);
});

test("each sequence has a type, a card content and an instruction; code cards come without fences", () => {
  const q = Jarvis.lessonSequences(seqSheet(), 1);
  assert.equal(q.every(x => x.tip && x.continut && x.instruction), true);
  const by = Object.fromEntries(q.map(x => [x.tip, x]));
  assert.deepEqual([by.problema.continut, by.exemplu.continut.startsWith("async def f()"), by.exemplu.continut.includes("```"), by.punct.continut],
    [SHEET_AS.desf[0].p, true, false, SHEET_AS.points[0]]);
  assert.match(by.cpp.continut, /epoll_wait/); assert.match(by.cpp.continut, /Handlerul C\+\+ nu păstrează/);
  assert.equal(Jarvis.lessonSequences(seqSheet(), 2).find(x => x.tip === "pas").continut.includes("```"), false);
});

test("a sheet without unfoldings has only the point sequence", () => {
  assert.deepEqual(Jarvis.lessonSequences({ points: SHEET.points }, 2).map(x => [x.tip, x.continut]), [["punct", SHEET.points[1]]]);
});

test("the real asyncio sheet gives sequences for every point and the real django sheet only the point", () => {
  const P = loadData(new URL("../../", import.meta.url)), { desf } = buildDesf(P, readDesfFiles(new URL("../../", import.meta.url)));
  const as = { points: P.sheets.asyncio.points, desf: desf.asyncio.items };
  for (let n = 1; n <= as.points.length; n++) { const t = tips(as, n); assert.equal(t.at(-1), "punct"); assert.equal(t.includes("ideea") && t.includes("problema"), true); }
  assert.deepEqual(tips({ points: P.sheets.django.points }, 1), ["punct"]);
});

test("next_chunk on asyncio gives one sequence with its place in the chunk and the model does not get the next one", async () => {
  const t = await begin(setup(), "asyncio");
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.kind, r.n, r.k, r.of, r.tip, r.continut, "desf" in r, "text" in r], ["chunk", 1, 1, 6, "harta", [SHEET_AS.map.p, "1–2: cum rulează bucla", "3: cum colectezi rezultatele"].join("\n"), false, false]);
  assert.equal(JSON.stringify(r).includes("await"), false);
});

test("after a sequence is spoken the app asks for the next one and does not open the window", async () => {
  const t = await begin(setup(), "asyncio");
  await t.tool("next_chunk"); speak(t); t.clock.advance(GAP);
  assert.deepEqual([t.audio.beeps, /next_chunk/.test(t.texts().at(-1)), t.app.pos.asyncio || 0], [[], true, 0]);
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.n, r.k, r.tip], [1, 2, "problema"]);
});

test("the listening window opens only after the last sequence, which also writes lessonHeard", async () => {
  const t = await begin(setup(), "asyncio");
  for (let k = 1; k <= 5; k++) { await deliver(t); assert.deepEqual([t.audio.beeps.length, t.app.pos.asyncio || 0], [0, 0]); }
  const last = await deliver(t);
  assert.deepEqual([last.k, last.of, last.tip, t.audio.beeps, t.app.pos.asyncio], [6, 6, "punct", ["window"], 1]);
  t.clock.advance(3100);
  const next = await t.tool("next_chunk");
  assert.deepEqual([next.n, next.k, next.tip], [2, 1, "problema"]);
});

test("on Mut the sequences and then the next chunk follow without a window", async () => {
  const t = setup(); t.jarvis.settings.set({ muted: true });
  await begin(t, "asyncio");
  for (let k = 1; k <= 6; k++) { await deliver(t); t.clock.advance(GAP); }
  assert.deepEqual([t.audio.beeps, t.app.pos.asyncio, /next_chunk/.test(t.texts().at(-1))], [[], 1, true]);
});

test("the lesson view exposes the current card as tip and content, and no longer the old text or traps", async () => {
  const t = await begin(setup(), "asyncio");
  assert.equal(["text", "traps"].some(f => f in t.state().lesson), false);
  assert.equal(t.state().lesson.card, null);
  await deliver(t); await deliver(t); await t.tool("next_chunk"); sound(t);
  let l = t.state().lesson;
  assert.deepEqual([l.card, l.k, l.of, l.n], [{ tip: "ideea", continut: SHEET_AS.desf[0].i }, 3, 6, 1]);
  const o = await begin(setup(), "django");
  await play(o);
  assert.deepEqual(o.state().lesson.card, { tip: "punct", continut: SHEET.points[0] });
});

// ---------- cartonașul se schimbă când începe sunetul ----------

const sound = t => t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
const say = (t, text, id = "m1") => t.live.emit({ type: "transcript", id, who: "model", text });

test("a requested card stays hidden until its sound starts; the old one stays on screen", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t);
  await t.tool("next_chunk");
  assert.deepEqual([t.state().lesson.card.tip, t.state().lesson.k], ["harta", 1]);
  sound(t);
  assert.deepEqual([t.state().lesson.card.tip, t.state().lesson.k], ["problema", 2]);
});

test("the very first card does not show before it is heard", async () => {
  const t = await begin(setup(), "asyncio");
  await t.tool("next_chunk");
  assert.equal(t.state().lesson.card, null);
  sound(t);
  assert.equal(t.state().lesson.card.tip, "harta");
});

test("a pause or Vorbește before the sound leaves no unheard card on screen", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t);
  await t.tool("next_chunk"); t.jarvis.pause();
  sound(t);
  assert.equal(t.state().lesson.card.tip, "harta");
  const u = await begin(setup(), "asyncio");
  await deliver(u);
  await u.tool("next_chunk"); u.jarvis.talk(true); sound(u);
  assert.equal(u.state().lesson.card.tip, "harta");
});

test("the subtitle shows the last two lines the model spoke since the card changed, and empties on the next card", async () => {
  const t = await begin(setup(), "asyncio");
  await t.tool("next_chunk"); sound(t);
  say(t, "Prima propoziție. A doua. A treia!");
  assert.deepEqual(t.state().lesson.sub, ["A doua.", "A treia!"]);
  speak(t);
  await t.tool("next_chunk"); say(t, "Prima propoziție. A doua. A treia! Noua.", "m1"); sound(t);
  assert.deepEqual(t.state().lesson.sub, []);
  say(t, "Prima propoziție. A doua. A treia! Noua. Alta.", "m1");
  assert.deepEqual(t.state().lesson.sub, ["Noua.", "Alta."]);
});

test("Repetă in the middle of a chunk starts it again from the first sequence", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t); await deliver(t);
  await t.tool("next_chunk"); t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.repeat();
  const r = await t.tool("repeat_chunk");
  assert.deepEqual([r.n, r.k, r.tip, r.repeat, t.app.pos.asyncio || 0], [1, 1, "harta", true, 0]);
});

test("Sari in the middle of a chunk goes to the next chunk, not to the next sequence", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t);
  t.jarvis.skip();
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.n, r.k], [2, 1]);
});

test("a question between sequences restarts the chunk from its first sequence", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t); await deliver(t);
  t.jarvis.talk(true); t.jarvis.talk(false);
  speak(t);
  assert.match(t.texts().at(-1), /repeat_chunk/);
  const r = await t.tool("repeat_chunk");
  assert.deepEqual([r.n, r.k], [1, 1]);
});

// ---------- ritmul: pauza dintre secvențe (tichetul 04) ----------

const seqAsks = t => t.texts().filter(x => /^Continuă:/.test(x)).length;

test("SEQ_GAP_MS is a single constant of about two seconds", () => {
  assert.deepEqual([typeof GAP, GAP >= 1000 && GAP <= 4000], ["number", true]);
});

test("the next sequence is asked for only after SEQ_GAP_MS, not right after the model finishes", async () => {
  const t = await begin(setup(), "asyncio");
  await t.tool("next_chunk"); speak(t);
  assert.equal(seqAsks(t), 0);
  t.clock.advance(GAP - 1);
  assert.equal(seqAsks(t), 0);
  t.clock.advance(1);
  assert.equal(seqAsks(t), 1);
  t.clock.advance(10 * GAP);
  assert.equal(seqAsks(t), 1);
});

test("the gap also applies on Mut and in audio mode", async () => {
  for (const over of [{ muted: true }, { mode: "audio" }]) {
    const t = setup(); t.jarvis.settings.set(over);
    await begin(t, "asyncio");
    await t.tool("next_chunk"); speak(t);
    assert.equal(seqAsks(t), 0);
    t.clock.advance(GAP);
    assert.equal(seqAsks(t), 1);
  }
});

test("the listening window after the last sequence is unchanged, with no extra gap", async () => {
  const t = await begin(setup(), "asyncio");
  for (let k = 1; k <= 5; k++) { await deliver(t); t.clock.advance(GAP); }
  await deliver(t);
  assert.deepEqual([t.audio.beeps, seqAsks(t)], [["window"], 5]);
  t.clock.advance(3100);
  assert.match(t.texts().at(-1), /next_chunk/);
});

test("the model asking for the next sequence on its own during the gap does not get a second request", async () => {
  const t = await begin(setup(), "asyncio");
  await t.tool("next_chunk"); speak(t);
  const r = await t.tool("next_chunk");
  assert.equal(r.k, 2);
  t.clock.advance(5 * GAP);
  assert.equal(seqAsks(t), 0);
});

test("Pauză during the gap cancels it, and Reia restarts the chunk without a sequence asked twice", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t);
  t.jarvis.pause();
  t.clock.advance(5 * GAP);
  assert.equal(seqAsks(t), 0);
  await t.jarvis.resume();
  t.clock.advance(5 * GAP);
  assert.deepEqual([seqAsks(t), /repeat_chunk/.test(t.texts().at(-1))], [0, true]);
});

test("Repetă and Sari during the gap cancel it", async () => {
  for (const [act, re] of [["repeat", /repeat_chunk/], ["skip", /next_chunk/]]) {
    const t = await begin(setup(), "asyncio");
    await deliver(t);
    t.jarvis[act]();
    t.clock.advance(5 * GAP);
    assert.deepEqual([seqAsks(t), re.test(t.texts().at(-1))], [0, true]);
  }
});

test("Vorbește during the gap cancels it, and the answer is followed by the chunk restarted once", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t);
  t.jarvis.talk(true);
  t.clock.advance(GAP);
  assert.equal(seqAsks(t), 0);
  t.jarvis.talk(false);
  speak(t);
  t.clock.advance(5 * GAP);
  assert.deepEqual([seqAsks(t), t.texts().filter(x => /repeat_chunk/.test(x)).length], [0, 1]);
});

test("losing the connection during the gap cancels it", async () => {
  const t = await begin(setup(), "asyncio");
  await deliver(t);
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  assert.equal(t.state().phase, "paused");
  t.clock.advance(5 * GAP);
  assert.equal(seqAsks(t), 0);
});

// ---------- toate modulele pe secvențe (tichetul 08) ----------

// Un modul cu desfășurări (oop, SHEET_DZ) și unul fără (django, SHEET) se poartă la fel ca asyncio.
const MODS = [["oop", SHEET_DZ], ["django", SHEET]];

test("every module goes through sequences: a chunk is one sequence per call, with its place, and no whole-chunk shape is left", async () => {
  for (const [m, sh] of MODS) {
    const t = await begin(setup(), m), r = await t.tool("next_chunk");
    assert.deepEqual([r.kind, r.n, r.k, r.tip, "desf" in r, "text" in r, "intro" in r, "recap" in r], ["chunk", 1, 1, "harta", false, false, false, false], m);
    assert.equal(r.of, 1 + Jarvis.lessonSequences({ points: sh.points, desf: sh.desf }, 1).length, m);
  }
});

test("the closing of every module is the traps and the recap in sequences, never the old whole closing", async () => {
  for (const [m, sh] of MODS) {
    const t = await begin(setup(), m);
    for (let i = 0; i < sh.points.length; i++) await play(t);
    const c = await chunk(t);
    assert.deepEqual([c.kind, c.seqs.map(x => x.tip), "recap_from" in c, "lead" in c], ["closing", ["capcane", "recap"], false, false], m);
  }
});

test("lessonHeard is written only after the last sequence of a chunk, for every module", async () => {
  for (const [m, sh] of MODS) {
    const t = await begin(setup(), m);
    const r = await t.tool("next_chunk"); speak(t);
    for (let k = 2; k <= r.of; k++) { assert.equal(t.app.pos[m] || 0, 0, m + " before sequence " + k); await deliver(t); }
    assert.equal(t.app.pos[m], 1, m);
  }
});

test("a pause in the middle of a chunk and a long pause restart the chunk from its first sequence, for every module", async () => {
  for (const [m] of MODS) {
    await (async () => {
      const t = await begin(setup(), m);
      await play(t); t.clock.advance(3100); await play(t, "next_chunk");   // chunk 2 played in full: window open
      await t.tool("next_chunk"); sound(t);                              // chunk 3 (or closing) just started
      t.jarvis.pause(); t.clock.advance(11 * MIN); await t.jarvis.resume();
      assert.match(moves(t).at(-1), /repeat_chunk/, m);
      const r = await t.tool("repeat_chunk");
      assert.deepEqual([r.k, r.repeat], [1, true], m);
    })();
  }
});

test("a short pause in the middle of a chunk goes on from the same second, for every module", async () => {
  for (const [m] of MODS) {
    const t = await begin(setup(), m);
    await t.tool("next_chunk"); sound(t);
    t.jarvis.pause(); t.clock.advance(5 * MIN); await t.jarvis.resume();
    assert.deepEqual([t.audio.resumes, t.audio.flushes, t.app.pos[m] || 0], [1, 0, 0], m);
  }
});

test("a lost connection and a reconnection after a mid-chunk sequence replay the chunk from its first sequence, for every module", async () => {
  for (const [m] of MODS) {
    const t = await begin(setup(), m);
    await deliver(t);                               // sequence 1 heard
    await t.tool("next_chunk"); sound(t);           // sequence 2 or the point is playing
    t.live.emit({ type: "reconnecting" }); t.live.emit({ type: "live" });
    assert.match(moves(t).at(-1), /repeat_chunk/, m);
    const r = await t.tool("repeat_chunk");
    assert.deepEqual([r.n, r.k, r.tip, t.app.pos[m] || 0], [1, 1, "harta", 0], m);
    const u = await begin(setup(), m);
    await deliver(u); await u.tool("next_chunk"); sound(u);
    u.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
    await u.jarvis.resume();
    assert.match(moves(u).at(-1), /Reiau de unde am rămas.*repeat_chunk/s, m);
    assert.equal((await u.tool("repeat_chunk")).k, 1, m);
  }
});

test("Repetă in the middle of any module's chunk starts it again from the first sequence and does not count it as heard", async () => {
  for (const [m] of MODS) {
    const t = await begin(setup(), m);
    await deliver(t); await t.tool("next_chunk"); sound(t);
    t.jarvis.repeat();
    const r = await t.tool("repeat_chunk");
    assert.deepEqual([r.n, r.k, r.repeat, t.app.pos[m] || 0], [1, 1, true, 0], m);
  }
});

test("the history row of a lesson on a module with unfoldings is still a lesson row (the app does not count it in the evening's budget)", async () => {
  const t = await begin(setup(), "oop");
  for (let i = 0; i < SHEET_DZ.points.length; i++) await play(t, "next_chunk"), t.clock.advance(3100);
  t.jarvis.end ? t.jarvis.end() : await t.jarvis.stop();
  const row = t.app.logged.at(-1);
  assert.deepEqual([row.lesson, row.n], [true, SHEET_DZ.points.length]);
});

test("every module of the real data has sequences ending in the point, with content, and audio instructions free of screen words", () => {
  const root = new URL("../../", import.meta.url), P = loadData(root), { desf } = buildDesf(P, readDesfFiles(root));
  assert.ok(P.modules.length > 10);
  let seen = 0;
  for (const m of P.modules) {
    const sh = P.sheets[m.id];
    if (!sh || !sh.points) continue;
    const sheet = { points: sh.points, desf: desf[m.id] && desf[m.id].items };
    for (let n = 1; n <= sh.points.length; n++) for (const audio of [false, true]) {
      const q = Jarvis.lessonSequences(sheet, n, audio);
      assert.ok(q.length > 0, m.id + " " + n);
      assert.equal(q.at(-1).tip, "punct", m.id + " " + n);
      for (const x of q) {
        assert.ok(typeof x.continut === "object" ? x.continut.cuvinte.length || x.continut.cod || x.continut.schema : x.continut && x.continut.trim(), m.id + " " + n + " " + x.tip + ": empty continut");
        assert.ok(x.instruction, m.id + " " + n + " " + x.tip);
        if (audio) assert.equal(SCREEN_WORDS.test(x.instruction), false, m.id + " " + x.tip + ": " + x.instruction);
      }
      seen++;
    }
  }
  assert.ok(seen > 200, "points checked: " + seen);
});

// ---------- tabla: cuvinte cheie și schemă în loc de paragrafe ----------

const TABLA = { problema: ["cuvânt problemă"], ideea: ["cuvânt idee", "alt cuvânt"], schema: "A rulează\n↓ await\nB rulează", cpp: ["epoll_wait"], punct: ["cuvânt punct"] };
const boardSheet = () => seqSheet({ desf: [Object.assign({}, SHEET_AS.desf[0], { tab: TABLA }), ...SHEET_AS.desf.slice(1)] });
const byTip = (sh, n, audio) => Object.fromEntries(Jarvis.lessonSequences(sh, n, audio).map(x => [x.tip, x]));

test("a point with a board gives sequences with { cuvinte, schema?, cod? } and the other points stay text", () => {
  const sh = boardSheet(), by = byTip(sh, 1);
  assert.deepEqual(tips(sh, 1), ["problema", "ideea", "exemplu", "cpp", "punct"]);
  assert.deepEqual(by.problema.continut, { cuvinte: ["cuvânt problemă"] });
  assert.deepEqual(by.ideea.continut, { cuvinte: ["cuvânt idee", "alt cuvânt"], schema: TABLA.schema });
  assert.deepEqual(by.exemplu.continut, { cuvinte: [], cod: SHEET_AS.desf[0].ex.replace(/^```python\n|\n```$/g, "") });
  assert.deepEqual(by.cpp.continut, { cuvinte: ["epoll_wait"] });
  assert.deepEqual(by.punct.continut, { cuvinte: ["cuvânt punct"] });
  assert.equal(by.exemplu.continut.cod.includes("```"), false);
  // punctele fără tablă: textul de azi
  assert.equal(typeof byTip(sh, 2).problema.continut, "string");
  assert.equal(typeof byTip(sh, 3).punct.continut, "string");
});

test("a point with a board does not hand the unfolding paragraphs to the model, in either mode", () => {
  for (const audio of [false, true]) {
    const all = JSON.stringify(Jarvis.lessonSequences(boardSheet(), 1, audio).map(x => x.continut));
    for (const text of [SHEET_AS.desf[0].p, SHEET_AS.desf[0].i, SHEET_AS.desf[0].cpp, SHEET_AS.points[0]]) assert.equal(all.includes(text), false, text);
  }
});

test("a board with Pas cu pas gives the steps as the schema of the pas sequence", () => {
  const tab = { problema: ["a"], ideea: ["b"], analogie: ["d"], punct: ["c"] };
  const sh = seqSheet({ desf: [SHEET_AS.desf[0], Object.assign({}, SHEET_AS.desf[1], { tab }), SHEET_AS.desf[2]] }), by = byTip(sh, 2);
  assert.deepEqual(tips(sh, 2), ["problema", "ideea", "analogie", "pas", "punct"]);
  assert.deepEqual(by.pas.continut, { cuvinte: [], schema: SHEET_AS.desf[1].pas.replace(/^```text\n|\n```$/g, "") });
  assert.deepEqual(by.analogie.continut, { cuvinte: ["d"] });
});

test("the board instructions ask to tell around the keywords, slowly, and do not read them out", () => {
  const by = byTip(boardSheet(), 1);
  for (const tip of ["problema", "ideea", "cpp", "punct"]) {
    const i = by[tip].instruction;
    assert.match(i, /cuvinte(le)? cheie/, tip);
    assert.match(i, /în jurul/, tip);
    assert.match(i, /nu (le )?(citi|enumera)/i, tip);
    assert.match(i, /rar/, tip);
    assert.match(i, /fără fapte noi/i, tip);
  }
  assert.match(by.ideea.instruction, /schema/);
  // codul rămâne ca azi
  assert.equal(by.exemplu.instruction, byTip(seqSheet(), 1).exemplu.instruction);
});

test("the audio-only board instructions have no screen words and ask for the scheme told in words", () => {
  const by = byTip(boardSheet(), 1, true);
  for (const x of Object.values(by)) assert.equal(SCREEN_WORDS.test(x.instruction), false, x.tip + ": " + x.instruction);
  assert.match(by.ideea.instruction, /în cuvinte/);
});

test("next_chunk hands over the board as the content and the card carries the same board", async () => {
  const t = setup(); t.app.sheet0 = t.app.sheet;
  t.app.sheet = id => { const r = t.app.sheet0(id); if (id === "asyncio") r.desf = boardSheet().desf; return r; };
  await begin(t, "asyncio");
  await deliver(t);                                       // harta
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.tip, r.continut], ["problema", { cuvinte: ["cuvânt problemă"] }]);
  assert.match(r.instruction, /cuvinte(le)? cheie/);
  speak(t); sound(t);
  assert.deepEqual(t.state().lesson.card, { tip: "problema", continut: { cuvinte: ["cuvânt problemă"] } });
});

test("every real asyncio point has board sequences, and the real modules without a board keep their text", () => {
  const root = new URL("../../", import.meta.url), P = loadData(root), { desf } = buildDesf(P, readDesfFiles(root));
  const as = { points: P.sheets.asyncio.points, desf: desf.asyncio.items };
  const q = Jarvis.lessonSequences(as, 1);
  assert.deepEqual(q.map(x => x.tip), ["problema", "ideea", "exemplu", "cpp", "punct"]);
  for (const x of q) assert.equal(typeof x.continut, "object", x.tip);
  assert.ok(q.find(x => x.tip === "ideea").continut.schema.includes("await"));
  assert.ok(q.find(x => x.tip === "exemplu").continut.cod.startsWith("import asyncio"));
  for (const x of q) if (x.continut.cuvinte.length) assert.ok(x.continut.cuvinte.length <= 2);
  for (let n = 2; n <= as.points.length; n++) for (const x of Jarvis.lessonSequences(as, n)) {
    assert.equal(typeof x.continut, "object", n + " " + x.tip);
    if (x.tip !== "exemplu") assert.ok(x.continut.cuvinte.length >= 1 && x.continut.cuvinte.length <= 2, n + " " + x.tip);
  }
});

// ---------- module fără desfășurări: fără improvizație ----------

test("no lesson instruction asks for an example from outside the material", async () => {
  const sys = Jarvis.buildLessonSystem({ name: "django", muted: false, summary: {} });
  assert.equal(/experien/i.test(sys), false);
  for (const q of Object.values(Jarvis.lessonSequences({ points: SHEET.points, desf: SHEET_AS.desf }, 1)).map(x => x.instruction)) assert.equal(/experien/i.test(q), false);
  const t = await begin(setup(), "django"), r = await t.tool("next_chunk");
  assert.equal(/experien/i.test(r.instruction) || /experien/i.test(t.live.cfg.system), false);
});

test("a module without unfoldings (django) has one sequence per chunk, the point, spoken from the card", () => {
  const P = loadData(new URL("../../", import.meta.url));
  for (const m of ["dbmodels", "aws", "django"]) for (let n = 1; n <= P.sheets[m].points.length; n++)
    assert.deepEqual(Jarvis.lessonSequences({ points: P.sheets[m].points }, n).map(x => [x.tip, x.continut]), [["punct", P.sheets[m].points[n - 1]]]);
});

// ---------- harta, capcanele și recapitularea (tichetul 04) ----------

// Ascultă `asyncio` până la ultima bucată, fără să deschidă ferestre de întrebări (Mut).
async function toAsyncClosing(t) {
  t.jarvis.settings.set({ muted: true });
  await begin(t, "asyncio");
  for (let i = 0; i < SHEET_AS.points.length; i++) { let r; do { r = await deliver(t); } while (r.k < r.of); }
}

test("the opening is a sequence of its own: the map card with the problem and the groups, before the problem of point 1", async () => {
  const t = await begin(setup(), "asyncio");
  const r = await t.tool("next_chunk"); sound(t);
  assert.deepEqual([r.tip, r.k, r.of, t.state().lesson.card.tip, t.state().lesson.card.continut.split("\n")], ["harta", 1, 6, "harta", [SHEET_AS.map.p, "1–2: cum rulează bucla", "3: cum colectezi rezultatele"]]);
  assert.match(r.instruction, /asyncio, în 3 idei/);
  assert.equal("intro" in r, false);
  speak(t);
  assert.deepEqual([t.audio.beeps, (await t.tool("next_chunk")).tip], [[], "problema"]);
});

test("without a map the opening card is the main idea", async () => {
  const t = setup(); const sheet = t.app.sheet; t.app.sheet = id => Object.assign(sheet(id), { map: undefined });
  await begin(t, "asyncio");
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.tip, r.continut, r.of], ["harta", SHEET_AS.lead, 6]);
});

test("the closing comes in two sequences, the traps and then the recap, and the recap text is ours: the groups of the map", async () => {
  const t = setup(); await toAsyncClosing(t);
  const c1 = await t.tool("next_chunk"); sound(t);
  assert.deepEqual([c1.kind, c1.n, c1.k, c1.of, c1.tip, c1.continut, t.state().lesson.card.tip, "recap_from" in c1], ["closing", 4, 1, 2, "capcane", SHEET_AS.avoid.join("\n"), "capcane", false]);
  speak(t);
  assert.match(t.texts().at(-1), /next_chunk/);
  assert.deepEqual([t.app.doneLessons, t.state().phase !== "ended"], [[], true]);
  const c2 = await t.tool("next_chunk"); sound(t);
  assert.deepEqual([c2.k, c2.tip, c2.continut, t.state().lesson.card], [2, "recap", "1–2: cum rulează bucla\n3: cum colectezi rezultatele", { tip: "recap", continut: c2.continut }]);
  assert.match(c2.instruction, /rămas-bun/);
});

test("hearing the recap to the end finishes the lesson from the app; the traps alone do not", async () => {
  const t = setup(); await toAsyncClosing(t);
  await deliver(t);
  assert.deepEqual([t.app.doneLessons, t.state().phase !== "ended"], [[], true]);
  await deliver(t);
  assert.deepEqual([t.app.doneLessons, t.state().phase], [["asyncio"], "ended"]);
});

test("without a map the recap is the main idea, and without traps the closing is only the recap", async () => {
  const t = setup(); const sheet = t.app.sheet; t.app.sheet = id => Object.assign(sheet(id), { map: undefined, avoid: [] });
  await toAsyncClosing(t);
  const c = await t.tool("next_chunk");
  assert.deepEqual([c.k, c.of, c.tip, c.continut], [1, 1, "recap", SHEET_AS.lead]);
});

test("Sari on the traps ends the lesson with the goodbye and does not count the closing as heard", async () => {
  const t = setup(); await toAsyncClosing(t);
  await t.tool("next_chunk"); t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.jarvis.skip();
  const r = await t.tool("next_chunk");
  speak(t);
  assert.deepEqual([r.done, t.state().phase, t.app.doneLessons], [true, "ended", []]);
});

test("from a saved position the recall sentence has the card of the point recalled", async () => {
  const t = setup(); t.app.pos.asyncio = 2;
  await begin(t, "asyncio");
  const r = await t.tool("next_chunk"); sound(t);
  assert.deepEqual([r.n, r.k, r.of, r.tip, r.continut, t.state().lesson.card.continut], [3, 1, 3, "punct", SHEET_AS.points[1], SHEET_AS.points[1]]);
  assert.match(r.instruction, /Data trecută/);
  speak(t);
  const r2 = await t.tool("next_chunk");
  assert.deepEqual([r2.k, r2.tip, r2.continut], [2, "ideea", SHEET_AS.desf[2].i]);
});

test("a lesson that has heard every point starts with the recall and then the closing sequences", async () => {
  const t = setup(); t.app.pos.asyncio = 3;
  await begin(t, "asyncio");
  const r = await t.tool("next_chunk");
  assert.deepEqual([r.kind, r.k, r.of, r.tip, r.continut], ["closing", 1, 3, "punct", SHEET_AS.points[2]]);
});


// ---------- „Cu ecran” și „Doar audio” (tichetul 06) ----------

const SCREEN_WORDS = /ecran|cartona|\bvezi|\buite\b|uit[ăa] |rând|pe cod|aici/i;
const withMode = mode => { const t = setup(); t.jarvis.settings.set({ mode }); return t; };

test("the mode is 'ecran' by default, is kept in the Jarvis settings and reaches the screen state", async () => {
  const t = setup();
  assert.equal(t.jarvis.settings.get().mode, "ecran");
  t.jarvis.settings.set({ mode: "audio" });
  assert.equal(JSON.parse(t.storage.data["onapsis-jarvis-v1"]).mode, "audio");
  assert.equal(t.make().settings.get().mode, "audio");
  await begin(t, "asyncio");
  assert.equal(t.state().lesson.mode, "audio");
  const o = await begin(setup(), "asyncio");
  assert.equal(o.state().lesson.mode, "ecran");
});

test("the mode is read at the start: changing it in the middle of a lesson does not change the lesson", async () => {
  const t = await begin(withMode("audio"), "asyncio");
  t.jarvis.settings.set({ mode: "ecran" });
  const r = await t.tool("next_chunk");
  assert.deepEqual([t.state().lesson.mode, SCREEN_WORDS.test(r.instruction)], ["audio", false]);
});

test("on 'Cu ecran' the instructions may point to the screen and tell Jarvis the third line can be mentioned", async () => {
  const t = await begin(withMode("ecran"), "asyncio");
  const r = await t.tool("next_chunk");
  assert.match(t.live.cfg.system, /ecran/);
  assert.match(t.live.cfg.system, /rândul al treilea/);
  assert.match(r.instruction, /cartonaș/);
});

test("on 'Doar audio' neither the system instructions nor any sequence instruction point to the screen", async () => {
  const t = await begin(withMode("audio"), "asyncio");
  assert.equal(SCREEN_WORDS.test(t.live.cfg.system), false, t.live.cfg.system.match(SCREEN_WORDS) + "");
  assert.match(t.live.cfg.system, /în cuvinte/);
  const said = [];
  for (let n = 1; n <= 3; n++) for (const s of Jarvis.lessonSequences(seqSheet(), n, true)) said.push([s.tip, s.instruction]);
  assert.ok(said.length >= 10);
  for (const [tip, ins] of said) assert.equal(SCREEN_WORDS.test(ins), false, tip + ": " + ins);
  // și ce primește modelul în răspunsurile next_chunk, până la închidere
  for (let i = 0; i < 40 && !t.state().lesson.closing; i++) {
    const r = await t.tool("next_chunk"); speak(t);
    assert.equal(SCREEN_WORDS.test(r.instruction || ""), false, r.instruction);
    t.clock.advance(3100);
  }
  assert.equal(t.state().lesson.closing, true);
});

test("on 'Doar audio' the code is told in words: the example says so, and the text of the sequences is the same as before", async () => {
  const a = Jarvis.lessonSequences(seqSheet(), 1, true), e = Jarvis.lessonSequences(seqSheet(), 1);
  assert.match(a.find(x => x.tip === "exemplu").instruction, /în cuvinte/);
  assert.match(a.find(x => x.tip === "exemplu").instruction, /nu citi codul/i);
  assert.deepEqual(a.map(x => [x.tip, x.continut]), e.map(x => [x.tip, x.continut]));
  assert.notEqual(a[0].instruction, e[0].instruction);
});

test("the four combinations of mode and Mut work: the sequences go on, the window opens only without Mut", async () => {
  for (const mode of ["ecran", "audio"]) for (const muted of [false, true]) {
    const t = setup(); t.jarvis.settings.set({ mode, muted });
    await begin(t, "asyncio");
    await deliver(t);
    for (let k = 2; k <= t.state().lesson.of; k++) await deliver(t);
    const l = t.state().lesson;
    assert.deepEqual([l.mode, l.muted, t.audio.beeps, t.app.pos.asyncio], [mode, muted, muted ? [] : ["window"], 1], mode + "/" + muted);
    if (!muted) t.clock.advance(3100);
    const r = await t.tool("next_chunk");
    assert.deepEqual([r.n, r.k], [2, 1], mode + "/" + muted);
  }
});

test("on 'Doar audio' the map, the recall, the traps and the recap also have instructions with no pointer to the screen", async () => {
  const seen = [];
  const t1 = await begin(withMode("audio"), "asyncio");
  const r1 = await t1.tool("next_chunk"); seen.push(r1);
  assert.equal(r1.tip, "harta");
  const t2 = setup(); t2.jarvis.settings.set({ mode: "audio" }); t2.app.pos.asyncio = 2;
  await begin(t2, "asyncio");
  const r2 = await t2.tool("next_chunk"); seen.push(r2);
  assert.equal(r2.tip, "punct");
  const t3 = setup(); t3.jarvis.settings.set({ mode: "audio" }); t3.app.pos.asyncio = 3;
  await begin(t3, "asyncio");
  for (let i = 0; i < 6; i++) { const r = await t3.tool("next_chunk"); seen.push(r); speak(t3); t3.clock.advance(3100); }
  const tips = seen.filter(x => x && x.tip).map(x => x.tip);
  for (const need of ["harta", "punct", "recap"]) assert.ok(tips.includes(need), need + " in " + tips);
  for (const r of seen) if (r && r.instruction) assert.equal(SCREEN_WORDS.test(r.instruction), false, r.tip + ": " + r.instruction);
  // varianta „fără hartă” și ideea principală, fără trimitere la ecran
  assert.equal(SCREEN_WORDS.test(r1.instruction), false);
});

// ---------- întrebări, „mai simplu”, „exemplu” (tichetul 05) ----------

const heard = (t, text) => t.live.emit({ type: "transcript", who: "me", text });
async function askMid(t, q) {
  await deliver(t); await t.tool("next_chunk"); sound(t);          // harta auzită, problema pe ecran
  t.jarvis.talk(true); if (q) heard(t, q); t.jarvis.talk(false);
  t.live.emit({ type: "interrupted" });                          // întrebarea taie bucata în curs
}

test("a free question switches the screen to the question card, with Alex's words and the answer as subtitle", async () => {
  const t = await begin(setup(), "asyncio");
  await askMid(t, "De ce anulează TaskGroup grupul?");
  assert.equal(t.state().lesson.card.tip, "problema");
  sound(t); say(t, "Pentru că un task a eșuat. Restul se anulează.");
  const l = t.state().lesson;
  assert.deepEqual([l.card, l.sub, l.n], [{ tip: "intrebare", continut: "De ce anulează TaskGroup grupul?" }, ["Pentru că un task a eșuat.", "Restul se anulează."], 1]);
});

test("when the question text arrives after the answer started, the card gets it", async () => {
  const t = await begin(setup(), "asyncio");
  await askMid(t);
  sound(t);
  assert.equal(t.state().lesson.card.continut, "");
  heard(t, "De ce?");
  assert.deepEqual(t.state().lesson.card, { tip: "intrebare", continut: "De ce?" });
});

test("a question never shows the text of the previous one", async () => {
  const t = await begin(setup(), "asyncio");
  await askMid(t, "Prima?"); sound(t); speak(t);
  await t.tool("repeat_chunk"); sound(t);
  t.jarvis.talk(true); t.jarvis.talk(false); t.live.emit({ type: "interrupted" }); sound(t);
  assert.deepEqual(t.state().lesson.card, { tip: "intrebare", continut: "" });
});

test("when Jarvis returns to the lesson the chunk card returns, from its first sequence, without a mark", async () => {
  const t = await begin(setup(), "asyncio");
  await askMid(t, "De ce?");
  sound(t); speak(t);
  assert.match(t.texts().at(-1), /repeat_chunk/);
  await t.tool("repeat_chunk"); sound(t);
  const l = t.state().lesson;
  assert.deepEqual([l.card.tip, l.card.eticheta, l.k, l.sub], ["harta", undefined, 1, []]);
});

test("'mai simplu' and 'exemplu' keep the chunk card and add a label", async () => {
  const t = await begin(setup(), "asyncio");
  await askMid(t, "Mai simplu, te rog."); sound(t);
  assert.deepEqual([t.state().lesson.card.tip, t.state().lesson.card.eticheta, t.state().lesson.k], ["problema", "Mai simplu", 2]);
  const u = await begin(setup(), "asyncio");
  await askMid(u, "Dă-mi un exemplu"); sound(u);
  assert.deepEqual([u.state().lesson.card.tip, u.state().lesson.card.eticheta], ["problema", "Alt exemplu"]);
});

test("the request forms are tolerant of diacritics, punctuation and a polite tail", async () => {
  for (const [q, label] of [["mai simplu", "Mai simplu"], ["Explică-mi mai simplu!", "Mai simplu"], ["Mai simplu, te rog.", "Mai simplu"], ["Alt exemplu", "Alt exemplu"], ["Încă un exemplu, te rog", "Alt exemplu"], ["Un exemplu?", "Alt exemplu"], ["exemplu", "Alt exemplu"], ["Dă-mi un exemplu.", "Alt exemplu"]]) {
    const t = await begin(setup(), "asyncio");
    await askMid(t, q); sound(t);
    assert.deepEqual([q, t.state().lesson.card.tip, t.state().lesson.card.eticheta], [q, "problema", label]);
  }
});

test("a short question ABOUT an example or about 'simpler' is a question, not a request", async () => {
  for (const q of ["Ce e un exemplu de closure?", "De ce e exemplul ăsta greșit?", "Cum arată un exemplu cu TaskGroup?", "E mai simplu cu gather?", "Care e cel mai simplu exemplu?", "Exemplu de ce?"]) {
    const t = await begin(setup(), "asyncio");
    await askMid(t, q); sound(t);
    assert.deepEqual([q, t.state().lesson.card.tip, t.state().lesson.card.continut], [q, "intrebare", q]);
  }
});

test("a long question that only mentions an example is still a question", async () => {
  const t = await begin(setup(), "asyncio");
  await askMid(t, "În exemplul acesta, de ce se oprește bucla când un task aruncă o excepție?"); sound(t);
  assert.equal(t.state().lesson.card.tip, "intrebare");
});

test("the question is kept nowhere: not in the app, results or gaps", async () => {
  const t = await begin(setup(), "asyncio");
  await askMid(t, "De ce?"); sound(t); speak(t);
  assert.deepEqual([t.app.logged.length, JSON.stringify(t.app).includes("De ce?")], [0, false]);
});

test("a question on a module without sequences also gets the question card", async () => {
  const t = await begin(setup(), "django");
  await deliver(t); t.jarvis.talk(true); heard(t, "Cum?"); t.jarvis.talk(false); t.live.emit({ type: "interrupted" }); sound(t);
  assert.deepEqual(t.state().lesson.card, { tip: "intrebare", continut: "Cum?" });
});
