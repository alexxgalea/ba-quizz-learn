// Desfășurările punctelor: parsarea (src/desf/<modul>.md) și regulile de validare. Fiecare regulă are un caz care pică; la final, datele reale trec.
import test from "node:test";
import assert from "node:assert/strict";
import { parseDesf, checkDesf, buildDesf, readDesfFiles, parseExpl, loadData, DESF_LIMITS, DESF_LIMITS_FE, DESF_FE_MODULES, desfLimits } from "../../lib.mjs";

const w = n => Array.from({ length: n }, (_, i) => "cuvânt" + i).join(" ");   // n cuvinte
const fence = (lang, ...lines) => "```" + lang + "\n" + lines.join("\n") + "\n```";

// O desfășurare validă (≈ 70 de cuvinte), cu câmpuri înlocuibile / scoase (null) prin `over`.
function item(n, over = {}) {
  const f = { p: "Problema: " + w(20), i: "Ideea: " + w(20), ex: "Exemplu:\n" + fence("python", "x = 1", "print(x)  # → 1") + "\n" + w(20) };
  for (const [k, v] of Object.entries(over)) { if (v === null) delete f[k]; else f[k] = v; }
  return "### " + n + "\n" + Object.values(f).join("\n") + "\n";
}
const MAP = "### harta\nProblema: " + w(10) + "\nGrupuri:\n- 1–2: " + w(4) + "\n- 3: " + w(4) + "\n";
const doc = (map, ...items) => (map === null ? "" : map + "\n") + items.join("\n");
const sheet = n => ({ points: Array(n).fill("punct") });
const errs = (md, n = 3, file = "oop.md") => checkDesf(parseDesf(md, file), sheet(n), file).errors;
const warns = (md, n = 3, file = "oop.md") => checkDesf(parseDesf(md, file), sheet(n), file).warnings;
const good = () => doc(MAP, item(1), item(2), item(3));
const has = (list, re) => assert.ok(list.some(e => re.test(e)), "așteptat /" + re + "/ în:\n" + list.join("\n"));

test("parsing: the map, the points and every field land where they belong", () => {
  const md = doc(MAP, item(1, { an: "Analogie: " + w(5), cpp: "În C++: " + w(5), nu: "Unde nu ține: " + w(5), leg: "Legătură: " + w(5), hard: "Greu: da" }), item(2), item(3));
  const d = parseDesf(md, "oop.md");
  assert.equal(d.items.length, 3);
  assert.deepEqual(d.map.g.map(g => [g.a, g.b]), [[1, 2], [3, 3]]);
  assert.match(d.map.p, /^cuvânt0 /);
  const it = d.items[0];
  assert.deepEqual(Object.keys(it).sort(), ["an", "cpp", "ex", "hard", "i", "leg", "n", "nu", "p"]);
  assert.equal(it.hard, true);
  assert.match(it.ex, /```python\nx = 1\nprint\(x\)  # → 1\n```/);
  assert.equal(d.items[1].cpp, undefined);
});

test("parsing: fields inside a code fence are not read as fields", () => {
  const md = doc(MAP, item(1, { ex: "Exemplu:\n" + fence("text", "Problema: nu e câmp", "Ideea: nici asta") }), item(2), item(3));
  const d = parseDesf(md, "oop.md");
  assert.match(d.items[0].ex, /Problema: nu e câmp/);
  assert.match(d.items[0].p, /^cuvânt0/);
});

test("the grid parser for questions is unchanged", () => {
  const md = "### py-01\nPe scurt: a\nMecanism: b\n```\nPe scurt: nu\n```\n### py-02\nPe scurt: c\nVarianta greșită B: d\n";
  const x = parseExpl(md, "x.md");
  assert.deepEqual(Object.keys(x), ["py-01", "py-02"]);
  assert.equal(x["py-01"].mec, "b\n```\nPe scurt: nu\n```");
  assert.deepEqual(x["py-02"].gr, [{ letter: "B", raw: "d" }]);
});

test("a valid module passes with no errors", () => assert.deepEqual(errs(good()), []));

test("rule: the number of explanations equals the number of points", () => {
  has(errs(doc(MAP, item(1), item(2)), 3), /2 desfășurări.*3 puncte|3 puncte.*2/);
  has(errs(doc(MAP, item(1), item(2), item(3), item(4)), 3), /4 desfășurări/);
});

test("rule: the points are numbered 1, 2, 3 in order", () => has(errs(doc(MAP, item(1), item(3), item(2))), /ordine|numerotare|punctul 2/i));

test("rule: a module with explanations has a map", () => has(errs(doc(null, item(1), item(2), item(3))), /harta/i));

