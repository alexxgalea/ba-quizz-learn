// node xcheck.mjs mod1 ... → for questions WITH new explanations: each option + the "de ce nu" text mapped to it
import { loadData, buildExplanations } from "../lib.mjs";
const root = new URL("../", import.meta.url);
const P = loadData(root);
P.mcq.forEach(q => { const c = (P.qctx || {})[q.id]; if (c) { q.lvl = q.lvl || c[0]; q.ctx = q.ctx || c[1]; } });
const { expl } = buildExplanations(root, P);
const ids = process.argv.slice(2);
for (const q of P.mcq.filter(q => ids.includes(q.m) || ids.includes(q.id))) {
  const x = expl[q.id]; if (!x) continue;
  console.log(`\n### ${q.id} [L${q.lvl}] ${q.q}`);
  console.log(`  scurt: ${x.scurt}`);
  q.o.forEach((o, i) => {
    console.log(`  ${"ABCD"[i]}${i === q.a ? "*" : " "} ${o}`);
    const g = (x.gr || {})[i] ?? (Array.isArray(x.gr) ? (x.gr.find(g => g.i === i) || {}).t : undefined);
    if (i !== q.a) console.log(`      ↳ ${g === undefined ? "<<LIPSĂ>>" : (typeof g === "string" ? g : JSON.stringify(g))}`);
  });
}
