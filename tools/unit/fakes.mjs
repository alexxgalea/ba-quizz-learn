// Înlocuitori falși pentru testele de unitate (Node). Fiecare stă la o cusătură: socketul lui GeminiLive, Live, Audio.

// Un „WebSocket” fals. `net.sockets` păstrează conexiunile deschise, în ordine; `sent` păstrează mesajele JSON trimise de client.
export function fakeNetwork() {
  // `plan`: ce face fiecare socket nou, pe rând: { close: [cod, motiv] } îl închide imediat, altfel se deschide.
  const net = { sockets: [], holdOpen: false, plan: [] };
  net.Socket = class FakeSocket {
    constructor(url) {
      this.url = url; this.readyState = 0; this.sent = [];
      net.sockets.push(this);
      const step = net.plan.shift();
      queueMicrotask(() => {
        if (step && step.close) this.serverClose(step.close[0], step.close[1] || "");
        else if (this.readyState === 0 && !net.holdOpen) this.open();
      });
    }
    open() { this.readyState = 1; if (this.onopen) this.onopen({}); }
    send(data) { this.sent.push(JSON.parse(data)); }
    close(code = 1000, reason = "") {
      if (this.readyState === 3) return;
      this.readyState = 3;
      queueMicrotask(() => { if (this.onclose) this.onclose({ code, reason }); });
    }
    // Ce face serverul:
    serverSend(obj, as = "string") { const t = JSON.stringify(obj); if (this.onmessage) this.onmessage({ data: as === "blob" ? new Blob([t]) : t }); }
    serverClose(code, reason = "") { this.readyState = 3; if (this.onclose) this.onclose({ code, reason }); }
  };
  return net;
}

// Lasă să ruleze toate microtask-urile și timerele deja programate.
export const tick = () => new Promise(r => setTimeout(r, 0));

// Câteva tick-uri la rând: pentru lanțuri de promisiuni și decodări de Blob.
export async function settle(n = 4) { for (let i = 0; i < n; i++) await tick(); }

// Un AudioContext fals, cât să programeze redarea: `sources` păstrează sursele create, în ordine.
export function fakeAudioContext() {
  const ctx = { currentTime: 0, destination: {}, sources: [], suspended: false, suspends: 0 };
  ctx.suspend = async () => { ctx.suspended = true; ctx.suspends++; };
  ctx.resume = async () => { ctx.suspended = false; };
  ctx.createBuffer = (channels, length, rate) => {
    const data = new Float32Array(length);
    return { duration: length / rate, data, copyToChannel(f32) { data.set(f32); } };
  };
  ctx.createBufferSource = () => {
    const s = {
      buffer: null, startedAt: null, stopped: false, onended: null,
      connect() {},
      start(t) { s.startedAt = t; },
      stop() { s.stopped = true; queueMicrotask(() => { if (s.onended) s.onended(); }); },     // ca în browser: `ended` vine și după stop()
      end() { if (s.onended) s.onended(); }                                                    // sfârșitul firesc, declanșat de test
    };
    ctx.sources.push(s);
    return s;
  };
  return ctx;
}

// Live fals: respectă contractul lui GeminiLive (open → sesiune; close() emite `closed`; după `closed` nu mai emite nimic).
// Pentru test: `emit(e)` e ce trimite serverul, `sent` e ce a trimis clientul, `failOpen = "auth"` face open să pice.
export function fakeLive() {
  const live = { cfg: null, sent: [], closed: false, failOpen: null, emit: () => {}, session: null, opens: 0 };
  live.open = async (cfg, onEvent) => {
    live.cfg = cfg; live.opens++;
    if (live.failOpenOnce) { const r = live.failOpenOnce; live.failOpenOnce = null; throw Object.assign(new Error(r), { reason: r, code: 0, detail: "" }); }
    live.closed = false;
    if (live.failOpen) throw Object.assign(new Error(live.failOpen), { reason: live.failOpen, code: 0, detail: "" });
    live.emit = e => { if (!live.closed) onEvent(e); };
    live.session = {
      audio: pcm => { if (live.closed) return false; live.sent.push({ audio: Array.from(pcm) }); return true; },
      text: text => { if (live.closed) return false; live.sent.push({ text }); return true; },
      audioEnd: () => { if (live.closed) return false; live.sent.push({ audioEnd: true }); return true; },
      close: () => { if (live.closed) return; live.emit({ type: "closed", reason: "user", code: 1000, detail: "" }); live.closed = true; }
    };
    return live.session;
  };
  return live;
}

// Audio fals: respectă contractul lui BrowserAudio. Pentru test: `frame(pcm)` și `level(v)` vin de la microfon, `drain()` e sfârșitul firesc al redării.
export function fakeAudio() {
  const a = { opts: null, started: false, stopped: false, stops: 0, played: [], flushes: 0, playing: false, failStart: null, beeps: [], paused: false, pauses: 0, resumes: 0 };
  const setPlaying = v => { if (a.playing !== v) { a.playing = v; a.opts.onPlaying(v); } };
  a.start = async opts => {
    if (a.failStart) throw Object.assign(new Error(a.failStart), { reason: a.failStart });
    a.opts = opts; a.started = true;
    return { label: "Microfon de test" };
  };
  a.stop = async () => { a.stopped = true; a.stops++; };
  a.play = pcm => { a.played.push(Array.from(pcm)); setPlaying(true); };
  a.flush = () => { a.flushes++; setPlaying(false); };
  a.mics = async () => [{ id: "m1", label: "Microfon de test" }];
  a.beep = kind => { a.beeps.push(kind); };
  a.pause = () => { a.paused = true; a.pauses++; };            // coada rămâne: `played` nu se golește
  a.resume = () => { a.paused = false; a.resumes++; };
  a.frame = pcm => a.opts.onFrame(pcm);
  a.level = v => a.opts.onLevel(v);
  a.drain = () => setPlaying(false);
  return a;
}