test("rule: Problema and Ideea are required", () => {
  has(errs(doc(MAP, item(1, { p: null }), item(2), item(3))), /punctul 1.*Problema/);
  has(errs(doc(MAP, item(1), item(2, { i: null }), item(3))), /punctul 2.*Ideea/);
});

test("rule: at least one of Exemplu and Analogie", () => {
  has(errs(doc(MAP, item(1), item(2), item(3, { ex: null }))), /punctul 3.*Exemplu.*Analogie/);
  assert.deepEqual(errs(doc(MAP, item(1), item(2), item(3, { ex: null, an: "Analogie: " + w(20) }))), []);
});

test("rule: În C++ and Unde nu ține come together", () => {
  has(errs(doc(MAP, item(1, { cpp: "În C++: " + w(5) }), item(2), item(3))), /punctul 1.*Unde nu ține/);
  has(errs(doc(MAP, item(1, { nu: "Unde nu ține: " + w(5) }), item(2), item(3))), /punctul 1.*În C\+\+/);
  assert.deepEqual(errs(doc(MAP, item(1, { cpp: "În C++: " + w(5), nu: "Unde nu ține: " + w(5) }), item(2), item(3))), []);
});

test("rule: length 50–100 words, up to 190 on points marked hard; code is not counted", () => {
  assert.equal([DESF_LIMITS.min, DESF_LIMITS.max, DESF_LIMITS.hard].join(), "50,100,180");
  has(errs(doc(MAP, item(1, { i: "Ideea: " + w(3), ex: null, an: "Analogie: " + w(3), p: "Problema: " + w(3) }), item(2), item(3))), /punctul 1.*prea scurt/);
  has(errs(doc(MAP, item(1, { an: "Analogie: " + w(60) }), item(2), item(3))), /punctul 1.*prea lung/);
  const long = { an: "Analogie: " + w(60) };   // 120 de cuvinte: prea lung, dar bun dacă punctul e marcat greu
  assert.deepEqual(errs(doc(MAP, item(1, { ...long, hard: "Greu: da" }), item(2), item(3))), []);
  has(errs(doc(MAP, item(1, { an: "Analogie: " + w(150), hard: "Greu: da" }), item(2), item(3))), /punctul 1.*prea lung/);
  assert.deepEqual(errs(doc(MAP, item(1, { ex: "Exemplu:\n" + fence("python", ...Array(8).fill("x = 1")) + "\n" + w(20) }), item(2), item(3))), []);
});

test("warning: outside the 60–90 band but inside the limits", () => {
  const r = checkDesf(parseDesf(doc(MAP, item(1, { i: "Ideea: " + w(15), p: "Problema: " + w(15) }), item(2), item(3)), "oop.md"), sheet(3), "oop.md");
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some(x => /punctul 1/.test(x)), r.warnings.join("\n"));
});

test("rule: the example has at most 8 lines of code", () => {
  const nine = "Exemplu:\n" + fence("python", ...Array(9).fill("x = 1")) + "\n" + w(20);
  has(errs(doc(MAP, item(1, { ex: nine }), item(2), item(3))), /punctul 1.*Exemplu.*8 rânduri/);
});

test("rule: code lines have at most 36 characters", () => {
  const wide = "Exemplu:\n" + fence("python", "x = '" + "a".repeat(40) + "'") + "\n" + w(20);
  has(errs(doc(MAP, item(1, { ex: wide }), item(2), item(3))), /punctul 1.*rândul 1.*36/);
  const cpp = "În C++: " + w(5) + "\n" + fence("cpp", "int y = " + "9".repeat(40) + ";");
  has(errs(doc(MAP, item(1, { cpp, nu: "Unde nu ține: " + w(5) }), item(2), item(3))), /punctul 1.*rândul 1.*36/);
});

test("rule: code languages are python, cpp, ts, tsx or text; fences are balanced", () => {
  has(errs(doc(MAP, item(1, { ex: "Exemplu:\n" + fence("rust", "let x = 1;") + "\n" + w(20) }), item(2), item(3))), /punctul 1.*limbaj.*rust/);
  has(errs(doc(MAP, item(1, { ex: "Exemplu:\n```python\nx = 1\n" + w(20) }), item(2), item(3))), /punctul 1.*bloc de cod/);
});

