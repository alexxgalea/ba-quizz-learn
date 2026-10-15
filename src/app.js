(function () {
  "use strict";
  const P = window.PREP;

  // ---------- indexes ----------
  const MODS = P.modules;
  const MOD = Object.fromEntries(MODS.map(m => [m.id, m]));
  const MCQ = P.mcq, ORAL = P.oral, KATAS = P.katas;
  const QBY = Object.fromEntries(MCQ.map(q => [q.id, q]));
  const OBY = Object.fromEntries(ORAL.map(c => [c.id, c]));
  const KBY = Object.fromEntries(KATAS.map(k => [k.id, k]));
  const MCQ_BY_M = {}, ORAL_BY_M = {};
  MODS.forEach(m => { MCQ_BY_M[m.id] = []; ORAL_BY_M[m.id] = []; });
  MCQ.forEach(q => MCQ_BY_M[q.m].push(q));
  ORAL.forEach(c => ORAL_BY_M[c.m].push(c));
  const TASKS = P.plan.flatMap(d => d.tasks.map(t => Object.assign({ day: d.id }, t)));
  const TBY = Object.fromEntries(TASKS.map(t => [t.id, t]));
  // Nivel (1 bază, 2 practic, 3 avansat) și context pentru fiecare grilă: din data_ctx.js sau direct pe întrebare.
  const LVL = { 1: "bază", 2: "practic", 3: "avansat" };
  MCQ.forEach(q => { const c = (P.qctx || {})[q.id]; if (c) { q.lvl = q.lvl || c[0]; q.ctx = q.ctx || c[1]; } q.lvl = q.lvl || 2; });

  // Explicațiile noi (format Perplexity) și glosarul. Contextul nou îl înlocuiește pe cel vechi.
  const EXPL = P.expl || {};
  MCQ.forEach(q => { const x = EXPL[q.id]; if (x && x.ctx) q.ctx = x.ctx; });
  const GLOSS = (P.gloss || []).slice().sort((a, b) => a.t.localeCompare(b.t, "ro"));
  const GBY = Object.fromEntries(GLOSS.map(g => [g.id, g]));
  const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // Formele în care apare fiecare termen; varianta cu majusculă (început de propoziție) se adaugă automat.
  const TERM_FORM = new Map();
  GLOSS.forEach(g => g.forms.forEach(f => { TERM_FORM.set(f, g.id); if (/^\p{Ll}/u.test(f)) TERM_FORM.set(f.charAt(0).toUpperCase() + f.slice(1), g.id); }));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const TERM_RE = TERM_FORM.size ? new RegExp("(^|[^\\p{L}\\p{N}_])(" + [...TERM_FORM.keys()].sort((a, b) => b.length - a.length).map(reEsc).join("|") + ")(?![\\p{L}\\p{N}_])", "gu") : null;
  // termeni care, într-un anumit loc, au alt sens decât cel din glosar
  const TERM_SKIP = { "obs-01": ["coada"], domain: ["tranzactie"] };
  function termsIn(text) {
    const s = new Set(); if (!TERM_RE || !text) return s;
    for (const m of String(text).matchAll(TERM_RE)) s.add(TERM_FORM.get(m[2]));
    return s;
  }
  const skipFor = q => new Set((TERM_SKIP[q.id] || []).concat(TERM_SKIP[q.m] || []));
  const findTerm = s => { const k = String(s).replace(/`/g, "").trim(); return GBY[slug(k)] ? slug(k) : (TERM_FORM.get(k) || null); };

  const PW = { 1: 3, 2: 2, 3: 1, 4: 0.3 };
  const PNAME = { 1: "P1 · critic", 2: "P2 · important", 3: "P3 · util", 4: "Bonus" };
  const MB = [0, 0, 0.5, 0.75, 0.9, 1];          // stăpânire pe cutie Leitner
  const INTERVIEW = new Date(2026, 9, 19);       // luni, 19 octombrie 2026 (ora locală)
  const HMAX = 80;
  const LS_KEY = "onapsis-prep-v1";
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const LETTERS = "ABCDEF";

  // ---------- utils ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Inline code gets soft break points after . / ( , so long names wrap at a natural spot on a phone.
  const fmt = s => esc(s).replace(/`([^`]+)`/g, (_, c) => "<code>" + c.replace(/([./(,])(?=[^\s.\/(,)])/g, "$1<wbr>") + "</code>");
  const now = () => Date.now();
  const pc = x => Math.round((x || 0) * 100);
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function wsample(items, wfn, n) {
    const pool = items.map(x => ({ x, w: Math.max(0, wfn(x)) })).filter(o => o.w > 0);
    const out = [];
    while (out.length < n && pool.length) {
      let tot = 0; for (const o of pool) tot += o.w;
      let r = Math.random() * tot, i = 0;
      for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
      out.push(pool[i].x); pool.splice(i, 1);
    }
    return out;
  }

  // Python highlighter (comments, strings, keywords, numbers)
  const PY = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|(?:\b[rbfRBF]{1,2})?"(?:\\.|[^"\\\n])*"|(?:\b[rbfRBF]{1,2})?'(?:\\.|[^'\\\n])*')|\b(def|return|for|in|if|elif|else|while|class|import|from|as|async|await|yield|with|try|except|finally|raise|not|and|or|is|None|True|False|lambda|global|pass|break|continue)\b|\b(\d[\d_]*(?:\.\d+)?)\b/g;
  function hlPy(src) {
    let out = "", last = 0, m;
    PY.lastIndex = 0;
    while ((m = PY.exec(src))) {
      if (!m[0]) { PY.lastIndex++; continue; }
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : "n";
      // token-urile pe mai multe rânduri (docstring-uri) sunt închise la fiecare capăt de rând, ca rândurile să poată fi separate
      out += m[0].split("\n").map(part => '<span class="tk-' + cls + '">' + esc(part) + "</span>").join("\n");
      last = PY.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  // wrap: fiecare rând devine un bloc cu indent agățat, ca pe telefon rândurile lungi să se rupă vizibil, nu să fie tăiate.
  // Pentru fragmente scurte (explicații, cod din întrebări); codul lung al exercițiilor rămâne cu scroll orizontal.
  function codeBlock(src, plain, wrap) {
    src = String(src);
    const py = !plain && !/^\s*(CREATE|SELECT|docker|EXPLAIN)\b/.test(src);
    const h = py ? hlPy(src) : esc(src);
    if (!wrap) return '<pre class="code"><code>' + h + "</code></pre>";
    const raw = src.split("\n");
    return '<pre class="code wrap"><code>' + h.split("\n").map((l, i) => {
      const n = (raw[i] || "").match(/^[ \t]*/)[0].replace(/\t/g, "    ").length;
      return '<span class="ln"' + (n ? ' style="--n:' + n + '"' : "") + ">" + (l || " ") + "</span>";
    }).join("") + "</code></pre>";
  }
  // Text cu `cod` inline. Cu tc ({ seen, skip }), prima apariție a fiecărui termen din glosar devine apăsabilă.
  function inlineRich(text, tc) {
    return String(text == null ? "" : text).split(/`([^`]+)`/).map((seg, i) => {
      if (i % 2) return "<code>" + esc(seg).replace(/([./(,])(?=[^\s.\/(,)])/g, "$1<wbr>") + "</code>";
      let h = esc(seg);
      if (tc && TERM_RE) h = h.replace(TERM_RE, (all, pre, word) => {
        const id = TERM_FORM.get(word);
        if (!id || tc.seen.has(id) || tc.skip.has(id)) return all;
        tc.seen.add(id);
        return pre + '<button class="term" data-a="term" data-t="' + id + '">' + word + "</button>";
      });
      return h.replace(/\n/g, "<br>");
    }).join("");
  }
  // Paragrafe + blocuri de cod (```lang ... ```).
  function rich(text, tc) {
    const parts = String(text == null ? "" : text).split(/```(\w*)[^\n]*\n([\s\S]*?)```/);
    let h = "";
    for (let i = 0; i < parts.length; i += 3) {
      const t = parts[i].replace(/^\s+|\s+$/g, "");
      if (t) h += '<p class="rt">' + inlineRich(t, tc) + "</p>";
      if (i + 2 < parts.length) h += codeBlock(parts[i + 2].replace(/\s+$/, ""), !/^(python|py)$/.test(parts[i + 1]), true);
    }
    return h;
  }

  // ---------- state ----------
  function emptyState() { return { v: 1, r: 0, q: {}, o: {}, k: {}, p: {}, h: [] }; }
  function normalize(x) {
    const s = emptyState();
    if (!x || typeof x !== "object") return s;
    s.r = +x.r || 0;
    for (const k of ["q", "o", "k", "p"]) {
      const src = x[k];
      if (src && typeof src === "object" && !Array.isArray(src)) for (const id of Object.keys(src)) { const e = src[id]; if (e && typeof e === "object") s[k][id] = Object.assign({}, e); }
    }
    if (Array.isArray(x.h)) s.h = x.h.filter(e => e && e.id && e.ts).map(e => Object.assign({}, e)).slice(-HMAX);
    return s;
  }
  function prune(s) {
    if (!s.r) return s;
    for (const k of ["q", "o", "k", "p"]) for (const id of Object.keys(s[k])) if ((s[k][id].t || 0) < s.r) delete s[k][id];
    s.h = s.h.filter(e => e.ts >= s.r);
    return s;
  }
  function mergeState(local, remote) {
    const out = emptyState(); let ln = false, rn = false;
    out.r = Math.max(local.r || 0, remote.r || 0);
    if ((local.r || 0) > (remote.r || 0)) ln = true; else if ((remote.r || 0) > (local.r || 0)) rn = true;
    for (const k of ["q", "o", "k", "p"]) {
      const keys = new Set(Object.keys(local[k]).concat(Object.keys(remote[k])));
      for (const id of keys) {
        const a = local[k][id], b = remote[k][id];
        const ta = a ? (a.t || 0) : -1, tb = b ? (b.t || 0) : -1;
        if (ta > tb) { out[k][id] = a; ln = true; } else { out[k][id] = b; if (tb > ta) rn = true; }
      }
    }
    const hm = new Map();
    remote.h.forEach(e => hm.set(e.id, e));
    local.h.forEach(e => { if (!hm.has(e.id)) { hm.set(e.id, e); ln = true; } });
    const lids = new Set(local.h.map(e => e.id));
    if (remote.h.some(e => !lids.has(e.id))) rn = true;
    out.h = Array.from(hm.values()).sort((x, y) => x.ts - y.ts).slice(-HMAX);
    prune(out);
    return { state: out, localNewer: ln, remoteNewer: rn };
  }
  const hasData = s => s.h.length > 0 || ["q", "o", "k", "p"].some(k => Object.keys(s[k]).length > 0);

  let S = emptyState();
  let lsOK = true;
  function loadLocal() {
    try { const raw = localStorage.getItem(LS_KEY); return raw ? prune(normalize(JSON.parse(raw))) : null; }
    catch (e) { lsOK = false; return null; }
  }
  function saveLocal() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); lsOK = true; } catch (e) { lsOK = false; } }
  function commit() { saveLocal(); Sync.push(); paintHeader(); }

  // ---------- sync (progres privat per utilizator, prin db) ----------
  const DEAD = ["invalid_argument", "not_granted", "revoked", "capability_disabled", "capability_removed", "transform_error"];
  const Sync = {
    ref: null, status: "local", writing: false, dirty: false, timer: 0, retries: 0, dead: false,
    async init() {
      const c = window.claude;
      if (!c || typeof c.use !== "function") return;
      let db = null, user = null;
      try { [db, user] = await Promise.all([c.use("db"), c.use("user")]); } catch (e) { return; }
      if (!db || !user) return;
      let uid = null;
      try { uid = await user.id(); } catch (e) { uid = null; }
      if (!uid) return;
      try { this.ref = db.doc("data/users/" + uid + "/progress"); } catch (e) { this.ref = null; return; }
      this.status = "syncing"; paintStatus();
      try {
        this.unsub = this.ref.onSnapshot(snap => this.onRemote(snap), () => { this.ref = null; this.status = "local"; paintStatus(); });
      } catch (e) { this.ref = null; this.status = "local"; paintStatus(); }
    },
    onRemote(snap) {
      if (!snap.exists) {
        if (hasData(S)) this.push(400); else { this.status = "synced"; paintStatus(); }
        return;
      }
      const remote = prune(normalize(snap.data()));
      const res = mergeState(S, remote);
      S = res.state;
      if (res.remoteNewer) { saveLocal(); softRender(); }
      if (res.localNewer) this.push(900);
      else if (!this.writing && !this.dirty) { this.status = "synced"; paintStatus(); }
    },
    push(delay) {
      if (!this.ref || this.dead) return;
      this.dirty = true; this.retries = 0;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), delay == null ? 1200 : delay);
      if (this.status !== "syncing") { this.status = "syncing"; paintStatus(); }
    },
    async flush() {
      if (!this.ref || this.dead || !this.dirty || this.writing) return;
      this.writing = true; this.dirty = false;
      try {
        await this.ref.set(JSON.parse(JSON.stringify(S)));
        this.status = "synced";
      } catch (e) {
        const code = e && e.code;
        this.status = "local";
        if (DEAD.indexOf(code) >= 0) this.dead = true;
        else if (code === "quota_exceeded") this.status = "full";
        else if (this.retries < 2) { this.retries++; this.dirty = true; }
      }
      this.writing = false; paintStatus();
      if (this.dirty && !this.dead) { clearTimeout(this.timer); this.timer = setTimeout(() => this.flush(), 1500 + Math.random() * 2000); }
    },
    label() {
      if (this.status === "synced") return "Sincronizat cu contul tău: vezi același progres pe telefon și pe laptop.";
      if (this.status === "syncing") return "Se sincronizează…";
      if (this.status === "full") return "Spațiul de sincronizare e plin; progresul rămâne salvat pe acest dispozitiv.";
      return lsOK ? "Salvat doar pe acest dispozitiv (în browser)." : "Browserul nu permite salvarea: progresul se pierde la închidere. Folosește exportul.";
    }
  };

  // ---------- learning model ----------
  // Un răspuns corect dat cu contextul deschis te duce cel mult în cutia 2: ca să urci mai sus,
  // trebuie să răspunzi și fără context (contextul se ascunde singur de la cutia 2 în sus).
  function updQ(id, ok, assisted) {
    const e = Object.assign({ b: 0, n: 0, c: 0 }, S.q[id]);
    e.n++;
    if (ok) { e.c++; const nb = Math.min(5, Math.max(1, e.b) + 1); e.b = assisted ? Math.max(e.b, Math.min(nb, 2)) : nb; } else e.b = 1;
    e.l = ok ? 1 : 0; e.t = now();
    S.q[id] = e;
  }
  function updO(id, p) {
    const e = Object.assign({ b: 0, n: 0 }, S.o[id]);
    e.n++; e.s = Math.round(p * 100);
    if (p >= 0.8) e.b = Math.min(5, Math.max(1, e.b) + 1);
    else if (p >= 0.5) e.b = Math.max(1, e.b);
    else e.b = 1;
    e.t = now();
    S.o[id] = e;
  }
  const mastery = e => (e ? MB[e.b] || 0 : 0);
  function modStats(mid) {
    let sum = 0, n = 0, seen = 0, ans = 0, cor = 0, qn = 0, qseen = 0;
    for (const q of MCQ_BY_M[mid]) { const e = S.q[q.id]; sum += mastery(e); n++; qn++; if (e) { seen++; qseen++; ans += e.n; cor += e.c; } }
    for (const c of ORAL_BY_M[mid]) { const e = S.o[c.id]; sum += mastery(e); n++; if (e) seen++; }
    return { mastery: n ? sum / n : 0, coverage: n ? seen / n : 0, n, seen, ans, cor, qn, qseen };
  }
  function readiness() {
    let w = 0, s = 0, cv = 0, ans = 0, cor = 0;
    for (const m of MODS) {
      const st = modStats(m.id); ans += st.ans; cor += st.cor;
      if (m.p > 3) continue;
      w += PW[m.p]; s += PW[m.p] * st.mastery; cv += PW[m.p] * st.coverage;
    }
    return { ready: w ? s / w : 0, cover: w ? cv / w : 0, ans, cor };
  }
  const needW = e => (!e ? 3 : e.b <= 1 ? 4 : ([0, 0, 2.4, 1.6, 1, 0.5][e.b] || 0.5));
  const recentF = e => (e && now() - (e.t || 0) < 20 * 60000 ? 0.2 : 1);
  const wQ = q => PW[MOD[q.m].p] * needW(S.q[q.id]) * recentF(S.q[q.id]);
  const wO = c => PW[MOD[c.m].p] * needW(S.o[c.id]) * recentF(S.o[c.id]);
  const rankBox = e => (!e ? 0.5 : e.b <= 1 ? 0 : e.b);
  const sortWeak = (items, st) => shuffle(items).sort((a, b) => rankBox(st[a.id]) - rankBox(st[b.id]));

  // Contextul apare deschis cât timp grila nu e încă știută (nouă sau greșită ultima dată).
  const ctxDefault = q => !!q.ctx && (!S.q[q.id] || S.q[q.id].b <= 1);
  // Nivelul deblocat într-un modul: urci la „practic” când știi jumătate din bază, la „avansat” când știi jumătate din practic.
  function unlockedLvl(mid) {
    const known = lv => {
      const qs = MCQ_BY_M[mid].filter(q => q.lvl === lv);
      return qs.length ? qs.filter(q => S.q[q.id] && S.q[q.id].b >= 2).length / qs.length : 1;
    };
    if (known(1) < 0.5) return 1;
    return known(2) < 0.5 ? 2 : 3;
  }
  function pickSmart(n) {
    const ul = {}; MODS.forEach(m => { ul[m.id] = unlockedLvl(m.id); });
    const lvlF = q => { const d = q.lvl - ul[q.m]; return d <= 0 ? 1 : d === 1 ? 0.12 : 0.03; };
    return wsample(MCQ.filter(q => MOD[q.m].p < 4), q => wQ(q) * lvlF(q), n).sort((a, b) => a.lvl - b.lvl);
  }
  // Diagnostic ghidat: întâi câte o grilă de bază din fiecare modul, apoi încă una la modulele P1.
  // A doua e de nivel „practic” doar dacă prima a ieșit; altfel rămâne la bază (vezi adaptDiag).
  function pickDiag() {
    const first = [], second = [];
    const pick1 = list => { const fresh = list.filter(q => !S.q[q.id]); return shuffle(fresh.length ? fresh : list)[0]; };
    for (const m of MODS) {
      const qs = MCQ_BY_M[m.id];
      if (m.p > 3 || !qs.length) continue;
      const a = pick1(qs.filter(q => q.lvl === 1)) || pick1(qs);
      first.push({ q: a, round: 1 });
      if (m.p === 1) {
        const rest = qs.filter(q => q !== a);
        const b = pick1(rest.filter(q => q.lvl === 2)) || pick1(rest.filter(q => q.lvl === 1)) || pick1(rest);
        if (b) second.push({ q: b, round: 2 });
      }
    }
    return shuffle(first).concat(shuffle(second));
  }
  function adaptDiag(run, i) {
    const it = run.items[i]; if (it.round !== 1) return;
    const j = run.items.findIndex((x, k) => k > i && x.round === 2 && x.m === it.m && !run.done[k]);
    if (j < 0 || QBY[run.items[j].id].lvl === 1) return;
    const used = new Set(run.items.map(x => x.id));
    const pool = MCQ_BY_M[it.m].filter(q => q.lvl === 1 && !used.has(q.id));
    if (!pool.length) return;
    const fresh = pool.filter(q => !S.q[q.id]);
    run.items[j] = mkItem(shuffle(fresh.length ? fresh : pool)[0], run.mode, 2);
  }
  function mkItem(q, mode, round) {
    return { id: q.id, m: q.m, round: round || 0, ord: shuffle(q.o.map((_, i) => i)), cx: mode !== "mock" && ctxDefault(q) };
  }
  function pickMistakes() { return MCQ.filter(q => S.q[q.id] && S.q[q.id].l === 0).sort((a, b) => S.q[b.id].t - S.q[a.id].t).slice(0, 25); }
  function pickMock(n) {
    const out = [], used = new Set();
    MODS.filter(m => m.p === 1).forEach(m => { const q = wsample(MCQ_BY_M[m.id], wQ, 1)[0]; if (q) { out.push(q); used.add(q.id); } });
    const rest = MCQ.filter(q => MOD[q.m].p < 4 && !used.has(q.id));
    return shuffle(out.concat(wsample(rest, q => PW[MOD[q.m].p] * needW(S.q[q.id]), n - out.length)));
  }

  // ---------- dates & plan ----------
  function todayDate() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function daysLeft() { return Math.round((INTERVIEW - todayDate()) / 86400000); }
  function isoLocal(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function todayIdx() {
    const iso = isoLocal(todayDate());
    const i = P.plan.findIndex(d => d.date === iso);
    if (i >= 0) return i;
    return iso < P.plan[0].date ? 0 : P.plan.length - 1;
  }
  const isDone = id => !!(S.p[id] && S.p[id].d);
  function nextTask() {
    const ti = todayIdx();
    const order = P.plan.slice(ti).concat(P.plan.slice(0, ti));
    for (const d of order) for (const t of d.tasks) if (!isDone(t.id)) return { d, t };
    return null;
  }

  // ---------- UI state ----------
  let ui = {
    tab: "plan", run: null, result: null,
    study: { seg: "sheets", open: null, kata: null, hints: 0, kEnd: 0 },
    prog: { exp: false, imp: false, reset: false }
  };

  function snapshotUi() { try { return JSON.parse(JSON.stringify(ui)); } catch (e) { return null; } }

  // ---------- header, tabs ----------
  function ringSvg(x) {
    const C = 2 * Math.PI * 16;
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><circle class="trk" cx="20" cy="20" r="16"/>' +
      (x > 0.005 ? '<circle class="val" cx="20" cy="20" r="16" stroke-dasharray="' + (C * x).toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 20 20)"/>' : "") + "</svg>";
  }
  function headLabel(d) {
    if (d > 1) return "Mai sunt " + d + " zile";
    if (d === 1) return "Mâine e interviul";
    if (d === 0) return "Azi e interviul. Succes!";
    return "Interviul a trecut";
  }
  function paintHeader() {
    const r = readiness();
    const t = $("#hdr-t"); if (t) t.textContent = headLabel(daysLeft());
    const rg = $("#ring"); if (rg) rg.innerHTML = ringSvg(r.ready);
    const rv = $("#ring-v"); if (rv) rv.textContent = pc(r.ready) + "%";
    paintStatus();
  }
  function paintStatus() {
    const d = $("#sdot");
    if (d) { d.className = "sync-dot" + (Sync.status === "synced" ? " on" : Sync.status === "syncing" ? " busy" : ""); d.title = Sync.label(); }
    const s = $("#sync-l"); if (s) s.textContent = Sync.label();
  }
  function paintTabs() { document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-current", b.dataset.tab === ui.tab ? "page" : "false")); }

  // ---------- render ----------
  function render() {
    const main = $("#main");
    let h = "";
    try {
      if (ui.tab === "plan") h = vPlan();
      else if (ui.tab === "quiz") h = ui.run && ui.run.kind === "mcq" ? vMcqRun() : ui.result && ui.result.kind === "mcq" ? vMcqResult() : vQuizHome();
      else if (ui.tab === "oral") h = ui.run && ui.run.kind === "oral" ? vOralRun() : ui.result && ui.result.kind === "oral" ? vOralResult() : vOralHome();
      else if (ui.tab === "study") h = vStudy();
      else h = vProgress();
    } catch (err) {
      h = '<div class="card"><h2>Ceva n-a mers</h2><p class="muted small">' + esc(err && err.message) + '</p><button class="btn" data-a="tab" data-tab="plan">Înapoi la plan</button></div>';
    }
    main.innerHTML = h;
    paintTabs(); paintHeader();
  }
  function softRender() { if (!ui.run) render(); else paintHeader(); }

  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.tm); toast.tm = setTimeout(() => { t.hidden = true; }, 2400);
  }

  const prioChip = p => '<span class="prio p' + p + '">' + (p === 4 ? "BONUS" : "P" + p) + "</span>";
  const bar = x => '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, pc(x))) + '%"></i></div>';

  // ---------- views: plan ----------
  function vPlan() {
    const d = daysLeft(), r = readiness(), ti = todayIdx();
    const doneN = TASKS.filter(t => isDone(t.id)).length;
    const totalMin = TASKS.reduce((s, t) => s + (t.min || 0), 0);
    const big = d > 0 ? "T−" + d : d === 0 ? "Azi" : "Gata";
    const small = d > 1 ? "zile până la interviu" : d === 1 ? "mâine e interviul" : d === 0 ? "succes!" : "interviul a trecut";
    let h = '<section class="card hero"><div class="stack-s"><h1>Interviul tehnic Onapsis</h1><p class="muted small">Software Engineer – Python · Onapsis Defend · luni, 19 octombrie</p></div><div class="tminus">' + big + "<small>" + small + "</small></div></section>";
    h += '<section class="card kpis">' +
      kpi(pc(r.ready) + "%", "pregătire (stăpânire ponderată)") +
      kpi(pc(r.cover) + "%", "acoperire (întrebări văzute)") +
      kpi(doneN + "/" + TASKS.length, "sarcini din plan bifate") +
      kpi(r.ans ? pc(r.cor / r.ans) + "%" : "–", r.ans ? "corecte din " + r.ans + " răspunsuri" : "încă niciun răspuns") + "</section>";
    const nx = nextTask();
    if (nx) {
      h += '<section class="card next"><div class="stack-s"><div class="eyebrow">Următorul pas · ' + esc(nx.d.day) + "</div><div>" + fmt(nx.t.text) + ' <span class="xs muted mono">' + nx.t.min + " min</span></div></div>" +
        (nx.t.go ? '<button class="btn primary" data-a="go" data-id="' + nx.t.id + '">Start</button>' : '<button class="btn" data-a="plan-toggle" data-id="' + nx.t.id + '">Bifează</button>') + "</section>";
    }
    h += '<div class="sec-h"><h2>Planul pe zile</h2><span class="xs muted mono">~' + Math.round(totalMin / 60) + " h în total</span></div>";
    P.plan.forEach((day, i) => {
      const dn = day.tasks.filter(t => isDone(t.id)).length;
      h += '<details class="day' + (i === ti ? " today" : "") + '" id="day-' + day.id + '"' + (i === ti ? " open" : "") + ">" +
        '<summary><span class="day-t">' + esc(day.day) + " " + esc(day.label) + '</span><span class="day-badge">' + dn + "/" + day.tasks.length + '</span><span class="day-s">' + esc(day.when) + "</span></summary>" +
        '<div class="day-body"><p class="focus">' + fmt(day.focus) + "</p>" + day.tasks.map(taskRow).join("") + "</div></details>";
    });
    h += '<p class="note">Planul presupune ~2–2,5 h în serile de lucru și 5–6 h în weekend. Bifezi sarcinile tu; scorurile se calculează singure din răspunsuri.</p>';
    return h;
  }
  function kpi(v, l) { return '<div class="kpi"><div class="v">' + v + '</div><div class="l">' + esc(l) + "</div></div>"; }
  function taskRow(t) {
    const dn = isDone(t.id);
    return '<div class="task' + (dn ? " done" : "") + '"><button class="check" role="checkbox" aria-checked="' + dn + '" aria-label="Marchează ca făcută" data-a="plan-toggle" data-id="' + t.id + '">' + CHECK + "</button>" +
      '<div class="task-text">' + fmt(t.text) + '<span class="min">' + t.min + " min</span></div>" +
      (t.go ? '<button class="btn sm" data-a="go" data-id="' + t.id + '">Start</button>' : "<span></span>") +
      (t.code ? codeBlock(t.code, true) : "") + "</div>";
  }

  // ---------- views: quiz ----------
  function vQuizHome() {
    const r = readiness(), mist = pickMistakes().length, fresh = r.ans === 0;
    let h = '<div class="stack-s"><h1>Grile</h1><p class="muted small">' + MCQ.length + " de grile cu context și explicații, pe trei niveluri: bază, practic, avansat. Pornești de la bază și urci pe măsură ce le știi.</p></div>";
    h += '<div class="modes">' +
      modeCard("diag", "Test diagnostic", "30 de grile: întâi baza din fiecare modul, apoi un pas mai departe. Nu ghici: apasă „Nu știu încă”.", "~25 min", fresh) +
      modeCard("smart", "Mix inteligent", "15 grile pe nivelul tău, mai multe din modulele slabe și din P1.", "~10 min", !fresh) +
      modeCard("mistakes", "Greșelile mele", mist ? mist + " grile greșite la ultimul răspuns." : "Nimic de reluat încă.", mist ? "~" + Math.max(1, Math.round(mist * 0.7)) + " min" : "–", false) +
      modeCard("mock", "Simulare de interviu", "25 de grile în 25 de minute, fără feedback până la final. Un singur răspuns per grilă contează.", "25 min", false, true) +
      "</div>";
    h += '<p class="xs muted">Contextul apare la grilele noi. După primul răspuns corect, grila revine fără context: ca s-o stăpânești complet, răspunde fără el.</p>';
    h += '<div class="sec-h"><h2>Pe module</h2><span class="xs muted">stăpânire</span></div>';
    h += modList("mcq");
    return h;
  }
  function modeCard(mode, t, d, m, hot, wide) {
    return '<button class="mode' + (hot ? " hot" : "") + (wide ? " wide" : "") + '" data-a="mcq" data-mode="' + mode + '"><span class="mt">' + esc(t) + '</span><span class="md">' + esc(d) + '</span><span class="mm">' + esc(m) + "</span></button>";
  }
  function modList(kind) {
    let h = "";
    [1, 2, 3, 4].forEach(p => {
      const ms = MODS.filter(m => m.p === p && (kind === "mcq" ? MCQ_BY_M[m.id].length : ORAL_BY_M[m.id].length));
      if (!ms.length) return;
      h += '<div class="card flat stack-s"><div class="eyebrow">' + PNAME[p] + '</div><div class="modlist">';
      ms.forEach(m => {
        const st = modStats(m.id);
        const count = kind === "mcq" ? st.qseen + "/" + st.qn : ORAL_BY_M[m.id].filter(c => S.o[c.id]).length + "/" + ORAL_BY_M[m.id].length;
        h += '<button class="modrow" data-a="' + (kind === "mcq" ? "mcq-mod" : "oral-mod") + '" data-m="' + m.id + '"><span class="chip">' + m.code + '</span><span class="nm">' + esc(m.short) + (m.src.indexOf("Lateral") >= 0 ? ' <span class="xs muted">· lacună Lateral</span>' : "") + '</span><span class="st">' + count + " · " + pc(st.mastery) + "%</span>" + bar(st.mastery) + "</button>";
      });
      h += "</div></div>";
    });
    return h;
  }

  function startMcq(mode, opt) {
    opt = opt || {};
    let qs = [], title = "", rounds = null;
    if (mode === "smart") { qs = pickSmart(15); title = "Mix inteligent"; }
    else if (mode === "diag") { const d = pickDiag(); qs = d.map(x => x.q); rounds = d.map(x => x.round); title = "Test diagnostic"; }
    else if (mode === "mistakes") { qs = pickMistakes(); title = "Greșelile mele"; }
    else if (mode === "mock") { qs = pickMock(25); title = "Simulare de interviu"; }
    else if (mode === "ids") { qs = shuffle(opt.ids.map(id => QBY[id]).filter(Boolean)); title = opt.title || "Reluare"; }
    else {
      // pe module: întâi baza, apoi practic, apoi avansat; în fiecare nivel, cele mai slabe primele
      const ms = opt.ms || [], pool = MCQ.filter(q => ms.indexOf(q.m) >= 0);
      qs = [1, 2, 3].flatMap(l => sortWeak(pool.filter(q => q.lvl === l), S.q));
      title = ms.map(m => MOD[m] ? MOD[m].short : m).join(" + "); mode = "module";
    }
    if (!qs.length) { toast(mode === "mistakes" ? "Nicio greșeală de reluat." : "Nu am găsit întrebări."); return; }
    ui.result = null;
    ui.run = { kind: "mcq", mode, title, items: qs.map((q, k) => mkItem(q, mode, rounds ? rounds[k] : 0)), i: 0, picks: {}, done: {}, assist: {}, t0: now(), deadline: mode === "mock" ? now() + 25 * 60000 : 0, confirmQuit: false };
    ui.tab = "quiz"; render(); window.scrollTo(0, 0);
  }

  // ---------- explicația pe două niveluri ----------
  // Imediat: pe scurt, de ce contează, cum funcționează și de ce e greșită varianta aleasă.
  // „Arată-mi concret”: pas cu pas, în practică, legătura cu ce știi, atenție, interviu, verificare, celelalte variante.
  const XL = { scop: "De ce contează", mec: "Cum funcționează", pas: "Pas cu pas", apl: "În practică", leg: "Legătura cu ce știi", lim: "Atenție", intv: "La interviu" };
  const xsec = (label, text, tc, cls) => '<div class="xp-sec' + (cls ? " " + cls : "") + '"><div class="xp-h">' + label + "</div>" + rich(text, tc) + "</div>";
  function vExpl(q, st, tc) {
    const x = EXPL[q.id];
    if (!x) return '<div class="xp">' + rich(q.e, tc) + "</div>";
    let h = '<div class="xp"><p class="xp-lead">' + inlineRich(x.scurt, tc) + "</p>";
    if (x.scop) h += xsec(XL.scop, x.scop, tc);
    h += xsec(XL.mec, x.mec, tc);
    const chosen = !st.ok && st.pickOi != null && st.pickOi >= 0 ? x.gr[st.pickOi] : null;
    if (chosen) h += xsec("De ce nu „" + inlineRich(q.o[st.pickOi]) + "”", chosen, tc, "warn");
    if (!st.review && !st.more) return h + '<button class="btn sm more-btn" data-a="xp-more">Arată-mi concret</button></div>';
    ["pas", "apl", "leg", "lim"].forEach(k => { if (x[k]) h += xsec(XL[k], x[k], tc); });
    if (x.intv) {
      if (st.review || st.intv) h += xsec(XL.intv, x.intv, tc, "intv") + (st.review ? "" : '<p class="xs muted">Acum spune-o cu voce tare, cu cuvintele tale și cu un exemplu din proiectele tale.</p>');
      else h += '<button class="btn sm more-btn" data-a="xp-intv">Cum o spun la interviu</button>';
    }
    if (x.ver && !st.review) h += '<div class="xp-sec ver"><div class="xp-h">Verifică-te</div>' + rich(x.ver, tc) +
      (st.verR ? '<div class="ver-a">' + rich(x.verR, tc) + "</div>" : '<button class="btn sm more-btn" data-a="xp-ver">Arată răspunsul</button>') + "</div>";
    const others = Object.keys(x.gr).map(Number).filter(i => i !== st.pickOi);
    if (others.length) h += '<div class="xp-sec"><div class="xp-h">' + (chosen ? "Celelalte variante" : "De ce nu celelalte variante") + "</div>" +
      others.map(i => '<div class="xp-alt"><div class="xp-opt">„' + inlineRich(q.o[i]) + "”</div>" + rich(x.gr[i], tc) + "</div>").join("") + "</div>";
    return h + "</div>";
  }

  function vMcqRun() {
    const run = ui.run, it = run.items[run.i], q = QBY[it.id], m = MOD[q.m];
    const mock = run.mode === "mock", total = run.items.length;
    const answered = Object.keys(mock ? run.picks : run.done).length;
    const done = !mock && !!run.done[run.i], pick = run.picks[run.i];
    const correctPos = it.ord.indexOf(q.a);
    let h = '<div class="spread"><div class="eyebrow">' + esc(run.title) + " · " + (run.i + 1) + "/" + total + '</div><div class="row">' +
      (mock ? '<span class="timer" data-timer="mock">' + mmss(run.deadline - now()) + "</span>" : "") +
      '<button class="btn sm ghost" data-a="quit">' + (run.confirmQuit ? (mock ? "Sigur? Fără scor" : "Sigur ieși?") : "Ieși") + "</button></div></div>";
    h += '<div class="runbar">' + bar(answered / total) + "</div>";
    const lvlChip = '<span class="chip lvl" data-l="' + q.lvl + '" title="Nivel: ' + LVL[q.lvl] + '"><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span>' + LVL[q.lvl] + "</span>";
    h += '<div class="row"><span class="chip acc">' + esc(q.id.toUpperCase()) + "</span>" + prioChip(m.p) + '<span class="chip">' + esc(m.short) + "</span>" + lvlChip + (q.tag === "formulare" ? '<span class="chip warn">formulare</span>' : "") + "</div>";
    // Contextul vine înaintea întrebării; în simulare nu există.
    if (!mock && q.ctx) {
      if (it.cx || it.co) {
        // înainte de răspuns nu fac apăsabil termenul despre care se întreabă
        const skip = skipFor(q); if (!done) termsIn(q.q).forEach(t => skip.add(t));
        h += '<div class="ctx"><div class="ctx-h"><span class="eyebrow">Context</span><button class="linkbtn" data-a="open-sheet" data-m="' + q.m + '">Fișa modulului</button></div>' + rich(q.ctx, { seen: new Set(), skip }) + "</div>";
      }
      else h += '<button class="btn sm ctx-btn" data-a="ctx-open">Arată contextul</button>';
    }
    h += '<p class="qtext">' + fmt(q.q) + "</p>";
    if (q.code) h += codeBlock(q.code, false, true);
    h += '<div class="opts" role="group" aria-label="Variante">' + it.ord.map((oi, pos) => {
      let cls = "opt", mk = "";
      if (done) { if (pos === correctPos) { cls += " right"; mk = "✓"; } else if (pos === pick) { cls += " wrong"; mk = "✗"; } }
      else if (pick === pos) cls += " sel";
      return '<button class="' + cls + '" data-a="ans" data-pos="' + pos + '"' + (done ? " disabled" : "") + ' aria-pressed="' + (pick === pos) + '"><span class="lt">' + LETTERS[pos] + "</span><span>" + fmt(q.o[oi]) + '</span><span class="mk" aria-hidden="true">' + mk + "</span></button>";
    }).join("") + "</div>";
    if (!mock && !done) h += '<button class="btn ghost dunno" data-a="dunno">Nu știu încă – arată-mi răspunsul</button>';
    if (done) {
      const ok = pick === correctPos, dunno = pick === -1, guessed = !!(run.guess && run.guess[run.i]);
      const ttl = ok ? "Corect" : (dunno ? "Nu-i nimic · răspunsul corect e " : "Greșit · răspunsul corect e ") + LETTERS[correctPos];
      const note = guessed ? "Notat: grila revine curând, ca o greșeală."
        : ok ? (run.assist && run.assist[run.i] ? "Ai răspuns cu contextul deschis. Data viitoare grila vine fără el." : "")
        : "Grila revine curând, ca s-o fixezi.";
      const st = { ok, dunno, pickOi: pick >= 0 ? it.ord[pick] : null, more: it.more, intv: it.intv, verR: it.verR };
      h += '<div class="explain ' + (ok ? "ok" : dunno ? "dk" : "bad") + '" id="fb"><div class="ttl">' + ttl + "</div>" + vExpl(q, st, { seen: new Set(), skip: skipFor(q) }) +
        (note ? '<div class="xs fb-note">' + note + "</div>" : "") +
        (ok && !guessed ? '<button class="btn ghost sm guess-btn" data-a="guess">Am ghicit – vreau s-o revăd</button>' : "") + "</div>";
    }
    const last = run.i === total - 1;
    if (mock) {
      h += '<div class="dots" aria-label="Navigare întrebări">' + run.items.map((_, k) => '<button data-a="jump" data-i="' + k + '" class="' + (run.picks[k] !== undefined ? "ans" : "") + (k === run.i ? " cur" : "") + '">' + (k + 1) + "</button>").join("") + "</div>";
      h += '<div class="navrow"><button class="btn" data-a="prev"' + (run.i === 0 ? " disabled" : "") + '>Înapoi</button>' +
        (last ? '<button class="btn primary" data-a="submit">Predă (' + answered + "/" + total + ")</button>" : '<button class="btn primary" data-a="next">Următoarea</button>') + "</div>";
      if (!last) h += '<button class="btn ghost" data-a="submit">Predă acum (' + answered + "/" + total + " răspunse)</button>";
    } else {
      h += '<div class="navrow"><button class="btn" data-a="prev"' + (run.i === 0 ? " disabled" : "") + '>Înapoi</button>' +
        '<button class="btn primary" data-a="next"' + (done ? "" : " disabled") + ">" + (last ? "Vezi rezultatul" : "Următoarea") + "</button></div>";
      h += '<p class="xs muted">Pe laptop: tastele 1–4 aleg varianta, 0 = nu știu, C = context, Enter trece mai departe.</p>';
    }
    return h;
  }

  function answer(pos) {
    const run = ui.run; if (!run || run.kind !== "mcq") return;
    const it = run.items[run.i], q = QBY[it.id], mock = run.mode === "mock";
    // pos = -1 înseamnă „Nu știu încă” (doar în afara simulării)
    if (pos === -1 ? mock : (pos < 0 || pos >= it.ord.length)) return;
    if (mock) { run.picks[run.i] = pos; render(); return; }
    if (run.done[run.i]) return;
    const ok = pos >= 0 && it.ord[pos] === q.a;
    const assisted = !!(q.ctx && (it.cx || it.co));
    run.picks[run.i] = pos; run.done[run.i] = true;
    run.assist = run.assist || {}; if (assisted) run.assist[run.i] = true;
    updQ(q.id, ok, assisted); commit();
    if (run.mode === "diag" && !ok) adaptDiag(run, run.i);
    render();
    revealFeedback();
  }
  // „Am ghicit”: răspunsul a fost corect, dar grila e tratată ca greșită (revine curând, apare la „Greșelile mele”).
  function guess() {
    const run = ui.run; if (!run || run.kind !== "mcq" || !run.done[run.i]) return;
    const q = QBY[run.items[run.i].id];
    run.guess = run.guess || {}; run.guess[run.i] = true;
    const e = S.q[q.id]; if (e) { e.b = 1; e.l = 0; e.t = now(); }
    commit(); render();
  }
  // După răspuns, aduce în ecran explicația și butonul „Următoarea”, fără să le lase sub bara de jos.
  // Nu derulează niciodată dincolo de începutul explicației.
  function revealFeedback() {
    const fb = $("#fb"); if (!fb) return;
    const end = ($(".navrow") || fb).getBoundingClientRect().bottom + window.scrollY;
    const headH = ($(".top") || fb).getBoundingClientRect().height, footH = ($(".tabs") || fb).getBoundingClientRect().height;
    const y = Math.min(end - (window.innerHeight - footH - 12), fb.getBoundingClientRect().top + window.scrollY - headH - 12);
    const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (y > window.scrollY + 4) window.scrollTo({ top: y, behavior: calm ? "auto" : "smooth" });
  }
  function nextQ() {
    const run = ui.run; if (!run) return;
    if (run.kind === "mcq") {
      if (run.mode !== "mock" && !run.done[run.i]) return;
      if (run.i < run.items.length - 1) { run.i++; render(); window.scrollTo(0, 0); } else if (run.mode !== "mock") finishMcq();
    }
  }
  function finishMcq() {
    const run = ui.run; if (!run) return;
    const mock = run.mode === "mock";
    let n = 0, c = 0, u = 0; const per = {}, wrong = [];
    run.items.forEach((it, k) => {
      const q = QBY[it.id], pick = run.picks[k];
      if (!mock && !run.done[k]) return;
      const guessed = !!(run.guess && run.guess[k]);
      const ok = pick !== undefined && pick >= 0 && it.ord[pick] === q.a && !guessed;
      if (mock && pick !== undefined) updQ(q.id, ok);
      n++; if (ok) c++; if (pick === -1) u++;
      per[q.m] = per[q.m] || { n: 0, c: 0 }; per[q.m].n++; if (ok) per[q.m].c++;
      if (!ok) wrong.push({ id: q.id, pick: pick === undefined || pick < 0 ? null : it.ord[pick], dunno: pick === -1, guessed });
    });
    if (n) { S.h.push({ id: "h" + now(), ts: now(), kind: "mcq", mode: run.mode, title: run.title, n, c, dur: Math.round((now() - run.t0) / 1000) }); S.h = S.h.slice(-HMAX); }
    commit();
    ui.result = { kind: "mcq", title: run.title, mode: run.mode, n, c, u, per, wrong };
    ui.run = null; render(); window.scrollTo(0, 0);
  }
  function vMcqResult() {
    const r = ui.result, p = r.n ? r.c / r.n : 0;
    const verdict = !r.n ? "Nicio grilă răspunsă." :
      r.mode === "diag" ? "Ai harta de pornire. Continuă cu „Mix inteligent”: îți dă grile pe nivelul tău și urcă pe măsură ce le știi." :
      p >= 0.85 ? "Foarte bine. Treci la următorul modul." : p >= 0.7 ? "Bine. Reia greșelile ca să le fixezi." : p >= 0.5 ? "Jumătate. Recitește fișa, apoi reia greșelile." : "Încă e de lucru: fișa întâi, apoi grilele din nou.";
    let h = '<div class="eyebrow">Rezultat · ' + esc(r.title) + "</div>";
    h += '<section class="card score"><div class="big">' + pc(p) + '%</div><div class="stack-s"><h2>' + r.c + " din " + r.n + " corecte</h2>" +
      (r.u ? '<p class="small">' + r.u + (r.u === 1 ? " grilă marcată" : " grile marcate") + " „Nu știu încă”: revin primele.</p>" : "") +
      "<p class=\"muted small\">" + esc(verdict) + "</p></div></section>";
    const mods = Object.keys(r.per).sort((a, b) => r.per[a].c / r.per[a].n - r.per[b].c / r.per[b].n);
    if (mods.length > 1) {
      h += '<section class="card stack"><h3>Pe module</h3><div class="brk">' + mods.map(mid => { const x = r.per[mid]; return '<div class="brk-r"><span>' + esc(MOD[mid].short) + '</span><span class="mono xs">' + x.c + "/" + x.n + "</span>" + bar(x.c / x.n) + "</div>"; }).join("") + "</div></section>";
    }
    if (r.wrong.length) {
      h += '<div class="sec-h"><h2>De revăzut</h2><span class="xs muted mono">' + r.wrong.length + "</span></div>";
      h += r.wrong.map(w => {
        const q = QBY[w.id];
        const tc = { seen: new Set(), skip: skipFor(q) };
        const picked = w.guessed ? '<div class="muted">Ai răspuns corect, dar ai marcat-o „Am ghicit”.</div>'
          : w.pick != null ? '<div><b class="xs mono" style="color:var(--bad)">AI ALES</b><br>' + fmt(q.o[w.pick]) + "</div>"
          : '<div class="muted">' + (w.dunno ? "Ai ales „Nu știu încă”." : "Fără răspuns.") + "</div>";
        return '<details class="rev"><summary><span class="chip bad">' + esc(q.id.toUpperCase()) + "</span><span>" + fmt(q.q) + '</span></summary><div class="rv">' +
          (q.ctx ? '<div class="ctx"><div class="ctx-h"><span class="eyebrow">Context</span></div>' + rich(q.ctx, tc) + "</div>" : "") +
          (q.code ? codeBlock(q.code, false, true) : "") + picked +
          '<div><b class="xs mono" style="color:var(--ok)">CORECT</b><br>' + fmt(q.o[q.a]) + "</div>" +
          vExpl(q, { ok: !!w.guessed, pickOi: w.guessed ? null : w.pick, review: true }, tc) + "</div></details>";
      }).join("");
      h += '<button class="btn primary block" data-a="redo-wrong">Reia cele ' + r.wrong.length + " greșeli</button>";
    }
    h += '<button class="btn block" data-a="close-result">Înapoi la grile</button>';
    return h;
  }

  // ---------- views: oral ----------
  function boxOf(id) { return (S.o[id] && S.o[id].b) || 0; }
  function leit(b) { let h = '<span class="leit" title="Cutia ' + b + ' din 5" aria-label="Cutia ' + b + ' din 5">'; for (let i = 1; i <= 5; i++) h += '<i class="' + (b >= i ? "on" : "") + '" style="height:' + (4 + i * 3) + 'px"></i>'; return h + "</span>"; }
  function vOralHome() {
    const counts = [0, 0, 0, 0, 0, 0];
    ORAL.forEach(c => { counts[boxOf(c.id)]++; });
    const due = ORAL.filter(c => MOD[c.m].p < 4 && boxOf(c.id) <= 2).length;
    let h = '<div class="stack-s"><h1>Răspunsuri cu voce tare</h1><p class="muted small">Regula din documentul tău: dacă nu poți răspunde în 3–4 propoziții, cu voce tare, mai ai de lucru. Spui răspunsul, apoi bifezi ce ai acoperit. Cardul urcă o cutie la cel puțin 80% și coboară în cutia 1 sub 50%.</p></div>';
    h += '<div class="boxes" style="grid-template-columns:repeat(6,1fr)">' + ["noi", "c. 1", "c. 2", "c. 3", "c. 4", "c. 5"].map((l, i) => '<div><div class="v">' + counts[i] + '</div><div class="l">' + l + "</div></div>").join("") + "</div>";
    h += '<div class="modes">' +
      '<button class="mode hot" data-a="oral" data-f="smart"><span class="mt">Recomandate</span><span class="md">6 carduri, mai multe din cutiile mici și din P1.</span><span class="mm">~12 min</span></button>' +
      '<button class="mode" data-a="oral" data-f="due"><span class="mt">De repetat</span><span class="md">Cardurile noi și cele din cutiile 1–2 (maximum 8).</span><span class="mm">' + due + " carduri</span></button>" +
      "</div>";
    h += '<div class="sec-h"><h2>Pe module</h2><span class="xs muted">văzute · stăpânire</span></div>' + modList("oral");
    return h;
  }
  function startOral(opt) {
    opt = opt || {};
    let cards = [], title = "Oral";
    if (opt.ids) { cards = opt.ids.map(id => OBY[id]).filter(Boolean); title = "Reluare"; }
    else if (opt.ms) { cards = sortWeak(ORAL.filter(c => opt.ms.indexOf(c.m) >= 0), S.o); title = opt.ms.map(m => MOD[m].short).join(" + "); }
    else if (opt.due) { cards = shuffle(ORAL.filter(c => MOD[c.m].p < 4 && boxOf(c.id) <= 2)).sort((a, b) => rankBox(S.o[a.id]) - rankBox(S.o[b.id])).slice(0, 8); title = "De repetat"; }
    else { cards = wsample(ORAL.filter(c => MOD[c.m].p < 4), wO, 6); title = "Recomandate"; }
    if (!cards.length) { toast(opt.due ? "Niciun card în cutiile 0–2. Încearcă „Recomandate”." : "Nu am găsit carduri."); return; }
    ui.result = null;
    ui.run = { kind: "oral", title, items: cards.map(c => c.id), i: 0, phase: "ask", ticks: {}, scores: {}, t0: now(), tEnd: 0, confirmQuit: false };
    ui.tab = "oral"; render(); window.scrollTo(0, 0);
  }
  function vOralRun() {
    const run = ui.run, c = OBY[run.items[run.i]], m = MOD[c.m], total = run.items.length;
    let h = '<div class="spread"><div class="eyebrow">' + esc(run.title) + " · " + (run.i + 1) + "/" + total + '</div><button class="btn sm ghost" data-a="quit">' + (run.confirmQuit ? "Sigur ieși?" : "Ieși") + "</button></div>";
    h += '<div class="runbar">' + bar(run.i / total) + "</div>";
    h += '<article class="icard"><div class="icard-h"><span class="row" style="gap:6px">' + prioChip(m.p) + '<span class="chip">' + esc(m.short) + "</span></span>" + leit(boxOf(c.id)) + '</div><div class="icard-b"><div class="icard-q">' + fmt(c.q) + "</div>";
    if (run.phase === "ask") {
      h += '<p class="muted small">Răspunde cu voce tare, în 3–4 propoziții: definiție → mecanism → compromis → exemplu din experiența ta.</p>';
      h += '<div class="row">' + (run.tEnd ? '<span class="timer" data-timer="oral">' + mmss(run.tEnd - now()) + '</span><button class="btn sm" data-a="oral-timer">Oprește</button>' : '<button class="btn sm" data-a="oral-timer">Cronometru 90 s</button>') + "</div>";
    }
    h += "</div></article>";
    if (run.phase === "ask") {
      h += '<button class="btn primary block" data-a="oral-reveal">Am răspuns: arată punctele cheie</button>';
    } else {
      const ticked = c.k.filter((_, i) => run.ticks[i]).length;
      h += '<section class="card stack"><div class="spread"><h3>Ce ai acoperit?</h3><span class="chip' + (ticked / c.k.length >= 0.8 ? " ok" : ticked / c.k.length >= 0.5 ? " warn" : "") + '">' + ticked + "/" + c.k.length + '</span></div><div class="kp">' +
        c.k.map((p, i) => '<button class="kp-i" data-a="tick" data-k="' + i + '" aria-pressed="' + !!run.ticks[i] + '"><span class="check">' + CHECK + "</span><span>" + fmt(p) + "</span></button>").join("") + "</div></section>";
      h += '<details class="model"><summary>Model de răspuns</summary><p>' + inlineRich(c.model, { seen: new Set(), skip: new Set(TERM_SKIP[c.m] || []) }) + "</p></details>";
      h += '<button class="btn primary block" data-a="oral-save">Salvează și ' + (run.i === total - 1 ? "termină" : "continuă") + " (" + ticked + "/" + c.k.length + ")</button>";
    }
    return h;
  }
  function oralSave() {
    const run = ui.run, c = OBY[run.items[run.i]];
    const ticked = c.k.filter((_, i) => run.ticks[i]).length, p = ticked / c.k.length;
    updO(c.id, p); run.scores[c.id] = p; commit();
    if (run.i < run.items.length - 1) { run.i++; run.phase = "ask"; run.ticks = {}; run.tEnd = 0; render(); window.scrollTo(0, 0); }
    else finishOral();
  }
  function finishOral() {
    const run = ui.run, ids = Object.keys(run.scores);
    if (ids.length) {
      const avg = ids.reduce((s, id) => s + run.scores[id], 0) / ids.length;
      S.h.push({ id: "h" + now(), ts: now(), kind: "oral", mode: "oral", title: run.title, n: ids.length, c: Math.round(avg * ids.length * 100) / 100, dur: Math.round((now() - run.t0) / 1000) });
      S.h = S.h.slice(-HMAX); commit();
      ui.result = { kind: "oral", title: run.title, items: ids.map(id => ({ id, p: run.scores[id] })), avg };
    }
    ui.run = null; render(); window.scrollTo(0, 0);
  }
  function vOralResult() {
    const r = ui.result;
    let h = '<div class="eyebrow">Rezultat oral · ' + esc(r.title) + "</div>";
    h += '<section class="card score"><div class="big">' + pc(r.avg) + '%</div><div class="stack-s"><h2>' + r.items.length + " carduri</h2><p class=\"muted small\">Media punctelor cheie acoperite. Sub 50% → cardul revine în cutia 1.</p></div></section>";
    h += '<section class="card stack-s">' + r.items.map(x => { const c = OBY[x.id]; return '<div class="spread"><span class="small">' + fmt(c.q) + '</span><span class="row" style="flex:none"><span class="chip ' + (x.p >= 0.8 ? "ok" : x.p >= 0.5 ? "warn" : "bad") + '">' + pc(x.p) + "%</span>" + leit(boxOf(c.id)) + "</span></div>"; }).join('<hr style="border:0;border-top:1px solid var(--line);margin:0">') + "</section>";
    const weak = r.items.filter(x => x.p < 0.5);
    if (weak.length) h += '<button class="btn primary block" data-a="oral-redo">Reia cele ' + weak.length + " carduri sub 50%</button>";
    h += '<button class="btn block" data-a="close-result">Înapoi la oral</button>';
    return h;
  }

  // ---------- views: study ----------
  const SEGS = [["sheets", "Fișe"], ["gloss", "Glosar"], ["katas", "Live coding"], ["design", "System design"], ["behav", "Comportamental"], ["tactics", "Tactici"]];
  function vStudy() {
    const st = ui.study;
    let h = '<div class="seg" role="group" aria-label="Secțiuni de studiu">' + SEGS.map(s => '<button data-a="seg" data-seg="' + s[0] + '" aria-pressed="' + (st.seg === s[0]) + '">' + s[1] + "</button>").join("") + "</div>";
    if (st.seg === "sheets") h += vSheets();
    else if (st.seg === "gloss") h += vGloss();
    else if (st.seg === "katas") h += st.kata ? vKata(KBY[st.kata]) : vKataList();
    else if (st.seg === "design") h += vDesign();
    else if (st.seg === "behav") h += vBehav();
    else h += vTactics();
    return h;
  }
  function figure(key) {
    const d = P.diagrams[key]; if (!d) return "";
    return '<figure><div class="figwrap">' + d.svg + "</div><figcaption>" + fmt(d.cap) + "</figcaption></figure>";
  }
  function vSheets() {
    let h = '<p class="muted small">Ce trebuie să poți spune, pe module. Deschizi fișa, o citești, apoi faci grilele și cardurile orale ale modulului.</p>';
    [1, 2, 3, 4].forEach(p => {
      h += '<div class="eyebrow" style="margin-top:4px">' + PNAME[p] + "</div>";
      MODS.filter(m => m.p === p).forEach(m => {
        const s = P.sheets[m.id], st = modStats(m.id), nq = MCQ_BY_M[m.id].length, no = ORAL_BY_M[m.id].length;
        const open = ui.study.open === m.id;
        h += '<details class="sheet" id="sheet-' + m.id + '" data-m="' + m.id + '"' + (open ? " open" : "") + '><summary><span class="chip">' + m.code + '</span><span class="nm">' + esc(m.name) + '</span><span class="xs muted mono">' + pc(st.mastery) + "%</span></summary>";
        if (open) {
          const tc = { seen: new Set(), skip: new Set(TERM_SKIP[m.id] || []) };
          h += '<div class="sheet-b"><p class="lead">' + inlineRich(s.lead, tc) + "</p>" + (s.diagram ? figure(s.diagram) : "") +
            '<ul class="pts">' + s.points.map(x => "<li>" + inlineRich(x, tc) + "</li>").join("") + "</ul>" +
            (s.avoid ? '<div class="avoid"><b>De evitat la interviu</b>' + s.avoid.map(x => "<span>" + fmt(x) + "</span>").join("") + "</div>" : "") +
            '<div class="row">' + (nq ? '<button class="btn primary sm" data-a="mcq-mod" data-m="' + m.id + '">Grile (' + nq + ")</button>" : "") +
            (no ? '<button class="btn sm" data-a="oral-mod" data-m="' + m.id + '">Oral (' + no + ")</button>" : "") +
            (s.page ? '<button class="btn sm" data-a="seg" data-seg="' + s.page + '">Deschide pagina</button>' : "") + "</div></div>";
        }
        h += "</details>";
      });
    });
    return h;
  }
  function kataStatus(id) { const e = S.k[id]; return e && e.s; }
  const KST = { solo: ["ok", "Rezolvat singur"], hint: ["warn", "Cu indicii"], redo: ["bad", "De reluat"] };
  function vKataList() {
    let h = '<p class="muted small">Exerciții de live coding alese pentru un rol de detecție: ferestre de timp, deduplicare, retry, procesare pe stream. Lucrezi cu cronometru, gândind cu voce tare; soluțiile de referință sunt testate.</p>';
    h += '<div class="stack-s">' + KATAS.map(k => {
      const s = kataStatus(k.id);
      return '<button class="kata" data-a="kata" data-k="' + k.id + '"><span class="n">' + k.n + '</span><span class="stack-s" style="gap:2px;min-width:0"><span class="t">' + esc(k.title) + '</span><span class="xs muted">' + esc(k.level) + "</span></span>" + (s ? '<span class="chip ' + KST[s][0] + '">' + KST[s][1] + "</span>" : '<span class="chip">nou</span>') + "</button>";
    }).join("") + "</div>";
    return h;
  }
  function vKata(k) {
    const st = ui.study, code = (P.kataCode || {})[k.id] || "";
    const s = kataStatus(k.id);
    let h = '<button class="btn ghost" data-a="kata-back" style="align-self:flex-start">← Toate exercițiile</button>';
    h += '<section class="card stack"><div class="row"><span class="chip acc">Kata ' + k.n + '</span><span class="chip">' + esc(k.level) + "</span>" + (s ? '<span class="chip ' + KST[s][0] + '">' + KST[s][1] + "</span>" : "") + "</div><h2>" + esc(k.title) + '</h2><p class="muted small">' + fmt(k.why) + "</p><p>" + fmt(k.prompt) + "</p>" + codeBlock(k.example) +
      '<div class="row">' + (st.kEnd ? '<span class="timer" data-timer="kata">' + mmss(st.kEnd - now()) + '</span><button class="btn sm" data-a="kata-timer">Oprește</button>' : '<button class="btn sm" data-a="kata-timer">Cronometru 20 min</button>') + "</div></section>";
    h += '<p class="xs muted">Protocol: clarifici input și cazuri limită → spui soluția simplă și complexitatea → scrii codul → treci prin exemple → discuți follow-up-urile.</p>';
    for (let i = 0; i < Math.min(st.hints, k.hints.length); i++) h += '<div class="hint"><b class="xs mono">INDICIU ' + (i + 1) + "</b><br>" + fmt(k.hints[i]) + "</div>";
    if (st.hints < k.hints.length) h += '<button class="btn" data-a="kata-hint">Arată un indiciu (' + (st.hints + 1) + "/" + k.hints.length + ")</button>";
    h += '<details class="model"><summary>Soluția de referință (testată cu pytest)</summary><div class="stack-s" style="padding:0 14px 14px">' + codeBlock(code) + '<button class="btn sm" data-a="copy-code" data-k="' + k.id + '">Copiază codul</button></div></details>';
    h += '<section class="card stack-s"><h3>Complexitate</h3><p class="small">' + fmt(k.complexity) + '</p><h3 style="margin-top:6px">Întrebări de follow-up</h3><ul class="pts">' + k.follow.map(f => "<li>" + fmt(f) + "</li>").join("") + "</ul></section>";
    h += '<section class="card stack-s"><h3>Cum a mers?</h3><div class="row">' + Object.keys(KST).map(key => '<button class="btn sm' + (s === key ? " primary" : "") + '" data-a="kata-status" data-s="' + key + '">' + KST[key][1] + "</button>").join("") + "</div></section>";
    return h;
  }
  function vDesign() {
    const d = P.extra.design;
    let h = '<section class="card stack"><h2>' + esc(d.title) + '</h2><p class="small">' + fmt(d.intro) + "</p>" + figure("design") + "</section>";
    h += d.steps.map(s => '<section class="card flat stack-s"><h3>' + esc(s.h) + '</h3><ul class="pts">' + s.list.map(x => "<li>" + fmt(x) + "</li>").join("") + "</ul></section>").join("");
    h += '<button class="btn primary block" data-a="oral-mod" data-m="design">Exersează oral (2 carduri)</button>';
    return h;
  }
  function vBehav() {
    const b = P.extra.behav;
    let h = '<section class="card stack"><h2>' + esc(b.pitch.h) + '</h2><p class="muted small">' + fmt(b.pitch.note) + '</p><p style="line-height:1.65">' + fmt(b.pitch.text) + '</p><button class="btn primary" data-a="oral-mod" data-m="behav">Exersează cu voce tare (4 carduri)</button></section>';
    h += '<section class="card stack-s"><h3>Stack-ul Onapsis ↔ experiența ta</h3><div style="overflow-x:auto"><table class="map">' + b.map.map(r => "<tr><td>" + esc(r[0]) + "</td><td>" + fmt(r[1]) + "</td></tr>").join("") + "</table></div></section>";
    h += '<div class="sec-h"><h2>Povești STAR</h2></div>';
    h += b.stories.map(s => '<section class="card stack-s"><h3>' + esc(s.h) + '</h3><div class="star"><b>S</b><span>' + fmt(s.s) + "</span><b>T</b><span>" + fmt(s.t) + "</span><b>A</b><span>" + fmt(s.a) + "</span><b>R</b><span>" + fmt(s.r) + "</span></div></section>").join("");
    h += '<div class="sec-h"><h2>Întrebări delicate</h2></div>';
    h += b.extra.map(x => '<section class="card flat stack-s"><h3>' + esc(x.h) + '</h3><p class="small">' + fmt(x.a) + "</p></section>").join("");
    h += '<section class="card stack-s"><h3>Întrebări pentru ei</h3><ol class="qs">' + b.questions.map(q => "<li>" + fmt(q) + "</li>").join("") + "</ol></section>";
    return h;
  }
  function vTactics() {
    return P.extra.tactics.map(t => {
      let h = '<section class="card stack-s"><h3>' + esc(t.h) + "</h3>";
      if (t.list) h += '<ul class="pts">' + t.list.map(x => "<li>" + fmt(x) + "</li>").join("") + "</ul>";
      if (t.pairs) h += t.pairs.map(p => '<div class="pair"><span class="no">' + fmt(p[0]) + '</span><span class="yes">→ ' + fmt(p[1]) + "</span></div>").join("");
      if (t.note) h += '<p class="small muted">' + fmt(t.note) + "</p>";
      return h + "</section>";
    }).join("");
  }

  // ---------- views: progress ----------
  function vProgress() {
    const r = readiness();
    let h = '<div class="stack-s"><h1>Progres</h1><p class="muted small">Pregătirea e media stăpânirii pe module, ponderată după prioritate (P1 ×3, P2 ×2, P3 ×1). O grilă contează 50% după primul răspuns corect, 75% după două la rând și 100% după patru. O greșeală o readuce la zero.</p></div>';
    h += '<section class="card kpis">' + kpi(pc(r.ready) + "%", "pregătire") + kpi(pc(r.cover) + "%", "acoperire") + kpi(String(r.ans), "răspunsuri la grile") + kpi(r.ans ? pc(r.cor / r.ans) + "%" : "–", "corecte") + "</section>";
    h += '<div class="sec-h"><h2>Harta de acoperire</h2><span class="xs muted">atinge un modul</span></div>';
    h += '<div class="cov">' + MODS.map(m => {
      const st = modStats(m.id), x = st.mastery;
      if (!st.seen) return '<button class="tile unseen" data-a="open-sheet" data-m="' + m.id + '"><span class="c">' + m.code + '</span><span class="s">' + esc(m.short) + '</span><span class="p">–</span></button>';
      const mix = Math.round(14 + x * 86);
      return '<button class="tile' + (mix >= 58 ? " dark" : "") + '" style="background:color-mix(in srgb, var(--accent) ' + mix + '%, var(--surface))" data-a="open-sheet" data-m="' + m.id + '"><span class="c">' + m.code + '</span><span class="s">' + esc(m.short) + '</span><span class="p">' + pc(x) + "%</span></button>";
    }).join("") + "</div>";
    h += '<div class="legend"><i style="background:var(--bg);border-style:dashed"></i>nevăzut<i style="background:color-mix(in srgb, var(--accent) 20%, var(--surface))"></i>început<i style="background:color-mix(in srgb, var(--accent) 60%, var(--surface))"></i>pe drum<i style="background:var(--accent)"></i>stăpânit</div>';
    const counts = [0, 0, 0, 0, 0, 0]; ORAL.forEach(c => counts[boxOf(c.id)]++);
    h += '<section class="card stack-s"><h3>Carduri orale pe cutii</h3><div class="boxes" style="grid-template-columns:repeat(6,1fr)">' + ["noi", "c. 1", "c. 2", "c. 3", "c. 4", "c. 5"].map((l, i) => '<div><div class="v">' + counts[i] + '</div><div class="l">' + l + "</div></div>").join("") + "</div></section>";
    const ks = { solo: 0, hint: 0, redo: 0 }; KATAS.forEach(k => { const s = kataStatus(k.id); if (s) ks[s]++; });
    h += '<section class="card stack-s"><h3>Live coding</h3><p class="small">' + ks.solo + " rezolvate singur · " + ks.hint + " cu indicii · " + ks.redo + " de reluat · " + (KATAS.length - ks.solo - ks.hint - ks.redo) + " neîncepute</p></section>";
    const hist = S.h.slice().reverse();
    const mcqH = S.h.filter(e => e.kind === "mcq" && e.n);
    h += '<section class="card stack-s"><h3>Istoric</h3>' + (mcqH.length > 1 ? spark(mcqH.slice(-20).map(e => e.c / e.n)) : "") +
      (hist.length ? '<div class="hist">' + hist.slice(0, 15).map(e => '<div class="hist-r"><span>' + esc(e.title) + ' <span class="xs muted">' + (e.kind === "oral" ? "oral" : "grile") + '</span></span><span class="mono xs">' + (e.kind === "oral" ? pc(e.c / e.n) + "%" : e.c + "/" + e.n) + '</span><span class="xs muted">' + whenStr(e.ts) + " · " + Math.max(1, Math.round(e.dur / 60)) + " min</span></div>").join("") + "</div>" : '<p class="small muted">Nicio sesiune încă. Începe cu testul diagnostic.</p>') + "</section>";
    h += '<section class="card stack-s"><h3>Salvare</h3><p class="small" id="sync-l">' + esc(Sync.label()) + '</p><div class="row">' +
      '<button class="btn sm" data-a="exp">' + (ui.prog.exp ? "Ascunde exportul" : "Exportă progresul") + "</button>" +
      '<button class="btn sm" data-a="imp">' + (ui.prog.imp ? "Ascunde importul" : "Importă") + "</button>" +
      '<button class="btn sm danger" data-a="reset">' + (ui.prog.reset ? "Confirmă: șterge tot" : "Resetează") + "</button></div>";
    if (ui.prog.exp) h += '<textarea class="io" id="exp-t" readonly aria-label="Progres exportat">' + esc(JSON.stringify(S)) + '</textarea><button class="btn sm" data-a="copy-exp">Copiază</button>';
    if (ui.prog.imp) h += '<textarea class="io" id="imp-t" aria-label="Lipește progresul exportat" placeholder="Lipește aici textul exportat de pe alt dispozitiv"></textarea><button class="btn sm primary" data-a="do-imp">Importă (îmbină cu progresul de aici)</button>';
    h += "</section>";
    return h;
  }
  function whenStr(ts) {
    const d = new Date(ts), days = ["dum", "lun", "mar", "mie", "joi", "vin", "sâm"];
    return days[d.getDay()] + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function spark(vals) {
    const W = 320, H = 64, n = vals.length, x = i => 4 + (i * (W - 8)) / Math.max(1, n - 1), y = v => H - 6 - v * (H - 12);
    const pts = vals.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
    const area = "4," + (H - 6) + " " + pts + " " + x(n - 1).toFixed(1) + "," + (H - 6);
    return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Scorurile ultimelor ' + n + ' sesiuni de grile"><line class="gd" x1="0" x2="' + W + '" y1="' + y(0.8).toFixed(1) + '" y2="' + y(0.8).toFixed(1) + '"/><polygon class="ar" points="' + area + '"/><polyline class="ln" points="' + pts + '"/><circle class="pt" cx="' + x(n - 1).toFixed(1) + '" cy="' + y(vals[n - 1]).toFixed(1) + '" r="3.5"/></svg><p class="xs muted">Scorul pe sesiune; linia punctată = 80%.</p>';
  }

  // ---------- navigation helpers ----------
  function goTask(id) {
    const t = TBY[id]; if (!t || !t.go) return;
    const g = t.go;
    if (g.t === "diag" || g.t === "smart" || g.t === "mock" || g.t === "mistakes") startMcq(g.t);
    else if (g.t === "mcq") startMcq("module", { ms: g.ms || [g.m] });
    else if (g.t === "sheet") openSheet(g.m);
    else if (g.t === "oral") startOral(g.due ? { due: true } : { ms: g.ms || [g.m] });
    else if (g.t === "kata") { ui.tab = "study"; ui.study.seg = "katas"; ui.study.kata = g.id; ui.study.hints = 0; render(); window.scrollTo(0, 0); }
    else if (g.t === "study") { ui.tab = "study"; ui.study.seg = g.tab; ui.study.kata = null; render(); window.scrollTo(0, 0); }
  }
  function openSheet(mid) {
    ui.tab = "study"; ui.study.seg = "sheets"; ui.study.open = mid; render();
    const el = document.getElementById("sheet-" + mid);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
  }
  function quit() {
    const run = ui.run; if (!run) return;
    if (!run.confirmQuit) {
      run.confirmQuit = true; render();
      setTimeout(() => { if (ui.run === run && run.confirmQuit) { run.confirmQuit = false; render(); } }, 3500);
      return;
    }
    if (run.kind === "mcq" && run.mode !== "mock" && Object.keys(run.done).length) { finishMcq(); return; }
    if (run.kind === "oral" && Object.keys(run.scores).length) { finishOral(); return; }
    ui.run = null; render(); window.scrollTo(0, 0);
  }
  function copyText(text, fallbackEl) {
    const done = () => toast("Copiat");
    const fail = () => {
      if (fallbackEl) { const rng = document.createRange(); rng.selectNodeContents(fallbackEl); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rng); }
      toast("Selectat: copiază manual");
    };
    try { navigator.clipboard.writeText(text).then(done, fail); } catch (e) { fail(); }
  }

  // ---------- glosar: fișa de termen, deschisă jos, peste pagina curentă ----------
  const gsheet = document.createElement("div");
  gsheet.className = "gsheet"; gsheet.hidden = true;
  document.body.appendChild(gsheet);
  let gsReturn = null;
  function openTerm(id) {
    const g = GBY[id]; if (!g) return;
    if (gsheet.hidden) gsReturn = document.activeElement;
    const tc = { seen: new Set([id]), skip: new Set() };
    let h = '<div class="gs-back" data-a="term-close"></div><div class="gs-panel" role="dialog" aria-modal="true" aria-labelledby="gs-t">' +
      '<div class="gs-head"><h3 id="gs-t">' + esc(g.t) + '</h3><button class="btn sm ghost" data-a="term-close">Închide</button></div><div class="gs-body">';
    h += '<p class="gs-def">' + inlineRich(g.def, tc) + "</p>";
    [["scop", "La ce folosește"], ["ex", "Exemplu"], ["an", "Analogie"], ["lim", "Atenție"]].forEach(([k, l]) => { if (g[k]) h += xsec(l, g[k], tc); });
    if (g.see.length) h += '<div class="xp-sec"><div class="xp-h">Vezi și</div><div class="row">' + g.see.map(s => {
      const sid = findTerm(s);
      return sid && sid !== id ? '<button class="chip acc" data-a="term" data-t="' + sid + '">' + esc(s) + "</button>" : '<span class="chip">' + esc(s) + "</span>";
    }).join("") + "</div></div>";
    gsheet.innerHTML = h + "</div></div>";
    gsheet.hidden = false; document.body.classList.add("gs-open");
    const panel = gsheet.querySelector(".gs-body"); if (panel) panel.scrollTop = 0;
    const btn = gsheet.querySelector('.gs-head [data-a="term-close"]'); if (btn) btn.focus({ preventScroll: true });
  }
  function closeTerm() {
    gsheet.hidden = true; gsheet.innerHTML = ""; document.body.classList.remove("gs-open");
    if (gsReturn && gsReturn.focus && document.contains(gsReturn)) gsReturn.focus({ preventScroll: true });
    gsReturn = null;
  }
  function vGloss() {
    return '<p class="muted small">' + GLOSS.length + " de termeni, explicați pe scurt. Îi găsești și apăsând pe cuvintele subliniate din context și din explicații.</p>" +
      '<div class="glist">' + GLOSS.map(g => '<button class="glrow" data-a="term" data-t="' + g.id + '"><span class="gl-t">' + esc(g.t) + '</span><span class="gl-d">' + inlineRich(g.def) + "</span></button>").join("") + "</div>";
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-a]"); if (!b || b.disabled) return;
    const a = b.dataset.a;
    switch (a) {
      case "tab": ui.tab = b.dataset.tab; if (ui.tab === "study" && ui.study.seg === "katas") { /* păstrează kata deschis */ } render(); window.scrollTo(0, 0); break;
      case "go": goTask(b.dataset.id); break;
      case "plan-toggle": { const id = b.dataset.id; S.p[id] = { d: isDone(id) ? 0 : 1, t: now() }; commit(); render(); break; }
      case "mcq": startMcq(b.dataset.mode); break;
      case "mcq-mod": startMcq("module", { ms: [b.dataset.m] }); break;
      case "ans": answer(+b.dataset.pos); break;
      case "dunno": answer(-1); break;
      case "ctx-open": if (ui.run && ui.run.kind === "mcq") { ui.run.items[ui.run.i].co = true; render(); } break;
      case "xp-more": case "xp-intv": case "xp-ver":
        if (ui.run && ui.run.kind === "mcq") { ui.run.items[ui.run.i][{ "xp-more": "more", "xp-intv": "intv", "xp-ver": "verR" }[a]] = true; render(); }
        break;
      case "guess": guess(); break;
      case "term": openTerm(b.dataset.t); break;
      case "term-close": closeTerm(); break;
      case "next": nextQ(); break;
      case "prev": if (ui.run && ui.run.i > 0) { ui.run.i--; render(); } break;
      case "jump": if (ui.run) { ui.run.i = +b.dataset.i; render(); } break;
      case "submit": finishMcq(); break;
      case "quit": quit(); break;
      case "close-result": ui.result = null; render(); window.scrollTo(0, 0); break;
      case "redo-wrong": if (ui.result) startMcq("ids", { ids: ui.result.wrong.map(w => w.id), title: "Reluare greșeli" }); break;
      case "oral": startOral(b.dataset.f === "due" ? { due: true } : {}); break;
      case "oral-mod": startOral({ ms: [b.dataset.m] }); break;
      case "oral-timer": if (ui.run) { ui.run.tEnd = ui.run.tEnd ? 0 : now() + 90000; ui.run.tDone = false; render(); } break;
      case "oral-reveal": if (ui.run) { ui.run.phase = "review"; ui.run.tEnd = 0; render(); } break;
      case "tick": if (ui.run) { const k = +b.dataset.k; ui.run.ticks[k] = !ui.run.ticks[k]; render(); } break;
      case "oral-save": oralSave(); break;
      case "oral-redo": if (ui.result) startOral({ ids: ui.result.items.filter(x => x.p < 0.5).map(x => x.id) }); break;
      case "seg": ui.tab = "study"; ui.study.seg = b.dataset.seg; ui.study.kata = null; render(); window.scrollTo(0, 0); break;
      case "open-sheet": openSheet(b.dataset.m); break;
      case "kata": ui.study.kata = b.dataset.k; ui.study.hints = 0; ui.study.kEnd = 0; render(); window.scrollTo(0, 0); break;
      case "kata-back": ui.study.kata = null; ui.study.kEnd = 0; render(); window.scrollTo(0, 0); break;
      case "kata-hint": ui.study.hints++; render(); break;
      case "kata-timer": ui.study.kEnd = ui.study.kEnd ? 0 : now() + 20 * 60000; ui.study.kDone = false; render(); break;
      case "kata-status": { const id = ui.study.kata; S.k[id] = { s: b.dataset.s, t: now() }; commit(); render(); toast("Notat"); break; }
      case "copy-code": { const pre = b.parentElement.querySelector("pre"); copyText((P.kataCode || {})[b.dataset.k] || "", pre); break; }
      case "exp": ui.prog.exp = !ui.prog.exp; render(); break;
      case "imp": ui.prog.imp = !ui.prog.imp; render(); break;
      case "copy-exp": copyText(JSON.stringify(S), $("#exp-t")); break;
      case "do-imp": {
        const t = $("#imp-t"); let data = null;
        try { data = JSON.parse(t.value); } catch (err) { toast("Textul nu e un export valid"); break; }
        const res = mergeState(S, prune(normalize(data)));
        S = res.state; commit(); ui.prog.imp = false; render(); toast("Progres importat");
        break;
      }
      case "reset":
        if (!ui.prog.reset) { ui.prog.reset = true; render(); setTimeout(() => { if (ui.prog.reset) { ui.prog.reset = false; if (ui.tab === "progress") render(); } }, 4000); }
        else { S = emptyState(); S.r = now(); ui.prog.reset = false; ui.result = null; commit(); render(); toast("Progres resetat"); }
        break;
    }
  });
  document.addEventListener("toggle", e => {
    const d = e.target;
    if (d && d.classList && d.classList.contains("sheet")) {
      const mid = d.dataset.m;
      if (d.open && ui.study.open !== mid) { ui.study.open = mid; render(); const el = document.getElementById("sheet-" + mid); if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" }); }
      else if (!d.open && ui.study.open === mid) { ui.study.open = null; render(); }
    }
  }, true);
  document.addEventListener("keydown", e => {
    if (!gsheet.hidden) { if (e.key === "Escape") { closeTerm(); e.preventDefault(); } return; }
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
    const run = ui.run; if (!run || ui.tab !== (run.kind === "mcq" ? "quiz" : "oral")) return;
    if (run.kind === "mcq") {
      if (/^[1-6]$/.test(e.key)) { answer(+e.key - 1); e.preventDefault(); }
      else if (e.key === "0") { answer(-1); e.preventDefault(); }
      else if ((e.key === "c" || e.key === "C") && run.mode !== "mock") { run.items[run.i].co = true; render(); }
      else if (e.key === "Enter" || e.key === "ArrowRight") { if (run.mode === "mock" || run.done[run.i]) { nextQ(); e.preventDefault(); } }
      else if (e.key === "ArrowLeft" && run.i > 0) { run.i--; render(); }
    }
  });

  // ---------- timers ----------
  setInterval(() => {
    const run = ui.run;
    if (run && run.kind === "mcq" && run.deadline) {
      const left = run.deadline - now(), el = $('[data-timer="mock"]');
      if (el) { el.textContent = mmss(left); el.classList.toggle("low", left < 3 * 60000); }
      if (left <= 0) { toast("Timpul a expirat"); finishMcq(); }
    }
    if (run && run.kind === "oral" && run.tEnd) {
      const left = run.tEnd - now(), el = $('[data-timer="oral"]');
      if (el) { el.textContent = left > 0 ? mmss(left) : "Timpul!"; el.classList.toggle("low", left < 15000); }
      if (left <= 0 && !run.tDone) { run.tDone = true; try { if (navigator.vibrate) navigator.vibrate(150); } catch (err) { /* opțional */ } }
    }
    if (ui.study.kEnd) {
      const left = ui.study.kEnd - now(), el = $('[data-timer="kata"]');
      if (el) { el.textContent = left > 0 ? mmss(left) : "Timpul!"; el.classList.toggle("low", left < 120000); }
    }
  }, 500);

  // ---------- boot ----------
  function start(data) {
    const local = loadLocal();
    if (local) S = local;
    if (data && data.ui && typeof data.ui === "object") {
      const u = data.ui;
      if (u.run && u.run.kind === "mcq" && !(u.run.items || []).every(it => QBY[it.id])) u.run = null;
      if (u.run && u.run.kind === "oral" && !(u.run.items || []).every(id => OBY[id])) u.run = null;
      ui = Object.assign(ui, u);
    }
    render();
    Sync.init();
  }
  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === "function") { try { hot.snapshot(() => ({ ui: snapshotUi() })); } catch (e) { /* opțional */ } }
  if (hot && typeof hot.ready === "function") { try { hot.ready(start); } catch (e) { start({}); } }
  else start((hot && hot.data) || {});

  // expus pentru verificare locală
  window.__prep = { mergeState, normalize, prune, readiness, modStats, pickDiag, pickMock, pickSmart, unlockedLvl, updQ, updO, state: () => S };
})();
