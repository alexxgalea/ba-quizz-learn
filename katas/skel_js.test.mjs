// Testele referințelor de schelet JavaScript (rulează cu `node --test`).
// Verifică proprietatea apărată de punctele esențiale, nu doar cazul fericit.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  makeCounter,
  Button,
  call,
  order,
  promisify,
  load,
  retry,
  debounce,
  throttle,
  setDone,
  snapshot,
  paidByUser,
  byUser,
  countWords,
  uniqueBy,
  intersect,
  pages,
  collect,
  Account,
} from "./skel_js.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

// îngheață adânc: orice mutație aruncă TypeError (modulele sunt strict)
function deepFreeze(x) {
  if (x && typeof x === "object" && !Object.isFrozen(x)) {
    Object.freeze(x);
    Object.values(x).forEach(deepFreeze);
  }
  return x;
}

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

// ---------- this ----------

test("this: o metodă extrasă pierde obiectul (TypeError în clasă)", () => {
  const btn = new Button("ok");
  assert.equal(btn.click(), "click:ok");
  assert.throws(() => call(btn.click), TypeError);
});

test("this: bind în constructor și arrow-câmp îl fixează pe instanță", () => {
  const btn = new Button("ok");
  assert.equal(call(btn.bound), "click:ok");
  assert.equal(call(btn.arrow), "click:ok");
  // call/apply nu mai schimbă this pe cele legate
  assert.equal(btn.bound.call({ label: "x" }), "click:ok");
  assert.equal(btn.arrow.call({ label: "x" }), "click:ok");
  // pe metoda obișnuită, call îl schimbă
  assert.equal(btn.click.call({ label: "x" }), "click:x");
});

test("this: fiecare instanță își leagă propriul this", () => {
  const a = new Button("a");
  const b = new Button("b");
  assert.equal(call(a.bound), "click:a");
  assert.equal(call(b.bound), "click:b");
  assert.notEqual(a.bound, b.bound);
});

test("this: arrow în callback ia this din metodă", () => {
  const btn = new Button("L");
  assert.deepEqual(btn.tags(["1", "2"]), ["L1", "L2"]);
  // un `function` clasic în același loc și-ar pierde this
  assert.throws(() => {
    ["1"].map(function (i) {
      return this.label + i;
    });
  }, TypeError);
});

// ---------- event loop ----------

test("event loop: sync, apoi microtask-urile (inclusiv cele imbricate), apoi timeout", async () => {
  assert.deepEqual(await order(), [
    "async sync",
    "sync",
    "then",
    "micro",
    "await",
    "nested",
    "timeout",
  ]);
});

test("event loop: setTimeout 0 vine după toate microtask-urile", async () => {
  const log = await order();
  assert.equal(log.at(-1), "timeout");
  assert.ok(log.indexOf("nested") < log.indexOf("timeout"));
});

// ---------- promisify + async/await ----------

test("promisify: rezolvă cu valoarea și respinge cu eroarea", async () => {
  const add = (a, b, cb) => setTimeout(() => cb(null, a + b), 1);
  const fail = (cb) => setTimeout(() => cb(new Error("nu")), 1);
  assert.equal(await promisify(add)(2, 3), 5);
  await assert.rejects(promisify(fail)(), /nu/);
});

test("promisify: o excepție sincronă a lui fn devine rejecție", async () => {
  const boom = () => {
    throw new Error("sync");
  };
  await assert.rejects(promisify(boom)(), /sync/);
});

test("load: parsează JSON, iar finally rulează și la succes", async () => {
  const log = [];
  const read = async () => '{"a":1}';
  assert.deepEqual(await load(read, "f.json", log), { a: 1 });
  assert.deepEqual(log, ["gata f.json"]);
});

