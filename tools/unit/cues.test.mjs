// Indiciile de formă (`.scratch/grile-fara-tipar/`, tichetul 01): lungimea variantelor, cuvintele absolute, rangul pe modul și clichetul. Pe stări construite, nu pe datele reale.
import test from "node:test";
import assert from "node:assert/strict";
import { optLen, absWords, checkCues, cueGrid, CUE_DONE } from "../../lib.mjs";

const rep = n => "x".repeat(n);
// o grilă cu corecta pe index 0 și lungimile date (corecta, apoi greșitele)
const q = (id, m, lens, extra = {}) => ({ id, m, a: 0, o: lens.map((n, i) => String(i) + rep(n - 1)), ...extra });
const world = (mcq, mods = ["a"]) => ({ modules: mods.map(id => ({ id })), mcq });
const run = (mcq, opts = {}) => checkCues(world(mcq), { done: [], baseline: [], ...opts });

test("CUE_DONE e o listă de module fără duplicate", () => { assert.ok(Array.isArray(CUE_DONE)); assert.equal(new Set(CUE_DONE).size, CUE_DONE.length); });

test("optLen does not count backticks", () => {
  assert.equal(optLen("`ab`"), 2);
  assert.equal(optLen("a `b` c"), 5);
  assert.equal(optLen("```x```"), 1);
});

test("the per-item rule needs both 1.15x and more than 8 characters", () => {
  assert.equal(cueGrid(q("q", "a", [20, 17, 10, 10])).viol, false);
  assert.equal(cueGrid(q("q", "a", [40, 34, 10, 10])).viol, false);
  assert.equal(cueGrid(q("q", "a", [50, 41, 10, 10])).viol, true);
  // raport sub 1,15 deși diferența e mare
  assert.equal(cueGrid(q("q", "a", [200, 180, 10, 10])).viol, false);
  // exact 1,15 nu e „peste”
  assert.equal(cueGrid(q("q", "a", [115, 100, 10, 10])).viol, false);
  assert.equal(cueGrid(q("q", "a", [116, 100, 10, 10])).viol, true);
  // diferență exact 8 nu e „peste”
  assert.equal(cueGrid(q("q", "a", [12, 4, 3, 3])).viol, false);
  assert.equal(cueGrid(q("q", "a", [13, 4, 3, 3])).viol, true);
  // corecta mai scurtă nu încalcă
  assert.equal(cueGrid(q("q", "a", [10, 50, 50, 50])).viol, false);
});

test("backticks do not make the correct option longer", () => {
  const item = { id: "q", m: "a", a: 0, o: ["`" + rep(30) + "`", rep(30) + "1", rep(30) + "2", rep(30) + "3"] };
  assert.equal(cueGrid(item).viol, false);
  assert.equal(cueGrid(item).lens[0], 30);
});

test("strictly longest and strictly shortest ignore ties", () => {
  const tie = cueGrid(q("q", "a", [20, 20, 10, 10]));
  assert.deepEqual([tie.longest, tie.shortest], [false, false]);
  assert.equal(cueGrid(q("q", "a", [21, 20, 10, 10])).longest, true);
  assert.equal(cueGrid(q("q", "a", [5, 20, 10, 10])).shortest, true);
});

test("absolute words match whole words, with diacritics and capitals", () => {
  assert.deepEqual(absWords("Se execută doar o dată"), ["doar"]);
  assert.deepEqual(absWords("copilul adoarme"), []);
  assert.deepEqual(absWords("Niciodată nu blochează"), ["niciodată"]);
  assert.deepEqual(absWords("toți și TOATE, mereu."), ["toți", "toate", "mereu"]);
  assert.deepEqual(absWords("niciunul"), []);
  assert.deepEqual(absWords("`doar` ca nume de cod"), ["doar"]);
});

test("rank rule: correct strictly longest in more than k grids is an error on a done module", () => {
  // n = 10 → k = ceil(3,5) = 4; 5 grile cu corecta cea mai lungă
  const mcq = [];
  for (let i = 0; i < 5; i++) mcq.push(q("l" + i, "a", [21, 20, 10, 10]));
  for (let i = 0; i < 5; i++) mcq.push(q("m" + i, "a", [15, 20, 20, 30]));
  const r = run(mcq, { done: ["a"] });
  assert.ok(r.errors.some(e => /cea mai lungă/.test(e)), r.errors.join("\n"));
  assert.equal(r.report.a.longest, 5);
  assert.equal(r.report.a.n, 10);
  // același modul, nefăcut: nicio eroare de rang, doar raport
  assert.deepEqual(run(mcq).errors, []);
});

