// Check-ul exemplelor Python din desfășurări: rulează blocul într-un proces izolat și compară ce afișează cu comentariile `# → …`;
// o excepție așteptată se marchează `# ! Tip` și blocul trebuie să se oprească exact cu acel tip, pe acea instrucțiune.
import test from "node:test";
import assert from "node:assert/strict";
import { checkExample, extractExamples, checkTsExamples } from "../desf_examples.mjs";

const run = (code, opts) => checkExample(code.replace(/^\n/, ""), opts);
const fails = (r, re) => { assert.equal(r.ok, false, "trebuia să pice"); assert.ok(r.errors.some(e => re.test(e)), "așteptat " + re + " în:\n" + r.errors.join("\n")); };

test("a print whose output matches its comment passes", () => {
  assert.deepEqual(run(`
x = [1, 2]
print(len(x))  # → 2
print(x[0])    # → 1
`), { ok: true, errors: [] });
});

test("a bare expression is checked like in the REPL (its repr)", () => {
  assert.equal(run(`
x = "a"
x * 2  # → 'aa'
[1, 2][::-1]  # → [2, 1]
`).ok, true);
});

test("a wrong result fails and names the line", () => fails(run(`
print(1 + 1)  # → 3
`), /rezultat.*2.*3|așteptat.*3.*afișat.*2/is));

test("output without an expected comment fails", () => fails(run(`
print("a")  # → a
print("b")
`), /2 rânduri.*1|afișează 2/is));

test("an expected comment without output fails", () => fails(run(`
x = 1  # → 1
`), /1 rezultat.*0|așteptat.*0 rânduri|afișează 0/is));

test("an arrow inside a string is not an expectation", () => assert.equal(run(`
s = "# → nu e comentariu"
print(s)  # → # → nu e comentariu
`).ok, true));

test("an expected exception: the block must stop with exactly that type, on that statement", () => {
  assert.equal(run(`
print("înainte")  # → înainte
1 / 0  # ! ZeroDivisionError
`).ok, true);
  assert.equal(run(`
def f():
    raise TypeError("x")
f()  # ! TypeError
`).ok, true);
});

test("a wrong exception type fails", () => fails(run(`
int("x")  # ! TypeError
`), /ValueError.*TypeError|TypeError.*ValueError/s));

test("the exception type must be exact, not a base class", () => fails(run(`
raise KeyError("k")  # ! LookupError
`), /KeyError.*LookupError/s));

test("a marked exception that never happens fails", () => fails(run(`
x = 1  # ! TypeError
`), /nicio excepție|nu s-a oprit/i));

test("an unmarked exception fails", () => fails(run(`
print("a")  # → a
1 / 0
`), /ZeroDivisionError.*neașteptat|neașteptat.*ZeroDivisionError/is));

test("an exception raised on another statement than the marked one fails", () => fails(run(`
x = 1
1 / 0
y = 2  # ! ZeroDivisionError
`), /alt rând|altă instrucțiune|rândul 2/i));

test("output printed before the exception is still compared", () => fails(run(`
print("a")  # → b
1 / 0  # ! ZeroDivisionError
`), /așteptat.*b/is));

test("code that does not parse fails", () => fails(run(`
def (:
`), /sintax/i));

test("an endless loop is stopped by the timeout", () => fails(run(`
while True:
    pass
`, { timeout: 600 }), /timp|timeout/i));

test("the block runs in its own directory, with isolated imports", () => assert.equal(run(`
import os
print(os.path.exists("lib.mjs"))  # → False
`).ok, true));

test("extractExamples reads every python block of every field, with its place", () => {
  const items = [
    { n: 1, ex: "Exemplu:\n```python\nprint(1)  # → 1\n```\ntext", an: "fără cod" },
    { n: 2, ex: "```cpp\nint x;\n```", cpp: "```py\nprint(2)  # → 2\n```", leg: "```text\nnu rulează\n```" }
  ];
  const ex = extractExamples({ items });
  assert.deepEqual(ex.map(e => [e.n, e.field, e.index]), [[1, "Exemplu", 1], [2, "În C++", 1]]);
  assert.equal(ex[0].code, "print(1)  # → 1");
});

// ---- JavaScript: același contract, cu `// → …` și `// ! Tip`; blocul rulează ca modul ESM, deci `await` la nivel de modul merge ----
const js = (code, opts) => checkExample(code.replace(/^\n/, ""), { lang: "js", ...opts });

test("js: console.log output is compared with the // → comments, in order", () => {
  assert.deepEqual(js(`
const x = [1, 2];
console.log(x.length);  // → 2
console.log(x);         // → [ 1, 2 ]
console.log("a", 3);    // → a 3
`), { ok: true, errors: [] });
});

