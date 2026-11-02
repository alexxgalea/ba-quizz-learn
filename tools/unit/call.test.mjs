import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeLive, fakeAudio, fakeClock, settle } from "./fakes.mjs";

const Call = createRequire(import.meta.url)("../../src/call.js");

const CONFIG = { key: "KEY", model: "gemini-3.8-live", voice: "Charon", silenceMs: 1200, system: "Ești Jarvis.", tools: [] };

// Pornește un apel peste Live și Audio false; `t.events` strânge evenimentele Call, `t.call` e apelul.
async function started(opts = {}) {
  const t = { live: fakeLive(), audio: fakeAudio(), clock: fakeClock(), events: [] };
  t.call = await Call.start(Object.assign({ live: t.live, audio: t.audio, config: CONFIG, clock: t.clock, onEvent: e => t.events.push(e) }, opts));
  t.states = () => t.events.filter(e => e.type === "state").map(e => e.state);
  return t;
}

test("start opens the live session with the config and begins listening", async () => {
  const t = await started();
  assert.deepEqual([t.live.cfg, t.audio.started, t.states()], [CONFIG, true, ["listening"]]);
});

test("microphone frames go to the live session", async () => {
  const t = await started();
  t.audio.frame(Int16Array.of(1, 2, 3));
  assert.deepEqual(t.live.sent, [{ audio: [1, 2, 3] }]);
});

test("audio from the model is played and the state becomes speaking", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(5, 6) });
  assert.deepEqual([t.audio.played, t.states()], [[[5, 6]], ["listening", "speaking"]]);
});

test("it goes back to listening once playback has drained and the model's turn is complete", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.audio.drain();
  assert.deepEqual(t.states(), ["listening", "speaking", "listening"]);
});

test("a pause in playback while the model is still talking does not count as listening", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.drain();
  assert.deepEqual(t.states(), ["listening", "speaking"]);
});

test("an interruption from the server empties the speaker at once and goes back to listening", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "interrupted" });
  assert.deepEqual([t.audio.flushes, t.states()], [1, ["listening", "speaking", "listening"]]);
});

test("interrupt() empties the speaker and tells the model to stop", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.interrupt();
  assert.deepEqual([t.audio.flushes, t.live.sent, t.states()], [1, [{ text: "Stai." }], ["listening", "speaking", "listening"]]);
});

test("say() sends typed text to the model", async () => {
  const t = await started();
  t.call.say("Folosesc procese pentru CPU-bound.");
  assert.deepEqual(t.live.sent, [{ text: "Folosesc procese pentru CPU-bound." }]);
});

const transcripts = t => t.events.filter(e => e.type === "transcript");

test("transcript pieces grow one utterance per speaker", async () => {
  const t = await started();
  t.live.emit({ type: "transcript", who: "me", text: "Bună" });
  t.live.emit({ type: "transcript", who: "me", text: " seara" });
  t.live.emit({ type: "transcript", who: "model", text: "Salut, Alex." });
  assert.deepEqual(transcripts(t), [
    { type: "transcript", id: 1, who: "me", text: "Bună" },
    { type: "transcript", id: 1, who: "me", text: "Bună seara" },
    { type: "transcript", id: 2, who: "model", text: "Salut, Alex." }]);
});

test("after the model's turn is complete, its next words start a new utterance", async () => {
  const t = await started();
  t.live.emit({ type: "transcript", who: "model", text: "Prima." });
  t.live.emit({ type: "turnComplete" });
  t.live.emit({ type: "transcript", who: "model", text: "A doua." });
  assert.deepEqual(transcripts(t).map(e => [e.id, e.text]), [[1, "Prima."], [2, "A doua."]]);
});

test("by default the microphone keeps going while the model speaks", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(7));
  assert.deepEqual(t.live.sent, [{ audio: [7] }]);
});

test("with halfDuplex the microphone is not forwarded while the model's audio plays", async () => {
  const t = await started({ halfDuplex: true });
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.frame(Int16Array.of(8));
  t.audio.drain();
  t.audio.frame(Int16Array.of(9));
  assert.deepEqual(t.live.sent, [{ audio: [9] }]);
});

test("pause() empties the speaker, stops forwarding the microphone and reports paused", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.pause();
  t.audio.frame(Int16Array.of(2));
  assert.deepEqual([t.audio.flushes, t.live.sent, t.states().pop()], [1, [], "paused"]);
});

test("audio from the model that arrives while paused is dropped", async () => {
  const t = await started();
  t.call.pause();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  assert.deepEqual([t.audio.played, t.states().pop()], [[], "paused"]);
});

test("resume() goes back to listening and forwards the microphone again", async () => {
  const t = await started();
  t.call.pause();
  t.call.resume();
  t.audio.frame(Int16Array.of(3));
  assert.deepEqual([t.live.sent, t.states().pop()], [[{ audio: [3] }], "listening"]);
});