test("load: eroarea păstrează cauza, iar finally rulează și la eșec", async () => {
  const log = [];
  const read = promisify((p, cb) => cb(new Error("ENOENT " + p)));
  await assert.rejects(load(read, "x", log), (e) => {
    assert.match(e.message, /citire eșuată: ENOENT x/);
    assert.match(e.cause.message, /ENOENT/);
    return true;
  });
  // JSON invalid aruncă sincron în try și e prins în același loc
  await assert.rejects(load(async () => "{", "y", log), /citire eșuată/);
  assert.deepEqual(log, ["gata x", "gata y"]);
});

// ---------- retry cu backoff + timeout ----------

test("retry: reușește la a treia încercare, cu pauze crescătoare", async () => {
  const at = [];
  const fn = async () => {
    at.push(Date.now());
    if (at.length < 3) throw new Error("tranzitorie");
    return "ok";
  };
  assert.equal(await retry(fn, { base: 20, timeout: 500 }), "ok");
  assert.equal(at.length, 3);
  // pauze de 20 și 40 ms (cu 3 ms toleranță pentru ceasul timerelor)
  assert.ok(at[1] - at[0] >= 17, "prima pauză");
  assert.ok(at[2] - at[1] >= 37, "a doua pauză");
});

test("retry: după ultima încercare aruncă ultima eroare, fără pauză în plus", async () => {
  let calls = 0;
  const errors = [];
  const fn = async () => {
    calls++;
    errors.push(new Error("e" + calls));
    throw errors.at(-1);
  };
  const t0 = Date.now();
  await assert.rejects(retry(fn, { tries: 3, base: 20 }), (e) => {
    assert.equal(e, errors[2]);
    return true;
  });
  assert.equal(calls, 3);
  // 20 + 40 ms de pauză; fără o a treia pauză de 80 ms
  assert.ok(Date.now() - t0 < 20 + 40 + 60, "nu doarme după ultima");
});

test("retry: fiecare încercare primește un semnal cu timeout propriu", async () => {
  const signals = [];
  const hang = (signal) =>
    new Promise((_, reject) => {
      signals.push(signal);
      signal.addEventListener("abort", () => reject(signal.reason));
    });
  // timerul din AbortSignal.timeout e unref în Node: în test ținem bucla trează
  // (într-o aplicație reală o țin socket-ul sau serverul)
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await assert.rejects(
      retry(hang, { tries: 2, base: 5, timeout: 20 }),
      (e) => e.name === "TimeoutError",
    );
  } finally {
    clearInterval(keepAlive);
  }
  assert.equal(signals.length, 2);
  assert.notEqual(signals[0], signals[1]);
  assert.ok(signals[0].aborted && signals[1].aborted);
});

test("retry: rejecția lui fn e prinsă de catch (return await)", async () => {
  let calls = 0;
  const fn = () => {
    calls++;
    return calls < 2 ? Promise.reject(new Error("x")) : Promise.resolve(calls);
  };
  assert.equal(await retry(fn, { base: 1 }), 2);
});

// ---------- debounce și throttle ----------

test("debounce: rulează o dată, după ultimul apel, cu argumentele lui", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const seen = [];
  const d = debounce((x) => seen.push(x), 100);
  d("a");
  t.mock.timers.tick(60);
  d("b");
  t.mock.timers.tick(60); // 120 ms de la "a", dar doar 60 de la "b"
  assert.deepEqual(seen, []);
  d("c");
  t.mock.timers.tick(99);
  assert.deepEqual(seen, []);
  t.mock.timers.tick(1);
  assert.deepEqual(seen, ["c"]);
  t.mock.timers.tick(1000);
  assert.deepEqual(seen, ["c"]);
});

test("debounce: fiecare funcție întoarsă are timerul ei", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const seen = [];
  const a = debounce((x) => seen.push("a" + x), 50);
  const b = debounce((x) => seen.push("b" + x), 50);
  a(1);
  b(2);
  t.mock.timers.tick(50);
  assert.deepEqual(seen.sort(), ["a1", "b2"]);
});

