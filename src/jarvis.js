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
    nosheet: "Nu găsesc fișa acestui modul.",
    // Jetonul de la server (tichetul 08): primul pas al unei sesiuni, înainte de microfon.
    noserver: "Serverul nu e configurat. Adaugă adresa și secretul în setările Jarvis.",
    offline: "Fără conexiune la server: Jarvis are nevoie de internet ca să pornească. Încearcă din nou când ai semnal.",
    unauthorized: "Serverul a refuzat secretul. Verifică-l în setările Jarvis.",
    nokey: "Pe server lipsește cheia Gemini (GEMINI_API_KEY). Adaug-o la lansarea serverului.",
    gemini: "Serverul n-a putut obține un jeton de la Gemini. Încearcă mai târziu.",
    server: "Serverul nu răspunde cum trebuie. Încearcă mai târziu."
  };
  // Cu jeton, `auth` nu mai înseamnă „cheia ta”: Gemini a refuzat jetonul (a expirat sau era deja folosit).
  const TOKEN_ERRORS = { auth: "Gemini a refuzat jetonul sesiunii. Pornește din nou.", network: "Conexiunea a căzut. Pornește din nou când ai semnal." };
  const errorOf = (code, token) => ({ code, message: (token && TOKEN_ERRORS[code]) || ERRORS[code] || ERRORS.failed });
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
    restart: "Alex a cerut să reiei lecția de la început: apelează next_chunk pentru prima bucată și începe din nou cu introducerea din „intro”.",
    back: "Conexiunea a revenit. Spune «Reiau de unde am rămas», apoi ",
    // Sesiunea a repornit fără istoric (jeton nou): modelul trebuie să ceară din nou cardul curent.
    seq: "Continuă: apelează next_chunk pentru secvența următoare a bucății.",
    restarted: "Sesiunea s-a reînnoit și nu mai ții minte conversația de până acum. Spune într-o propoziție că reiei întrebarea, apoi apelează next_card."
  };

  // Secvențele (spec .scratch/lectie-sincronizata): o bucată se dă pe câmpuri ale desfășurării, fiecare cu cartonașul ei.
  // Proba e doar pe asyncio; tichetul 08 șterge condiția (SEQ_MODULES) și toate modulele merg pe secvențe.
  const SEQ_MODULES = ["asyncio"];
  const SEQ_RULE = " Spune doar ce e pe cartonaș, în ordinea de pe cartonaș, în 15–30 de secunde, cu vorbele tale. Fără fapte noi, fără exemple inventate; nu anunța ce urmează și nu încheia cu o întrebare.";
  const SEQ_INSTR = {
    problema: "Spune problema de pe cartonaș." + SEQ_RULE,
    ideea: "Spune ideea de pe cartonaș." + SEQ_RULE,
    exemplu: "Povestește exemplul de pe cartonaș: ce face codul și ce iese, cu rezultatul din comentarii. Nu citi codul caracter cu caracter." + SEQ_RULE,
    analogie: "Spune analogia de pe cartonaș." + SEQ_RULE,
    pas: "Spune pașii de pe cartonaș, în ordine, ca o poveste în timp." + SEQ_RULE,
    cpp: "Spune comparația cu C++ de pe cartonaș și unde nu ține." + SEQ_RULE,
    punct: "Spune punctul din fișă de pe cartonaș ca încheiere a bucății." + SEQ_RULE,
    capcane: "Spune formulările de evitat de pe cartonaș, ca „capcane la interviu”." + SEQ_RULE,
    recap: "Recapitulează din cartonaș: spune grupurile de puncte, pe rând, într-o propoziție fiecare (dacă e doar ideea principală, spune-o pe ea), apoi un rămas-bun scurt. Fără fapte noi. După asta nu mai apela nicio funcție."
  };
  const rng = g => (g.a === g.b ? String(g.a) : g.a + "–" + g.b) + ": " + g.t;
  // Cartonașele de deschidere și de încheiere (text scris de aplicație, nu de model): harta modulului (fără hartă, ideea principală), capcanele, recapitularea.
  const mapText = sh => sh.map ? sh.map.g.map(rng).join("\n") : sh.lead;
  function openSeq(sh, total, name) {
    const say = " Începe cu numărul de idei: „" + name + ", în " + total + " idei.”";
    return sh.map
      ? { tip: "harta", continut: [sh.map.p].concat(sh.map.g.map(rng)).join("\n"), instruction: "Spune problema modulului de pe cartonaș și cum se grupează punctele, grup cu grup, ca să se vadă firul." + say + SEQ_RULE }
      : { tip: "harta", continut: sh.lead, instruction: "Spune ideea principală de pe cartonaș." + say + SEQ_RULE };
  }
  // La reluarea dintr-o poziție: propoziția de amintire are cartonașul punctului amintit.
  function recallSeq(sh, from, resumed) {
    return { tip: "punct", continut: sh.points[from - 1], instruction: (resumed ? "Spune într-o propoziție „Reiau de unde am rămas, la …” și amintește punctul de pe cartonaș." : "Amintește într-o propoziție punctul de pe cartonaș, ca în „Data trecută am ajuns la …”.") + SEQ_RULE };
  }
  function closingSeqs(sh) {
    const out = [];
    if (sh.avoid.length) out.push({ tip: "capcane", continut: sh.avoid.join("\n"), instruction: SEQ_INSTR.capcane });
    out.push({ tip: "recap", continut: mapText(sh), instruction: SEQ_INSTR.recap });
    return out;
  }
  const unfence = c => { const m = /^\s*```[^\n]*\n([\s\S]*?)\n?```\s*$/.exec(String(c)); return (m ? m[1] : String(c)).replace(/\s+$/, ""); };
  // Secvențele bucății n (1..total) a unei fișe { points, desf? } (funcție pură): problema → ideea → exemplu | analogie → pas → cpp (cu „Unde nu ține”) → punct.
  // Câmpurile care lipsesc se sar; „Legătură” nu are secvență. Fără desfășurare rămâne doar `punct`. Cartonașul codului (exemplu, pas) vine fără gardurile ```.
  function lessonSequences(sheet, n) {
    const x = (sheet.desf && sheet.desf[n - 1]) || {}, out = [];
    const add = (tip, continut) => { if (continut) out.push({ tip, continut, instruction: SEQ_INSTR[tip] }); };
    add("problema", x.p); add("ideea", x.i);
    if (x.ex) add("exemplu", unfence(x.ex)); else add("analogie", x.an);
    add("pas", x.pas && unfence(x.pas));
    add("cpp", x.cpp || x.nu ? [x.cpp, x.nu && "Unde nu ține: " + x.nu].filter(Boolean).join("\n") : "");
    add("punct", sheet.points[n - 1]);
    return out;
  }

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
      { name: "next_chunk", description: "Dă bucata următoare a lecției: textul punctului din fișă, numărul ei și totalul (la prima bucată și introducerea: harta modulului sau ideea principală; la punctele cu desfășurare, și materialul ei, în „desf”; la final capcanele). Apeleaz-o doar când aplicația sau Alex cer bucata următoare. Dacă răspunsul are „k” și „of”, bucata se dă pe secvențe: primești o singură secvență (tip și cartonaș) și o spui așa cum cere „instruction”.", parameters: NO_ARGS, run: async () => ctx.nextChunk() },
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
      "2. O bucată este un punct din fișă. Dezvoltă-l în 1–1,5 minute, cu vorbele tale. Rămâi la ce ai primit: fără exemple din afara materialului, fără fapte noi, fără cifre sau nume de API care nu sunt în bucată.",
      "   Dacă bucata are „desf” (desfășurarea punctului), e materialul tău verificat: pornești de la problemă, spui ideea, apoi exemplul sau analogia, apoi pașii din „pas_cu_pas” (dacă există), spuși în ordine, ca o poveste în timp, și, dacă există, comparația cu C++ și unde nu ține. Exemplul din desfășurare e singurul exemplu: folosește-l pe el, nu inventa altul. Codul nu-l citi caracter cu caracter: povestește ce face și ce iese. Fără fapte noi nici față de desfășurare.",
      "3. Dacă răspunsul are „tip”: „harta”, e deschiderea lecției: spui problema modulului și grupurile de puncte de pe cartonaș, după „instruction”. Dacă are „tip”: „punct” la începutul bucății și „instruction” cere amintirea poziției, spui doar acea propoziție. Dacă răspunsul are „intro”, începe cu numărul de idei, ca în „Asyncio, în 10 idei. Prima: …”. Dacă „intro” are „harta”, spune întâi problema modulului și cum se grupează punctele (grupurile), ca să se vadă firul; altfel spune ideea principală. Apoi explică prima bucată. Dacă are „recap”, începe cu o propoziție care amintește ultima bucată ascultată („Data trecută am ajuns la …”), apoi explică bucata primită. Dacă „recap” are „continuare”: true, sesiunea s-a reluat în aceeași lecție: nu spune „data trecută”, ci „Reiau de unde am rămas, la …”.",
      "   Dacă răspunsul next_chunk are „k” și „of” (secvența k din of), nu e toată bucata: primești o singură secvență, cu „tip”, „continut” (cartonașul pe care îl vede Alex) și „instruction”. Spui doar cartonașul, în ordinea lui, și te oprești; aplicația cere secvența următoare.",
      "4. Nu anunța ce urmează și nu încheia bucata cu o întrebare: aplicația îi lasă lui Alex câteva secunde să intervină.",
      "5. Când next_chunk dă „closing” cu „k” și „of”, finalul vine pe secvențe: „capcane” (formulările de evitat) și „recap” (recapitularea de pe cartonaș, scrisă de aplicație: n-o alcătuiești tu), iar la „recap” închei cu un rămas-bun scurt. Când „closing” nu are „k”, spune formulările de evitat ca „capcane la interviu” (dacă există), apoi o recapitulare în trei propoziții, pe baza lui recap_from, și un rămas-bun scurt. După asta nu mai apelezi nicio funcție.",
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
    // Serverul (adresă + secret, `ServerConn`) dă jetoane pentru Live. Fără server configurat rămâne cheia Gemini din setări, ca rezervă veche.
    const useServer = () => !!(env.server && env.server.configured() && env.getToken);
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
      async nextChunk() { quiet(); const c = lz.cur; return c && c.advance ? deliver(c.n, false, c.k + 1) : deliver(lz.idx + 1, false); },
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
      const card = !c ? null : c.seqs ? { tip: c.seqs[c.k - 1].tip, continut: c.seqs[c.k - 1].continut } : closing ? (lz.sheet.avoid.length ? { tip: "capcane", continut: lz.sheet.avoid.join("\n") } : { tip: "recap", continut: "Recapitulare și rămas-bun." }) : { tip: "punct", continut: lz.sheet.points[c.n - 1] };
      return { card, k: c && c.seqs ? c.k : 1, of: c && c.seqs ? c.seqs.length : 1, module: lz.module, name: lz.name, n: c ? Math.min(c.n, lz.total) : 0, total: lz.total, pos: lz.pos0, closing, text: c && !closing ? lz.sheet.points[c.n - 1] : "", traps: closing ? lz.sheet.avoid.slice() : [], heard: lz.heard.size, muted: lz.muted, talking: lz.talking, status };
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
        // Mijlocul unei bucăți pe secvențe: se cere secvența următoare; fereastra și poziția așteaptă ultima.
        if (c.seqs && c.k < c.seqs.length) { c.advance = true; sess.call.say(MSG.seq); sync(); return; }
        if (c.n <= lz.total) { lz.heard.add(c.n); env.app.lessonHeard(lz.module, c.n); }
        else { lz.closingHeard = true; env.app.lessonDone(lz.module); sess.call.end(); return; }
        afterChunk();
      } else if (lz.redo) { lz.redo = false; sess.call.say(MSG.repeat); sync(); }
      else afterChunk();
    }
    // Continuarea după o întrerupere: bucata neauzită se reia, una auzită trece la următoarea (sau își redeschide fereastra).
    function continueLesson(prefix, windowOk) {
      const c = lz.cur, cut = lz.redo || (c && (c.delivering || c.advance));      // `redo`: bucata a fost tăiată de o întrebare; între secvențe, bucata se reia de la prima
      lz.redo = false;
      if (!c) sess.call.say(prefix + MSG.next);
      else if (cut) sess.call.say(prefix + MSG.repeat);
      else if (windowOk && !lz.muted) openWindow();
      else sess.call.say(prefix + MSG.next);
      sync();
    }
    // Desfășurarea unui punct, cu chei pe înțelesul modelului (aceleași câmpuri ca DESF_FIELDS din lib.mjs; jarvis.js se testează în Node, deci nu le importă); câmpurile care lipsesc nu apar. Indexul ei e indexul punctului.
    const DZ_KEYS = [["p", "problema"], ["i", "ideea"], ["ex", "exemplu"], ["an", "analogie"], ["pas", "pas_cu_pas"], ["cpp", "in_cpp"], ["nu", "unde_nu_tine"], ["leg", "legatura"]];
    function dzMaterial(sh, n) {
      const x = sh.desf && sh.desf[n - 1];
      if (!x) return null;
      const out = {};
      DZ_KEYS.forEach(([k, name]) => { if (x[k]) out[name] = x[k]; });
      return out;
    }
    // Bucata dată modelului. Prima dată vine cu introducerea (harta modulului sau ideea principală) și numărul de bucăți (sau cu recapitularea, dacă lecția continuă dintr-o poziție).
    function deliver(n, again, k) {
      const sh = lz.sheet, total = lz.total, first = !lz.started;
      // Cerută dincolo de final (de ex. Sari pe capcane): lecția se încheie după rămas-bun, altfel fereastra și MSG.next ar cere bucăți la nesfârșit.
      if (n > total + 1) { quiet(); lz.endRequested = true; return { done: true, message: "Lecția s-a terminat. Ia-ți rămas-bun în două propoziții; aplicația încheie sesiunea, deci nu mai apela nicio funcție." }; }
      lz.started = true; lz.idx = n; lz.cur = { n, delivering: true }; lz.redo = false;
      const useSeq = SEQ_MODULES.includes(lz.module);
      // După o repornire de sesiune (jeton nou, handle refuzat) modelul nu mai știe ce a spus: recapitularea pornește de la ultima bucată auzită, nu de la poziția salvată.
      let from = 0, resumed = false;
      if (first) { from = lz.recapN != null ? lz.recapN : lz.pos0; resumed = lz.recapN != null; lz.recapN = null; lz.lead = null; }
      // Deschiderea (harta sau amintirea poziției) e prima secvență a primei bucăți date; reperează aceeași bucată la repetare.
      if (first && useSeq) lz.lead = from === 0 && n === 1 ? { n, seq: openSeq(sh, total, lz.name) } : from > 0 ? { n, seq: recallSeq(sh, from, resumed) } : null;
      let r;
      if (useSeq) {
        const base = n <= total ? lessonSequences(sh, n) : closingSeqs(sh);
        const seqs = lz.lead && lz.lead.n === n ? [lz.lead.seq].concat(base) : base, q = seqs[(k || 1) - 1];
        lz.cur.seqs = seqs; lz.cur.k = k || 1;
        r = { kind: n <= total ? "chunk" : "closing", n, total, module: lz.name, k: lz.cur.k, of: seqs.length, tip: q.tip, continut: q.continut, instruction: q.instruction };
      } else if (n <= total) {
        r = { kind: "chunk", n, total, module: lz.name, text: sh.points[n - 1], instruction: "Explică bucata cu vorbele tale, în 1–1,5 minute. Fără exemple din afara bucății, fără fapte noi." };
        const dz = dzMaterial(sh, n);
        if (dz) {
          r.desf = dz;
          r.instruction = "Explică bucata pornind de la desfășurare: problema, ideea, apoi exemplul din desfășurare sau analogia, pașii din „pas_cu_pas” (dacă există), în ordine, și, dacă există, comparația cu C++ cu „unde nu ține”. Folosește exemplul din desfășurare, nu inventa altul. Codul nu-l citi caracter cu caracter: povestește ce face și ce iese. Cu vorbele tale, în 1–1,5 minute. Fără fapte noi, nici față de punct, nici față de desfășurare.";
        }
      } else {
        r = { kind: "closing", module: lz.name, lead: sh.lead, recap_from: [sh.lead].concat(sh.points), instruction: "Spune capcanele la interviu (dacă există), apoi o recapitulare în trei propoziții și un rămas-bun." };
        if (sh.avoid.length) r.traps = sh.avoid.slice();
      }
      if (first && !useSeq) {
        if (from === 0 && n === 1) {
          const say = lz.name + ", în " + total + " idei. Prima: …";
          // Cu harta modulului lecția se deschide cu problema mare și cu grupurile de puncte; fără ea, cu ideea principală.
          r.intro = sh.map ? { module: lz.name, total, say, harta: { problema: sh.map.p, grupuri: sh.map.g.map(g => ({ puncte: g.a === g.b ? String(g.a) : g.a + "–" + g.b, text: g.t })) } }
            : { module: lz.name, lead: sh.lead, total, say };
        } else if (from > 0) { r.recap = { n: from, text: sh.points[from - 1] }; if (resumed) r.recap.continuare = true; }
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
      if (lz.cur) { lz.cur.delivering = false; lz.cur.advance = false; }
      sess.call.interrupt(msg); sync();
    }
    function lessonTalk(down) {
      if (!lz) return;
      if (!down) { lz.talking = false; sess.call.talk(false); if (!lz.paused && !lz.lost) armAsk(); sync(); return; }     // eliberarea contează oricând
      if (lz.paused || lz.lost) return;
      cancelTimers();
      lz.window = false; lz.asking = true; lz.talking = true;
      if (lz.cur && (lz.cur.delivering || lz.cur.advance)) { lz.cur.delivering = false; lz.cur.advance = false; lz.redo = true; }        // bucata tăiată de întrebare se reia după răspuns
      sess.call.talk(true);
      armAsk();
      sync();
    }
    // Sesiunea Live a repornit fără istoric (jeton nou cu handle refuzat, sau redeschidere după pierderea conexiunii): modelul nu mai știe ce a explicat.
    // Următoarea bucată vine cu recapitularea ultimei bucăți auzite întregi; poziția salvată a lecției (`lz.idx`) rămâne a aplicației.
    function lessonRecontext() {
      const c = lz.cur, cut = lz.redo || (c && (c.delivering || c.advance));
      lz.started = false;
      lz.recapN = Math.max(0, Math.min(lz.total, lz.idx - (cut ? 1 : 0)));
    }
    // Evenimentele apelului care contează pentru lecție.
    function lessonEvent(e) {
      if (e.type === "restarted" || e.type === "reopened") lessonRecontext();
      else if (e.type === "spoken") onSpoken();
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
      change({ phase: "ended", endedReason: reason, error: reason === "user" ? null : errorOf(reason, sess.viaServer) });
      if (lz) { lz.window = false; lz.asking = false; lz.paused = false; lz.lost = false; sync(); }
    }
    async function stop() { if (sess && sess.call) await sess.call.end(); }

    async function start(opts) {
      const st = settings.get(), viaServer = useServer();
      if (!viaServer && !st.key) { change({ needKey: true, phase: "idle" }); return false; }
      const lesson = opts.mode === "lesson";
      let sheet = null;
      if (lesson) {
        sheet = env.app.sheet(opts.module);
        if (!sheet || !sheet.total) { change({ phase: "idle", needKey: false, error: errorOf("nosheet") }); return false; }
      }
      sess = { mode: opts.mode, module: opts.module, done: [], card: null, failures: 0, t0: env.clock.now(), finished: false, endRequested: false, viaServer };
      lz = lesson ? { module: opts.module, name: sheet.name, sheet, total: sheet.total, pos0: sheet.pos || 0, idx: sheet.pos || 0, cur: null, started: false, heard: new Set(), closingHeard: false, redo: false,
        muted: !!st.muted, window: false, asking: false, talking: false, paused: false, lost: false, reconnecting: false, cutOff: false, wasBusy: false, endRequested: false,
        winTimer: null, askTimer: null, pausedAt: 0, pausedMs: 0, recapN: null, lead: null } : null;
      change(Object.assign({ needKey: false, phase: "connecting" }, FRESH, { startedAt: env.clock.now(), mode: opts.mode, module: opts.module || null }));
      // Jetonul se cere ÎNAINTE de microfon: fără semnal, Alex vede mesajul și nu apare nicio cerere de permisiune. Jetonul ține o singură sesiune nouă,
      // deci primul `getToken` din sesiune îl întoarce pe acesta, iar următoarele (reconectări, redeschidere) cer altul.
      let auth = { key: st.key };
      if (viaServer) {
        let first;
        try { first = await env.getToken(); }
        catch (err) { sess = null; lz = null; change({ phase: "idle", error: errorOf(err && err.reason, true) }); return false; }
        let spare = first;
        auth = { getToken: async () => { if (spare) { const t = spare; spare = null; return t; } return env.getToken(); } };
      }
      const summary = env.app.summary();
      const config = Object.assign(lesson
        ? { model: "gemini-3.8-live", voice: st.voice, silenceMs: SILENCE[st.patience] || SILENCE.normal, system: buildLessonSystem({ name: sheet.name, muted: lz.muted, summary }), tools: makeLessonTools(ctx), retryMs: RETRY_LESSON }
        : { model: "gemini-3.8-live", voice: st.voice, silenceMs: SILENCE[st.patience] || SILENCE.normal, system: buildSystem({ mode: opts.mode, module: opts.module, summary }), tools: makeTools(ctx) }, auth);
      const onEvent = e => {
        if (lz && !sess.finished) lessonEvent(e);
        if (e.type === "restarted" && !lz && call && !sess.finished) call.say(MSG.restarted);
        else if (e.type === "state") {
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
      catch (err) { change({ phase: "idle", error: errorOf(err && err.reason, viaServer) }); return false; }
      sess.call = call;
      // Cheia veche din browser n-a mai fost nevoie: jetonul a mers, deci cheia Gemini rămâne doar pe server (spec platforma, Jarvis).
      if (viaServer && storage.getItem(KEY_ITEM)) storage.removeItem(KEY_ITEM);
      call.say(lesson ? "Începem lecția despre " + sheet.name + ". Apelează next_chunk pentru prima bucată." : "Începem sesiunea. Mai sunt " + summary.daysLeft + " zile până la interviu.");
      return true;
    }
    // Verifică dacă Live acceptă autentificarea (jeton de la server sau cheia veche): deschide o sesiune goală și o închide.
    // E și proba cap-coadă pe API-ul real: un jeton nou (consumă unul), WebSocket-ul `Constrained`, mesajul de setup.
    async function checkKey() {
      const st = settings.get(), viaServer = useServer();
      try {
        const session = await env.live.open(Object.assign(viaServer ? { getToken: env.getToken } : { key: st.key }, { model: "gemini-3.8-live", voice: st.voice, silenceMs: SILENCE.normal, system: "test", tools: [] }), () => {});
        session.close();
        return { ok: true };
      } catch (err) { return { ok: false, reason: (err && err.reason) || "failed" }; }
    }
    return {
      start, stop, settings, checkKey,
      // Mesajul pentru ecran al unui motiv de eroare (în modul cu server sau cu cheie).
      errorText: code => errorOf(code, useServer()).message,
      // După sfârșit, ecranul revine la alegerea modului; în timpul unei sesiuni nu face nimic.
      reset() { if (state.phase === "ended") change(Object.assign({ phase: "idle", needKey: false }, FRESH)); },
      interrupt() { if (sess && sess.call) sess.call.interrupt(); },
      say(text) { if (sess && sess.call) sess.call.say(text); },
      pause() { if (sess && sess.call) { if (lz) lessonPause(); else sess.call.pause(); } },
      resume() { if (sess && sess.call) return lz ? lessonResume() : sess.call.resume(); },
      // Lecția: Sari, Repetă, Mut și Vorbește (ținut apăsat). Butoanele fac același lucru ca vocea.
      // Reset în lecție: poziția salvată revine la zero, iar modelul reia de la introducere (harta sau ideea principală; nu mai e „ascultat” nimic din ce a fost).
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

  return { create, buildSystem, buildLessonSystem, lessonSequences };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Jarvis;
