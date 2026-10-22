// Inlines CSS, data, explanations, glossary, tested kata solutions and app code into one self-contained page.
import fs from "node:fs";
import { DATA_FILES, LIB_FILES, loadData, buildExplanations } from "./lib.mjs";

const root = new URL("./", import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), "utf8");
const py = read("./katas/katas.py");
const kataCode = {};
for (const m of py.matchAll(/# === (k\d+) ===\n([\s\S]*?)# === end ===/g)) kataCode[m[1]] = m[2].replace(/\s+$/, "") + "\n";

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

fs.mkdirSync(new URL("./dist/", root), { recursive: true });
fs.writeFileSync(new URL("./dist/pregatire-onapsis.html", root), html);
fs.writeFileSync(new URL("./dist/bundle-check.js", root), data + "\n" + app);
console.log("katas:", Object.keys(kataCode).join(","), "| explanations:", Object.keys(expl).length + "/" + P.mcq.length, "| terms:", gloss.length,
  "| bytes:", Buffer.byteLength(html), "| title in first 8KB:", html.slice(0, 8192).includes("<title>"));
