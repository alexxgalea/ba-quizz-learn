// Propune legăturile item–punct pentru un modul (`.scratch/fundatie-concepte/`, tichetul 04): node tools/tagpoints.mjs <modul...>
// Pe fiecare grilă și schelet: cele mai apropiate 3 puncte (cuvinte comune, ca la goluri); pe fiecare card oral: un punct (sau null) pentru fiecare punct cheie.
// Sunt doar propuneri: citești itemul și punctul și scrii tu `pt` / `kp` în `src/data_*.js`. Ce e deja scris apare la „acum”.
import { loadData, proposeTags } from "../lib.mjs";

const P = loadData(new URL("../", import.meta.url));
const mods = process.argv.slice(2);
if (!mods.length) { console.error("folosire: node tools/tagpoints.mjs <modul...>"); process.exit(1); }
for (const m of mods) {
  const sh = P.sheets[m];
  if (!sh) { console.error("modul necunoscut: " + m); process.exit(1); }
  console.log("# " + m + " (" + sh.points.length + " puncte)");
  sh.points.forEach((p, i) => console.log("  P" + (i + 1) + ": " + p.slice(0, 100)));
  for (const x of proposeTags(P, m)) {
    const now = x.has === undefined ? "–" : JSON.stringify(x.has);
    console.log((x.kind === "oral" ? "kp" : "pt") + " " + x.id + "  propus " + JSON.stringify(x.prop) + "  acum " + now + "\n    " + x.text.slice(0, 110));
  }
}
