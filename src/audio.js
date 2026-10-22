// Audio: microfon și difuzor în browser (spec §4.2). Partea pură (`Pcm`) se testează în Node; `BrowserAudio` e lipiciul cu API-urile browserului.
// Fără importuri. În pagină sunt declarații globale, în Node un modul.
const Pcm = (() => {
  const OUT_RATE = 16000, FRAME = 640;               // 40 ms la 16 kHz

  const toInt16 = v => { v = Math.max(-1, Math.min(1, v)); return v < 0 ? v * 0x8000 : v * 0x7fff; };

  // Microfon: blocuri Float32 la rata dispozitivului → cadre Int16 de 40 ms la 16 kHz.
  // Fiecare eșantion de ieșire e media eșantioanelor de intrare din fereastra lui; ferestrele merg în continuare de la un bloc la altul.
  function micFramer(inRate, handlers) {
    const frame = new Int16Array(FRAME);
    let fill = 0, produced = 0, consumed = 0, acc = 0, n = 0;
    return { push(f32) {
      for (let i = 0; i < f32.length; i++) {
        acc += f32[i]; n++; consumed++;
        if (consumed >= Math.floor(((produced + 1) * inRate) / OUT_RATE)) {
          frame[fill++] = toInt16(acc / n);
          acc = 0; n = 0; produced++;
          if (fill === FRAME) {
            let sq = 0;
            for (let j = 0; j < FRAME; j++) sq += frame[j] * frame[j];
            handlers.onFrame(frame.slice());
            if (handlers.onLevel) handlers.onLevel(Math.sqrt(sq / FRAME) / 32768);
            fill = 0;
          }
        }
      }
    } };
  }

  // Redare: fragmente Int16 la 24 kHz, programate unul după altul pe un context Web Audio.
  // `onPlaying(true)` la primul fragment după tăcere, `onPlaying(false)` când s-a terminat și ultimul sau după `flush`.
  function player(ctx, handlers) {
    let next = 0;
    const active = new Set();
    return {
      play(pcm) {
        const f32 = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
        const buf = ctx.createBuffer(1, f32.length, 24000);
        buf.copyToChannel(f32, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination);
        next = Math.max(next, ctx.currentTime);
        src.start(next); next += buf.duration;
        if (!active.size) handlers.onPlaying(true);
        active.add(src);
        src.onended = () => { if (active.delete(src) && !active.size) handlers.onPlaying(false); };
      },
      // Oprește imediat tot ce e programat. `stop()` declanșează și el `ended`, de aceea handlerele se scot întâi.
      flush() {
        const was = Array.from(active);
        active.clear(); next = 0;
        for (const src of was) { src.onended = null; try { src.stop(); } catch (e) { /* oprit deja */ } }
        if (was.length) handlers.onPlaying(false);
      }
    };
  }

  return { micFramer, player };
})();

// Microfonul rulează într-un AudioWorklet (încărcat din Blob) care trimite blocuri de ~1024 de eșantioane.
const MIC_WORKLET = "class P extends AudioWorkletProcessor {" +
  " constructor() { super(); this.buf = new Float32Array(1024); this.n = 0; }" +
  " process(inputs) { const c = inputs[0] && inputs[0][0]; if (!c) return true;" +
  "  for (let i = 0; i < c.length; i++) { this.buf[this.n++] = c[i]; if (this.n === 1024) { this.port.postMessage(this.buf.slice(0)); this.n = 0; } }" +
  "  return true; } }" +
  " registerProcessor('jarvis-mic', P);";

// BrowserAudio.create(env?) → dispozitivul audio (spec §4.2). `env` poate înlocui navigator și AudioContext.
const BrowserAudio = {
  create(env) {
    env = env || {};
    const nav = env.navigator || (typeof navigator !== "undefined" ? navigator : null);
    const AC = env.AudioContext || (typeof AudioContext !== "undefined" ? AudioContext : null);
    const doc = typeof document !== "undefined" ? document : null;
    const fail = reason => Object.assign(new Error(reason), { reason });
    let ctx = null, stream = null, node = null, source = null, speaker = null, wake = null, onVisible = null;

    async function keepAwake() { try { wake = await nav.wakeLock.request("screen"); } catch (e) { wake = null; } }

    async function start(opts) {
      if (!AC || !nav || !nav.mediaDevices) throw fail("failed");
      ctx = new AC();
      try {
        await ctx.resume();
        stream = await nav.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, deviceId: opts.micId ? { exact: opts.micId } : undefined } });
      } catch (e) {
        await stop();
        throw fail(e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : e && (e.name === "NotFoundError" || e.name === "OverconstrainedError") ? "no-mic" : "failed");
      }
      try {
        await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([MIC_WORKLET], { type: "text/javascript" })));
        const framer = Pcm.micFramer(ctx.sampleRate, { onFrame: opts.onFrame, onLevel: opts.onLevel });
        node = new AudioWorkletNode(ctx, "jarvis-mic", { numberOfOutputs: 0 });
        node.port.onmessage = ev => framer.push(ev.data);
        source = ctx.createMediaStreamSource(stream);
        source.connect(node);
        speaker = Pcm.player(ctx, { onPlaying: opts.onPlaying });
      } catch (e) { await stop(); throw fail("failed"); }
      await keepAwake();
      if (doc) { onVisible = () => { if (doc.visibilityState === "visible" && !wake) keepAwake(); }; doc.addEventListener("visibilitychange", onVisible); }
      const track = stream.getAudioTracks()[0];
      return { label: track ? track.label : "" };
    }

    async function stop() {
      if (onVisible && doc) { doc.removeEventListener("visibilitychange", onVisible); onVisible = null; }
      if (wake) { try { await wake.release(); } catch (e) { /* eliberat deja */ } wake = null; }
      if (node) { node.port.onmessage = null; node.disconnect(); node = null; }
      if (source) { source.disconnect(); source = null; }
      if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
      speaker = null;
      if (ctx) { const c = ctx; ctx = null; try { await c.close(); } catch (e) { /* închis deja */ } }
    }

    return {
      start, stop,
      play: pcm => { if (speaker) speaker.play(pcm); },
      flush: () => { if (speaker) speaker.flush(); },
      async mics() {
        const all = await nav.mediaDevices.enumerateDevices();
        return all.filter(d => d.kind === "audioinput").map(d => ({ id: d.deviceId, label: d.label }));
      }
    };
  }
};
if (typeof module !== "undefined" && module.exports) module.exports = { Pcm, BrowserAudio };
