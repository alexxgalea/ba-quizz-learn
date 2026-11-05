// Check-ul exemplelor din desfășurări (src/desf/*.md).
//   ```python / ```py: rulează într-un proces izolat, cu timeout; ce afișează se compară în ordine cu comentariile `# → …`.
//     O excepție așteptată se marchează `# ! Tip`: blocul trebuie să se oprească exact cu acel tip, pe acea instrucțiune.
//   ```js: la fel, cu `// → …` și `// ! Tip` (tools/desf_run.mjs, ca modul ESM; marcajul pe un rând prin care trece excepția).
//   ```ts: tsc --strict --noEmit (configul din katas/); o eroare voită se marchează `// ! TS2322` pe rândul care o dă.
//   ```tsx / ```jsx: nu rulează (se verifică de mână, într-un test vitest temporar). Pseudo-codul se scrie ```text.
//   node tools/desf_examples.mjs        (din rădăcina repo-ului; iese cu 1 dacă un exemplu pică)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDesf, readDesfFiles, codeBlocks, DESF_LABEL } from "../lib.mjs";
import { readMarks } from "./desf_comments.mjs";

const RUNNER = fileURLToPath(new URL("./desf_run.py", import.meta.url));
const RUNNER_JS = fileURLToPath(new URL("./desf_run.mjs", import.meta.url));
const PY = process.env.PYTHON || "python3";
const TSC = process.env.TSC || fileURLToPath(new URL("../katas/node_modules/.bin/tsc", import.meta.url));

// Rulează un bloc și întoarce { ok, errors }. Python: `-I` (fără variabile PYTHON*, fără directorul scriptului în sys.path); JS: modul ESM;
// în ambele cazuri cwd = un director gol. `lang: "ts"` trece blocul prin tsc (pentru mai multe blocuri deodată: checkTsExamples).
export function checkExample(code, { timeout = 10000, lang = "python" } = {}) {
  if (lang === "ts") return checkTsExamples([code], { timeout })[0];
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "desf-"));
  try {
    const cmd = lang === "js" ? [process.execPath, ["--no-warnings", RUNNER_JS]] : [PY, ["-I", "-X", "utf8", RUNNER]];
    const r = spawnSync(cmd[0], cmd[1], { input: code, cwd, timeout, encoding: "utf8", maxBuffer: 1 << 22 });
    if (r.error && r.error.code === "ETIMEDOUT") return { ok: false, errors: ["depășit timpul (" + timeout + " ms): blocul nu se termină"] };
    if (r.error) return { ok: false, errors: ["nu pot porni " + cmd[0] + ": " + r.error.message] };
    let res;
    try { res = JSON.parse(r.stdout); } catch (e) { return { ok: false, errors: ["rularea a eșuat: " + (r.stderr || r.stdout || "fără ieșire").trim().slice(-300)] }; }
    return judge(res);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
}

function judge(res) {
  const errors = [];
  if (res.syntax) return { ok: false, errors: ["eroare de sintaxă: " + res.syntax] };
  const exp = res.expected, out = res.output;
  if (exp.length !== out.length) errors.push("afișează " + out.length + " rânduri, dar " + exp.length + " au rezultat așteptat (# → …); afișat: " + JSON.stringify(out).slice(0, 160));
  else exp.forEach(([ln, text], i) => { if (out[i].trimEnd() !== text) errors.push("rândul " + ln + ": așteptat „" + text + "”, afișat „" + out[i] + "”"); });
  if (res.marks.length > 1) errors.push("o singură excepție așteptată (# ! Tip) pe bloc");
  const mark = res.marks[0], exc = res.exc;
  if (mark && exc && res.frames) {   // JS: nu știm instrucțiunea, ci rândurile prin care a trecut excepția
    if (exc.type !== mark[1]) errors.push("blocul s-a oprit cu " + exc.type + ", nu cu " + mark[1] + " (// ! " + mark[1] + ", rândul " + mark[0] + ")");
    else if (!res.frames.includes(mark[0])) errors.push("excepția nu trece prin rândul marcat (rândul " + mark[0] + "); trece prin rândurile " + (res.frames.join(", ") || "(niciunul din bloc)"));
  } else if (mark && !exc) errors.push("nicio excepție: blocul nu s-a oprit cu " + mark[1] + " (marcat la rândul " + mark[0] + ")");
  else if (mark && exc.type !== mark[1]) errors.push("blocul s-a oprit cu " + exc.type + ", nu cu " + mark[1] + " (# ! " + mark[1] + ", rândul " + mark[0] + ")");
  else if (mark) {
    const st = (res.stmts || []).find(([a, b]) => a <= mark[0] && mark[0] <= b);
    if (st && (exc.line == null || exc.line < st[0] || exc.line > st[1])) errors.push("excepția a venit de la instrucțiunea de la rândul " + exc.line + ", nu de la cea marcată (rândul " + mark[0] + ")");
  } else if (exc) errors.push("excepție neașteptată: " + exc.type + " la rândul " + exc.line + " (dacă e voită, marchează linia cu # ! " + exc.type + ")");
  return { ok: !errors.length, errors };
}

