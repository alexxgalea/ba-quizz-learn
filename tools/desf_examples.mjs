// Check-ul exemplelor Python din desfășurări (src/desf/*.md): fiecare bloc ```python rulează într-un proces izolat, cu timeout,
// iar ce afișează se compară în ordine cu comentariile `# → …`. O excepție așteptată se marchează `# ! Tip`: blocul trebuie să se
// oprească exact cu acel tip, pe acea instrucțiune. Un bloc Python care nu rulează nu e permis (pseudo-codul se scrie ```text).
//   node tools/desf_examples.mjs        (din rădăcina repo-ului; iese cu 1 dacă un exemplu pică)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDesf, readDesfFiles, codeBlocks, DESF_LABEL } from "../lib.mjs";

const RUNNER = fileURLToPath(new URL("./desf_run.py", import.meta.url));
const PY = process.env.PYTHON || "python3";

// Rulează un bloc și întoarce { ok, errors }. `-I`: fără variabile PYTHON*, fără directorul scriptului în sys.path; cwd = un director gol.
export function checkExample(code, { timeout = 10000 } = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "desf-"));
  try {
    const r = spawnSync(PY, ["-I", "-X", "utf8", RUNNER], { input: code, cwd, timeout, encoding: "utf8", maxBuffer: 1 << 22 });
    if (r.error && r.error.code === "ETIMEDOUT") return { ok: false, errors: ["depășit timpul (" + timeout + " ms): blocul nu se termină"] };
    if (r.error) return { ok: false, errors: ["nu pot porni " + PY + ": " + r.error.message] };
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
  if (mark && !exc) errors.push("nicio excepție: blocul nu s-a oprit cu " + mark[1] + " (marcat la rândul " + mark[0] + ")");
  else if (mark && exc.type !== mark[1]) errors.push("blocul s-a oprit cu " + exc.type + ", nu cu " + mark[1] + " (# ! " + mark[1] + ", rândul " + mark[0] + ")");
  else if (mark) {
    const st = res.stmts.find(([a, b]) => a <= mark[0] && mark[0] <= b);
    if (st && (exc.line == null || exc.line < st[0] || exc.line > st[1])) errors.push("excepția a venit de la instrucțiunea de la rândul " + exc.line + ", nu de la cea marcată (rândul " + mark[0] + ")");
  } else if (exc) errors.push("excepție neașteptată: " + exc.type + " la rândul " + exc.line + " (dacă e voită, marchează linia cu # ! " + exc.type + ")");
  return { ok: !errors.length, errors };
}

// Blocurile ```python / ```py ale tuturor câmpurilor, cu locul lor: [{ n, field, index, code }] (index = al câtelea bloc din câmp, de la 1).
export function extractExamples(parsed) {
  const out = [];
  for (const it of parsed.items) for (const [k, label] of Object.entries(DESF_LABEL)) {
    codeBlocks(it[k]).forEach((b, j) => { if (b.lang === "python" || b.lang === "py") out.push({ n: it.n, field: label, index: j + 1, code: b.code }); });
  }
  return out;
}

function main() {
  const root = new URL("../", import.meta.url);
  const files = readDesfFiles(root);
  let total = 0, bad = 0;
  for (const [f, md] of Object.entries(files)) {
    const ex = extractExamples(parseDesf(md, f));
    for (const e of ex) {
      total++;
      const r = checkExample(e.code);
      if (!r.ok) { bad++; console.error(f + ": punctul " + e.n + ", " + e.field + (e.index > 1 ? " (blocul " + e.index + ")" : "") + ":\n  " + r.errors.join("\n  ")); }
    }
  }
  console.log("exemple Python în desfășurări: " + total + ", picate: " + bad);
  if (bad) process.exit(1);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
