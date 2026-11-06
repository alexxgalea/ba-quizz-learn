<!-- Desfășurările fișei `js` (8 puncte; exemple JS, rulate de tools/desf_examples.mjs în Node 22; C++ compilat cu g++ 13 și clang++ 18 în -std=c++17). Format frontend: 90–140 de cuvinte, ~250 la `Greu: da`, exemplu ≤ 14 rânduri, Pas cu pas ≤ 8 rânduri. Format și reguli: lib.mjs (checkDesf, DESF_LIMITS_FE), .scratch/frontend-extins/spec.md. Faptele: research/interview-facts.md, secțiunea 43. -->

### harta
Problema: Un bug de frontend pare un capriciu al limbajului: un `setTimeout` afișează de trei ori `3`, un contor nu crește, copia unui obiect îl schimbă pe cel original, iar trei cereri „în paralel” rulează pe rând. Aproape toate vin din același loc: JavaScript nu copiază ce crezi că copiază și nu leagă ce crezi că leagă. Modulul răspunde la trei întrebări: ce e o valoare și ce e o referință, ce vede o funcție din jurul ei (variabile și `this`) și cum rulează codul asincron și clasele.
Grupuri:
- 1–2: valori, referințe și variabile (copii, scope, TDZ)
- 3–4: ce vede o funcție din jur: closures și `this`
- 5–6: comparații și date: `==`, falsy, `??`, array-uri
- 7–8: cod asincron și clase: `await`, promisiuni, prototipuri

### 1
Greu: da
Problema: Copiezi un obiect cu `{ ...a }` și schimbi un număr în copie: originalul rămâne neatins. Apoi faci `push` pe un array din copie, iar originalul se schimbă și el. Cele două lucruri sunt tratate diferit.
Ideea: O variabilă cu o primitivă (număr, string, boolean, `null`, `undefined`) ține chiar valoarea, deci atribuirea o copiază. O variabilă cu un obiect sau un array ține o referință, deci atribuirea copiază doar referința. `===` pe obiecte compară referințele: două obiecte cu același conținut nu sunt egale. Spread-ul copiază doar primul nivel; ce e mai adânc rămâne același obiect. Pentru o copie completă folosești `structuredClone`.
Exemplu:
```js
const log = console.log;
const a = { n: 1, tags: ["x"] };
const b = { ...a };  // ✗
b.n = 2;
b.tags.push("y");
log(a.n);     // → 1
log(a.tags);  // → [ 'x', 'y' ]
// ✓ copie completă
const c = structuredClone(a);
c.tags.push("z");
log(a.tags);  // → [ 'x', 'y' ]
```
Pas cu pas:
```text
a = { n: 1, tags: [ 'x' ] }
b = { ...a }
  n: copiat (1)
  tags: aceeași referință
b.tags.push('y') → array comun
a.tags → [ 'x', 'y' ]
```
Legătură: PY-13 e aceeași idee în Python: `[[0] * 2] * 2` repetă aceeași listă interioară. În React, `items.push(x); setItems(items)` nu re-randează, fiindcă referința e aceeași (modulul `react`).

### 2
Greu: da
Problema: Citești o variabilă înainte s-o declari. Cu `var` primești `undefined`, iar codul merge mai departe cu o valoare goală. Cu `let` primești o eroare. Același cod, două comportamente.
Ideea: `var` are scope de funcție și primește `undefined` de la începutul funcției (hoisting). `let` și `const` au scope de bloc, adică între acolade. Ele există de la începutul blocului, dar nu pot fi citite până la linia lor: zona de până acolo se numește TDZ, iar o citire în ea aruncă `ReferenceError`, chiar și cu `typeof`. `const` interzice reasignarea variabilei, nu modificarea obiectului din ea.
Exemplu:
```js
const log = console.log;
log(typeof x);  // → undefined
var x = 1;
try {
  log(y);
} catch (e) {
  log(e.name);
  // → ReferenceError
}
let y = 2;
const o = {};
o.k = 1;  // ✓ merge
log(o.k);  // → 1
```
Pas cu pas:
```text
început de modul
  x: undefined
  y: TDZ (neinițializat)
citești x acum: undefined
citești y acum: eroare
let y = 2 → y devine 2
```
Legătură: Python nu are scope de bloc și nici TDZ. Într-o funcție, citirea unei variabile locale înainte de atribuire aruncă `UnboundLocalError`.