test("throttle: prima oară imediat, apoi cel mult o dată la ms", (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const seen = [];
  const th = throttle((x) => seen.push(x), 100);
  th(1);
  assert.deepEqual(seen, [1]);
  t.mock.timers.tick(50);
  th(2); // pierdut
  t.mock.timers.tick(49);
  th(3); // pierdut: 99 ms de la primul
  assert.deepEqual(seen, [1]);
  t.mock.timers.tick(1);
  th(4);
  assert.deepEqual(seen, [1, 4]);
  // pierderile nu mută fereastra: următorul permis e la 100 ms de la 4
  t.mock.timers.tick(99);
  th(5);
  assert.deepEqual(seen, [1, 4]);
  t.mock.timers.tick(1);
  th(6);
  assert.deepEqual(seen, [1, 4, 6]);
});

// ---------- update imutabil ----------

const initial = () =>
  deepFreeze({
    user: "ana",
    lists: [
      { id: "a", tasks: [{ id: 1, done: false }, { id: 2, done: false }] },
      { id: "b", tasks: [{ id: 3, done: false }] },
    ],
  });

test("setDone: schimbă doar valoarea țintă, originalul rămâne intact", () => {
  const s = initial();
  const n = setDone(s, "a", 2, true);
  assert.equal(n.lists[0].tasks[1].done, true);
  assert.equal(s.lists[0].tasks[1].done, false);
  assert.equal(n.user, "ana");
  assert.deepEqual(n.lists[0].tasks[0], { id: 1, done: false });
  assert.deepEqual(n.lists[1], s.lists[1]);
});

test("setDone: drumul se copiază, restul se refolosește prin referință", () => {
  const s = initial();
  const n = setDone(s, "a", 2, true);
  assert.notEqual(n, s);
  assert.notEqual(n.lists, s.lists);
  assert.notEqual(n.lists[0], s.lists[0]);
  assert.notEqual(n.lists[0].tasks, s.lists[0].tasks);
  assert.notEqual(n.lists[0].tasks[1], s.lists[0].tasks[1]);
  // ce n-a fost atins păstrează identitatea
  assert.equal(n.lists[1], s.lists[1]);
  assert.equal(n.lists[0].tasks[0], s.lists[0].tasks[0]);
});

test("snapshot: copie profundă, independentă de original", () => {
  const src = {
    when: new Date(0),
    tags: new Set(["x"]),
    by: new Map([["k", { n: 1 }]]),
    deep: { a: [1, 2] },
  };
  const copy = snapshot(src);
  assert.notEqual(copy.deep, src.deep);
  copy.deep.a.push(3);
  copy.by.get("k").n = 2;
  assert.deepEqual(src.deep.a, [1, 2]);
  assert.equal(src.by.get("k").n, 1);
  assert.ok(copy.when instanceof Date && copy.tags instanceof Set);
  // o copie superficială ar fi împărțit array-ul
  assert.equal({ ...src }.deep, src.deep);
});

test("snapshot: funcțiile nu se pot clona, iar clasele își pierd prototipul", () => {
  assert.throws(() => snapshot({ f() {} }), { name: "DataCloneError" });
  class P {
    x = 1;
  }
  assert.equal(snapshot(new P()) instanceof P, false);
});

// ---------- map / filter / reduce + grupare ----------

const orders = () =>
  deepFreeze([
    { user: "ana", total: 10, paid: true },
    { user: "dan", total: 50, paid: true },
    { user: "ana", total: 25, paid: true },
    { user: "dan", total: 99, paid: false },
    { user: "eva", total: 5, paid: true },
  ]);

test("paidByUser: doar comenzile plătite, însumate, descrescător", () => {
  assert.deepEqual(paidByUser(orders()), [
    { user: "dan", total: 50 },
    { user: "ana", total: 35 },
    { user: "eva", total: 5 },
  ]);
});

test("paidByUser: comparatorul e numeric, intrarea nu se schimbă, gol -> []", () => {
  const big = [
    { user: "a", total: 9, paid: true },
    { user: "b", total: 10, paid: true },
    { user: "c", total: 100, paid: true },
  ];
  // sortarea implicită ar da 10, 100, 9 (ca șiruri)
  assert.deepEqual(paidByUser(big).map((x) => x.total), [100, 10, 9]);
  assert.deepEqual(paidByUser([]), []);
  paidByUser(orders()); // frozen: ar arunca la orice mutație
});

