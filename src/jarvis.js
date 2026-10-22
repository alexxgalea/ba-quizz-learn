// Jarvis: sesiunea vocală (spec §4.4): moduri, persona, funcțiile oferite modelului, scorul, rezumatul, setările.
// Fără importuri: Call, Live, Audio, PrepApp, stocarea și ceasul se primesc prin `create`. Nu atinge DOM-ul: ecranul citește `getState()`.
// În pagină e o declarație globală, în Node un modul.
const Jarvis = (() => {
  const KEY_ITEM = "onapsis-gemini-v1";

  // Mesajele pentru ecran, după motivul întors de Call (spec §8).
  const ERRORS = {
    auth: "Cheia Gemini nu e validă. Verifică-o în setări.",
    quota: "Limita gratuită a fost atinsă. Încearcă mai târziu.",
    network: "Conexiunea a căzut.",
    rejected: "Serverul a respins cererea.",
    denied: "Microfonul e blocat. Permite-l din setările browserului sau scrie în loc să vorbești.",
    "no-mic": "Nu găsesc niciun microfon.",
    failed: "Nu pot porni sunetul."
  };
  const errorOf = code => ({ code, message: ERRORS[code] || ERRORS.failed });
  const MAX_TRANSCRIPT = 8;
  const SETTINGS_ITEM = "onapsis-jarvis-v1";
  const SILENCE = { short: 800, normal: 1200, long: 2000 };          // „Răbdare”: cât tace Alex până consideră Jarvis că a terminat
  const DEFAULTS = { voice: "Charon", patience: "normal", halfDuplex: false, micId: "" };

  const NO_ARGS = { type: "OBJECT", properties: {} };
  const MODULE = { type: "STRING", description: "Modulul dorit (de exemplu gil, asyncio, oop, pytest, asgi, design)" };
  // Funcțiile oferite modelului (spec §4.4). `run` primește argumentele și întoarce un obiect.
  function makeTools(ctx) {
    return [
      { name: "next_card", description: "Dă următorul card de interviu: întrebarea de pus lui Alex, codul (dacă are), punctele cheie (doar pentru tine, nu le citi) și regulile cardului.",
        parameters: { type: "OBJECT", properties: { module: MODULE, difficulty: { type: "STRING", description: "mai usor sau mai greu, doar dacă Alex cere" } } }, run: async args => ctx.nextCard(args) },
      { name: "record_result", description: "Salvează evaluarea răspunsului lui Alex la cardul curent. points are câte o valoare pentru fiecare punct cheie, în ordine: spontan, dupa sau nu.",
        parameters: { type: "OBJECT", properties: { card_id: { type: "STRING" }, points: { type: "ARRAY", items: { type: "STRING" } }, wrong: { type: "ARRAY", items: { type: "STRING" } }, feedback: { type: "STRING" } }, required: ["card_id", "points"] }, run: async args => ctx.recordResult(args) },
      { name: "skip_card", description: "Treci la alt card, fără scor, când Alex cere asta.", parameters: NO_ARGS, run: async () => ctx.skipCard() },
      { name: "explain_missed", description: "Doar în antrenament: teoria pentru ce a ratat Alex la un card, ca să i-o explici.", parameters: { type: "OBJECT", properties: { card_id: { type: "STRING" } }, required: ["card_id"] }, run: async args => ctx.explainMissed(args) },
      { name: "progress_summary", description: "Cât de pregătit e Alex, golurile principale și zilele rămase.", parameters: NO_ARGS, run: async () => ctx.progressSummary() },
      { name: "pause_session", description: "Pune sesiunea în pauză, la cererea lui Alex.", parameters: NO_ARGS, run: async () => ctx.pause() },
      { name: "end_session", description: "Încheie sesiunea, când nu mai sunt carduri sau Alex cere să oprești. După ce o apelezi, spune-i rezumatul pe scurt.", parameters: NO_ARGS, run: async () => ctx.endSession() }
    ];
  }

  // Instrucțiunile de sistem ale sesiunii (funcție pură). Punctele cheie și regulile cardului NU intră aici: vin în răspunsul la next_card.
  function buildSystem(o) {
    const sum = o.summary || {}, mock = o.mode === "mock", topic = o.mode === "topic";
    const lines = [
      "Ești Jarvis, asistentul vocal al lui Alex, care se pregătește pentru un interviu tehnic" + (sum.role ? " de " + sum.role : "") + ". Vorbești doar în română; termenii tehnici (thread, worker, endpoint, commit) rămân în engleză. " + (sum.profile || ""),
      mock
        ? "În această sesiune conduci un interviu tehnic simulat: ton neutru și profesionist, fără glume, fără laude, fără feedback și fără explicații între carduri."
        : "Ton: politicos și sec, cu umor discret, ca Jarvis pentru Tony Stark. Îi spui „Alex”. Ești exigent pe conținut: nu accepți răspunsuri vagi și ceri concret („cum ai face asta în producție?”). Cel mult o remarcă scurtă între carduri.",
      "Vorbești ca într-o conversație: replici scurte, două-trei propoziții, fără liste și fără markdown. Pui o singură întrebare pe tură.",
      "",
      "Cum conduci sesiunea:",
      "1. Salută-l într-o propoziție, apoi apelează next_card" + (topic ? " cu module=" + o.module : "") + ".",
      "2. Pune întrebarea cu vorbele tale. Nu citi punctele cheie și nu le dezvălui nici înainte, nici după verdict. Dacă cardul are cod, spune-i să se uite la codul de pe ecran.",
      "3. Ascultă răspunsul. Dacă lipsesc puncte cheie, pune cel mult atâtea întrebări de continuare câte permite rules.max din card, pe rând, fără indicii care dau răspunsul. Respectă regulile din rules.turn.",
      "4. Apoi apelează record_result, cu câte o valoare pentru fiecare punct cheie, în ordine: „spontan” (l-a spus fără să fie întrebat), „dupa” (abia după o întrebare de continuare), „nu” (lipsește, e vag sau e greșit). În wrong pune ce a spus greșit tehnic. Dacă primești o eroare, corectează și reapelează.",
      mock
        ? "5. Nu spui scorul și nu comentezi răspunsul; treci la următorul card cu o tranziție scurtă („Bine, trecem mai departe.”)."
        : "5. Spune în una-două propoziții cum a fost și ce a lipsit (scorul e în răspunsul lui record_result). Dacă a ratat ceva important, oferă-i explicația și, dacă acceptă, apelează explain_missed.",
      "6. Apoi apelează next_card. Când next_card spune că nu mai sunt carduri, sau Alex cere să oprești, apelează end_session și încheie cu două-trei propoziții.",
      "",
      "Comenzi de la Alex: „treci mai departe” → skip_card; „cum stau?” → progress_summary; „pauză” → pause_session; „oprește” sau „gata” → end_session" +
        (mock ? "." : "; „altă temă” → next_card cu module; „mai greu” sau „mai ușor” → next_card cu difficulty; „explică ce am ratat” → explain_missed."),
      "Alex te poate întrerupe: dacă se întâmplă, taci și ascultă. Nu inventa fapte; dacă nu ești sigur, spune-o."
    ];
    return lines.join("\n");
  }

  function create(env) {
    const storage = env.storage, callApi = env.call || (typeof Call !== "undefined" ? Call : null);
    const FRESH = { error: null, card: null, results: [], transcript: [], level: 0, warn: null, endedReason: null };
    let state = Object.assign({ phase: "idle", needKey: false }, FRESH);
    const change = patch => { state = Object.assign({}, state, patch); if (env.onChange) env.onChange(); };

    // Setările: cheia într-un item separat, restul într-un JSON. Nimic din ele nu intră în starea aplicației.
    const settings = {
      get() {
        let rest = {};
        try { rest = JSON.parse(storage.getItem(SETTINGS_ITEM) || "{}"); } catch (e) { /* JSON stricat: se iau valorile implicite */ }
        return Object.assign({}, DEFAULTS, rest, { key: storage.getItem(KEY_ITEM) || "" });
      },
      set(patch) {
        const cur = settings.get(), next = Object.assign({}, cur, patch);
        const key = String(next.key || "").trim();
        if (key) storage.setItem(KEY_ITEM, key); else storage.removeItem(KEY_ITEM);
        const rest = Object.assign({}, next); delete rest.key;
        storage.setItem(SETTINGS_ITEM, JSON.stringify(rest));
      }
    };

    // Sesiunea curentă: modul, cardurile terminate și cardul în desfășurare (cu punctele cheie, care nu ies din acest modul).
    let sess = null;
    const ctx = {
      async nextCard(args) {
        const mock = sess.mode === "mock";
        const card = env.app.next({ mode: sess.mode, module: mock ? undefined : (args.module || sess.module), done: sess.done.slice(), difficulty: args.difficulty });
        if (!card) { sess.card = null; change({ card: null }); return { done: true, message: "Nu mai sunt carduri pentru această sesiune." }; }
        sess.card = card; sess.failures = 0;
        change({ card: { id: card.id, module: card.module, q: card.q, code: card.code, index: sess.done.length + 1 } });
        return { card_id: card.id, question: card.q, code: card.code, key_points: card.points, model_answer: card.model, rules: card.rules, missed_last_time: card.missed };
      },
      // Verdictul trece prin aplicație (scor, Leitner, goluri). La prima greșeală de format modelul primește eroarea;
      // la a doua cardul se lasă neînregistrat și modelul e trimis mai departe.
      async recordResult(args) {
        const card = sess.card;
        if (!card || args.card_id !== card.id) return { ok: false, error: "card_id nu e cardul curent" + (card ? ": " + card.id : "") };
        const r = env.app.record(card.id, { points: args.points, wrong: args.wrong, feedback: args.feedback });
        if (!r.ok) {
          sess.failures++;
          if (sess.failures < 2) return { ok: false, error: r.error };
          sess.done.push(card.id); sess.card = null; sess.failures = 0; change({ card: null });
          return { ok: false, error: r.error, give_up: true, message: "Cardul rămâne neînregistrat; treci la următorul." };
        }
        sess.failures = 0; sess.done.push(card.id); sess.card = null;
        change({ card: null, results: (state.results || []).concat({ id: card.id, score: r.score }) });
        return sess.mode === "mock" ? { ok: true } : r;
      },
      async explainMissed(args) {
        if (sess.mode === "mock") return { error: "În interviul simulat nu se explică nimic până la final." };
        return { text: env.app.theory(args.card_id) };
      },
      async progressSummary() { const x = env.app.summary(); return { readiness: x.readiness, daysLeft: x.daysLeft, gaps: x.gaps }; },
      // Sesiunea se încheie după ce modelul își ia rămas bun: următoarea revenire în `listening`.
      async endSession() {
        sess.endRequested = true;
        const results = state.results || [];
        return { results, average: results.length ? results.reduce((a, r) => a + r.score, 0) / results.length : 0 };
      },
      async pause() { sess.call.pause(); return { ok: true }; },
      async skipCard() {
        if (sess.card) sess.done.push(sess.card.id);
        sess.card = null; sess.failures = 0; change({ card: null });
        return { ok: true };
      }
    };

    // Un singur sfârșit: rândul din istoric (doar dacă s-a făcut vreun card) și motivul pentru ecran.
    const TITLE = { train: "antrenament", mock: "interviu tehnic simulat", topic: "pe o temă" };
    function finish(reason) {
      if (!sess || sess.finished) return;
      sess.finished = true;
      const results = state.results || [];
      if (results.length) env.app.log({ title: "Jarvis · " + TITLE[sess.mode], n: results.length, c: Math.round(results.reduce((a, r) => a + r.score, 0) * 100) / 100, dur: Math.round((env.clock.now() - sess.t0) / 1000) });
      change({ phase: "ended", endedReason: reason, error: reason === "user" ? null : errorOf(reason) });
    }
    async function stop() { if (sess && sess.call) await sess.call.end(); }

    async function start(opts) {
      const st = settings.get();
      if (!st.key) { change({ needKey: true, phase: "idle" }); return false; }
      sess = { mode: opts.mode, module: opts.module, done: [], card: null, failures: 0, t0: env.clock.now(), finished: false, endRequested: false };
      change(Object.assign({ needKey: false, phase: "connecting" }, FRESH));
      const summary = env.app.summary();
      const config = { key: st.key, model: "gemini-3.8-live", voice: st.voice, silenceMs: SILENCE[st.patience] || SILENCE.normal, system: buildSystem({ mode: opts.mode, module: opts.module, summary }), tools: makeTools(ctx) };
      const onEvent = e => {
        if (e.type === "state") {
          change({ phase: e.state });
          if (e.state === "listening" && sess.endRequested) call.end();
        } else if (e.type === "transcript") {
          const list = state.transcript.slice(), i = list.findIndex(u => u.id === e.id);
          if (i >= 0) list[i] = { id: e.id, who: e.who, text: e.text }; else list.push({ id: e.id, who: e.who, text: e.text });
          change({ transcript: list.slice(-MAX_TRANSCRIPT) });
        } else if (e.type === "level") change({ level: e.v });
        else if (e.type === "warn") change({ warn: e.code });
        else if (e.type === "ended") finish(e.reason);
      };
      let call = null;
      try { call = await callApi.start({ live: env.live, audio: env.audio, config, micId: st.micId, halfDuplex: st.halfDuplex, clock: env.clock, onEvent }); }
      catch (err) { change({ phase: "idle", error: errorOf(err && err.reason) }); return false; }
      sess.call = call;
      call.say("Începem sesiunea. Mai sunt " + summary.daysLeft + " zile până la interviu.");
      return true;
    }
    // Verifică dacă serverul acceptă cheia: deschide o sesiune goală și o închide.
    async function checkKey() {
      const st = settings.get();
      try {
        const session = await env.live.open({ key: st.key, model: "gemini-3.8-live", voice: st.voice, silenceMs: SILENCE.normal, system: "test", tools: [] }, () => {});
        session.close();
        return { ok: true };
      } catch (err) { return { ok: false, reason: (err && err.reason) || "failed" }; }
    }
    return {
      start, stop, settings, checkKey,
      interrupt() { if (sess && sess.call) sess.call.interrupt(); },
      say(text) { if (sess && sess.call) sess.call.say(text); },
      pause() { if (sess && sess.call) sess.call.pause(); },
      resume() { if (sess && sess.call) sess.call.resume(); },
      mics: () => env.audio.mics(),
      getState: () => Object.assign({}, state)
    };
  }

  return { create, buildSystem };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Jarvis;