test("rank rule: the reverse pattern (correct always shortest) is an error too", () => {
  const mcq = [];
  for (let i = 0; i < 10; i++) mcq.push(q("s" + i, "a", [10, 20, 25, 30]));
  const r = run(mcq, { done: ["a"] });
  assert.ok(r.errors.some(e => /cea mai scurtă/.test(e)), r.errors.join("\n"));
  assert.equal(r.report.a.shortest, 10);
});

test("rank rule: exactly k is fine", () => {
  const mcq = [];
  for (let i = 0; i < 4; i++) mcq.push(q("l" + i, "a", [21, 20, 10, 10]));
  for (let i = 0; i < 6; i++) mcq.push(q("m" + i, "a", [20, 15, 25, 30]));
  assert.deepEqual(run(mcq, { done: ["a"] }).errors, []);
});

// corecta la mijloc ca lungime (nici cea mai lungă, nici cea mai scurtă); `cAbs(i)` / `wAbs(i)` hotărăsc cine primește un cuvânt absolut
const absSet = (n, cAbs, wAbs) => Array.from({ length: n }, (_, i) => ({
  id: "q" + i, m: "a", a: 0,
  o: [(cAbs(i) ? "doar varianta corectă " : "varianta corectă ") + i, (wAbs(i) ? "mereu e greșită " : "altfel greșită ") + i, "scurtă " + i, "o variantă greșită ceva mai lungă decât celelalte " + i]
}));

test("absolute-word rule: wrong share may exceed correct share by at most 10 points", () => {
  // 3 din 30 de variante greșite = 10% → la limită, ok
  assert.deepEqual(run(absSet(10, () => false, i => i < 3), { done: ["a"] }).errors, []);
  // 4 din 30 = 13,3% → eroare
  const r = run(absSet(10, () => false, i => i < 4), { done: ["a"] });
  assert.ok(r.errors.some(e => /absolut/.test(e)), r.errors.join("\n"));
  assert.equal(r.report.a.absWrong, 4);
  assert.equal(r.report.a.absCorrect, 0);
  // nefăcut: doar raport
  assert.deepEqual(run(absSet(10, () => false, i => i < 4)).errors, []);
});

test("absolute-word rule: absolutes in correct options raise the allowance", () => {
  // corecte 50%, greșite 6/30 = 20% → ok
  assert.deepEqual(run(absSet(10, i => i < 5, i => i < 6), { done: ["a"] }).errors, []);
});

test("ratchet: a new violation outside the baseline is an error", () => {
  const r = run([q("n1", "a", [60, 20, 20, 20])], { baseline: [] });
  assert.ok(r.errors.some(e => e.startsWith("n1:")), r.errors.join("\n"));
  assert.equal(r.report.a.viol, 1);
});

test("ratchet: a baseline id that no longer violates is an error, and so is one that is gone", () => {
  const r = run([q("n1", "a", [20, 20, 20, 20])], { baseline: ["n1"] });
  assert.ok(r.errors.some(e => e.startsWith("n1:") && /listă/.test(e)), r.errors.join("\n"));
  const g = run([], { baseline: ["gone"] });
  assert.ok(g.errors.some(e => e.startsWith("gone:")), g.errors.join("\n"));
});

test("ratchet: a violation inside the baseline is tolerated on a module not done", () => {
  assert.deepEqual(run([q("n1", "a", [60, 20, 20, 20])], { baseline: ["n1"] }).errors, []);
});

test("ratchet: a done module with an id in the baseline is an error", () => {
  const r = run([q("n1", "a", [60, 20, 20, 20])], { baseline: ["n1"], done: ["a"] });
  assert.ok(r.errors.some(e => /n1/.test(e) && /CUE_DONE/.test(e)), r.errors.join("\n"));
});

test("report has one row per module with counts", () => {
  const r = checkCues(world([q("a1", "a", [21, 20, 10, 10]), q("b1", "b", [10, 20, 20, 20])], ["a", "b"]), { done: [], baseline: [] });
  assert.deepEqual(Object.keys(r.report).sort(), ["a", "b"]);
  assert.deepEqual([r.report.a.n, r.report.a.longest, r.report.a.shortest, r.report.b.shortest], [1, 1, 0, 1]);
});
