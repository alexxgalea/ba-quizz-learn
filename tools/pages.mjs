// Copiază PWA-ul construit (dist/app) în docs/app, de unde GitHub Pages îl servește din ramură (Settings › Pages › Deploy from a branch › /docs).
// Rulezi după `npm run build`. `.nojekyll` oprește procesarea Jekyll, ca fișierele să fie servite exact cum sunt.
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const from = new URL("./dist/app/", root), to = new URL("./docs/app/", root);
if (!fs.existsSync(from)) throw new Error("dist/app lipsește: rulează întâi `npm run build`.");
fs.rmSync(to, { recursive: true, force: true });
fs.mkdirSync(to, { recursive: true });
for (const f of fs.readdirSync(from)) fs.copyFileSync(new URL(f, from), new URL(f, to));
fs.writeFileSync(new URL("./docs/.nojekyll", root), "");
console.log("docs/app:", fs.readdirSync(to).join(", "));
