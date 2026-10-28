// Inlines CSS, data, explanations, glossary, tested kata solutions and app code into one self-contained page.
import fs from "node:fs";
import crypto from "node:crypto";
import { DATA_FILES, LIB_FILES, loadData, buildExplanations } from "./lib.mjs";

const root = new URL("./", import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), "utf8");
// Kata solutions: every "# === kN ===" (Python) or "// === kN ===" (JS/TS) section in katas/,
// sources first, then their tests (a test section is appended to the kata's code).
const kataCode = {};
const kataFiles = fs.readdirSync(new URL("./katas/", root))
  .filter(f => /\.(py|mjs|tsx)$/.test(f) && !/^test_/.test(f) && !/\.test\.mjs$/.test(f))
  .sort((a, b) => /\.test\./.test(a) - /\.test\./.test(b) || a.localeCompare(b));
for (const f of kataFiles) {
  const src = read("./katas/" + f);
  for (const m of src.matchAll(/^(#|\/\/) === (k\d+) ===\n([\s\S]*?)^\1 === end ===/gm)) {
    const code = m[3].replace(/\s+$/, "") + "\n";
    kataCode[m[2]] = kataCode[m[2]] ? kataCode[m[2]] + "\n// --- test ---\n" + code : code;
  }
}
for (const k of Object.keys(kataCode).sort((a, b) => a.slice(1) - b.slice(1))) {
  const code = kataCode[k]; delete kataCode[k]; kataCode[k] = code;  // ordinea k1, k2, …
}

// explanations (src/expl/*.md) and glossary (src/expl/glosar.md), checked against the questions
const P = loadData(root);
const { expl, gloss, errors } = buildExplanations(root, P);
if (errors.length) throw new Error("explanations:\n" + errors.join("\n"));
const cap = s => s.replace(/^\p{Ll}/u, c => c.toUpperCase());
for (const x of Object.values(expl)) for (const k of Object.keys(x.gr)) x.gr[k] = cap(x.gr[k]);

const data = DATA_FILES.map(f => read("./src/" + f)).join("\n") +
  "\nwindow.PREP.kataCode = " + JSON.stringify(kataCode) + ";\n" +
  "window.PREP.expl = " + JSON.stringify(expl) + ";\n" +
  "window.PREP.gloss = " + JSON.stringify(gloss) + ";\n";
const app = LIB_FILES.map(f => read("./src/" + f)).join("\n") + "\n" + read("./src/app.js");

for (const [name, js] of [["data", data], ["app", app]]) if (/<\/script/i.test(js)) throw new Error("</script inside " + name);

const html = read("./src/shell.html")
  .replace("/*CSS*/", () => read("./src/app.css"))
  .replace("/*DATA*/", () => data)
  .replace("/*APP*/", () => app);

// PWA (dist/app): aceeași pagină ca document întreg, cu manifest, iconițe și service worker. Artifactul rămâne fără ele.
const split = html.indexOf("</style>") + "</style>".length;
const pwaHtml = '<!doctype html>\n<html lang="ro">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="theme-color" content="#2c4fd3">\n' +
  '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n' + html.slice(0, split) +
  '\n</head>\n<body>\n' + html.slice(split) + '\n<script>if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});</script>\n</body>\n</html>\n';
const manifest = { name: "Pregătire Onapsis", short_name: "Pregătire", description: "Grile, carduri orale, Jarvis (interviu vorbit) și plan pe zile pentru interviul tehnic Onapsis.", lang: "ro", start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
  background_color: "#0e121a", theme_color: "#2c4fd3", icons: [192, 512].map(n => ({ src: "icon-" + n + ".png", sizes: n + "x" + n, type: "image/png", purpose: "any maskable" })) };
const appDir = new URL("./dist/app/", root);
fs.mkdirSync(appDir, { recursive: true });
fs.writeFileSync(new URL("index.html", appDir), pwaHtml);
fs.writeFileSync(new URL("manifest.webmanifest", appDir), JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(new URL("sw.js", appDir), read("./src/pwa/sw.js").replace("__CACHE__", "pregatire-" + crypto.createHash("sha1").update(pwaHtml).digest("hex").slice(0, 10)));
for (const n of [192, 512]) fs.copyFileSync(new URL("./src/pwa/icon-" + n + ".png", root), new URL("icon-" + n + ".png", appDir));

fs.mkdirSync(new URL("./dist/", root), { recursive: true });
fs.writeFileSync(new URL("./dist/pregatire-onapsis.html", root), html);
fs.writeFileSync(new URL("./dist/bundle-check.js", root), data + "\n" + app);
console.log("katas:", Object.keys(kataCode).join(","), "| explanations:", Object.keys(expl).length + "/" + P.mcq.length, "| terms:", gloss.length,
  "| bytes:", Buffer.byteLength(html), "| title in first 8KB:", html.slice(0, 8192).includes("<title>"));