test("rule: the map has Problema and groups that cover every point exactly once", () => {
  const map = g => "### harta\nProblema: " + w(10) + "\nGrupuri:\n" + g + "\n";
  has(errs(doc("### harta\nGrupuri:\n- 1–3: " + w(3) + "\n", item(1), item(2), item(3))), /harta.*Problema/i);
  has(errs(doc(map("- 1–2: " + w(3)), item(1), item(2), item(3))), /harta.*punctul 3.*nu e în niciun grup/i);
  has(errs(doc(map("- 1–2: " + w(3) + "\n- 2–3: " + w(3)), item(1), item(2), item(3))), /harta.*punctul 2.*două grupuri/i);
  has(errs(doc(map("- 1–5: " + w(3)), item(1), item(2), item(3))), /harta.*grupul 1–5.*fișa are 3 puncte/i);
  has(errs(doc(map("- 1–3 " + w(3)), item(1), item(2), item(3))), /harta.*rând de grup/i);
  has(errs(doc(map("- 3–1: " + w(3)), item(1), item(2), item(3))), /harta.*3–1/);
  assert.deepEqual(errs(doc(map("- 1: " + w(3) + "\n- 2-3: " + w(3)), item(1), item(2), item(3))), []);   // și cratimă simplă
});

test("rule: Greu is written 'Greu: da'", () => has(errs(doc(MAP, item(1, { hard: "Greu: poate" }), item(2), item(3))), /punctul 1.*Greu: da/));

test("rule: the map needs a Grupuri field", () => has(errs(doc("### harta\nProblema: " + w(10) + "\n", item(1), item(2), item(3))), /harta.*Grupuri/i));

test("the map heading is read in any case, and two map headings are a duplicate", () => {
  const d = parseDesf(doc(MAP.replace("### harta", "### Harta"), item(1), item(2), item(3)), "oop.md");
  assert.ok(d.map && d.map.g.length === 2);
  assert.deepEqual(errs(doc(MAP.replace("### harta", "### Harta"), item(1), item(2), item(3))), []);
  assert.throws(() => parseDesf(doc(MAP + "\n" + MAP.replace("### harta", "### HARTA"), item(1), item(2), item(3)), "oop.md"), /duplicate harta/);
});

test("warning: the material for the Ask context nears its cap", () => {
  const P = { modules: [{ id: "oop" }], sheets: { oop: { lead: "x", points: Array(3).fill(w(20)) } } };
  assert.deepEqual(buildDesf(P, { "oop.md": good() }).warnings, []);
  const big = doc(MAP, item(1, { hard: "Greu: da", an: "Analogie: " + w(120) }), item(2), item(3));
  const P2 = { modules: [{ id: "oop" }], sheets: { oop: { lead: "x", points: Array(3).fill(w(3000)) } } };
  assert.ok(buildDesf(P2, { "oop.md": big }).warnings.some(x => /Întreabă/.test(x)));
});

test("buildDesf: a module that has no file simply has no explanations; an unknown module file is an error", () => {
  const P = { modules: [{ id: "oop" }], sheets: { oop: sheet(3) } };
  const files = { "oop.md": good() };
  const ok = buildDesf(P, files);
  assert.deepEqual(ok.errors, []);
  assert.equal(Object.keys(ok.desf).join(), "oop");
  assert.equal(ok.desf.oop.items.length, 3);
  assert.deepEqual(buildDesf(P, {}).desf, {});
  has(buildDesf(P, { "nope.md": good() }).errors, /nope.*modul/i);
  has(buildDesf({ modules: [{ id: "oop" }], sheets: {} }, { "oop.md": good() }).errors, /oop.*nu are fișă/i);
  has(buildDesf(P, { "oop.md": doc(MAP, item(1), item(2), item(2)) }).errors, /duplicate|dublat/i);
});

// ---- modulele frontend: limite proprii (tichetul 02 din .scratch/frontend-extins) ----
const FE = ["js", "ts", "react", "frontend", "fedebug"];
const feErrs = (md, file = "js.md") => errs(md, 3, file);

test("frontend modules have their own limits; the other modules keep the old ones", () => {
  assert.equal([DESF_LIMITS_FE.bandMin, DESF_LIMITS_FE.bandMax, DESF_LIMITS_FE.hard, DESF_LIMITS_FE.exLines, DESF_LIMITS_FE.stepLines].join(), "90,140,250,14,8");
  for (const m of FE) assert.equal(desfLimits(m), DESF_LIMITS_FE, m);
  for (const m of ["oop", "python", "asyncio", "design"]) assert.equal(desfLimits(m), DESF_LIMITS, m);
});

test("frontend: 120 words pass in js, but the same item fails in oop (max 100)", () => {
  const long = { an: "Analogie: " + w(60) };   // 120 de cuvinte
  assert.deepEqual(feErrs(doc(MAP, item(1, long), item(2), item(3))), []);
  has(errs(doc(MAP, item(1, long), item(2), item(3))), /punctul 1.*prea lung/);
});

test("frontend: the 'hard' ceiling is 250 words, and 180 is still the ceiling elsewhere", () => {
  const w200 = { an: "Analogie: " + w(140), hard: "Greu: da" };   // ≈ 200 de cuvinte
  assert.deepEqual(feErrs(doc(MAP, item(1, w200), item(2), item(3))), []);
  has(errs(doc(MAP, item(1, w200), item(2), item(3))), /punctul 1.*prea lung.*180/);
  has(feErrs(doc(MAP, item(1, { an: "Analogie: " + w(200), hard: "Greu: da" }), item(2), item(3))), /punctul 1.*prea lung.*250/);
});

