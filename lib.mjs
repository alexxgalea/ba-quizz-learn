// Shared by build.mjs and validate.mjs: loads the app data and parses the explanation/glossary markdown.
import fs from "node:fs";
import vm from "node:vm";

export const DATA_FILES = ["data_core.js", "data_tech.js", "data_diagrams.js", "data_mcq1.js", "data_mcq2.js", "data_mcq3.js", "data_mcq4.js", "data_mcq5.js", "data_mcq6.js", "data_ctx.js", "data_oral.js", "data_oral2.js", "data_katas.js"];

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
const FIELD_RE = new RegExp("^(" + Object.keys(FIELDS).sort((a, b) => b.length - a.length).map(reEsc).join("|") + ")(?:\\s+([A-D]))?:\\s*(.*)$");
const CITE_RE = /\s*\[(?:file|web):\d+\](?:\[(?:file|web):\d+\])*/g;
const clean = s => s.replace(CITE_RE, "").replace(/\s+$/g, "").replace(/^\s+/, "");

export function parseExpl(md, file) {
  const items = {};
  let cur = null, field = null, buf = [], fence = false;
  const flush = () => {
    if (cur && field) {
      const text = clean(buf.join("\n"));
      if (field.key === "gr") cur.gr.push({ letter: field.letter, raw: text });
      else if (cur[field.key] !== undefined) throw new Error(file + ": " + cur.id + " has field twice: " + field.key);
      else cur[field.key] = text;
    }
    field = null; buf = [];
  };
  for (const line of md.split(/\r?\n/)) {
    if (!fence) {
      const h = line.match(/^###\s+`?([a-z]+-\d+)`?\s*$/);
      if (h) { flush(); if (items[h[1]]) throw new Error(file + ": duplicate " + h[1]); cur = items[h[1]] = { id: h[1], gr: [], file }; continue; }
      if (/^#{1,3}\s/.test(line)) { flush(); cur = null; continue; }
      const f = cur && line.match(FIELD_RE);
      if (f) { flush(); field = { key: FIELDS[f[1]], letter: f[2] || null }; buf = [f[3]]; continue; }
    }
    if (/^\s*```/.test(line)) fence = !fence;
    if (field) buf.push(line);
  }
  flush();
  return items;
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