// Ceas fals: `now()` stă pe loc până la `advance(ms)`; `after(ms, fn)` programează fn, iar `advance` le declanșează în ordine. `after` întoarce anularea.
export function fakeClock(start = 1000) {
  const c = { t: start, timers: [], seq: 0, now: () => c.t };
  c.after = (ms, fn) => { const tm = { at: c.t + ms, fn, seq: c.seq++ }; c.timers.push(tm); return () => { c.timers = c.timers.filter(x => x !== tm); }; };
  c.advance = ms => {
    const end = c.t + ms;
    for (;;) {
      const due = c.timers.filter(x => x.at <= end).sort((a, b) => a.at - b.at || a.seq - b.seq)[0];
      if (!due) break;
      c.timers = c.timers.filter(x => x !== due);
      c.t = Math.max(c.t, due.at);
      due.fn();
    }
    c.t = end;
  };
  return c;
}

// Stocare falsă (ca localStorage): `data` e conținutul.
export function memoryStorage(initial = {}) {
  const data = Object.assign({}, initial);
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, removeItem: k => { delete data[k]; } };
}

// Un card ca îl dă PrepApp (spec §4.5). `points` are trei puncte cheie.
export const CARD_A = { id: "o-gil-1", module: "gil", q: "Ce folosești pentru CPU-bound și pentru I/O-bound?", code: "", points: ["GIL: un singur thread rulează bytecode", "I/O-bound: threads sau asyncio", "CPU-bound: procese"], model: "Pentru I/O-bound threads sau asyncio; pentru CPU-bound procese, din cauza GIL.", rules: { max: 2, turn: "", verdict: "" }, missed: [], best: "" };
export const CARD_B = { id: "o-asy-2", module: "asyncio", q: "Ce se întâmplă dacă blochezi event loop-ul?", code: "async def f():\n    time.sleep(5)", points: ["Event loop-ul nu rulează alte corutine", "Soluția: await asyncio.sleep sau executor"], model: "Blochează tot; folosești asyncio.sleep sau run_in_executor.", rules: { max: 2, turn: "snippet", verdict: "" }, missed: ["Soluția: await asyncio.sleep sau executor"], best: "" };

// Fișa unui modul, ca o dă PrepApp.sheet (spec Lecție): ideea principală, 4 puncte, 2 formulări de evitat.
export const SHEET = { lead: "Event loop-ul rulează corutine pe un singur thread.", points: ["Corutina cedează la await.", "create_task programează o corutină.", "gather colectează rezultate.", "TaskGroup anulează grupul la prima eroare."], avoid: ["„asyncio e multithreading.”", "„await blochează thread-ul.”"] };

// PrepApp în memorie: păstrează în `recorded` și `logged` ce primește.
export function stubApp(cards = [CARD_A, CARD_B]) {
  const app = { recorded: [], logged: [], nextCalls: [] };
  app.next = o => { app.nextCalls.push(o); return cards.find(c => !(o.done || []).includes(c.id) && (!o.module || c.module === o.module)) || null; };
  app.record = (id, v) => {
    const c = cards.find(x => x.id === id);
    if (!c || !Array.isArray(v.points) || v.points.length !== c.points.length || !v.points.every(p => ["spontan", "dupa", "nu"].includes(p))) return { ok: false, error: "puncte invalide" };
    app.recorded.push({ id, v });
    const score = v.points.reduce((s, p) => s + (p === "spontan" ? 1 : p === "dupa" ? 0.5 : 0), 0) / c.points.length;
    return { ok: true, score, prev: null, box: 2, missed: c.points.filter((_, i) => v.points[i] === "nu") };
  };
  app.theory = id => "Teorie pentru " + id;
  app.summary = () => ({ readiness: 0.42, daysLeft: 4, gaps: ["GIL: costul proceselor"], role: "Software Engineer – Python", profile: "Profilul candidatului: Django, Celery." });
  app.log = entry => { app.logged.push(entry); };
  // Lecția: poziția pe modul (`pos`) și modulele terminate (`doneLessons`).
  app.pos = {}; app.doneLessons = [];
  app.sheet = id => id === "asyncio" ? { module: "asyncio", name: "asyncio", lead: SHEET.lead, points: SHEET.points.slice(), avoid: SHEET.avoid.slice(), total: SHEET.points.length, pos: app.pos.asyncio || 0 } : id === "gil" ? { module: "gil", name: "GIL & threads", lead: "GIL-ul limitează paralelismul.", points: ["Un singur thread rulează bytecode.", "Procesele ocolesc GIL."], avoid: [], total: 2, pos: app.pos.gil || 0 } : null;
  app.lessonHeard = (id, n) => { app.pos[id] = Math.max(app.pos[id] || 0, n); };
  app.lessonDone = id => { app.pos[id] = 0; app.doneLessons.push(id); };
  return app;
}
