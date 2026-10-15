// node fencew.mjs [maxCols] → lines inside fenced blocks wider than maxCols, per explanation field
import { loadData, buildExplanations } from "../lib.mjs";
const root = new URL("../", import.meta.url);
const P = loadData(root);
const { expl } = buildExplanations(root, P);
const max = +(process.argv[2] || 36);
let n = 0, tot = 0; const per = {};
for (const [id, x] of Object.entries(expl)) for (const [k, v] of Object.entries(x)) {
  if (typeof v !== "string") continue;
  for (const m of v.matchAll(/```(\w*)\n([\s\S]*?)```/g)) for (const line of m[2].split("\n")) {
    tot++; if ([...line].length > max) { n++; (per[id] ||= []).push(`${k}/${m[1] || "-"} ${[...line].length}: ${line}`); }
  }
}
console.log(`lines > ${max}: ${n}/${tot}`);
for (const [id, l] of Object.entries(per)) console.log(id + "\n  " + l.join("\n  "));