test("the microphone level is forwarded at most ten times a second", async () => {
  const t = await started();
  for (const v of [0.1, 0.2, 0.3, 0.4]) { t.audio.level(v); t.clock.advance(40); }
  assert.deepEqual(t.events.filter(e => e.type === "level"), [{ type: "level", v: 0.1 }, { type: "level", v: 0.4 }]);
});

const warns = t => t.events.filter(e => e.type === "warn").map(e => e.code);

test("four seconds of a dead-silent microphone while listening raise the mic-silent warning", async () => {
  const t = await started();
  t.audio.level(0);
  t.clock.advance(3900);
  t.audio.level(0);
  const early = warns(t);
  t.clock.advance(200);
  t.audio.level(0);
  assert.deepEqual([early, warns(t)], [[], ["mic-silent"]]);
});

test("the mic-silent warning clears at the first frame with a signal", async () => {
  const t = await started();
  t.clock.advance(4100);
  t.audio.level(0);
  t.audio.level(0.01);
  assert.deepEqual(warns(t), ["mic-silent", null]);
});

test("a quiet room that still has a signal never raises the warning", async () => {
  const t = await started();
  for (let i = 0; i < 20; i++) { t.audio.level(0.003); t.clock.advance(400); }
  assert.deepEqual(warns(t), []);
});

test("silence while the model is speaking is not a warning", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.clock.advance(5000);
  t.audio.level(0);
  assert.deepEqual(warns(t), []);
});

test("when the candidate stops talking it shows thinking until the model answers", async () => {
  const t = await started();
  t.audio.level(0.1);
  t.clock.advance(500);
  t.audio.level(0.001);
  const waiting = t.states();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  assert.deepEqual([waiting, t.states().pop()], [["listening", "thinking"], "speaking"]);
});

test("a short pause inside an answer is not thinking yet", async () => {
  const t = await started();
  t.audio.level(0.1);
  t.clock.advance(200);
  t.audio.level(0.001);
  assert.deepEqual(t.states(), ["listening"]);
});

test("talking again after a pause goes back from thinking to listening", async () => {
  const t = await started();
  t.audio.level(0.1);
  t.clock.advance(500);
  t.audio.level(0.001);
  t.audio.level(0.1);
  assert.deepEqual(t.states(), ["listening", "thinking", "listening"]);
});

test("echo of the model's own voice never makes it think", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.audio.level(0.2);
  t.live.emit({ type: "turnComplete" });
  t.audio.drain();
  t.clock.advance(600);
  t.audio.level(0.001);
  assert.deepEqual(t.states(), ["listening", "speaking", "listening"]);
});

test("say() shows thinking until the model answers", async () => {
  const t = await started();
  t.call.say("Folosesc procese.");
  const afterSay = t.states().pop();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  assert.deepEqual([afterSay, t.states().pop()], ["thinking", "speaking"]);
});

test("tool outcomes from the live session are passed on", async () => {
  const t = await started();
  t.live.emit({ type: "tool", name: "next_card", args: {}, result: { card_id: "o-1" } });
  assert.deepEqual(t.events.filter(e => e.type === "tool"), [{ type: "tool", name: "next_card", args: {}, result: { card_id: "o-1" } }]);
});

test("a reconnect shows the reconnecting warning until the session is live again", async () => {
  const t = await started();
  t.live.emit({ type: "reconnecting" });
  t.live.emit({ type: "live" });
  assert.deepEqual(warns(t), ["reconnecting", null]);
});

test("end() closes the session and the audio and reports ended once", async () => {
  const t = await started();
  await t.call.end();
  await t.call.end();
  assert.deepEqual([t.live.closed, t.audio.stops, t.states().pop(), t.events.filter(e => e.type === "ended")], [true, 1, "ended", [{ type: "ended", reason: "user" }]]);
});

test("a close from the server ends the call with its reason and stops the audio", async () => {
  const t = await started();
  t.live.emit({ type: "closed", reason: "quota", code: 1011, detail: "exhausted" });
  await settle();
  assert.deepEqual([t.audio.stopped, t.states().pop(), t.events.filter(e => e.type === "ended")], [true, "ended", [{ type: "ended", reason: "quota" }]]);
});

test("start is rejected with the reason when the live session cannot be opened, and the audio is stopped", async () => {
  const live = fakeLive(), audio = fakeAudio();
  live.failOpen = "auth";
  await assert.rejects(Call.start({ live, audio, config: CONFIG, clock: fakeClock(), onEvent() {} }), err => err.reason === "auth");
  assert.equal(audio.stopped, true);
});