test("frontend: the band is 90–140 (warning), the old 60–90 band is not used there", () => {
  assert.ok(warns(doc(MAP, item(1), item(2), item(3)), 3, "js.md").some(x => /punctul 1.*60 cuvinte.*90–140/.test(x)), "60 de cuvinte ar trebui să avertizeze în js");
  assert.deepEqual(warns(doc(MAP, item(1), item(2), item(3))), []);   // în oop, 60 e în bandă
  const ok = { an: "Analogie: " + w(40) };   // 100 de cuvinte
  assert.deepEqual(warns(doc(MAP, item(1, ok), item(2, ok), item(3, ok)), 3, "js.md"), []);
});

test("frontend: the example may have 14 lines of code, not 15; elsewhere still 8", () => {
  const ex = n => "Exemplu:\n" + fence("ts", ...Array(n).fill("x = 1")) + "\n" + w(20);
  assert.deepEqual(feErrs(doc(MAP, item(1, { ex: ex(14) }), item(2), item(3))), []);
  has(feErrs(doc(MAP, item(1, { ex: ex(15) }), item(2), item(3))), /punctul 1.*Exemplu.*14 rânduri/);
  has(errs(doc(MAP, item(1, { ex: ex(9) }), item(2), item(3))), /punctul 1.*Exemplu.*8 rânduri/);
});

test("frontend limits are picked from the file name even when it comes with a path", () => {
  const long = { an: "Analogie: " + w(60) };   // 120 de cuvinte: bun la frontend, prea lung la restul
  assert.deepEqual(feErrs(doc(MAP, item(1, long), item(2), item(3)), "src/desf/js.md"), []);
  has(feErrs(doc(MAP, item(1, long), item(2), item(3)), "src/desf/oop.md"), /punctul 1.*prea lung/);
});

test("the modules flagged `fe` in the data are exactly the frontend modules of the limits", () => {
  const P = loadData(new URL("../../", import.meta.url));
  const flagged = Array.from(P.modules).filter(m => m.fe).map(m => m.id).sort();   // Array.from: P vine dintr-un context vm, cu alt Array
  const expected = DESF_FE_MODULES.filter(id => P.modules.some(m => m.id === id)).sort();
  assert.deepEqual(flagged, expected);
  assert.ok(flagged.includes("js") && flagged.includes("frontend"), flagged.join());
});

test("languages: js and jsx are accepted (frontend examples run in Node)", () => {
  for (const lang of ["js", "jsx"]) assert.deepEqual(feErrs(doc(MAP, item(1, { ex: "Exemplu:\n" + fence(lang, "let x = 1;") + "\n" + w(20) }), item(2), item(3))), [], lang);
});

test("Pas cu pas: parsed as its own field, shown after the example, not counted in the words", () => {
  const steps = "Pas cu pas:\n" + fence("text", "render 1: n = 0", "click → setN(1)", "render 2: n = 1");
  const d = parseDesf(doc(MAP, item(1, { pas: steps }), item(2), item(3)), "js.md");
  assert.match(d.items[0].pas, /render 1: n = 0/);
  assert.deepEqual(feErrs(doc(MAP, item(1, { pas: steps }), item(2), item(3))), []);
  // 64 de cuvinte în 8 rânduri scurte: item (60) + pas (64) ar depăși 100 în oop, deci trece doar dacă pasul nu se numără
  const many = "Pas cu pas:\n" + fence("text", ...Array(8).fill("a b c d e f g h"));
  assert.deepEqual(errs(doc(MAP, item(1, { pas: many }), item(2), item(3))), []);
});

test("Pas cu pas: at most 8 short lines, and not empty", () => {
  const steps = (n, line = "x") => "Pas cu pas:\n" + fence("text", ...Array(n).fill(line));
  has(feErrs(doc(MAP, item(1, { pas: steps(9) }), item(2), item(3))), /punctul 1.*Pas cu pas.*8 rânduri/);
  has(feErrs(doc(MAP, item(1, { pas: steps(2, "x".repeat(40)) }), item(2), item(3))), /punctul 1.*Pas cu pas.*rândul 1.*36/);
  has(feErrs(doc(MAP, item(1, { pas: "Pas cu pas:\n" }), item(2), item(3))), /punctul 1.*Pas cu pas.*gol/);
});

test("the real data passes the rules", () => {
  const root = new URL("../../", import.meta.url);
  const P = loadData(root);
  const r = buildDesf(P, readDesfFiles(root));
  assert.deepEqual(r.errors, []);
});
