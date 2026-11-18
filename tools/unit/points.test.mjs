// Legăturile item–punct (`.scratch/fundatie-concepte/`, tichetul 04): `pt` pe grile, schelete și kata-uri, `kp` pe cardurile orale, regulile din `checkPoints` (lib.mjs) și propunerile din `pointRank`.
import test from "node:test";
import assert from "node:assert/strict";
import { checkPoints, pointRank, proposeTags, PT_DONE, loadData } from "../../lib.mjs";

const P = loadData(new URL("../../", import.meta.url));

// O lume mică: modulul `a` are 3 puncte, `b` are 2.
const mini = over => Object.assign({
  modules: [{ id: "a", p: 1 }, { id: "b", p: 2 }],
  sheets: { a: { points: ["unu", "doi", "trei"] }, b: { points: ["x", "y"] } },
  mcq: [], oral: [], skel: [], katas: []
}, over);

test("a good tagging has no errors and no warnings", () => {
  const r = checkPoints(mini({
    mcq: [{ id: "q1", m: "a", pt: [1] }, { id: "q2", m: "a", pt: [2, 3] }, { id: "q3", m: "b", pt: [] }],
    oral: [{ id: "o1", m: "a", k: ["k0", "k1"], kp: [1, null] }],
    skel: [{ id: "s1", m: "a", pt: [3] }],
    katas: [{ id: "k1", pt: ["a:2", "b:1"] }]
  }), { done: ["a"] });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("an index outside the sheet, a kp of the wrong length and a bad kata reference are errors", () => {
  const r = checkPoints(mini({
    mcq: [{ id: "q1", m: "a", pt: [4] }, { id: "q2", m: "a", pt: [0] }, { id: "q3", m: "a", pt: "1" }],
    oral: [{ id: "o1", m: "a", k: ["k0", "k1"], kp: [1] }, { id: "o2", m: "a", k: ["k0"], kp: [9] }],
    skel: [{ id: "s1", m: "a", pt: [1.5] }],
    katas: [{ id: "k1", pt: ["c:1"] }, { id: "k2", pt: ["a:7"] }, { id: "k3", pt: [2] }]
  }), { done: [] });
  for (const id of ["q1", "q2", "q3", "o1", "o2", "s1", "k1", "k2", "k3"]) assert.ok(r.errors.some(e => e.startsWith(id + ":")), id + " → " + r.errors.join(" | "));
});

test("a missing field is a warning, but an error on a module marked as fully tagged", () => {
  const P1 = mini({ mcq: [{ id: "q1", m: "a" }, { id: "q2", m: "b" }], oral: [{ id: "o1", m: "a", k: ["k"] }], skel: [{ id: "s1", m: "b" }] });
  const loose = checkPoints(P1, { done: [] });
  assert.deepEqual(loose.errors, []);
  assert.equal(loose.missing.a, 2);
  assert.equal(loose.missing.b, 2);
  assert.ok(loose.warnings.length >= 1);
  const strict = checkPoints(P1, { done: ["a"] });
  assert.ok(strict.errors.some(e => e.startsWith("q1:")) && strict.errors.some(e => e.startsWith("o1:")));
  assert.ok(!strict.errors.some(e => e.startsWith("q2:") || e.startsWith("s1:")));
});

test("the coverage report of a tagged module: points without an MCQ, points without a production form", () => {
  const r = checkPoints(mini({
    mcq: [{ id: "q1", m: "a", pt: [1] }],
    oral: [{ id: "o1", m: "a", k: ["k0", "k1"], kp: [2, null] }],
    katas: [{ id: "k1", pt: ["a:1"] }]
  }), { done: ["a"] });
  assert.deepEqual(r.report.a, { points: 3, noMcq: [2, 3], noProd: [3] });
});

test("pointRank proposes the points with the most words in common", () => {
  const pts = ["`asyncio.gather` și excepțiile", "Semaphore limitează concurența", "TaskGroup anulează restul"];
  assert.deepEqual(pointRank("Ce face TaskGroup când un task aruncă?", pts).map(x => x.n), [3]);
  assert.deepEqual(pointRank("nimic comun aici", pts), []);
});

test("the real data: asyncio is fully tagged and its report names the points without an MCQ", () => {
  assert.ok(PT_DONE.includes("asyncio"));
  const r = checkPoints(P, { done: PT_DONE });
  assert.deepEqual(r.errors, []);
  assert.equal(r.missing.asyncio || 0, 0);
  assert.deepEqual(r.report.asyncio.noMcq, [7, 10, 11]);
});

test("proposeTags gives up to 3 points per MCQ / skeleton and one point (or null) per key point of a card", () => {
  const W = mini({
    sheets: { a: { points: ["Semaphore limitează concurența", "TaskGroup anulează restul", "gather păstrează ordinea"] }, b: { points: ["x"] } },
    mcq: [{ id: "q1", m: "a", q: "Ce face TaskGroup?", o: ["anulează restul"], e: "" }],
    oral: [{ id: "o1", m: "a", q: "?", k: ["Semaphore pentru concurența", "nimic comun"] }]
  });
  const p = proposeTags(W, "a");
  assert.deepEqual(p.find(x => x.id === "q1").prop, [2]);
  assert.deepEqual(p.find(x => x.id === "o1").prop, [1, null]);
  assert.ok(proposeTags(P, "asyncio").every(x => x.has !== undefined), "asyncio: every item already has its field");
});
