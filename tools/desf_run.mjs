// Rulează un bloc JavaScript din desfășurări (codul vine pe stdin) ca modul ESM și scrie pe stdout, ca JSON, ce a afișat și cum s-a oprit.
// Comentarii citite din cod (tools/desf_comments.mjs, deci nu din șiruri):
//   // → text   rezultatul așteptat al unui rând afișat de console.log / info / debug (formatat ca în Node: util.format)
//   // ! Tip    blocul trebuie să se oprească cu excepția Tip (numele constructorului), trecând prin rândul acesta (aruncarea sau apelul)
// Ca modul ESM, blocul poate folosi `await` la nivel de modul, iar timerele și promisiunile se termină înainte de verdict.
// Apelat de tools/desf_examples.mjs cu `node --no-warnings`, într-un director gol.
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { pathToFileURL } from "node:url";
import { readMarks } from "./desf_comments.mjs";

const code = fs.readFileSync(0, "utf8");
const { arrows, marks } = readMarks(code);
const res = {
  expected: [...arrows].sort((a, b) => a[0] - b[0]),
  marks: [...marks].sort((a, b) => a[0] - b[0]),
  frames: null, exc: null, output: []
};
const grab = (...a) => { for (const l of util.format(...a).split("\n")) res.output.push(l); };
console.log = console.info = console.debug = grab;

function note(e) {
  if (res.exc || res.syntax) return;
  const stack = String((e && e.stack) || "");
  const frames = [...stack.matchAll(/ex\.mjs:(\d+):\d+/g)].map(m => +m[1]);
  if (e instanceof SyntaxError && !frames.length) {
    const at = stack.match(/ex\.mjs:(\d+)/);
    res.syntax = e.message + (at ? " (rândul " + at[1] + ")" : "");
    return;
  }
  res.exc = { type: e && e.constructor ? e.constructor.name : typeof e, line: frames.length ? frames[0] : null };
  res.frames = frames;
}
process.on("unhandledRejection", note);
process.on("uncaughtException", note);
process.on("exit", () => { fs.writeSync(1, JSON.stringify(res)); });

const file = path.join(process.cwd(), "ex.mjs");
fs.writeFileSync(file, code);
import(pathToFileURL(file).href).catch(note);