// ```ts: toate blocurile deodată, într-un director gol, cu `tsc --strict --noEmit`. Fiecare bloc e un modul separat (`export {};` pe primul rând,
// deci rândurile rămân aceleași): declarațiile unui bloc nu se văd în altul. Întoarce un { ok, errors } pe bloc, în ordinea blocurilor.
export function checkTsExamples(blocks, { timeout = 60000 } = {}) {
  if (!blocks.length) return [];
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "desf-ts-"));
  try {
    blocks.forEach((b, i) => fs.writeFileSync(path.join(cwd, "ex" + i + ".ts"), "export {}; " + b));
    fs.writeFileSync(path.join(cwd, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "bundler", strict: true, noEmit: true, skipLibCheck: true, types: [] },
      files: blocks.map((_, i) => "ex" + i + ".ts")
    }));
    const r = spawnSync(TSC, ["-p", cwd], { cwd, timeout, encoding: "utf8", maxBuffer: 1 << 22 });
    if (r.error && r.error.code === "ETIMEDOUT") return blocks.map(() => ({ ok: false, errors: ["depășit timpul (" + timeout + " ms): tsc nu se termină"] }));
    if (r.error) return blocks.map(() => ({ ok: false, errors: ["nu pot porni tsc (" + TSC + "; rulează npm install --prefix katas): " + r.error.message] }));
    const got = blocks.map(() => []), stray = [];
    for (const l of String(r.stdout).split("\n")) {
      const m = l.match(/^ex(\d+)\.ts\((\d+),\d+\): error (TS\d+): (.*)$/);
      if (m) got[+m[1]].push({ line: +m[2], code: m[3], msg: m[4] }); else if (/error TS\d+/.test(l)) stray.push(l);
    }
    if (stray.length) return blocks.map(() => ({ ok: false, errors: ["tsc: " + stray[0].slice(0, 200)] }));
    return blocks.map((b, i) => {
      const { marks } = readMarks(b), errors = [], left = new Map(marks);
      for (const e of got[i]) {
        if (left.get(e.line) === e.code) left.delete(e.line);
        else errors.push("rândul " + e.line + ": " + e.code + " " + e.msg.slice(0, 120) + (marks.has(e.line) ? " (marcat " + marks.get(e.line) + ")" : " (neașteptat; dacă e voită, marchează rândul cu // ! " + e.code + ")"));
      }
      for (const [line, code] of left) if (!got[i].some(e => e.line === line)) errors.push("rândul " + line + ": așteptat " + code + ", dar tsc nu a dat nicio eroare");
      return { ok: !errors.length, errors };
    });
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
}

// Blocurile câmpurilor, cu locul lor: [{ n, field, index, lang, code }] (index = al câtelea bloc din câmp, de la 1). Implicit doar ```python / ```py.
export function extractExamples(parsed, langs = ["python", "py"]) {
  const out = [];
  for (const it of parsed.items) for (const [k, label] of Object.entries(DESF_LABEL)) {
    codeBlocks(it[k]).forEach((b, j) => { if (langs.includes(b.lang)) out.push({ n: it.n, field: label, index: j + 1, lang: b.lang, code: b.code }); });
  }
  return out;
}

function main() {
  const root = new URL("../", import.meta.url);
  const files = readDesfFiles(root);
  let total = 0, bad = 0;
  const per = { Python: 0, JS: 0, TS: 0 };
  const report = (f, e, r) => { if (!r.ok) { bad++; console.error(f + ": punctul " + e.n + ", " + e.field + (e.index > 1 ? " (blocul " + e.index + ")" : "") + ":\n  " + r.errors.join("\n  ")); } };
  for (const [f, md] of Object.entries(files)) {
    const ex = extractExamples(parseDesf(md, f), ["python", "py", "js", "ts"]);
    const tsEx = ex.filter(e => e.lang === "ts");
    for (const e of ex.filter(e => e.lang !== "ts")) { total++; per[e.lang === "js" ? "JS" : "Python"]++; report(f, e, checkExample(e.code, { lang: e.lang === "js" ? "js" : "python" })); }
    const rs = checkTsExamples(tsEx.map(e => e.code));
    tsEx.forEach((e, i) => { total++; per.TS++; report(f, e, rs[i]); });
  }
  console.log("exemple în desfășurări: " + total + " (Python " + per.Python + ", JS " + per.JS + ", TS " + per.TS + "), picate: " + bad);
  if (bad) process.exit(1);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
