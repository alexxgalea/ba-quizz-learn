// node tools/cues.mjs <modul…>  → pe fiecare grilă: lungimile variantelor (A* = corecta), raportul corectă / cea mai lungă greșită, rangul și cuvintele absolute; apoi regulile de modul (✓ / ✗).
// node tools/cues.mjs --all       → toate modulele; fără argumente: doar tabelul pe module.
// --viol: doar grilele care încalcă regula pe grilă.
import { loadData, checkCues, cueGrid, CUE } from "../lib.mjs";

const root = new URL("../", import.meta.url);
const P = loadData(root);
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith("--")));
const mods = args.filter(a => !a.startsWith("--"));

const { errors, report } = checkCues(P);
const pct = (a, b) => (b ? Math.round((100 * a) / b) + "%" : "–");
const letters = "ABCD";

const show = flags.has("--all") ? P.modules.map(m => m.id) : mods;
for (const m of show) {
  if (!report[m]) { console.error("modul necunoscut: " + m); process.exitCode = 1; continue; }
  const qs = P.mcq.filter(q => q.m === m);
  console.log("\n== " + m + " (" + qs.length + " grile) ==");
  for (const q of qs) {
    const g = cueGrid(q);
    if (flags.has("--viol") && !g.viol) continue;
    const lens = g.lens.map((n, i) => (i === q.a ? "A*" : letters[i]) + " " + n).join(" · ");
    const tags = [g.viol ? "LUNG!" : "", g.longest ? "cea mai lungă" : "", g.shortest ? "cea mai scurtă" : ""].filter(Boolean).join(", ");
    const abs = g.abs.map((a, i) => (a.length ? (i === q.a ? "A*" : letters[i]) + ":" + a.join("/") : "")).filter(Boolean).join(" ");
    console.log(q.id + "  " + lens + "  ×" + g.ratio.toFixed(2) + (tags ? "  [" + tags + "]" : "") + (abs ? "  absolute " + abs : ""));
  }
  const r = report[m];
  const k = Math.ceil(0.35 * r.n);
  const pc = r.n ? (100 * r.absCorrect) / r.n : 0, pw = r.wrongTotal ? (100 * r.absWrong) / r.wrongTotal : 0;
  const ok = c => (c ? "✓" : "✗");
  console.log("  reguli de modul:");
  console.log("  " + ok(r.longest <= k) + " corecta cea mai lungă: " + r.longest + "/" + r.n + " (cel mult " + k + ")");
  console.log("  " + ok(r.shortest <= k) + " corecta cea mai scurtă: " + r.shortest + "/" + r.n + " (cel mult " + k + ")");
  console.log("  " + ok(pw <= pc + CUE.absPp + 1e-9) + " absolute: greșite " + pct(r.absWrong, r.wrongTotal) + ", corecte " + pct(r.absCorrect, r.n) + " (greșite ≤ corecte + " + CUE.absPp + " puncte)");
  console.log("  " + ok(r.viol === 0) + " încalcă regula pe grilă: " + r.viol);
}

console.log("\nmodul        n  corecta-lungă  corecta-scurtă  abs corecte  abs greșite  încalcă");
for (const m of P.modules) {
  const r = report[m.id]; if (!r.n) continue;
  console.log(m.id.padEnd(10) + String(r.n).padStart(4) + String(r.longest).padStart(15) + String(r.shortest).padStart(16) + pct(r.absCorrect, r.n).padStart(13) + pct(r.absWrong, r.wrongTotal).padStart(13) + String(r.viol).padStart(9));
}
if (errors.length) { console.log("\nerori de validare (" + errors.length + "):\n" + errors.join("\n")); process.exitCode = 1; }