### 3
Greu: da
Problema: Trei `setTimeout` într-o buclă `for` cu `var` afișează `3 3 3`, nu `0 1 2`. Codul pare corect, dar fiecare callback vede altceva decât crezi.
Ideea: Un closure e o funcție împreună cu variabilele din locul unde a fost creată. Ține variabilele însele, nu copii ale valorilor, deci vede valoarea de la momentul apelului. `var i` e o singură variabilă pentru toată funcția: când rulează callback-urile, bucla s-a terminat și `i` e 3. `let i` creează o variabilă nouă la fiecare iterație, deci fiecare callback o vede pe a lui.
Exemplu:
```js
const log = console.log;
const out = [];
// ✗
for (var i = 0; i < 3; i++) {
  setTimeout(() => out.push(i));
}
// ✓
for (let j = 0; j < 3; j++) {
  setTimeout(() => out.push(j));
}
setTimeout(() => log(out.join()));
// → 3,3,3,0,1,2
```
Pas cu pas:
```text
bucla cu var: un singur i
  pasul 0: callback citește i
  pasul 1: callback citește i
  pasul 2: callback citește i
bucla s-a terminat: i = 3
timerele rulează: 3, 3, 3
cu let: j nou la fiecare pas
```
În C++: O lambdă `[&n]` capturează variabila prin referință, ca un closure JavaScript: modifici `n` din ea și `n` din afară se schimbă.
```cpp
int n = 0;
auto f = [&n] { return ++n; };
f(); f();   // n == 2
```
Unde nu ține: În C++ referința capturată poate rămâne agățată: dacă `n` iese din scope, un apel ulterior e, de regulă, comportament nedefinit. În JavaScript variabila trăiește cât o ține un closure, deci nu există așa ceva. În schimb nu poți captura prin copie, ca la `[n]`: valoarea o fixezi cu `let` sau cu un parametru.
Legătură: PY-02 e aceeași capcană în Python, cu `lambda` într-o listă. În React, un `setInterval` dintr-un effect cu `[]` vede state-ul din primul render (FE-05).

### 4
Greu: da
Problema: Pui `this.seconds++` într-un callback de `setInterval`, scris într-o metodă, iar contorul nu mișcă. Aceeași metodă dată drept handler de click nu mai găsește obiectul.
Ideea: `this` nu depinde de locul unde e scrisă funcția, ci de cum e apelată. În `obj.f()` e `obj`. Într-un apel simplu `f()` e `undefined` în cod strict (clase, module) și obiectul global altfel. Un callback e apelat de altcineva, deci își pierde obiectul. O arrow function nu are `this` propriu și îl ia din codul din jur. `bind` fixează `this` pentru o funcție obișnuită.
Exemplu:
```js
const log = console.log;
const t = {
  n: 0,
  tick() { return this?.n; },
};
log(t.tick());     // → 0
const f = t.tick;  // ✗
log(f());  // → undefined
const g = f.bind(t);  // ✓
log(g());          // → 0
```
Pas cu pas:
```text
t.tick() → this = t
f = t.tick  (fără t)
f() → this = undefined
f.bind(t) → this = t mereu
arrow () => … → this din jur
```
În C++: O arrow function seamănă cu o lambdă care capturează `this`: ține obiectul din jurul ei.
```cpp
struct T {
  int n = 0;
  auto up() {
    return [this] { ++n; };
  }
};
```
Unde nu ține: În C++, `this` e parametrul ascuns al unei funcții membre: `auto f = t.tick;` nici nu compilează, iar un pointer către membru cere obiectul la apel: `(t.*p)()`. În JavaScript, `const f = t.tick` e legal și pierde obiectul în tăcere. Și `[this]` poate rămâne agățat dacă `t` dispare; un closure JavaScript ține obiectul în viață.
Legătură: În Python, `self` e parametru explicit, iar `f = obj.m` rămâne legat de obiect (bound method). Clasele React vechi legau handler-ele în constructor, cu `bind`; componentele-funcții n-au `this`.

### 5
Greu: da
Problema: Un câmp `quantity` e `0`, iar `quantity || 10` îți dă `10`. Un `if (items)` trece și pe un array gol. O comparație `0 == ''` dă `true`. Nu sunt bug-uri, ci reguli de conversie.
Ideea: `===` compară fără să convertească tipurile; `==` convertește întâi, cu reguli greu de ținut minte, deci folosești `===`. Falsy sunt opt valori: `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined` și `NaN`. Orice altceva e truthy, inclusiv `[]` și `{}`. `||` alege dreapta la orice falsy. `??` alege dreapta doar la `null` și `undefined`. `?.` oprește lanțul la `null` sau `undefined`.
Exemplu:
```js
const log = console.log;
const q = 0;
log(q || 10);       // → 10
log(q ?? 10);       // → 0
log(0 == "");       // → true
log(0 === "");      // → false
log([] ? "da" : "nu");  // → da
log(null?.name);  // → undefined
```
Legătură: În Python, `x or 10` se comportă ca `||`, iar `x if x is not None else 10` ca `??`. Un `quantity` de `0` venit din API trebuie să rămână `0`.

