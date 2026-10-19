// Builds the Perplexity brief: hand-written template + content exported from the app data.
// Usage: node export/make_brief.js <progress.json> <output.md>
const fs = require("fs"), vm = require("vm"), path = require("path");
const root = path.join(__dirname, "..");
const [progressPath, outPath] = process.argv.slice(2);

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["data_core.js", "data_diagrams.js", "data_mcq1.js", "data_mcq2.js", "data_mcq3.js", "data_mcq4.js", "data_mcq5.js", "data_ctx.js", "data_oral.js", "data_katas.js"])
  vm.runInContext(fs.readFileSync(path.join(root, "src", f), "utf8"), ctx, { filename: f });
const P = ctx.window.PREP;
P.mcq.forEach(q => { const c = (P.qctx || {})[q.id]; if (c) { q.lvl = q.lvl || c[0]; q.ctx = q.ctx || c[1]; } q.lvl = q.lvl || 2; });

const S = JSON.parse(fs.readFileSync(progressPath, "utf8"));
const LVL = { 1: "bază", 2: "practic", 3: "avansat" };
const MOD = Object.fromEntries(P.modules.map(m => [m.id, m]));
const QBY = Object.fromEntries(P.mcq.map(q => [q.id, q]));
const MODS = P.modules.filter(m => m.id !== "behav");
const wrongLast = id => S.q[id] && S.q[id].l === 0;

const codeBlock = code => "```\n" + code.replace(/\s+$/, "") + "\n```";

function renderQ(q, heading) {
  const m = MOD[q.m];
  const lines = [];
  lines.push(heading + " `" + q.id + "` · " + m.short + " · nivel " + LVL[q.lvl] + " · P" + m.p + (wrongLast(q.id) ? " · greșită de Alex la ultimul răspuns" : ""));
  lines.push("");
  lines.push("**Întrebare:** " + q.q);
  if (q.code) { lines.push(""); lines.push(codeBlock(q.code)); }
  lines.push("");
  lines.push("**Variante:**");
  lines.push("");
  q.o.forEach((o, i) => lines.push("- " + o + (i === q.a ? " **(corect)**" : "")));
  lines.push("");
  lines.push("**Context actual (înainte de întrebare):** " + q.ctx);
  lines.push("");
  lines.push("**Explicație actuală (după răspuns):** " + q.e);
  return lines.join("\n");
}

// ---- example (how a question looks today) ----
function renderExample(q) {
  const L = ["> **Context:** " + q.ctx, ">", "> **Întrebare:** " + q.q, ">"];
  q.o.forEach((o, i) => L.push("> " + "ABCD"[i] + ") " + o));
  L.push(">", "> **După răspuns:** " + (q.a === 0 ? "Corect" : "Greșit · răspunsul corect e " + "ABCD"[q.a]) + ". " + q.e);
  return L.join("\n");
}

// ---- progress summary ----
function renderStats() {
  const entries = Object.entries(S.q).filter(([id]) => QBY[id]);
  const ok = entries.filter(([, e]) => e.l === 1).length;
  const byL = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
  for (const [id, e] of entries) { const l = QBY[id].lvl; byL[l][1]++; if (e.l === 1) byL[l][0]++; }
  const sessions = (S.h || []).filter(h => h.kind === "mcq" && h.mode === "module")
    .map(h => h.title + ": " + h.c + "/" + h.n + " în " + Math.max(1, Math.round(h.dur / 60)) + " min");
  return "Progresul de azi dimineață: " + entries.length + " de grile răspunse, din care " + ok + " corecte la ultima încercare (bază " +
    byL[1][0] + "/" + byL[1][1] + ", practic " + byL[2][0] + "/" + byL[2][1] + ", avansat " + byL[3][0] + "/" + byL[3][1] + ").\n" +
    "Sesiunile pe module, în ordine: " + sessions.join("; ") + ".";
}

function renderWeak() {
  const ids = Object.keys(S.q).filter(id => QBY[id] && wrongLast(id));
  ids.sort((a, b) => P.mcq.indexOf(QBY[a]) - P.mcq.indexOf(QBY[b]));
  return ids.map(id => { const q = QBY[id]; const hint = q.code ? " (codul începe cu `" + q.code.split("\n")[0].trim() + "`)" : ""; return "- `" + id + "` · " + MOD[q.m].short + " · " + LVL[q.lvl] + " — " + q.q.replace(/\s+/g, " ") + hint; }).join("\n");
}

// ---- sample to rewrite ----
const SAMPLE = ["py-01", "py-02", "py-04", "asgi-02", "pg-01", "rt-08", "rd-03", "rmq-07", "lx-01", "gil-03", "sqa-02", "cel-03", "idx-02"];
const renderSample = () => SAMPLE.map(id => renderQ(QBY[id], "####")).join("\n\n");