test("start is rejected when the microphone is refused, and the live session is closed", async () => {
  const live = fakeLive(), audio = fakeAudio();
  audio.failStart = "denied";
  await assert.rejects(Call.start({ live, audio, config: CONFIG, clock: fakeClock(), onEvent() {} }), err => err.reason === "denied");
  await settle();
  assert.equal(live.closed, true);
});

test("nothing is reported after the call has ended", async () => {
  const t = await started();
  await t.call.end();
  const n = t.events.length;
  t.live.emit({ type: "transcript", who: "model", text: "târziu" });
  t.audio.level(0.5);
  assert.equal(t.events.length, n);
});

test("commands after the call has ended do nothing", async () => {
  const t = await started();
  await t.call.end();
  const n = t.events.length;
  t.call.pause();
  t.call.say("încă aici?");
  assert.deepEqual([t.events.length, t.live.sent], [n, []]);
});

test("the candidate's earlier talking does not make it think once the model has answered", async () => {
  const t = await started();
  t.audio.level(0.1);
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.audio.drain();
  t.clock.advance(600);
  t.audio.level(0.001);
  assert.deepEqual(t.states(), ["listening", "speaking", "listening"]);
});

// ---- Lecție live: poarta microfonului, vorbirea terminată, Vorbește, pauza cu coadă, pierderea conexiunii ----

const ofType = (t, type) => t.events.filter(e => e.type === type);
const speakAll = t => { t.live.emit({ type: "audio", pcm: Int16Array.of(1) }); t.live.emit({ type: "turnComplete" }); t.audio.drain(); };

test("spoken is reported when the model's turn is complete and the playback has drained", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  const early = ofType(t, "spoken").length;
  t.audio.drain();
  assert.deepEqual([early, ofType(t, "spoken").length], [0, 1]);
});

test("spoken is not reported when the speech is cut short by an interruption", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "interrupted" });
  t.live.emit({ type: "turnComplete" });
  assert.equal(ofType(t, "spoken").length, 0);
});

test("a gated call sends nothing from the microphone until the gate is opened", async () => {
  const t = await started({ gate: false });
  t.audio.frame(Int16Array.of(1));
  t.call.mic(true);
  t.audio.frame(Int16Array.of(2));
  assert.deepEqual(t.live.sent, [{ audio: [2] }]);
});

test("closing the gate ends the audio stream once, so the server closes the turn", async () => {
  const t = await started({ gate: false });
  t.call.mic(true);
  t.audio.frame(Int16Array.of(2));
  t.call.mic(false);
  t.call.mic(false);
  t.audio.frame(Int16Array.of(3));
  assert.deepEqual(t.live.sent, [{ audio: [2] }, { audioEnd: true }]);
});

test("voice is reported when the level rises above the threshold while the gate is open, once per utterance", async () => {
  const t = await started({ gate: false });
  t.audio.level(0.2);
  t.call.mic(true);
  t.audio.level(0.2);
  t.audio.level(0.3);
  t.clock.advance(600);
  t.audio.level(0.001);
  t.audio.level(0.2);
  assert.equal(ofType(t, "voice").length, 2);
});

test("talk(true) empties the speaker, opens the microphone and drops the rest of the interrupted turn", async () => {
  const t = await started({ gate: false });
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.talk(true);
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  t.audio.frame(Int16Array.of(5));
  assert.deepEqual([t.audio.flushes, t.audio.played, t.live.sent], [1, [[1]], [{ audio: [5] }]]);
});

test("after talk(true) the model's next turn plays once the server has reported the interruption", async () => {
  const t = await started({ gate: false });
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.talk(true);
  t.live.emit({ type: "interrupted" });
  t.live.emit({ type: "audio", pcm: Int16Array.of(9) });
  assert.deepEqual(t.audio.played, [[1], [9]]);
});

test("releasing talk closes the microphone again and ends the audio stream", async () => {
  const t = await started({ gate: false });
  t.call.talk(true);
  t.audio.frame(Int16Array.of(5));
  t.call.talk(false);
  t.audio.frame(Int16Array.of(6));
  assert.deepEqual(t.live.sent, [{ audio: [5] }, { audioEnd: true }]);
});

test("while talk is held, a gate that is open stays open after the release", async () => {
  const t = await started({ gate: false });
  t.call.mic(true);
  t.call.talk(true);
  t.call.talk(false);
  t.audio.frame(Int16Array.of(7));
  assert.deepEqual(t.live.sent, [{ audio: [7] }]);
});

test("interrupt(text) empties the speaker and sends that text instead of the default one", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.interrupt("Repetă bucata.");
  assert.deepEqual([t.audio.flushes, t.live.sent], [1, [{ text: "Repetă bucata." }]]);
});

test("the rest of a turn cut by interrupt(text) is dropped until the model reports a tool call", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.interrupt("Repetă bucata.");
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  t.live.emit({ type: "tool", name: "repeat_chunk", args: {}, result: {} });
  t.live.emit({ type: "audio", pcm: Int16Array.of(3) });
  assert.deepEqual(t.audio.played, [[1], [3]]);
});

