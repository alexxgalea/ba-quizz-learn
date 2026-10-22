// Înlocuitori falși pentru Live și Audio, în pagină (tools/test_jarvis.py). Se încarcă înainte de aplicație.
// `window.__jarvisFakes.ctl` e telecomanda testului: emit(e) = ce trimite serverul, level/frame = microfonul, drain() = sfârșitul redării,
// tool(nume, args) = ce ar apela modelul, advance(ms) = ceasul fals al lui Jarvis.
(() => {
  const ctl = { live: { cfg: null, sent: [], closed: false, failOpen: null }, audio: { started: false, stopped: false, flushes: 0, played: 0, failStart: null }, clock: { t: Date.now() } };
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
        close: () => { if (ctl.live.closed) return; onEvent({ type: "closed", reason: "user", code: 1000, detail: "" }); ctl.live.closed = true; }
      };
    }
  };
  const audio = {
    start: async o => { if (ctl.audio.failStart) throw fail(ctl.audio.failStart); audioOpts = o; ctl.audio.started = true; return { label: "Microfon de test" }; },
    stop: async () => { ctl.audio.stopped = true; },
    play: () => { ctl.audio.played++; if (!playing) { playing = true; audioOpts.onPlaying(true); } },
    flush: () => { ctl.audio.flushes++; if (playing) { playing = false; audioOpts.onPlaying(false); } },
    mics: async () => [{ id: "m1", label: "Microfon de test" }, { id: "m2", label: "Căști" }]
  };
  ctl.emit = e => onEvent(e);
  ctl.frame = n => audioOpts.onFrame(new Int16Array(n || 4));
  ctl.level = v => audioOpts.onLevel(v);
  ctl.drain = () => { if (playing) { playing = false; audioOpts.onPlaying(false); } };
  ctl.tool = (name, args) => ctl.live.cfg.tools.find(t => t.name === name).run(args || {});
  ctl.advance = ms => { ctl.clock.t += ms; };
  window.__jarvisFakes = { live, audio, clock: { now: () => ctl.clock.t }, ctl };
})();