const TERMS = [
  ["Python și concurență", "GIL, bytecode, thread, proces, corutină, event loop, I/O-bound vs CPU-bound, race condition, pickle, IPC"],
  ["Servere web", "WSGI, ASGI, worker (Gunicorn), threadpool, reverse proxy"],
  ["Baze de date", "index B-tree, selectivitate, `EXPLAIN ANALYZE`, tranzacție, nivel de izolare, MVCC, lock, deadlock"],
  ["ORM", "ORM, `Session` (SQLAlchemy), identity map, lazy loading, problema N+1, eager loading, migrație (Alembic)"],
  ["Mesagerie", "broker, coadă, exchange, routing key, ack, prefetch, idempotență, at-least-once"],
  ["Redis", "TTL, cache-aside"],
  ["Testare", "fixture, mock"],
  ["Securitate și infrastructură", "JWT, SSRF, imagine vs container, SIGTERM vs SIGKILL"]
];
const renderTerms = () => TERMS.map(([g, t]) => "- **" + g + ":** " + t + ".").join("\n");

// ---- appendices ----
function renderAppendix() {
  const out = [];
  out.push("## Anexa 1. Modulele");
  out.push("");
  out.push("| Cod | Modul | Prioritate | De unde vine | Grile (bază / practic / avansat) | Carduri orale |");
  out.push("|---|---|---|---|---|---|");
  for (const m of MODS) {
    const qs = P.mcq.filter(q => q.m === m.id);
    const c = l => qs.filter(q => q.lvl === l).length;
    out.push("| " + m.code + " | " + m.name + " | P" + m.p + " | " + m.src.replace("Experiența ta", "Experiența lui Alex") + " | " + qs.length + " (" + c(1) + " / " + c(2) + " / " + c(3) + ") | " + P.oral.filter(o => o.m === m.id).length + " |");
  }

  out.push("", "## Anexa 2. Fișele de studiu", "");
  for (const m of MODS) {
    const s = P.sheets[m.id]; if (!s) continue;
    out.push("### " + m.code + " · " + m.name, "");
    if (s.lead) out.push("**Ideea principală:** " + s.lead, "");
    if (s.points && s.points.length) { out.push("**Puncte:**", ""); s.points.forEach(p => out.push("- " + p)); out.push(""); }
    if (s.avoid && s.avoid.length) { out.push("**De evitat la interviu:**", ""); s.avoid.forEach(p => out.push("- " + p)); out.push(""); }
    if (s.diagram) out.push("_În aplicație, fișa are și o diagramă._", "");
  }

  out.push("## Anexa 3. Toate grilele, pe module", "");
  for (const m of MODS) {
    const qs = P.mcq.filter(q => q.m === m.id).sort((a, b) => a.lvl - b.lvl || P.mcq.indexOf(a) - P.mcq.indexOf(b));
    if (!qs.length) continue;
    out.push("### " + m.code + " · " + m.name + " (" + qs.length + " grile)", "");
    qs.forEach(q => out.push(renderQ(q, "####"), ""));
  }

  out.push("## Anexa 4. Cardurile orale", "");
  for (const m of MODS) {
    const cards = P.oral.filter(o => o.m === m.id);
    if (!cards.length) continue;
    out.push("### " + m.code + " · " + m.name, "");
    for (const c of cards) {
      out.push("#### `" + c.id + "` " + c.q, "");
      out.push("**Puncte-cheie:**", "");
      c.k.forEach(k => out.push("- " + k));
      out.push("", "**Răspuns-model:** " + c.model, "");
    }
  }

  out.push("## Anexa 5. Exercițiile de live coding", "");
  for (const k of P.katas) out.push("- **" + k.n + ". " + k.title + "** (" + k.level + "): " + k.why);

  out.push("", "## Anexa 6. Planul pe zile", "");
  out.push("Planul se generează în aplicație din data interviului (" + P.cfg.interview + "), orele pe seară (~" + P.cfg.hours + " h) și progres: fiecare seară are aceeași rețetă (scadențe → fișă + grile + oral pe modulele cu cea mai mare nevoie → kata → greșeli), iar dimineața interviului are doar încălzire:", "");
  P.planTpl.morning.forEach(t => out.push("- " + t.text + " (" + t.min + " min)"));
  out.push("");
  return out.join("\n");
}

let md = fs.readFileSync(path.join(__dirname, "brief_template.md"), "utf8");
const parts = {
  EXAMPLE: renderExample(QBY["gil-04"]),
  STATS: renderStats(),
  WEAK: renderWeak(),
  SAMPLE: renderSample(),
  TERMS: renderTerms(),
  APPENDIX: renderAppendix()
};
for (const [k, v] of Object.entries(parts)) {
  if (!md.includes("{{" + k + "}}")) throw new Error("placeholder missing: " + k);
  md = md.split("{{" + k + "}}").join(v);
}
if (/\{\{[A-Z]+\}\}/.test(md)) throw new Error("unfilled placeholder");
fs.writeFileSync(outPath, md);
console.log("written", outPath, Buffer.byteLength(md), "bytes,", md.split("\n").length, "lines");