test("byUser: obiect fără prototip, array-uri pe grupă", () => {
  const g = byUser(orders());
  assert.equal(Object.getPrototypeOf(g), null);
  assert.deepEqual(Object.keys(g).sort(), ["ana", "dan", "eva"]);
  assert.equal(g.dan.length, 2);
  assert.equal(g.constructor, undefined);
});

// ---------- Map / Set ----------

test("countWords: contor cu Map, fără chei moștenite", () => {
  const c = countWords("Ana are  mere ana\nare constructor");
  assert.ok(c instanceof Map);
  assert.equal(c.get("ana"), 2);
  assert.equal(c.get("are"), 2);
  assert.equal(c.get("constructor"), 1);
  assert.equal(c.get("pere"), undefined);
  assert.equal(c.size, 4);
  assert.equal(countWords("").size, 0);
});

test("uniqueBy: prima apariție, în ordinea intrării", () => {
  const people = [
    { id: 1, n: "a" },
    { id: 2, n: "b" },
    { id: 1, n: "c" },
    { id: 3, n: "d" },
    { id: 2, n: "e" },
  ];
  assert.deepEqual(uniqueBy(people, (p) => p.id).map((p) => p.n), ["a", "b", "d"]);
  // obiectele se compară prin identitate, nu structural
  const same = [{ a: 1 }, { a: 1 }];
  assert.equal(uniqueBy(same, (x) => x).length, 2);
  assert.equal(uniqueBy([NaN, NaN, 1], (x) => x).length, 2);
});

test("intersect: fără dubluri, în ordinea lui a", () => {
  assert.deepEqual(intersect([3, 1, 3, 2, 9], [2, 3, 3, 7]), [3, 2]);
  assert.deepEqual(intersect([], [1]), []);
  assert.deepEqual(intersect([1], []), []);
});

test("uniqueBy: O(n), nu O(n^2): 60 000 de valori unice rapid", () => {
  // cu un array și `includes` ar fi ~1,8 miliarde de comparații (secunde)
  const big = Array.from({ length: 60_000 }, (_, i) => i);
  const t0 = performance.now();
  assert.equal(uniqueBy(big, (x) => x).length, 60_000);
  assert.ok(performance.now() - t0 < 300);
});

// ---------- generator async + for await ----------

function fakeApi(data, size) {
  const calls = [];
  const fetchPage = async (cursor) => {
    calls.push(cursor);
    const start = cursor ?? 0;
    const end = start + size;
    return { items: data.slice(start, end), next: end < data.length ? end : null };
  };
  return { fetchPage, calls };
}

test("pages: toate elementele, pagină cu pagină, până next === null", async () => {
  const { fetchPage, calls } = fakeApi([1, 2, 3, 4, 5], 2);
  const out = [];
  for await (const x of pages(fetchPage)) out.push(x);
  assert.deepEqual(out, [1, 2, 3, 4, 5]);
  assert.deepEqual(calls, [null, 2, 4]);
});

test("pages: e leneș, nu cere nimic până nu e consumat", async () => {
  const { fetchPage, calls } = fakeApi([1, 2, 3], 2);
  const it = pages(fetchPage);
  assert.deepEqual(calls, []);
  await it.next();
  assert.deepEqual(calls, [null]);
});

test("collect: break oprește generatorul, pagina următoare nu se mai cere", async () => {
  const { fetchPage, calls } = fakeApi([1, 2, 3, 4, 5, 6], 2);
  assert.deepEqual(await collect(pages(fetchPage), 2), [1, 2]);
  assert.deepEqual(calls, [null]);
  const more = fakeApi([1, 2, 3, 4, 5, 6], 2);
  assert.deepEqual(await collect(pages(more.fetchPage), 3), [1, 2, 3]);
  assert.deepEqual(more.calls, [null, 2]);
  assert.deepEqual(await collect(pages(fakeApi([], 2).fetchPage), 5), []);
});

