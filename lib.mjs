// Shared by build.mjs and validate.mjs: loads the app data and parses the explanation/glossary markdown.
import fs from "node:fs";
import vm from "node:vm";

export const DATA_FILES = ["data_core.js", "data_tech.js", "data_diagrams.js", "data_mcq1.js", "data_mcq2.js", "data_mcq3.js", "data_mcq4.js", "data_mcq5.js", "data_mcq6.js", "data_ctx.js", "data_oral.js", "data_oral2.js", "data_fe.js", "data_katas.js", "data_skel.js", "data_patterns.js"];

// Modulele Jarvis (Live, Audio, Call, Jarvis), cele pentru „Întreabă despre asta” (Ask, GeminiText), conexiunea la server (ServerConn, LiveToken), jurnalul de încercări (Journal) și sincronizarea lui (JournalSync): declarații globale, încărcate înaintea lui app.js. Aceleași fișiere rulează și în Node, în tools/unit.
export const LIB_FILES = ["server_conn.js", "live_token.js", "live.js", "audio.js", "call.js", "jarvis.js", "ask.js", "gemini_text.js", "journal.js", "server_ai.js", "sync.js"];

// Codul de referință din katas/: secțiunile „# === kN ===” (Python) sau „// === kN ===” (JS/TS) sunt soluțiile kata
// (sursele întâi, apoi testele lor, lipite la cod), iar „=== s-… ===” sunt referințele de schelet (fără teste).
export function loadCode(root) {
  const kataCode = {}, skelCode = {};
  const files = fs.readdirSync(new URL("./katas/", root))
    .filter(f => /\.(py|mjs|ts|tsx|sql|ya?ml|dockerfile)$/i.test(f) && !/^test_/.test(f) && !/\.test\./.test(f))
    .sort((a, b) => a.localeCompare(b));
  const kataTests = fs.readdirSync(new URL("./katas/", root)).filter(f => /\.test\.(mjs|tsx)$/.test(f)).sort();
  for (const f of files.concat(kataTests)) {
    const src = fs.readFileSync(new URL("./katas/" + f, root), "utf8");
    for (const m of src.matchAll(/^(#|\/\/|--) === (k\d+|s-[a-z0-9-]+) ===\n([\s\S]*?)^\1 === end ===/gm)) {
      const code = m[3].replace(/\s+$/, "") + "\n", id = m[2];
      if (id[0] === "s") { if (skelCode[id]) throw new Error("schelet duplicat: " + id); skelCode[id] = code; }
      else kataCode[id] = kataCode[id] ? kataCode[id] + "\n// --- test ---\n" + code : code;
    }
  }
  const ordered = {};
  for (const k of Object.keys(kataCode).sort((a, b) => a.slice(1) - b.slice(1))) ordered[k] = kataCode[k];  // k1, k2, …
  return { kataCode: ordered, skelCode };
}

export function loadData(root) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const f of DATA_FILES) vm.runInContext(fs.readFileSync(new URL("./src/" + f, root), "utf8"), ctx, { filename: f });
  return ctx.window.PREP;
}

// ---- explanations ----
// Format (one block per question):
//   ### py-01
//   Context: ...            (optional, replaces the pre-question context)
//   Pe scurt: ...  Scop: ...  Mecanism: ...  Pas cu pas: ...  Aplicare: ...  Legătură: ...
//   Limită: ...  La interviu: ...  Verificare: ...  Răspuns verificare: ...
//   Varianta greșită: „text exact al variantei” — explicația      (format Perplexity)
//   Varianta greșită B: explicația                                 (B/C/D = indexul din sursă)
// A field continues on the following lines (fenced code blocks included) until the next field.
export const FIELDS = {
  "Context": "ctx", "Pe scurt": "scurt", "Scop": "scop", "Mecanism": "mec", "Pas cu pas": "pas",
  "Aplicare": "apl", "Legătură": "leg", "Limită": "lim", "La interviu": "intv",
  "Verificare": "ver", "Răspuns verificare": "verR", "Varianta greșită": "gr"
};
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CITE_RE = /\s*\[(?:file|web):\d+\](?:\[(?:file|web):\d+\])*/g;
const clean = s => s.replace(CITE_RE, "").replace(/\s+$/g, "").replace(/^\s+/, "");