test("pause({ keep: true }) keeps the queue, stops the microphone and reports paused", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.pause({ keep: true });
  t.audio.frame(Int16Array.of(2));
  assert.deepEqual([t.audio.pauses, t.audio.flushes, t.live.sent, t.states().pop()], [1, 0, [], "paused"]);
});

test("audio from the model keeps being queued during a kept pause, without leaving the paused state", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.pause({ keep: true });
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  t.live.emit({ type: "turnComplete" });
  assert.deepEqual([t.audio.played, t.states().pop(), ofType(t, "spoken").length], [[[1], [2]], "paused", 0]);
});

test("resume after a kept pause plays on, shows speaking, and reports spoken when the queue drains", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.call.pause({ keep: true });
  t.call.resume();
  const during = t.states().pop();
  t.audio.drain();
  assert.deepEqual([t.audio.resumes, during, ofType(t, "spoken").length], [1, "speaking", 1]);
});

test("resume after a kept pause with nothing queued goes back to listening", async () => {
  const t = await started();
  t.call.pause({ keep: true });
  t.call.resume();
  assert.equal(t.states().pop(), "listening");
});

test("resume({ fresh: true }) throws away what was queued before playing on", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.pause({ keep: true });
  t.call.resume({ fresh: true });
  assert.deepEqual([t.audio.flushes, t.states().pop()], [1, "listening"]);
});

test("the plain pause still empties the speaker and drops the model's audio", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.call.pause();
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  assert.deepEqual([t.audio.flushes, t.audio.pauses, t.audio.played, ofType(t, "spoken").length], [1, 0, [[1]], 0]);
});

test("a call that survives a network loss reports lost and pauses instead of ending", async () => {
  const t = await started({ survive: true });
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  t.audio.frame(Int16Array.of(1));
  assert.deepEqual([ofType(t, "lost").length, ofType(t, "ended").length, t.audio.stopped, t.states().pop(), t.live.sent], [1, 0, false, "paused", []]);
});

test("a call that survives still ends for a refused key", async () => {
  const t = await started({ survive: true });
  t.live.emit({ type: "closed", reason: "auth", code: 1008, detail: "" });
  assert.deepEqual(ofType(t, "ended"), [{ type: "ended", reason: "auth" }]);
});

test("resume after a loss opens a new session and reports reopened", async () => {
  const t = await started({ survive: true });
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  const ok = await t.call.resume();
  t.audio.frame(Int16Array.of(4));
  assert.deepEqual([ok, t.live.opens, ofType(t, "reopened").length, t.states().pop(), t.live.sent], [true, 2, 1, "listening", [{ audio: [4] }]]);
});

test("resume after a loss with the network still down reports lost again and stays paused", async () => {
  const t = await started({ survive: true });
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  t.live.failOpenOnce = "network";
  const ok = await t.call.resume();
  assert.deepEqual([ok, ofType(t, "lost").length, t.states().pop()], [false, 2, "paused"]);
});

test("a call that does not survive ends on a network loss, as before", async () => {
  const t = await started();
  t.live.emit({ type: "closed", reason: "network", code: 1006, detail: "" });
  assert.deepEqual(ofType(t, "ended"), [{ type: "ended", reason: "network" }]);
});

test("spoken is not reported when speech that is already fully received is cut short while still playing", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.call.cut();
  assert.equal(ofType(t, "spoken").length, 0);
});

test("talk(true) over fully received speech does not report spoken either", async () => {
  const t = await started({ gate: false });
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.call.talk(true);
  assert.equal(ofType(t, "spoken").length, 0);
});

// ---- din code-review: restul unei ture se aruncă doar dacă tura mai e deschisă; eliberarea lui Vorbește contează și pe pauză ----

test("talk(true) after the model's turn is complete does not drop the answer to the question", async () => {
  const t = await started({ gate: false });
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.call.talk(true);
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  assert.deepEqual(t.audio.played, [[1], [2]]);
});

test("interrupt(text) after the model's turn is complete does not drop the model's next turn", async () => {
  const t = await started();
  t.live.emit({ type: "audio", pcm: Int16Array.of(1) });
  t.live.emit({ type: "turnComplete" });
  t.call.interrupt("Repetă bucata.");
  t.live.emit({ type: "audio", pcm: Int16Array.of(2) });
  assert.deepEqual(t.audio.played, [[1], [2]]);
});

test("releasing talk while paused still closes the microphone gate", async () => {
  const t = await started({ gate: false });
  t.call.talk(true);
  t.call.pause({ keep: true });
  t.call.talk(false);
  t.call.resume();
  t.audio.frame(Int16Array.of(8));
  assert.deepEqual(t.live.sent.filter(x => x.audio), []);
});
