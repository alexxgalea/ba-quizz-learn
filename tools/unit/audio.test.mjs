import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fakeAudioContext, settle } from "./fakes.mjs";

const { Pcm } = createRequire(import.meta.url)("../../src/audio.js");

// Un microfon la `rate` Hz; `frames` strânge cadrele, `levels` nivelurile.
function mic(rate) {
  const frames = [], levels = [];
  const m = Pcm.micFramer(rate, { onFrame: f => frames.push(Array.from(f)), onLevel: l => levels.push(l) });
  return { frames, levels, push: block => m.push(block) };
}
const block = (n, v) => new Float32Array(n).fill(v);

test("48 kHz input comes out as 40 ms frames of 640 samples at 16 kHz", () => {
  const m = mic(48000);
  m.push(block(960, 0));
  const early = m.frames.length;
  m.push(block(960, 0));
  assert.deepEqual([early, m.frames.length, m.frames[0].length], [0, 1, 640]);
});

test("samples are scaled to 16 bits and clipped", () => {
  const m = mic(48000);
  for (const v of [0.5, -0.5, 1.5, -2]) m.push(block(1920, v));
  assert.deepEqual(m.frames.map(f => f[0]), [16383, -16384, 32767, -32768]);
});

test("one second of 44.1 kHz input in small blocks gives exactly 25 frames", () => {
  const m = mic(44100);
  for (let i = 0; i < 344; i++) m.push(block(128, 0.25));
  m.push(block(44100 - 344 * 128, 0.25));
  assert.equal(m.frames.length, 25);
});

test("the way the input is cut into blocks does not change the frames", () => {
  const signal = Float32Array.from({ length: 44100 }, (_, i) => Math.sin(i / 7) * 0.8);
  const whole = mic(44100), cut = mic(44100);
  whole.push(signal);
  for (let at = 0, size = 97; at < signal.length; at += size, size = (size * 31 % 400) + 1) cut.push(signal.subarray(at, at + size));
  assert.deepEqual(cut.frames, whole.frames);
});

test("each frame reports its level as RMS between 0 and 1", () => {
  const m = mic(48000);
  m.push(block(1920, 0));
  m.push(block(1920, 0.5));
  m.push(block(1920, -0.5));
  assert.deepEqual(m.levels.map(l => Math.round(l * 100) / 100), [0, 0.5, 0.5]);
});

// Un player peste un context fals; `states` strânge valorile lui onPlaying.
function speaker() {
  const ctx = fakeAudioContext(), states = [];
  const p = Pcm.player(ctx, { onPlaying: v => states.push(v) });
  return { ctx, states, play: n => p.play(new Int16Array(n)), playPcm: pcm => p.play(pcm), flush: () => p.flush() };
}

test("chunks are scheduled back to back", () => {
  const sp = speaker();
  sp.ctx.currentTime = 1;
  sp.play(2400);
  sp.play(2400);
  assert.deepEqual(sp.ctx.sources.map(s => s.startedAt), [1, 1.1]);
});

test("a chunk that arrives after the queue has run dry starts now", () => {
  const sp = speaker();
  sp.play(2400);
  sp.ctx.currentTime = 5;
  sp.play(2400);
  assert.deepEqual(sp.ctx.sources.map(s => s.startedAt), [0, 5]);
});

test("samples reach the buffer as floats", () => {
  const sp = speaker();
  sp.playPcm(Int16Array.of(16384, -16384, 0));
  assert.deepEqual(Array.from(sp.ctx.sources[0].buffer.data), [0.5, -0.5, 0]);
});

test("it reports playing at the first chunk and not playing when the last one has ended", () => {
  const sp = speaker();
  sp.play(2400);
  sp.play(2400);
  sp.ctx.sources[0].end();
  const midway = sp.states.slice();
  sp.ctx.sources[1].end();
  assert.deepEqual([midway, sp.states], [[true], [true, false]]);
});

test("flush stops everything, reports not playing once, and later chunks start fresh", async () => {
  const sp = speaker();
  sp.play(2400);
  sp.play(2400);
  sp.flush();
  await settle();
  sp.play(2400);
  assert.deepEqual([sp.ctx.sources.slice(0, 2).map(s => s.stopped), sp.states, sp.ctx.sources[2].startedAt], [[true, true], [true, false, true], 0]);
});
