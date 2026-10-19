// Loads the data files the way the page does and checks the schema.
import { loadData, buildExplanations } from "./lib.mjs";

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
}
for (const m of P.modules) if (!P.sheets[m.id]) errors.push("no sheet for " + m.id);
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
console.log("MCQ:", P.mcq.length, "oral:", P.oral.length, "katas:", P.katas.length, "interview:", P.cfg.interview, "| morning tasks:", taskIds.size);
// position of correct answers in source (all 0 is expected: the app shuffles)
// new-format explanations + glossary
const ex = buildExplanations(root, P);
ex.errors.forEach(e => errors.push(e));
const covered = {};
for (const q of P.mcq) { covered[q.m] = covered[q.m] || [0, 0]; covered[q.m][1]++; if (ex.expl[q.id]) covered[q.m][0]++; }
console.log("explanations:", Object.keys(ex.expl).length + "/" + P.mcq.length, "| terms:", ex.gloss.length, "|", Object.entries(covered).map(([m, [a, b]]) => m + " " + a + "/" + b).join(", "));
const long = [];
const LIM = { scurt: 220, scop: 360, mec: 420, pas: 520, apl: 560, leg: 320, lim: 380, intv: 420, ver: 280, verR: 360 };
for (const [id, x] of Object.entries(ex.expl)) for (const [k, n] of Object.entries(LIM)) if (x[k] && x[k].replace(/```[\s\S]*?```/g, "").length > n) long.push(id + "." + k + " (" + x[k].length + ")");
if (long.length) console.log("long fields (warning):", long.join(", "));
if (errors.length) { console.error("ERRORS:\n" + errors.join("\n")); process.exit(1); }
console.log("OK");