test("js: a wrong result fails and shows both values", () => fails(js(`
console.log(1 + 1);  // → 3
`), /așteptat.*3.*afișat.*2/is));

test("js: output without an expected comment fails, and so does an expected comment without output", () => {
  fails(js(`
console.log("a");  // → a
console.log("b");
`), /afișează 2 rânduri/i);
  fails(js(`
const x = 1;  // → 1
`), /afișează 0 rânduri/i);
});

test("js: an arrow inside a string or a template literal is not an expectation", () => assert.equal(js(`
const s = "// → nu e comentariu";
const t = \`și // → nici asta\`;
console.log(s.length, t.length);  // → 20 17
`).ok, true));

test("js: an expected exception stops the block with exactly that type", () => {
  assert.equal(js(`
console.log("înainte");  // → înainte
null.x;  // ! TypeError
`).ok, true);
  fails(js(`
JSON.parse("{");  // ! TypeError
`), /SyntaxError.*TypeError|TypeError.*SyntaxError/s);
});

test("js: the exception type is the constructor name, so custom errors can be expected", () => assert.equal(js(`
class AppError extends Error {}
throw new AppError("x");  // ! AppError
`).ok, true));

test("js: the marked line must be one the exception passes through (the throw or the call)", () => {
  assert.equal(js(`
function f(u) { return u.name; }
f(undefined);  // ! TypeError
`).ok, true);
  fails(js(`
const a = 1;
null.x;
const b = 2;  // ! TypeError
`), /nu trece prin rândul 3|rândul 3/i);
});

test("js: a marked exception that never happens fails, and an unmarked one fails", () => {
  fails(js(`
const x = 1;  // ! TypeError
`), /nicio excepție/i);
  fails(js(`
console.log("a");  // → a
null.x;
`), /excepție neașteptată: TypeError/i);
});

test("js: top-level await and timers work, and output stays in order", () => assert.equal(js(`
const wait = ms => new Promise(r => setTimeout(r, ms));
setTimeout(() => console.log("timer"), 5);
console.log("sync");
await wait(20);
console.log("după await");
// → sync
// → timer
// → după await
`).ok, true));

test("js: the order of the arrows is the order of the output (microtask before timer)", () => assert.equal(js(`
setTimeout(() => console.log("timer"));
Promise.resolve().then(() => console.log("micro"));
console.log("sync");
// → sync
// → micro
// → timer
`).ok, true));

test("js: code that does not parse fails; an endless loop is stopped by the timeout", () => {
  fails(js(`
const = ;
`), /sintax/i);
  fails(js(`
while (true) {}
`, { timeout: 800 }), /timp|timeout/i);
});

// ---- TypeScript: tsc --strict --noEmit; `// ! TS2322` pe linia care trebuie să dea eroarea ----
const ts = (...blocks) => checkTsExamples(blocks.map(b => b.replace(/^\n/, "")));

test("ts: a block that compiles under strict passes", () => assert.deepEqual(ts(`
type R = { kind: "ok" } | { kind: "err"; msg: string };
const f = (r: R) => (r.kind === "ok" ? 1 : r.msg.length);
`), [{ ok: true, errors: [] }]));

test("ts: a type error that is not marked fails and shows the code and the line", () => {
  const [r] = ts(`
const n: number = "a";
`);
  fails(r, /TS2322.*rândul 1|rândul 1.*TS2322/s);
});

test("ts: a marked error must be exactly that code on that line", () => {
  assert.equal(ts(`
const n: number = "a";  // ! TS2322
`)[0].ok, true);
  fails(ts(`
const n: number = "a";  // ! TS2345
`)[0], /TS2322.*TS2345|TS2345.*TS2322/s);
  fails(ts(`
const n: number = 1;  // ! TS2322
`)[0], /nicio eroare|nu a dat eroare/i);
});

test("ts: strict is on, so an implicit any or a possibly-null access fails", () => {
  fails(ts(`
function f(x) { return x; }
`)[0], /TS7006/);
  fails(ts(`
const el = document.querySelector("a");
el.href;
`)[0], /TS18047|TS2531/);
});

test("ts: blocks do not see each other's declarations, and each result keeps its block", () => {
  const r = ts(`
type A = { a: 1 };
`, `
type A = { b: 2 };
const x: A = { b: 2 };
`, `
const y: number = "z";
`);
  assert.deepEqual(r.map(x => x.ok), [true, true, false]);
});

test("extractExamples can also return js and ts blocks, with their language", () => {
  const items = [{ n: 1, ex: "```ts\nconst a = 1;\n```\n```js\nconsole.log(1);  // → 1\n```\n```tsx\n<div />\n```" }];
  const ex = extractExamples({ items }, ["js", "ts"]);
  assert.deepEqual(ex.map(e => [e.lang, e.index]), [["ts", 1], ["js", 2]]);
});