// Parser generic de câmpuri: titluri `head` (grupa 1 = id), câmpuri „Nume: text” care continuă pe rândurile următoare (blocurile de cod incluse) până la următorul câmp.
//   fields: { "Nume": "cheie" }   head: RegExp pe rând   letters: câmpul poate avea o literă A–D („Varianta greșită B:”)
//   multi: cheile câmpurilor care se pot repeta (se adună în cur[cheie], ca { letter, raw })   init(id): obiectul unui item   norm(id): forma id-ului din titlu, cheia itemilor
export function parseFields(md, file, { fields, head, letters = false, multi = [], init, norm = id => id }) {
  const fieldRe = new RegExp("^(" + Object.keys(fields).sort((a, b) => b.length - a.length).map(reEsc).join("|") + ")" + (letters ? "(?:\\s+([A-D]))?" : "") + ":\\s*(.*)$");
  const items = {};
  let cur = null, field = null, buf = [], fence = false;
  const flush = () => {
    if (cur && field) {
      const text = clean(buf.join("\n"));
      if (multi.includes(field.key)) cur[field.key].push({ letter: field.letter, raw: text });
      else if (cur[field.key] !== undefined) throw new Error(file + ": " + cur.id + " has field twice: " + field.key);
      else cur[field.key] = text;
    }
    field = null; buf = [];
  };
  for (const line of md.split(/\r?\n/)) {
    if (!fence) {
      const h = line.match(head);
      if (h) { const id = norm(h[1]); flush(); if (items[id]) throw new Error(file + ": duplicate " + id); cur = items[id] = init(id, file); continue; }
      if (/^#{1,3}\s/.test(line)) { flush(); cur = null; continue; }
      const f = cur && line.match(fieldRe);
      if (f) { flush(); field = { key: fields[f[1]], letter: letters ? f[2] || null : null }; buf = [letters ? f[3] : f[2]]; continue; }
    }
    if (/^\s*```/.test(line)) fence = !fence;
    if (field) buf.push(line);
  }
  flush();
  return items;
}

export function parseExpl(md, file) {
  return parseFields(md, file, { fields: FIELDS, head: /^###\s+`?([a-z]+-\d+)`?\s*$/, letters: true, multi: ["gr"], init: (id, f) => ({ id, gr: [], file: f }) });
}

const norm = s => s.replace(/[`„”"'’«»]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// Maps the wrong-variant explanations of an item onto the option indexes of its question.
export function resolveWrong(item, q) {
  const gr = {}, errs = [];
  for (const g of item.gr) {
    let idx = -1, text = g.raw;
    if (g.letter) idx = "ABCD".indexOf(g.letter);
    else {
      const m = g.raw.match(/^„([\s\S]+?)”\s*[—–-]\s*([\s\S]*)$/);
      if (!m) { errs.push("cannot read wrong-variant line: " + g.raw.slice(0, 60)); continue; }
      const key = norm(m[1]); text = m[2].trim();
      idx = q.o.findIndex(o => norm(o) === key);
      if (idx < 0) idx = q.o.findIndex(o => norm(o).startsWith(key) || key.startsWith(norm(o)));
    }
    if (idx < 0 || idx >= q.o.length) { errs.push("wrong-variant does not match any option: " + g.raw.slice(0, 70)); continue; }
    if (idx === q.a) { errs.push("wrong-variant points at the correct option: " + g.raw.slice(0, 70)); continue; }
    if (gr[idx]) { errs.push("two explanations for option " + idx); continue; }
    gr[idx] = text;
  }
  for (let i = 0; i < q.o.length; i++) if (i !== q.a && !gr[i]) errs.push("no explanation for wrong option " + "ABCD"[i] + ": " + q.o[i].slice(0, 60));
  return { gr, errs };
}

// ---- glossary ----
//   ### termen
//   Forme: termen, termenul, ...      (how the term appears in text; used to make it tappable)
//   Definiție / Scop / Exemplu / Analogie / Limită / Vezi și
const GFIELDS = { "Forme": "forms", "Definiție": "def", "Scop": "scop", "Exemplu": "ex", "Analogie": "an", "Limită": "lim", "Vezi și": "see" };
const GFIELD_RE = new RegExp("^(" + Object.keys(GFIELDS).map(reEsc).join("|") + "):\\s*(.*)$");
export const slug = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function parseGloss(md) {
  const out = [];
  let cur = null, key = null, fence = false;
  for (const line of md.split(/\r?\n/)) {
    if (!fence) {
      const h = line.match(/^###\s+(.+?)\s*$/);
      if (h) { const t = h[1].replace(/`/g, ""); cur = { id: slug(t), t, forms: [], def: "", scop: "", ex: "", an: "", lim: "", see: [] }; out.push(cur); key = null; continue; }
      const f = cur && line.match(GFIELD_RE);
      if (f) {
        key = GFIELDS[f[1]];
        const v = clean(f[2]);
        if (key === "forms" || key === "see") cur[key] = v.split(",").map(s => s.trim().replace(/`/g, "")).filter(Boolean);
        else cur[key] = v;
        continue;
      }
    }
    if (/^\s*```/.test(line)) fence = !fence;
    if (cur && key && key !== "forms" && key !== "see" && line.trim()) cur[key] += "\n" + line;
  }
  for (const g of out) for (const k of ["def", "scop", "ex", "an", "lim"]) g[k] = clean(g[k]);
  return out;
}

// Reads every explanation file, resolves wrong variants, returns { expl, gloss, errors }.
export function buildExplanations(root, P) {
  const dir = new URL("./src/expl/", root);
  const errors = [];
  const QBY = Object.fromEntries(P.mcq.map(q => [q.id, q]));
  const expl = {};
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".md") && f !== "glosar.md").sort();
  for (const f of files) {
    const items = parseExpl(fs.readFileSync(new URL(f, dir), "utf8"), f);
    for (const [id, it] of Object.entries(items)) {
      const q = QBY[id];
      if (!q) { errors.push(f + ": unknown question " + id); continue; }
      if (expl[id]) { errors.push(f + ": " + id + " already defined in " + expl[id].file); continue; }
      for (const k of ["scurt", "mec"]) if (!it[k]) errors.push(f + ": " + id + " missing " + k);
      if (it.ver && !it.verR) errors.push(f + ": " + id + " has Verificare without Răspuns verificare");
      const { gr, errs } = resolveWrong(it, q);
      errs.forEach(e => errors.push(f + ": " + id + ": " + e));
      const out = { file: f, gr };
      for (const k of ["ctx", "scurt", "scop", "mec", "pas", "apl", "leg", "lim", "intv", "ver", "verR"]) if (it[k]) out[k] = it[k];
      for (const [k, v] of Object.entries(out)) if (typeof v === "string" && ((v.match(/```/g) || []).length % 2)) errors.push(f + ": " + id + " unbalanced code fence in " + k);
      expl[id] = out;
    }
  }
  const gloss = parseGloss(fs.readFileSync(new URL("glosar.md", dir), "utf8"));
  const seenForm = new Map();
  for (const g of gloss) {
    if (!g.def) errors.push("glosar: " + g.t + " missing Definiție");
    if (!g.forms.length) errors.push("glosar: " + g.t + " missing Forme");
    for (const fm of g.forms) {
      const k = fm.toLowerCase();
      if (seenForm.has(k)) errors.push("glosar: form „" + fm + "” used by both " + seenForm.get(k) + " and " + g.t);
      seenForm.set(k, g.t);
    }
  }
  const ids = new Set(gloss.map(g => g.id));
  if (ids.size !== gloss.length) errors.push("glosar: duplicate term ids");
  for (const v of Object.values(expl)) delete v.file;
  return { expl, gloss, errors };
}

