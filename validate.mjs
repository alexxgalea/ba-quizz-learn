// Loads the data files the way the page does and checks the schema.
import { loadData, loadCode, buildExplanations, buildDesf, readDesfFiles, DESF_FE_MODULES } from "./lib.mjs";

const root = new URL("./", import.meta.url);
const P = loadData(root);

const errors = [];
const mods = new Map(P.modules.map(m => [m.id, m]));
const ids = new Set();
const dup = id => { if (ids.has(id)) errors.push("duplicate id " + id); ids.add(id); };

for (const q of P.mcq) {
  dup(q.id);
  if (!mods.has(q.m)) errors.push(q.id + ": unknown module " + q.m);
  if (!Array.isArray(q.o) || q.o.length < 2) errors.push(q.id + ": options");
  if (!(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length)) errors.push(q.id + ": bad answer index");
  if (!q.q || !q.e) errors.push(q.id + ": missing q/e");
  if (new Set(q.o).size !== q.o.length) errors.push(q.id + ": duplicate options");
  if (/\b(varianta|opțiunea) (a )?(1|2|3|4|întâi|doua|treia|patra)\b|ultima variantă|prima variantă|variantele de sus|de mai sus/i.test(q.e)) errors.push(q.id + ": explanation refers to option position");
  for (const s of [q.q, q.e, ...q.o]) if ((s.match(/`/g) || []).length % 2) errors.push(q.id + ": unbalanced backticks in: " + s.slice(0, 50));
}
// level + context: every question needs both (inline or from data_ctx.js)
const qctx = P.qctx || {};
for (const id of Object.keys(qctx)) if (!P.mcq.some(q => q.id === id)) errors.push("qctx for unknown id " + id);
const lvlTable = {};
for (const q of P.mcq) {
  const c = qctx[q.id] || [];
  const lvl = q.lvl || c[0], ctx = q.ctx || c[1];
  if (![1, 2, 3].includes(lvl)) errors.push(q.id + ": missing/bad level");
  if (!ctx) errors.push(q.id + ": missing context");
  else {
    if (ctx.length > 330) errors.push(q.id + ": context too long (" + ctx.length + ")");
    if ((ctx.match(/`/g) || []).length % 2) errors.push(q.id + ": unbalanced backticks in context");
  }
  const row = lvlTable[q.m] = lvlTable[q.m] || { L1: 0, L2: 0, L3: 0 };
  row["L" + lvl]++;
}
for (const m of P.modules) if (m.p <= 3 && lvlTable[m.id] && lvlTable[m.id].L1 < (m.p === 1 ? 3 : 1)) errors.push("module " + m.id + " has too few level-1 questions");
console.table(lvlTable);
for (const c of P.oral) {
  dup(c.id);
  if (!mods.has(c.m)) errors.push(c.id + ": unknown module " + c.m);
  if (!Array.isArray(c.k) || c.k.length < 3) errors.push(c.id + ": key points");
  if (!c.model || c.model.length < 80) errors.push(c.id + ": model answer missing");
  // snippet: codul se citește pe telefon (38 de caractere încap la 360 px), deci fără rânduri lungi
  if (c.code !== undefined) {
    if (typeof c.code !== "string" || !c.code.trim()) errors.push(c.id + ": empty code");
    else c.code.split("\n").forEach((l, i) => { if (l.length > 38) errors.push(c.id + ": code line " + (i + 1) + " longer than 38 (" + l.length + ")"); });
  }
}
for (const m of P.modules) if (!P.sheets[m.id]) errors.push("no sheet for " + m.id);
// modulele de frontend: câmpul `fe` din date (citit de aplicație) și DESF_FE_MODULES din lib.mjs (limitele desfășurărilor) trebuie să coincidă
for (const m of P.modules) if (!!m.fe !== DESF_FE_MODULES.includes(m.id)) errors.push("module " + m.id + ": fe: " + !!m.fe + ", dar DESF_FE_MODULES (lib.mjs) spune " + DESF_FE_MODULES.includes(m.id));
for (const [k, s] of Object.entries(P.sheets)) if (s.diagram && !P.diagrams[s.diagram]) errors.push("missing diagram " + s.diagram);
const kataIds = new Set(P.katas.map(k => k.id));
const taskIds = new Set();
if (!P.cfg || !/^\d{4}-\d{2}-\d{2}$/.test(P.cfg.interview) || !(P.cfg.hours > 0)) errors.push("cfg: interview date (YYYY-MM-DD) and hours are required");
for (const t of (P.planTpl && P.planTpl.morning) || []) {
  if (taskIds.has(t.id)) errors.push("duplicate task " + t.id); taskIds.add(t.id);
  const g = t.go; if (!g) continue;
  if ((g.t === "mcq" || g.t === "sheet") && g.m && !mods.has(g.m)) errors.push(t.id + ": bad module " + g.m);
  for (const m of g.ms || []) if (!mods.has(m)) errors.push(t.id + ": bad module " + m);
  if (g.t === "kata" && !kataIds.has(g.id)) errors.push(t.id + ": bad kata " + g.id);
}
for (const k of (P.planTpl && P.planTpl.katas) || []) if (!kataIds.has(k)) errors.push("planTpl.katas: bad kata " + k);
if (new Set(P.planTpl.katas).size !== P.katas.length) errors.push("planTpl.katas must list every kata once");

