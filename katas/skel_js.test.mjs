// Testele referințelor de schelet JavaScript (rulează cu `node --test`).
// Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import test from "node:test";
import assert from "node:assert/strict";

import { makeCounter } from "./skel_js.mjs";

test("makeCounter: inc, dec și value pornesc de la start", () => {
  const c = makeCounter(5);
  assert.equal(c.value(), 5);
  assert.equal(c.inc(), 6);
  assert.equal(c.inc(), 7);
  assert.equal(c.dec(), 6);
  assert.equal(c.value(), 6);
  assert.equal(makeCounter().value(), 0);
});

test("makeCounter: starea e privată, nu o proprietate a obiectului", () => {
  const c = makeCounter(3);
  assert.deepEqual(Object.keys(c).sort(), ["dec", "inc", "value"]);
  assert.equal(c.n, undefined);
  assert.equal(c.count, undefined);
  // o valoare pusă din afară nu schimbă contorul
  c.n = 100;
  assert.equal(c.inc(), 4);
});

test("makeCounter: fiecare apel are variabila lui", () => {
  const a = makeCounter();
  const b = makeCounter();
  a.inc();
  a.inc();
  b.dec();
  assert.equal(a.value(), 2);
  assert.equal(b.value(), -1);
});

test("makeCounter: metodele merg și extrase (fără this)", () => {
  const { inc, value } = makeCounter(10);
  inc();
  inc();
  assert.equal(value(), 12);
  const loose = makeCounter().inc;
  assert.equal(loose.call(undefined), 1);
});
