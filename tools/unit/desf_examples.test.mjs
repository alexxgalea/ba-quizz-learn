// Check-ul exemplelor Python din desfășurări: rulează blocul într-un proces izolat și compară ce afișează cu comentariile `# → …`;
// o excepție așteptată se marchează `# ! Tip` și blocul trebuie să se oprească exact cu acel tip, pe acea instrucțiune.
import test from "node:test";
import assert from "node:assert/strict";
import { checkExample, extractExamples } from "../desf_examples.mjs";

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
