// node dumpmod.mjs mod1 mod2 ... → prints questions (letters: A = source index 0) without new explanations
import { loadData, buildExplanations } from "../lib.mjs";
const root = new URL("../", import.meta.url);
const P = loadData(root);
P.mcq.forEach(q => { const c = (P.qctx || {})[q.id]; if (c) { q.lvl = q.lvl || c[0]; q.ctx = q.ctx || c[1]; } });
const { expl } = buildExplanations(root, P);
for (const m of process.argv.slice(2)) for (const q of P.mcq.filter(q => q.m === m && !expl[q.id])) {
  console.log(`\n### ${q.id} [L${q.lvl}] ${q.q}`);
  if (q.code) console.log("code:\n" + q.code);
  q.o.forEach((o, i) => console.log(`  ${"ABCD"[i]}${i === q.a ? "*" : " "} ${o}`));
  console.log("  ctx: " + q.ctx);
  console.log("  e: " + q.e);
}
