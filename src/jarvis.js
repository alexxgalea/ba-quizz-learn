// Jarvis: sesiunea vocală (spec §4.4): moduri, persona, funcțiile oferite modelului, scorul, rezumatul, setările.
// Modul „lesson” (spec .scratch/lectie-live): Jarvis explică fișa unui modul bucată cu bucată; aplicația ține ritmul (fereastra de ascultare, Mut, Pauză).
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
    failed: "Nu pot porni sunetul.",
    nosheet: "Nu găsesc fișa acestui modul."
  };
  const errorOf = code => ({ code, message: ERRORS[code] || ERRORS.failed });
  const MAX_TRANSCRIPT = 8;
  const SETTINGS_ITEM = "onapsis-jarvis-v1";
  const SILENCE = { short: 800, normal: 1200, long: 2000 };          // „Răbdare”: cât tace Alex până consideră Jarvis că a terminat
  const DEFAULTS = { voice: "Charon", patience: "normal", halfDuplex: false, micId: "", muted: false };
  // Lecția: cât durează fereastra de ascultare, cât așteaptă o întrebare fără răspuns, cât rămâne valabilă o pauză (după ea bucata se reia de la început)
  // și pauzele dintre încercările de reconectare (în total ~60 s; celelalte moduri păstrează cele trei încercări din GeminiLive).
  const WINDOW_MS = 3000, ASK_WAIT_MS = 12000, PAUSE_KEEP_MS = 10 * 60000;
  const RETRY_LESSON = [500, 1000, 2000, 3000, 4000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000];
  // Ce îi spune aplicația modelului ca să ducă lecția mai departe.
  const MSG = {
    next: "Continuă lecția: apelează next_chunk pentru bucata următoare.",
    repeat: "Repetă bucata curentă de la început: apelează repeat_chunk.",
    skip: "Alex a cerut să sari peste bucata asta: apelează next_chunk pentru bucata următoare.",
    again: "Alex a cerut să repeți: apelează repeat_chunk și explică bucata de la început.",
    restart: "Alex a cerut să reiei lecția de la început: apelează next_chunk pentru prima bucată și începe din nou cu ideea principală.",
    back: "Conexiunea a revenit. Spune «Reiau de unde am rămas», apoi "
  };

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


  // Funcțiile lecției (spec Lecție): bucata următoare, repetă, pauză, încheiere. „Mai simplu” și „exemplu” se tratează fără funcție.
  function makeLessonTools(ctx) {
    return [
      { name: "next_chunk", description: "Dă bucata următoare a lecției: textul punctului din fișă, numărul ei și totalul (la prima bucată și ideea principală, la final capcanele). Apeleaz-o doar când aplicația sau Alex cer bucata următoare.", parameters: NO_ARGS, run: async () => ctx.nextChunk() },
      { name: "repeat_chunk", description: "Dă din nou bucata curentă, ca s-o explici de la început, când aplicația sau Alex cer să repeți.", parameters: NO_ARGS, run: async () => ctx.repeatChunk() },
      { name: "pause_session", description: "Pune lecția pe pauză, la cererea lui Alex.", parameters: NO_ARGS, run: async () => ctx.pause() },
      { name: "end_session", description: "Încheie lecția, când Alex cere să oprești. După ce o apelezi, ia-ți rămas-bun în două propoziții.", parameters: NO_ARGS, run: async () => ctx.endSession() }
    ];
  }

  // Instrucțiunile lecției (funcție pură). Punctele fișei NU intră aici: le dă next_chunk, pe rând, ca ordinea și poziția să rămână ale aplicației.
  function buildLessonSystem(o) {
    const sum = o.summary || {};
    const lines = [
      "Ești Jarvis, asistentul vocal al lui Alex, care se pregătește pentru un interviu tehnic" + (sum.role ? " de " + sum.role : "") + ". Vorbești doar în română; termenii tehnici (thread, worker, endpoint, commit) rămân în engleză. " + (sum.profile || ""),
      "În această sesiune ții o lecție: îi explici cu voce tare fișa modulului „" + o.name + "”, bucată cu bucată. Nu ești intervievator și nu-l examinezi: nu pui întrebări de verificare și nu dai scor, doar explici.",
      "Ton: politicos și sec, cu umor discret, ca Jarvis pentru Tony Stark. Îi spui „Alex”. Vorbești ca într-o conversație, în propoziții scurte, ușor de urmărit pe ureche, fără liste și fără markdown.",
      "",
      "Cum conduci lecția:",
      "1. Primești bucățile prin funcția next_chunk, una câte una. Nu merge înainte singur: apelezi next_chunk doar când aplicația sau Alex cer bucata următoare.",
      "2. O bucată este un punct din fișă. Dezvoltă-l în 1–1,5 minute, cu vorbele tale și cu un exemplu legat de experiența lui Alex (Django/DRF, Celery, Keycloak, Docker Swarm, Elasticsearch, computer vision). Rămâi la ce ai primit: fără fapte noi, fără cifre sau nume de API care nu sunt în bucată.",
      "3. Dacă răspunsul are „intro”, începe cu ideea principală și numărul de idei, ca în „Asyncio, în 10 idei. Prima: …”, apoi explică prima bucată. Dacă are „recap”, începe cu o propoziție care amintește ultima bucată ascultată („Data trecută am ajuns la …”), apoi explică bucata primită.",
      "4. Nu anunța ce urmează și nu încheia bucata cu o întrebare: aplicația îi lasă lui Alex câteva secunde să intervină.",
      "5. Când next_chunk dă „closing”, spune formulările de evitat ca „capcane la interviu” (dacă există), apoi o recapitulare în trei propoziții, pe baza lui recap_from, și un rămas-bun scurt. După asta nu mai apelezi nicio funcție.",
      "",
      "Comenzi și întrebări de la Alex:",
      "- „repetă” → repeat_chunk. „sari”, „mai departe”, „următoarea” → next_chunk. „pauză” → pause_session. „gata”, „oprește” → end_session, apoi rămas-bun în două propoziții.",
      "- „mai simplu”: explică din nou aceeași bucată, mai simplu, fără funcții. „dă-mi un exemplu” sau „exemplu”: dă alt exemplu pentru aceeași bucată, fără funcții.",
      "- La o întrebare liberă răspunzi scurt, sub 30 de secunde. Poți folosi ce știi, dar spune „nu sunt sigur” când nu ești. Apoi revii la lecție cu o propoziție și te oprești: nu apela next_chunk, aplicația duce lecția mai departe.",
      o.muted
        ? "Alex ascultă fără fereastră de întrebări: nu-i spune că te poate opri prin voce."
        : "La începutul lecției, într-o propoziție, spune-i că te poate opri oricând: „pauză”, „repetă”, „mai simplu” sau o întrebare.",
      "Nu inventa fapte; dacă nu ești sigur, spune-o."
    ];
    return lines.join("\n");
  }

  function create(env) {
    const storage = env.storage, callApi = env.call || (typeof Call !== "undefined" ? Call : null);
    const FRESH = { error: null, card: null, results: [], transcript: [], level: 0, warn: null, endedReason: null, startedAt: 0, mode: null, module: null, lesson: null };
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
        if (sess.mode === "lesson") { quiet(); lz.endRequested = true; return { heard: lz.heard.size, total: lz.total }; }
        sess.endRequested = true;
        const results = state.results || [];
        return { results, average: results.length ? results.reduce((a, r) => a + r.score, 0) / results.length : 0 };
      },
      async pause() { if (sess.mode === "lesson") lessonPause(); else sess.call.pause(); return { ok: true }; },
      async nextChunk() { quiet(); return deliver(lz.idx + 1, false); },
      async repeatChunk() { quiet(); return deliver(lz.cur ? lz.cur.n : lz.idx + 1, true); },
      async skipCard() {
        if (sess.card) sess.done.push(sess.card.id);
        sess.card = null; sess.failures = 0; change({ card: null });
        return { ok: true };
      }
    };

    // ---------- lecția ----------
    // Aplicația ține ritmul: modelul primește bucățile prin next_chunk / repeat_chunk, iar aplicația hotărăște când se cere următoarea.
    // `lz.cur` = bucata dată modelului (n = 1..total, total + 1 = finalul cu capcanele); `delivering` rămâne adevărat până se redă toată.
    let lz = null;
    const sync = () => { if (lz) change({ lesson: lessonView() }); };
    function lessonView() {
      const c = lz.cur, closing = !!c && c.n > lz.total;
      const status = lz.lost ? "lost" : lz.paused ? "paused" : lz.window ? "window" : lz.asking || lz.talking ? "asking"
        : state.phase === "speaking" || state.phase === "thinking" || state.phase === "connecting" ? "explaining" : "idle";
      return { module: lz.module, name: lz.name, n: c ? Math.min(c.n, lz.total) : 0, total: lz.total, pos: lz.pos0, closing, text: c && !closing ? lz.sheet.points[c.n - 1] : "", traps: closing ? lz.sheet.avoid.slice() : [], heard: lz.heard.size, muted: lz.muted, talking: lz.talking, status };
    }
    function cancelTimers() { if (lz.winTimer) { lz.winTimer(); lz.winTimer = null; } if (lz.askTimer) { lz.askTimer(); lz.askTimer = null; } }
    // Închide fereastra (sau așteptarea unei întrebări) fără să mai ceară nimic.
    function quiet() {
      if (!lz) return;
      cancelTimers();
      if (lz.window || lz.asking) { lz.window = false; lz.asking = false; sess.call.mic(false); }
      sync();
    }
    // Cere bucata următoare, sau reia bucata întreruptă dacă a fost tăiată de o întrebare.
    function moveOn() {
      if (lz.redo) { lz.redo = false; sess.call.say(MSG.repeat); } else sess.call.say(MSG.next);
      sync();
    }
    function openWindow() {
      if (lz.paused || lz.lost) return;
      cancelTimers();
      lz.window = true; lz.asking = false;
      env.audio.beep("window");
      sess.call.mic(true);
      lz.winTimer = env.clock.after(WINDOW_MS, () => { lz.winTimer = null; lz.window = false; sess.call.mic(false); moveOn(); });
      sync();
    }
    function armAsk() {
      if (lz.askTimer) lz.askTimer();
      lz.askTimer = env.clock.after(ASK_WAIT_MS, () => {
        lz.askTimer = null;
        if (lz.talking) { armAsk(); return; }                // cât ține apăsat Vorbește, așteaptă
        if (lz.asking) { lz.asking = false; sess.call.mic(false); moveOn(); }
      });
    }
    const afterChunk = () => { if (lz.muted) moveOn(); else openWindow(); };
    // Ce urmează după ce modelul a terminat de vorbit: bucata s-a auzit toată sau a fost un răspuns la o întrebare.
    function onSpoken() {
      if (!lz || lz.paused || lz.lost) return;
      if (lz.endRequested) { sess.call.end(); return; }
      const c = lz.cur;
      if (c && c.delivering) {
        c.delivering = false;
        if (c.n <= lz.total) { lz.heard.add(c.n); env.app.lessonHeard(lz.module, c.n); }
        else { lz.closingHeard = true; env.app.lessonDone(lz.module); sess.call.end(); return; }
        afterChunk();
      } else if (lz.redo) { lz.redo = false; sess.call.say(MSG.repeat); sync(); }
      else afterChunk();
    }
    // Continuarea după o întrerupere: bucata neauzită se reia, una auzită trece la următoarea (sau își redeschide fereastra).
    function continueLesson(prefix, windowOk) {
      const c = lz.cur, cut = lz.redo || (c && c.delivering);      // `redo`: bucata a fost tăiată de o întrebare
      lz.redo = false;
      if (!c) sess.call.say(prefix + MSG.next);
      else if (cut) sess.call.say(prefix + MSG.repeat);
      else if (windowOk && !lz.muted) openWindow();
      else sess.call.say(prefix + MSG.next);
      sync();
    }
    // Bucata dată modelului. Prima dată vine cu ideea principală și numărul de bucăți (sau cu recapitularea, dacă lecția continuă dintr-o poziție).
    function deliver(n, again) {
      const sh = lz.sheet, total = lz.total, first = !lz.started;
      if (n > total + 1) return { done: true, message: "Lecția s-a terminat. Ia-ți rămas-bun." };
      lz.started = true; lz.idx = n; lz.cur = { n, delivering: true }; lz.redo = false;
      let r;
      if (n <= total) r = { kind: "chunk", n, total, module: lz.name, text: sh.points[n - 1], instruction: "Explică bucata cu vorbele tale, cu un exemplu din experiența lui Alex, în 1–1,5 minute. Fără fapte noi." };
      else {
        r = { kind: "closing", module: lz.name, lead: sh.lead, recap_from: [sh.lead].concat(sh.points), instruction: "Spune capcanele la interviu (dacă există), apoi o recapitulare în trei propoziții și un rămas-bun." };
        if (sh.avoid.length) r.traps = sh.avoid.slice();
      }
      if (first) {
        if (lz.pos0 === 0 && n === 1) r.intro = { module: lz.name, lead: sh.lead, total, say: lz.name + ", în " + total + " idei. Prima: …" };
        else if (lz.pos0 > 0) r.recap = { n: lz.pos0, text: sh.points[lz.pos0 - 1] };
      }
      if (again) r.repeat = true;
      sync();
      return r;
    }
    function lessonPause() {
      if (!lz || lz.paused || lz.lost) return;
      lz.wasBusy = state.phase === "speaking" || state.phase === "thinking";
      quiet();
      lz.paused = true; lz.pausedAt = env.clock.now();
      sess.call.pause({ keep: true });
      sync();
    }
    // Sub ~10 minute și cu conexiunea deschisă, redarea continuă din aceeași secundă; altfel (sau după o pierdere) bucata se reia de la început.
    async function lessonResume() {
      if (!lz || !lz.paused) return false;
      const gap = env.clock.now() - lz.pausedAt, wasLost = lz.lost, fresh = wasLost || lz.cutOff || gap > PAUSE_KEEP_MS;
      const ok = await sess.call.resume({ fresh });
      if (!ok) { sync(); return false; }
      lz.pausedMs += gap; lz.paused = false; lz.lost = false; lz.cutOff = false;
      if (wasLost) continueLesson(MSG.back, false);
      else if (fresh) continueLesson("", false);
      else if (!lz.wasBusy) continueLesson("", true);
      else sync();
      return true;
    }
    // Sari și Repetă: taie bucata în curs și cere modelului alta (sau aceeași, de la început). Bucata tăiată nu se numără ca auzită.
    function interruptWith(msg) {
      if (!lz || !sess.call || lz.paused || lz.lost) return;
      quiet(); lz.redo = false;
      if (lz.cur) lz.cur.delivering = false;
      sess.call.interrupt(msg); sync();
    }
    function lessonTalk(down) {
      if (!lz) return;
      if (!down) { lz.talking = false; sess.call.talk(false); if (!lz.paused && !lz.lost) armAsk(); sync(); return; }     // eliberarea contează oricând
      if (lz.paused || lz.lost) return;
      cancelTimers();
      lz.window = false; lz.asking = true; lz.talking = true;
      if (lz.cur && lz.cur.delivering) { lz.cur.delivering = false; lz.redo = true; }        // bucata tăiată de întrebare se reia după răspuns
      sess.call.talk(true);
      armAsk();
      sync();
    }
    // Evenimentele apelului care contează pentru lecție.
    function lessonEvent(e) {
      if (e.type === "spoken") onSpoken();
      else if (e.type === "voice") {
        if (lz.window) { cancelTimers(); lz.window = false; lz.asking = true; armAsk(); sync(); }
      } else if (e.type === "state") {
        if (e.state === "speaking" && lz.asking && !lz.talking) { lz.asking = false; if (lz.askTimer) { lz.askTimer(); lz.askTimer = null; } sess.call.mic(false); sync(); }
        else sync();
      } else if (e.type === "transcript") { if (lz.asking && e.who === "me") armAsk(); }
      else if (e.type === "warn") {
        if (e.code === "reconnecting") { lz.reconnecting = true; lz.cutOff = true; quiet(); sess.call.cut(); }
        else if (e.code == null && lz.reconnecting) { lz.reconnecting = false; if (!lz.paused) { lz.cutOff = false; continueLesson(MSG.back, false); } }
      } else if (e.type === "lost") {
        quiet();
        if (!lz.paused) { lz.paused = true; lz.pausedAt = env.clock.now(); }
        lz.lost = true; lz.reconnecting = false;
        env.audio.beep("warn");
        sync();
      }
    }

    // Un singur sfârșit: rândul din istoric (doar dacă s-a făcut vreun card) și motivul pentru ecran.
    const TITLE = { train: "antrenament", mock: "interviu tehnic simulat", topic: "pe o temă" };
    function finish(reason) {
      if (!sess || sess.finished) return;
      sess.finished = true;
      const results = state.results || [];
      if (lz) {
        cancelTimers();
        if (lz.heard.size || lz.closingHeard) env.app.log({ title: "Jarvis · Lecție · " + lz.name, n: Math.max(1, lz.heard.size), c: 0, dur: Math.round((env.clock.now() - sess.t0 - lz.pausedMs - (lz.paused ? env.clock.now() - lz.pausedAt : 0)) / 1000), lesson: true });
      } else if (results.length) env.app.log({ title: "Jarvis · " + TITLE[sess.mode], n: results.length, c: Math.round(results.reduce((a, r) => a + r.score, 0) * 100) / 100, dur: Math.round((env.clock.now() - sess.t0) / 1000) });
      change({ phase: "ended", endedReason: reason, error: reason === "user" ? null : errorOf(reason) });
      if (lz) { lz.window = false; lz.asking = false; lz.paused = false; lz.lost = false; sync(); }
    }
    async function stop() { if (sess && sess.call) await sess.call.end(); }

    async function start(opts) {
      const st = settings.get();
      if (!st.key) { change({ needKey: true, phase: "idle" }); return false; }
      const lesson = opts.mode === "lesson";
      let sheet = null;
      if (lesson) {
        sheet = env.app.sheet(opts.module);
        if (!sheet || !sheet.total) { change({ phase: "idle", needKey: false, error: errorOf("nosheet") }); return false; }
      }
      sess = { mode: opts.mode, module: opts.module, done: [], card: null, failures: 0, t0: env.clock.now(), finished: false, endRequested: false };
      lz = lesson ? { module: opts.module, name: sheet.name, sheet, total: sheet.total, pos0: sheet.pos || 0, idx: sheet.pos || 0, cur: null, started: false, heard: new Set(), closingHeard: false, redo: false,
        muted: !!st.muted, window: false, asking: false, talking: false, paused: false, lost: false, reconnecting: false, cutOff: false, wasBusy: false, endRequested: false,
        winTimer: null, askTimer: null, pausedAt: 0, pausedMs: 0 } : null;
      change(Object.assign({ needKey: false, phase: "connecting" }, FRESH, { startedAt: env.clock.now(), mode: opts.mode, module: opts.module || null }));
      const summary = env.app.summary();
      const config = lesson
        ? { key: st.key, model: "gemini-3.8-live", voice: st.voice, silenceMs: SILENCE[st.patience] || SILENCE.normal, system: buildLessonSystem({ name: sheet.name, muted: lz.muted, summary }), tools: makeLessonTools(ctx), retryMs: RETRY_LESSON }
        : { key: st.key, model: "gemini-3.8-live", voice: st.voice, silenceMs: SILENCE[st.patience] || SILENCE.normal, system: buildSystem({ mode: opts.mode, module: opts.module, summary }), tools: makeTools(ctx) };
      const onEvent = e => {
        if (lz && !sess.finished) lessonEvent(e);
        if (e.type === "state") {
          change({ phase: e.state });
          if (e.state === "listening" && sess.endRequested && !lz) call.end();
        } else if (e.type === "transcript") {
          const list = state.transcript.slice(), i = list.findIndex(u => u.id === e.id);
          if (i >= 0) list[i] = { id: e.id, who: e.who, text: e.text }; else list.push({ id: e.id, who: e.who, text: e.text });
          change({ transcript: list.slice(-MAX_TRANSCRIPT) });
        } else if (e.type === "level") change({ level: e.v });
        else if (e.type === "warn") change({ warn: e.code });
        else if (e.type === "ended") finish(e.reason);
      };
      let call = null;
      try { call = await callApi.start({ live: env.live, audio: env.audio, config, micId: st.micId, halfDuplex: lesson ? true : st.halfDuplex, gate: lesson ? false : undefined, survive: lesson, clock: env.clock, onEvent }); }
      catch (err) { change({ phase: "idle", error: errorOf(err && err.reason) }); return false; }
      sess.call = call;
      call.say(lesson ? "Începem lecția despre " + sheet.name + ". Apelează next_chunk pentru prima bucată." : "Începem sesiunea. Mai sunt " + summary.daysLeft + " zile până la interviu.");
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
      // După sfârșit, ecranul revine la alegerea modului; în timpul unei sesiuni nu face nimic.
      reset() { if (state.phase === "ended") change(Object.assign({ phase: "idle", needKey: false }, FRESH)); },
      interrupt() { if (sess && sess.call) sess.call.interrupt(); },
      say(text) { if (sess && sess.call) sess.call.say(text); },
      pause() { if (sess && sess.call) { if (lz) lessonPause(); else sess.call.pause(); } },
      resume() { if (sess && sess.call) return lz ? lessonResume() : sess.call.resume(); },
      // Lecția: Sari, Repetă, Mut și Vorbește (ținut apăsat). Butoanele fac același lucru ca vocea.
      // Reset în lecție: poziția salvată revine la zero, iar modelul reia de la ideea principală (nu mai e „ascultat” nimic din ce a fost).
      restart() {
        if (!lz || !sess.call || lz.paused || lz.lost) return;
        quiet();
        env.app.lessonReset(lz.module);
        lz.pos0 = 0; lz.idx = 0; lz.cur = null; lz.started = false; lz.redo = false;
        sess.call.interrupt(MSG.restart); sync();
      },
      skip: () => interruptWith(MSG.skip),
      repeat: () => interruptWith(MSG.again),
      talk: down => lessonTalk(down),
      setMuted(m) {
        settings.set({ muted: !!m });
        if (!lz || lz.finished) return;
        lz.muted = !!m;
        if (m && lz.window && !lz.paused) { quiet(); moveOn(); }
        sync();
      },
      mics: () => env.audio.mics(),
      getState: () => Object.assign({}, state)
    };
  }

  return { create, buildSystem, buildLessonSystem };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Jarvis;
