// Înlocuitori falși pentru Live și Audio, în pagină (tools/test_jarvis.py). Se încarcă înainte de aplicație.
// `window.__jarvisFakes.ctl` e telecomanda testului: emit(e) = ce trimite serverul, level/frame = microfonul, drain() = sfârșitul redării,
// tool(nume, args) = ce ar apela modelul, advance(ms) = ceasul fals al lui Jarvis (rulează și temporizatoarele programate cu `after`),
// speak() = modelul își termină tura, beeps / pauses / resumes = ce a cerut Jarvis de la audio.
(() => {
  const ctl = { live: { cfg: null, sent: [], closed: false, failOpen: null }, audio: { started: false, stopped: false, flushes: 0, played: 0, failStart: null, beeps: [], pauses: 0, resumes: 0 }, clock: { t: Date.now() } };
  const timers = [];
  let onEvent = () => {}, audioOpts = null, playing = false;
  const fail = reason => { const e = new Error(reason); e.reason = reason; return e; };
  const live = {
    open: async (cfg, cb) => {
      ctl.live.cfg = cfg; ctl.live.closed = false;
      if (ctl.live.failOpen) throw fail(ctl.live.failOpen);
      onEvent = e => { if (!ctl.live.closed) cb(e); };
      return {
        audio: pcm => { ctl.live.sent.push({ audio: pcm.length }); return true; },
        text: text => { ctl.live.sent.push({ text }); return true; },
        audioEnd: () => { ctl.live.sent.push({ audioEnd: true }); return true; },
        close: () => { if (ctl.live.closed) return; onEvent({ type: "closed", reason: "user", code: 1000, detail: "" }); ctl.live.closed = true; }
      };
    }
  };
  const audio = {
    start: async o => { if (ctl.audio.failStart) throw fail(ctl.audio.failStart); audioOpts = o; ctl.audio.started = true; return { label: "Microfon de test" }; },
    stop: async () => { ctl.audio.stopped = true; },
    play: () => { ctl.audio.played++; if (!playing) { playing = true; audioOpts.onPlaying(true); } },
    flush: () => { ctl.audio.flushes++; if (playing) { playing = false; audioOpts.onPlaying(false); } },
    mics: async () => [{ id: "m1", label: "Microfon de test" }, { id: "m2", label: "Căști" }],
    beep: kind => { ctl.audio.beeps.push(kind); },
    pause: () => { ctl.audio.pauses++; },
    resume: () => { ctl.audio.resumes++; }
  };
  ctl.emit = e => onEvent(e);
  ctl.frame = n => audioOpts.onFrame(new Int16Array(n || 4));
  ctl.level = v => audioOpts.onLevel(v);
  ctl.drain = () => { if (playing) { playing = false; audioOpts.onPlaying(false); } };
  ctl.tool = (name, args) => ctl.live.cfg.tools.find(t => t.name === name).run(args || {});
  ctl.advance = ms => {
    const end = ctl.clock.t + ms;
    for (;;) {
      const due = timers.filter(x => x.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers.splice(timers.indexOf(due), 1);
      ctl.clock.t = Math.max(ctl.clock.t, due.at);
      due.fn();
    }
    ctl.clock.t = end;
  };
  ctl.speak = () => { onEvent({ type: "audio", pcm: new Int16Array([1]) }); onEvent({ type: "turnComplete" }); ctl.drain(); };
  const clock = { now: () => ctl.clock.t, after: (ms, fn) => { const tm = { at: ctl.clock.t + ms, fn }; timers.push(tm); return () => { const i = timers.indexOf(tm); if (i >= 0) timers.splice(i, 1); }; } };
  window.__jarvisFakes = { live, audio, clock, ctl };
})();