// ---- desfășurări ----
// Explicația pe larg a fiecărui punct al unei fișe + harta modulului. Un fișier pe modul: src/desf/<modul>.md.
//   ### harta                       ### 1   (numărul punctului, în ordine)
//   Problema: …                     Problema: …   Ideea: …   Exemplu: …   Analogie: …
//   Grupuri:                        În C++: …   Unde nu ține: …   Legătură: …   Greu: da
//   Tablă (opțional, lecția): rânduri „- problema: cuvânt; cuvânt”, „- schemă:” + bloc ```text; vezi parseTab
//   - 1–2: ce au în comun
// Modul complet sau absent: câte o desfășurare pentru fiecare punct, plus harta.
export const DESF_FIELDS = { "Problema": "p", "Ideea": "i", "Exemplu": "ex", "Analogie": "an", "Pas cu pas": "pas", "Tablă": "tab", "În C++": "cpp", "Unde nu ține": "nu", "Legătură": "leg", "Grupuri": "g", "Greu": "hard" };
// Cuvinte (fără blocurile de cod): erori în afara [min, max] (≤ hard la punctele marcate grele), avertisment în afara benzii 60–90.
export const DESF_LIMITS = { min: 50, max: 100, hard: 180, bandMin: 60, bandMax: 90, exLines: 8, stepLines: 8, cols: 36, tabPer: 2, tabWords: 4, tabTotal: 6, schemaLines: 8 };
// Modulele frontend sunt teritoriu nou pentru Alex: desfășurări mai lungi, exemplu cu ✗ / ✓ alături. Pragul de jos rămâne 50, ca fișele scrise înainte să rămână valide.
export const DESF_LIMITS_FE = { min: 50, max: 160, hard: 250, bandMin: 90, bandMax: 140, exLines: 14, stepLines: 8, cols: 36, tabPer: 2, tabWords: 4, tabTotal: 6, schemaLines: 8 };
// Aceeași listă ca modulele cu `fe: true` din date (validate.mjs și un test unit verifică egalitatea); aplicația citește câmpul `fe`, nu lista.
export const DESF_FE_MODULES = ["js", "ts", "react", "frontend", "fedebug"];
export const desfLimits = id => (DESF_FE_MODULES.includes(id) ? DESF_LIMITS_FE : DESF_LIMITS);
// „Întreabă” taie materialul la ASK_DZ_MAX (src/app.js); sub acest prag (cu loc pentru etichete) nu se pierde nimic din coadă.
export const DESF_ASK_BUDGET = 28500;
export const DESF_LANGS = ["python", "py", "cpp", "ts", "tsx", "js", "jsx", "text"];
const DESF_TEXT = ["p", "i", "ex", "an", "cpp", "nu", "leg"];
export const DESF_LABEL = { p: "Problema", i: "Ideea", ex: "Exemplu", an: "Analogie", pas: "Pas cu pas", tab: "Tablă", cpp: "În C++", nu: "Unde nu ține", leg: "Legătură" };
const FENCE_RE = /```(\w*)[^\n]*\n([\s\S]*?)```/g;
const GROUP_RE = /^[-*]\s*(\d+)(?:\s*[–-]\s*(\d+))?\s*:\s*(\S.*)$/;

