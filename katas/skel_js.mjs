// Referințele de schelet JavaScript.
// Fiecare secțiune „=== s-… ===” ajunge în aplicație
// (build.mjs); testele sunt în skel_js.test.mjs.
// `export`-urile stau după secțiune, ca să nu
// încarce codul de scris din memorie.

// === s-frontend-closure ===
function makeCounter(start = 0) {
  // privat: doar closure-urile de mai jos
  // văd `n`, nimic din afară
  let n = start;
  return {
    inc() {
      return ++n;
    },
    dec() {
      return --n;
    },
    value() {
      return n;
    },
  };
}
// === end ===

// === s-frontend-this ===
class Button {
  constructor(label) {
    this.label = label;
    // legată o dată, la construire
    this.bound = this.click.bind(this);
  }

  click() {
    return "click:" + this.label;
  }

  // câmp arrow: this fix pe instanță
  arrow = () => "click:" + this.label;

  tags(items) {
    // arrow: this vine din tags()
    return items.map(
      (i) => this.label + i);
  }
}

function call(handler) {
  return handler(); // fără obiect în față
}
// === end ===

// === s-frontend-event-loop ===
// ordinea: async sync, sync, then, micro,
// await, nested, timeout
function order() {
  const log = [];
  const done = new Promise((resolve) => {
    setTimeout(() => {
      log.push("timeout");
      resolve(log);
    }, 0);
  });
  Promise.resolve().then(() => {
    log.push("then");
    queueMicrotask(
      () => log.push("nested"));
  });
  queueMicrotask(() => log.push("micro"));
  (async () => {
    log.push("async sync");
    await null;
    log.push("await");
  })();
  log.push("sync");
  return done;
}
// === end ===

// === s-frontend-promisify ===
function promisify(fn) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, value) => {
        if (err) reject(err);
        else resolve(value);
      });
    });
}

async function load(read, path, log) {
  try {
    const text = await read(path);
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      "citire eșuată: " + e.message,
      { cause: e });
  } finally {
    log.push("gata " + path);
  }
}
// === end ===

// === s-frontend-retry ===
const sleep = (ms) =>
  new Promise((r) => setTimeout(r, ms));

async function retry(fn, opts = {}) {
  const { tries = 3, base = 100 } = opts;
  const { timeout = 1000 } = opts;
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn(
        AbortSignal.timeout(timeout));
    } catch (e) {
      last = e;
      if (i < tries - 1) {
        await sleep(base * 2 ** i);
      }
    }
  }
  throw last;
}
// === end ===

// === s-frontend-debounce-throttle ===
function debounce(fn, ms) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(
      () => fn(...args), ms);
  };
}

function throttle(fn, ms) {
  let last = -Infinity;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
}
// === end ===

// === s-frontend-immutable-update ===
function setDone(state, lid, id, done) {
  return {
    ...state,
    lists: state.lists.map((l) =>
      l.id !== lid
        ? l
        : {
            ...l,
            tasks: l.tasks.map((t) =>
              t.id !== id
                ? t
                : { ...t, done }
            ),
          }
    ),
  };
}

function snapshot(state) {
  return structuredClone(state);
}
// === end ===

// === s-frontend-array-group ===
function paidByUser(orders) {
  const sums = orders
    .filter((o) => o.paid)
    .reduce((acc, o) => {
      const prev = acc[o.user] ?? 0;
      acc[o.user] = prev + o.total;
      return acc;
    }, {});
  return Object.entries(sums)
    .map(([user, total]) =>
      ({ user, total }))
    .sort((a, b) => b.total - a.total);
}

function byUser(orders) {
  return Object.groupBy(
    orders, (o) => o.user);
}
// === end ===

// === s-frontend-map-set ===
function countWords(text) {
  const counts = new Map();
  const lower = text.toLowerCase();
  for (const w of lower.split(/\s+/)) {
    if (!w) continue;
    const n = counts.get(w) ?? 0;
    counts.set(w, n + 1);
  }
  return counts;
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function intersect(a, b) {
  const inB = new Set(b);
  const uniq = [...new Set(a)];
  return uniq.filter((x) => inB.has(x));
}
// === end ===

// === s-frontend-async-gen ===
async function* pages(fetchPage) {
  let cursor = null;
  do {
    const page = await fetchPage(cursor);
    yield* page.items;
    cursor = page.next;
  } while (cursor !== null);
}

async function collect(source, limit) {
  const out = [];
  for await (const item of source) {
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
// === end ===

// === s-frontend-es-class ===
class Account {
  static #count = 0;
  #balance = 0;

  constructor(owner) {
    this.owner = owner;
    Account.#count++;
  }

  static get opened() {
    return Account.#count;
  }

  get balance() {
    return this.#balance;
  }

  deposit(amount) {
    if (!(amount > 0)) {
      throw new RangeError("sumă > 0");
    }
    this.#balance += amount;
    return this;
  }
}
// === end ===

/* Referința ESM are două fișiere (util.mjs și app.mjs), deci nu e un
   modul valid aici: stă în acest comentariu, iar testul o scrie în
   două fișiere reale și le importă (vezi `loadEsm` în skel_js.test.mjs).
// === s-frontend-esm ===
// util.mjs
export let count = 0;
export function inc() {
  count++;
}
export const add = (a, b) => a + b;
export default function mul(a, b) {
  return a * b;
}

// app.mjs
import mul, { add } from "./util.mjs";
import { count, inc } from "./util.mjs";

inc();
export const live = count; // 1, nu 0
export const product = mul(add(1, 2), 4);

export async function lazy() {
  const m = await import("./util.mjs");
  return m.default(2, 5) + m.add(1, 1);
}
export const namespace = () =>
  import("./util.mjs");
// === end ===
*/

export {
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
};