### 6
Greu: da
Problema: Sortezi `[10, 9, 1]` și primești `[1, 10, 9]`. Apoi, în React, faci `items.sort()` pe state: lista se sortează, dar ecranul nu se actualizează.
Ideea: `sort()` fără comparator convertește elementele în text și le compară ca text, deci „10” vine înaintea lui „9”. Pentru numere dai un comparator: `(x, y) => x - y`. `sort`, `push`, `splice` și `reverse` modifică array-ul pe loc; `map`, `filter`, `find` și `reduce` nu. Copiile cu modificare sunt `toSorted`, `toReversed` și `toSpliced` (ES2023). În React, state-ul se înlocuiește cu o copie nouă: un array modificat pe loc are aceeași referință, iar React nu vede schimbarea.
Exemplu:
```js
const log = console.log;
const a = [10, 9, 1];
const s = a.toSorted();
log(s);  // → [ 1, 10, 9 ]
log(a);  // → [ 10, 9, 1 ]
const num = (x, y) => x - y;
const n = a.toSorted(num);
log(n);  // → [ 1, 9, 10 ]
a.sort();  // ✗ pe loc
log(a);  // → [ 1, 10, 9 ]
```
Legătură: În Python, `sorted(a)` e `toSorted`, iar `a.sort()` modifică pe loc, ca în JavaScript. În React, `setItems(items.toSorted())` dă o referință nouă și declanșează re-render-ul (FE-05).

### 7
Greu: da
Problema: Aduci trei utilizatori într-o buclă cu `await` și durează de trei ori cât o cerere. Treci la `forEach(async …)` și funcția se termină înainte ca cererile să se termine.
Ideea: O funcție `async` întoarce mereu o promisiune. `await` oprește doar funcția curentă până se termină promisiunea, nu thread-ul, deci restul paginii merge. Dacă promisiunea e respinsă, `await` aruncă eroarea, pe care o prinzi cu `try` / `catch`. `await` în buclă pornește o cerere abia după ce s-a terminat cea dinainte. `Promise.all` le pornește pe toate deodată. `forEach` ignoră promisiunile întoarse de callback. Un `await` uitat lasă o promisiune, mereu truthy.
Exemplu:
```js
const log = console.log;
const get = id =>
  new Promise(r =>
    setTimeout(r, 20, id));
const ids = [1, 2, 3];
let t = Date.now();
const took = () => Date.now() - t;
// ✗ pe rând
for (const i of ids) await get(i);
log(took() >= 50);  // → true
t = Date.now();
// ✓ deodată
await Promise.all(ids.map(get));
log(took() < 50);  // → true
```
Pas cu pas:
```text
buclă: await get(1)
  funcția stă, pagina merge
  get(1) gata → get(2) → get(3)
Promise.all pornește get(1..3)
  pornesc deodată
  gata când se termină ultima
```
Legătură: AIO-04 și FE-14: `Promise.all` respinge la primul eșec, dar nu oprește celelalte cereri, ca `gather` în asyncio. În Python, `await` într-o buclă e la fel de secvențial.

### 8
Greu: da
Problema: Înlocuiești metoda `hi` pe `A.prototype` după ce ai creat obiectul `a`, iar `a.hi()` întoarce deja versiunea nouă. Te întrebi unde stă metoda, dacă nu în `a`.
Ideea: `class` e o sintaxă peste moștenirea prin prototipuri. Metodele stau pe `Clasa.prototype`, nu pe fiecare instanță. La `a.hi()`, JavaScript caută `hi` pe `a`, apoi urcă pe lanțul de prototipuri până îl găsește. `extends` leagă prototipul subclasei de cel al părintelui, iar în constructorul unei subclase apelezi `super()` înainte să folosești `this`. `#câmp` e privat la nivel de limbaj, iar `static` ține de clasă, nu de instanță.
Exemplu:
```js
const log = console.log;
class A {
  hi() { return "A"; }
}
const a = new A();
log(Object.keys(a));  // → []
log(a.hi());          // → A
A.prototype.hi = () => "B";
log(a.hi());          // → B
class C extends A {}
log(new C().hi());    // → B
```
Pas cu pas:
```text
a.hi() → caută hi pe a: nu e
  → caută pe A.prototype: găsit
A.prototype.hi se înlocuiește
a.hi() → același drum, cod nou
new C().hi() → pe C: nu e
  → A.prototype: găsit
```
Legătură: Python are același mecanism: `A.hi = …` după `a = A()` schimbă și `a.hi()`. Diferența: Python are moștenire multiplă și MRO (fișa `oop`), iar JavaScript are un singur lanț de prototipuri.