// Tabla unui punct (câmpul `Tablă`): ce scrie Alex vede pe ecran în lecție, nu paragraful. Rânduri `- cheie: cuvânt; cuvânt` (cheile = secvențele: problema, ideea, analogie, cpp, punct) și `- schemă:` urmat de un bloc ```text.
// Întoarce { tab: { problema: [..], …, schema: "text fără garduri" }, err: [mesaje] }; mesajele ajung la checkDesf, care le prefixează cu fișierul și punctul.
export const TAB_KEYS = ["problema", "ideea", "analogie", "cpp", "punct"];
export function parseTab(raw) {
  const tab = {}, err = [], seen = new Set();
  let key = null, buf = [], fence = false;
  const flush = () => {
    if (key === "schema") {
      const text = buf.join("\n"), blocks = codeBlocks(text), rest = text.replace(FENCE_RE, "").trim();
      if (blocks.length !== 1 || rest) err.push("schema se scrie într-un singur bloc ```text, fără alt text");
      else if (blocks[0].lang !== "text") err.push("schema se scrie în bloc ```text (nu „" + (blocks[0].lang || "(fără)") + "”)");
      else tab.schema = blocks[0].code;
    }
    key = null; buf = [];
  };
  for (const line of String(raw || "").split("\n")) {
    const m = !fence && line.match(/^-\s*([\p{L}]+)\s*:\s*(.*)$/u);
    if (m) {
      flush();
      const k = m[1] === "schemă" ? "schema" : m[1];
      if (k !== "schema" && !TAB_KEYS.includes(k)) { err.push("„" + m[1] + "” nu e o cheie de tablă (" + TAB_KEYS.join(", ") + ", schemă)"); continue; }
      if (seen.has(k)) { err.push("„" + k + "” apare de două ori"); continue; }
      seen.add(k);
      if (k === "schema") { key = k; if (m[2].trim()) err.push("după „schemă:” urmează blocul ```text pe rândurile următoare"); }
      else tab[k] = m[2].split(";").map(x => x.trim()).filter(Boolean);
      continue;
    }
    if (/^\s*```/.test(line)) fence = !fence;
    if (key === "schema") buf.push(line);
    else if (line.trim()) err.push("rând necitibil (aștept „- cheie: cuvânt; cuvânt”): " + line.trim().slice(0, 40));
  }
  flush();
  return { tab, err };
}

export function parseDesf(md, file) {
  let seq = 0;
  const raw = parseFields(md, file, { fields: DESF_FIELDS, head: /^###\s+(harta|\d+)\s*$/i, init: id => ({ id, seq: seq++ }), norm: id => id.toLowerCase() });
  let map = null;
  if (raw.harta) {
    const m = raw.harta, g = [], bad = [];
    for (const l of String(m.g || "").split("\n").map(x => x.trim()).filter(Boolean)) {
      const r = l.match(GROUP_RE);
      if (r) g.push({ a: +r[1], b: r[2] ? +r[2] : +r[1], t: r[3].trim() }); else bad.push(l);
    }
    map = { p: m.p, g, bad, hasG: m.g !== undefined };
  }
  const items = Object.values(raw).filter(x => x.id !== "harta").sort((a, b) => a.seq - b.seq).map(x => {
    const out = { n: +x.id };
    for (const k of Object.keys(x)) if (k !== "id" && k !== "seq" && k !== "hard") out[k] = x[k];
    if (x.hard !== undefined) out.hard = /^da$/i.test(x.hard) ? true : x.hard;
    if (x.tab !== undefined) { const t = parseTab(x.tab); out.tab = t.tab; if (t.err.length) out.tabErr = t.err; }
    return out;
  });
  return { map, items };
}

export const codeBlocks = text => [...String(text || "").matchAll(FENCE_RE)].map(m => ({ lang: m[1], code: m[2].replace(/\s+$/, "") }));
const wordCount = text => String(text || "").replace(FENCE_RE, " ").split(/\s+/).filter(Boolean).length;

// Tabla (în afara numărului de cuvinte): cuvinte cheie pentru fiecare secvență a punctului, schemă opțională.
function checkTab(it, L, at, E) {
  const T = it.tab, p = at + "în Tablă, ";
  (it.tabErr || []).forEach(m => E(p + m));
  const need = ["problema", "ideea", ...(it.cpp ? ["cpp"] : []), ...(!it.ex && it.an ? ["analogie"] : []), "punct"];
  let total = 0;
  for (const k of need) {
    const list = T[k];
    if (list === undefined) { E(p + "lipsește „" + k + "” (cuvintele cheie ale secvenței)"); continue; }
    if (!list.length) E(p + "„" + k + "” cere cel puțin 1 cuvânt cheie");
    if (list.length > L.tabPer) E(p + "„" + k + "” are " + list.length + " cuvinte cheie (maxim " + L.tabPer + ")");
    for (const w of list) { const n = w.split(/\s+/).length; if (n > L.tabWords) E(p + "„" + w + "” are " + n + " cuvinte (maxim " + L.tabWords + ")"); }
    total += list.length;
  }
  for (const k of TAB_KEYS) if (T[k] !== undefined && !need.includes(k)) E(p + "„" + k + "” nu are secvență la acest punct");
  if (total > L.tabTotal) E(p + "punctul are " + total + " cuvinte cheie (maxim " + L.tabTotal + ")");
  if (T.schema !== undefined) {
    const rows = T.schema.split("\n");
    if (!T.schema.trim()) E(p + "schema e goală");
    if (rows.length > L.schemaLines) E(p + "schema are " + rows.length + " rânduri (maxim " + L.schemaLines + ")");
    rows.forEach((l, j) => { if ([...l].length > L.cols) E(p + "schema, rândul " + (j + 1) + " are " + [...l].length + " de caractere (maxim " + L.cols + ")"); });
    if (it.pas !== undefined) E(p + "schema nu merge cu Pas cu pas (Pas cu pas e deja schema punctului)");
  }
}

// Regulile de conținut. Întoarce { errors, warnings }, fiecare mesaj cu numele fișierului.
export function checkDesf(parsed, sheet, file) {
  const errors = [], warnings = [], L = desfLimits(String(file).split(/[\\/]/).pop().replace(/\.md$/, ""));
  const E = m => errors.push(file + ": " + m), W = m => warnings.push(file + ": " + m);
  const N = sheet.points.length, items = parsed.items;
  if (items.length !== N) E(items.length + " desfășurări pentru " + N + " puncte (câte una pentru fiecare punct)");
  items.forEach((it, idx) => { if (it.n !== idx + 1) E("desfășurarea " + it.n + " apare pe locul " + (idx + 1) + ": ordinea trebuie să fie 1, 2, 3… ca a punctelor"); });
  items.forEach(it => {
    const at = "punctul " + it.n + ": ";
    if (!it.p) E(at + "lipsește Problema");
    if (!it.i) E(at + "lipsește Ideea");
    if (!it.ex && !it.an) E(at + "cere cel puțin unul dintre Exemplu și Analogie");
    if (it.cpp && !it.nu) E(at + "În C++ cere Unde nu ține");
    if (it.nu && !it.cpp) E(at + "Unde nu ține fără În C++");
    if (it.hard !== undefined && it.hard !== true) E(at + "Greu se scrie „Greu: da”");
    let words = 0;
    for (const k of DESF_TEXT) {
      const t = it[k]; if (!t) continue;
      words += wordCount(t);
      if ((t.match(/```/g) || []).length % 2) E(at + "bloc de cod neînchis în " + DESF_LABEL[k]);
      let lines = 0;
      for (const b of codeBlocks(t)) {
        if (!DESF_LANGS.includes(b.lang)) E(at + "limbaj necunoscut în bloc de cod: „" + (b.lang || "(fără)") + "” (python, cpp, ts, tsx sau text)");
        b.code.split("\n").forEach((l, j) => { lines++; if ([...l].length > L.cols) E(at + "în " + DESF_LABEL[k] + ", rândul " + (j + 1) + " de cod are " + [...l].length + " de caractere (maxim " + L.cols + ")"); });
      }
      if (k === "ex" && lines > L.exLines) E(at + "Exemplu are " + lines + " rânduri de cod (maxim " + L.exLines + " rânduri)");
    }
    if (it.pas !== undefined) {
      // „Pas cu pas”: urmărirea în timp, în afara numărului de cuvinte; cel mult stepLines rânduri scurte.
      const rows = it.pas.split("\n").filter(l => l.trim() && !/^\s*```/.test(l));
      if (!rows.length) E(at + "Pas cu pas e gol");
      if (rows.length > L.stepLines) E(at + "Pas cu pas are " + rows.length + " rânduri (maxim " + L.stepLines + " rânduri)");
      rows.forEach((l, j) => { if ([...l].length > L.cols) E(at + "în Pas cu pas, rândul " + (j + 1) + " are " + [...l].length + " de caractere (maxim " + L.cols + ")"); });
    }
    if (it.tab !== undefined) checkTab(it, L, at, E);
    const max = it.hard === true ? L.hard : L.max;
    if (words < L.min) E(at + "prea scurt (" + words + " cuvinte, minim " + L.min + ")");
    else if (words > max) E(at + "prea lung (" + words + " cuvinte, maxim " + max + (it.hard === true ? " la un punct greu" : "") + ")");
    else if (it.hard !== true && (words < L.bandMin || words > L.bandMax)) W(at + words + " cuvinte (de regulă " + L.bandMin + "–" + L.bandMax + ")");
  });
  const m = parsed.map;
  if (!m) E("lipsește harta modulului (### harta, cu Problema și Grupuri)");
  else {
    const H = "harta: ";
    if (!m.p) E(H + "lipsește Problema");
    if (!m.hasG) E(H + "lipsește Grupuri");
    m.bad.forEach(l => E(H + "rând de grup necitibil (aștept „- 1–2: ce au în comun”): " + l.slice(0, 50)));
    const seen = new Map();
    for (const g of m.g) {
      if (g.a > g.b) { E(H + "grupul " + g.a + "–" + g.b + " are capetele inversate"); continue; }
      if (g.a < 1 || g.b > N) { E(H + "grupul " + g.a + "–" + g.b + " iese din fișă (fișa are " + N + " puncte)"); continue; }
      for (let k = g.a; k <= g.b; k++) { if (seen.has(k)) E(H + "punctul " + k + " e în două grupuri"); else seen.set(k, 1); }
    }
    for (let k = 1; k <= N; k++) if (!seen.has(k)) E(H + "punctul " + k + " nu e în niciun grup");
  }
  return { errors, warnings };
}

export function readDesfFiles(root) {
  const dir = new URL("./src/desf/", root), out = {};
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".md")).sort()) out[f] = fs.readFileSync(new URL(f, dir), "utf8");
  return out;
}

// files: { "<modul>.md": text }. Întoarce { desf, errors, warnings }; desf[modul] = { map: { p, g: [{ a, b, t }] }, items: [{ p, i, ex?, an?, pas?, tab?, cpp?, nu?, leg?, hard? }] } indexat ca punctele fișei.
export function buildDesf(P, files) {
  const desf = {}, errors = [], warnings = [];
  for (const [f, md] of Object.entries(files)) {
    const id = f.replace(/\.md$/, "");
    if (!P.modules.some(m => m.id === id)) { errors.push(f + ": modul necunoscut " + id); continue; }
    if (!P.sheets[id] || !P.sheets[id].points) { errors.push(f + ": modulul nu are fișă"); continue; }
    let parsed;
    try { parsed = parseDesf(md, f); } catch (e) { errors.push(e.message); continue; }
    const r = checkDesf(parsed, P.sheets[id], f);
    errors.push(...r.errors); warnings.push(...r.warnings);
    const sh = P.sheets[id], size = [sh.lead, ...sh.points, ...(sh.avoid || []), parsed.map.p, ...parsed.map.g.map(g => g.t), ...parsed.items.flatMap(it => [...DESF_TEXT, "pas"].map(k => it[k] || ""))].join(" ").length;
    if (size > DESF_ASK_BUDGET) warnings.push(f + ": materialul pentru „Întreabă” are ~" + size + " de caractere (> " + DESF_ASK_BUDGET + "): urcă ASK_DZ_MAX în src/app.js sau scurtează");
    if (r.errors.length) continue;
    desf[id] = { map: { p: parsed.map.p, g: parsed.map.g }, items: parsed.items.map(({ n, ...rest }) => rest) };
  }
  return { desf, errors, warnings };
}
