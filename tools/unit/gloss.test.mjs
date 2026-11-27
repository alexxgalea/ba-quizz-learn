// Glosarul (src/expl/glosar.md): formatul vechi (Definiție … Vezi și) și câmpurile pentru începători
// (Problema, Cuvinte, Cum merge, Nu confunda, Legătură, La interviu, Verifică-te / Răspuns, Citește), toate opționale.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGloss, checkGloss, GLOSS_LIMITS } from "../../lib.mjs";

const OLD = `### GIL
Forme: GIL, GIL-ul

Definiție: Lock global din CPython.
Scop: Simplifică gestionarea internă.
Exemplu: Patru threaduri se alternează.
Analogie: O singură tastatură.
Limită: Se eliberează la I/O.
Vezi și: thread, event loop
`;

const NEW = `### CI/CD
Forme: CI/CD, Continuous Integration

Definiție: Verifici automat fiecare schimbare și o duci automat spre utilizatori.
Problema: Cinci oameni își pun schimbările cap la cap o dată pe lună.
Analogie: O brutărie cu bandă și controale.
Cuvinte:
- pipeline: lista de verificări care pornește singură
- runner: calculatorul curat care rulează verificările
Cum merge:
1. Trimiți schimbarea.
2. Pornește pipeline-ul.
3. Verde: intră în \`main\`.
Exemplu: Un fișier mic de config.
\`\`\`text
teste:
  script: pytest
\`\`\`
Nu confunda:
- CI nu e o unealtă.
- Delivery nu e Deployment.
Legătură: GitHub Pages publică după merge.
Limită: Valorează cât testele.
La interviu: „Pipeline la fiecare merge request.”
Verifică-te: Există un buton de lansare. Ce e?
Răspuns: Continuous Delivery.
Citește:
- [Martin Fowler: Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html)
Vezi și: test flaky
`;

test("formatul vechi se citește ca înainte, fără câmpuri noi și fără erori", () => {
  const [g] = parseGloss(OLD);
  assert.equal(g.id, "gil");
  assert.deepEqual(g.forms, ["GIL", "GIL-ul"]);
  assert.equal(g.def, "Lock global din CPython.");
  assert.equal(g.an, "O singură tastatură.");
  assert.deepEqual(g.see, ["thread", "event loop"]);
  for (const k of ["p", "leg", "intv", "ver", "verR"]) assert.equal(g[k], "", k);
  for (const k of ["voc", "pas", "conf", "read"]) assert.deepEqual(g[k], [], k);
  assert.deepEqual(checkGloss(g), []);
});

test("câmpurile noi: liste structurate, text liber, întrebare cu răspuns", () => {
  const [g] = parseGloss(NEW);
  assert.equal(g.p, "Cinci oameni își pun schimbările cap la cap o dată pe lună.");
  assert.deepEqual(g.voc, [
    { t: "pipeline", d: "lista de verificări care pornește singură" },
    { t: "runner", d: "calculatorul curat care rulează verificările" }]);
  assert.deepEqual(g.pas, ["Trimiți schimbarea.", "Pornește pipeline-ul.", "Verde: intră în `main`."]);
  assert.match(g.ex, /^Un fișier mic de config\.\n```text\nteste:\n  script: pytest\n```$/);
  assert.deepEqual(g.conf, ["CI nu e o unealtă.", "Delivery nu e Deployment."]);
  assert.equal(g.leg, "GitHub Pages publică după merge.");
  assert.equal(g.intv, "„Pipeline la fiecare merge request.”");
  assert.equal(g.ver, "Există un buton de lansare. Ce e?");
  assert.equal(g.verR, "Continuous Delivery.");
  assert.deepEqual(g.read, [{ t: "Martin Fowler: Continuous Integration", u: "https://martinfowler.com/articles/continuousIntegration.html" }]);
  assert.deepEqual(g.see, ["test flaky"]);
  assert.deepEqual(checkGloss(g), []);
});

test("checkGloss prinde rândurile greșite și depășirile", () => {
  const bad = `### X
Forme: X
Definiție: d
Cuvinte:
- fără două puncte
Cum merge:
1. unu
3. trei
Nu confunda:
text fără liniuță
Verifică-te: întrebare fără răspuns
Citește:
- [link](http://nesigur.ro)
`;
  const errs = checkGloss(parseGloss(bad)[0]).join("\n");
  assert.match(errs, /Cuvinte/);
  assert.match(errs, /Cum merge.*1, 2, 3/);
  assert.match(errs, /Nu confunda/);
  assert.match(errs, /Răspuns/);
  assert.match(errs, /Citește/);
  const many = "### Y\nForme: Y\nDefiniție: d\nCuvinte:\n" + Array.from({ length: GLOSS_LIMITS.voc + 1 }, (_, i) => "- t" + i + ": d").join("\n") +
    "\nCum merge:\n" + Array.from({ length: GLOSS_LIMITS.pas + 1 }, (_, i) => (i + 1) + ". pas").join("\n") + "\n";
  const e2 = checkGloss(parseGloss(many)[0]).join("\n");
  assert.match(e2, new RegExp("Cuvinte.*" + GLOSS_LIMITS.voc));
  assert.match(e2, new RegExp("Cum merge.*" + GLOSS_LIMITS.pas));
});

test("Răspuns fără Verifică-te e eroare; un bloc de cod cu rânduri lungi e eroare", () => {
  const md = "### Z\nForme: Z\nDefiniție: d\nRăspuns: r\nExemplu: e\n```text\n" + "x".repeat(GLOSS_LIMITS.cols + 1) + "\n```\n";
  const errs = checkGloss(parseGloss(md)[0]).join("\n");
  assert.match(errs, /Verifică-te/);
  assert.match(errs, new RegExp("" + GLOSS_LIMITS.cols));
});