test("pages: o eroare a API-ului ajunge la consumator", async () => {
  const bad = async () => {
    throw new Error("503");
  };
  await assert.rejects(collect(pages(bad), 3), /503/);
});

// ---------- clasă ES: #private, static, getter ----------

test("Account: depunerea și getter-ul", () => {
  const a = new Account("ana");
  assert.equal(a.balance, 0);
  assert.equal(a.deposit(50).deposit(25).balance, 75);
  assert.throws(() => a.deposit(0), RangeError);
  assert.throws(() => a.deposit(-5), RangeError);
  assert.throws(() => a.deposit("x"), RangeError);
  assert.equal(a.balance, 75);
});

test("Account: #balance e privat de-adevăratelea", () => {
  const a = new Account("ana");
  a.deposit(10);
  assert.deepEqual(Object.keys(a), ["owner"]);
  assert.equal(JSON.stringify(a), '{"owner":"ana"}');
  assert.equal(a.balance, 10);
  assert.equal(a._balance, undefined);
  // citirea din afara clasei nici nu se parsează
  assert.throws(() => new Function("a", "return a.#balance"), SyntaxError);
});

test("Account: getter fără setter, atribuirea aruncă în cod strict", () => {
  const a = new Account("ana");
  assert.throws(() => {
    a.balance = 1000; // modulul de test e ESM, deci strict
  }, TypeError);
  assert.equal(a.balance, 0);
});

test("Account: static aparține clasei, nu instanței", () => {
  const before = Account.opened;
  const a = new Account("a");
  new Account("b");
  assert.equal(Account.opened, before + 2);
  assert.equal(a.opened, undefined);
  assert.equal(Object.keys(a).includes("opened"), false);
});

// ---------- module ESM ----------

function sectionOf(id) {
  const src = fs.readFileSync(path.join(here, "skel_js.mjs"), "utf8");
  const m = src.match(new RegExp("^// === " + id + " ===\n([\\s\\S]*?)^// === end ===", "m"));
  assert.ok(m, id);
  return m[1];
}

// referința are două "fișiere"; le scriem și le importăm de-adevăratelea
async function loadEsm() {
  const code = sectionOf("s-frontend-esm");
  const parts = code.split(/^\/\/ (\w+\.mjs)\n/m);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skel-esm-"));
  const names = [];
  for (let i = 1; i < parts.length; i += 2) {
    fs.writeFileSync(path.join(dir, parts[i]), parts[i + 1]);
    names.push(parts[i]);
  }
  const url = (f) => pathToFileURL(path.join(dir, f)).href;
  return { dir, names, app: await import(url("app.mjs")), util: await import(url("util.mjs")) };
}

test("esm: două fișiere, util.mjs și app.mjs", async () => {
  const { names } = await loadEsm();
  assert.deepEqual(names, ["util.mjs", "app.mjs"]);
});

test("esm: import numit, default și legătură vie", async () => {
  const { app, util } = await loadEsm();
  assert.equal(app.product, 12); // mul(add(1, 2), 4)
  // `live` a citit count după inc(): importul vede valoarea nouă
  assert.equal(app.live, 1);
  assert.equal(util.count, 1);
  util.inc();
  assert.equal(util.count, 2);
  assert.equal(typeof util.default, "function");
  assert.equal(util.default(3, 4), 12);
});

test("esm: import() dinamic dă namespace-ul, cu default sub .default", async () => {
  const { app, util } = await loadEsm();
  assert.equal(await app.lazy(), 12); // default(2, 5) + add(1, 1)
  // modulul s-a executat o singură dată: aceeași stare
  assert.equal(util.count, 1);
  const ns = await app.namespace();
  assert.equal(ns, util);
  assert.deepEqual(Object.keys(ns).sort(), ["add", "count", "default", "inc"]);
});