const per = {};
for (const m of P.modules) per[m.id] = { mcq: 0, oral: 0 };
for (const q of P.mcq) per[q.m].mcq++;
for (const c of P.oral) per[c.m].oral++;
console.table(per);
// Schelete: cerință, 3–5 puncte esențiale, referință testată în katas/ (rânduri ≤ SKEL_COLS), grupă doar la frontend.
const SKEL_COLS = 42, SKEL_LANGS = ["py", "js", "ts", "tsx", "sql", "yaml", "docker"], SKEL_GROUPS = ["react", "js", "ts"];
const { skelCode } = loadCode(root);
const skelIds = new Set();
for (const s of P.skel || []) {
  if (!/^s-[a-z0-9]+-[a-z0-9-]+$/.test(s.id || "")) errors.push("skel: bad id " + s.id);
  dup(s.id); skelIds.add(s.id);
  if (!mods.has(s.m)) errors.push(s.id + ": unknown module " + s.m);
  else if (!s.id.startsWith("s-" + s.m + "-")) errors.push(s.id + ": id must start with s-" + s.m + "-");
  if (!s.t || !String(s.t).trim()) errors.push(s.id + ": missing title");
  if (!s.p || !String(s.p).trim()) errors.push(s.id + ": missing prompt (p)");
  if (!Array.isArray(s.k) || s.k.length < 3 || s.k.length > 5 || s.k.some(x => !x || !String(x).trim())) errors.push(s.id + ": needs 3–5 essential points (k)");
  if (!SKEL_LANGS.includes(s.lang)) errors.push(s.id + ": bad lang " + s.lang);
  if (s.m === "frontend" ? !SKEL_GROUPS.includes(s.g) : s.g !== undefined) errors.push(s.id + ": group (g) only on frontend, one of " + SKEL_GROUPS.join("/"));
  for (const x of [s.t, s.p, ...(s.k || [])]) if ((String(x).match(/`/g) || []).length % 2) errors.push(s.id + ": unbalanced backticks in: " + String(x).slice(0, 50));
  const code = skelCode[s.id];
  if (!code) errors.push(s.id + ": no reference section in katas/");
  else code.split("\n").forEach((l, i) => { if ([...l].length > SKEL_COLS) errors.push(s.id + ": reference line " + (i + 1) + " longer than " + SKEL_COLS + " chars"); });
}
for (const id of Object.keys(skelCode)) if (!skelIds.has(id)) errors.push("reference " + id + " in katas/ has no skeleton in data");
console.log("MCQ:", P.mcq.length, "oral:", P.oral.length, "katas:", P.katas.length, "schelete:", (P.skel || []).length, "interview:", P.cfg.interview, "| morning tasks:", taskIds.size);
// position of correct answers in source (all 0 is expected: the app shuffles)
// new-format explanations + glossary
const ex = buildExplanations(root, P);
ex.errors.forEach(e => errors.push(e));
const covered = {};
for (const q of P.mcq) { covered[q.m] = covered[q.m] || [0, 0]; covered[q.m][1]++; if (ex.expl[q.id]) covered[q.m][0]++; }
console.log("explanations:", Object.keys(ex.expl).length + "/" + P.mcq.length, "| terms:", ex.gloss.length, "|", Object.entries(covered).map(([m, [a, b]]) => m + " " + a + "/" + b).join(", "));
// Desfășurările punctelor (src/desf/<modul>.md): modul complet sau absent; regulile sunt în lib.mjs (checkDesf).
const dz = buildDesf(P, readDesfFiles(root));
dz.errors.forEach(e => errors.push(e));
console.log("desfășurări:", Object.entries(dz.desf).map(([m, d]) => m + " " + d.items.length).join(", ") || "niciuna");
if (dz.warnings.length) console.log("desfășurări, în afara benzii (warning):\n  " + dz.warnings.join("\n  "));
const long = [];
const LIM = { scurt: 220, scop: 360, mec: 420, pas: 520, apl: 560, leg: 320, lim: 380, intv: 420, ver: 280, verR: 360 };
for (const [id, x] of Object.entries(ex.expl)) for (const [k, n] of Object.entries(LIM)) if (x[k] && x[k].replace(/```[\s\S]*?```/g, "").length > n) long.push(id + "." + k + " (" + x[k].length + ")");
if (long.length) console.log("long fields (warning):", long.join(", "));
if (errors.length) { console.error("ERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("OK");
