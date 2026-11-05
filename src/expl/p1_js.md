<!-- JavaScript esențial (modulul js, frontend extins). Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). Fapte verificate pe MDN și rulate în Node 22: research/interview-facts.md, secțiunea 43. -->

### js-01
Pe scurt: Afișează `1 [ 'x', 'y' ]`: spread-ul copiază primul nivel, iar `tags` rămâne același array.
Scop: Știi unde se oprește o copie. Greșeala apare când modifici „copia” unui obiect din state sau dintr-un răspuns de API și schimbi, fără să vrei, originalul.
Mecanism: `{ ...a }` creează un obiect nou și îi pune proprietățile lui `a`. Numărul `n` se copiază ca valoare. Array-ul `tags` e un obiect, deci se copiază doar referința către el: `a.tags` și `b.tags` arată spre același array.
Pas cu pas:
```text
a = { n: 1, tags: [ 'x' ] }
b = { ...a }
  n: copiat (1)
  tags: aceeași referință
b.n = 2 → doar b
b.tags.push('y') → array comun
a: n = 1, tags = [ 'x', 'y' ]
```
Aplicare:
```js
const deep = structuredClone(a);
```
Legătură: PY-13 e aceeași idee în Python: `[[0] * 2] * 2` repetă aceeași listă interioară. În React, `items.push(x); setItems(items)` nu re-randează, fiindcă referința e aceeași.
Limită: `structuredClone` aruncă `DataCloneError` pe funcții. Pentru date de la API (JSON) merge, pentru obiecte cu metode nu.
La interviu: „Spread-ul face o copie de suprafață. Valorile simple se copiază, obiectele dinăuntru rămân aceleași. Pentru o copie completă folosesc `structuredClone`.”
Verificare: Cum copiezi `a` astfel încât `b.tags.push('y')` să nu schimbe `a.tags`, fără `structuredClone`?
Răspuns verificare: Copiezi și array-ul: `{ ...a, tags: [...a.tags] }`. Fiecare nivel mutabil se copiază separat.
Varianta greșită B: `b.n = 2` schimbă doar `b`: numărul `n` s-a copiat ca valoare. Doar array-ul `tags` rămâne comun.
Varianta greșită C: Ar fi corect dacă spread-ul ar copia și array-ul. El copiază doar referința, deci `push` se vede și în `a`.
Varianta greșită D: Combină două greșeli: crede că `n` rămâne comun și că `tags` s-a copiat.

### js-02
Pe scurt: Afișează `undefined`, apoi aruncă `ReferenceError` la a doua linie.
Scop: Distingi `var` de `let` și `const` la citirea înainte de declarație. Întrebarea apare des sub forma „ce e hoisting-ul?”.
Mecanism: `var x` există de la începutul funcției, cu valoarea `undefined`, deci `typeof x` dă „undefined”. `let y` există de la începutul blocului, dar neinițializat, până la linia `let y = 2`: zona asta e TDZ. Orice citire în ea, chiar și `typeof`, aruncă `ReferenceError`.
Pas cu pas:
```text
început de modul
  x: undefined
  y: TDZ (neinițializat)
typeof x → „undefined”
typeof y → ReferenceError
execuția se oprește aici
```
Legătură: Python nu are scope de bloc și nici TDZ. Într-o funcție, citirea unei variabile locale înainte de atribuire aruncă `UnboundLocalError`.
Limită: `typeof` pe o variabilă care nu există deloc dă „undefined”, fără eroare. Eroarea apare doar pentru o variabilă aflată în TDZ.
La interviu: „`var` primește `undefined` de la început. `let` și `const` stau în TDZ până la linia lor, deci citirea înainte aruncă `ReferenceError`.”
Verificare: Merge `const o = {}; o.k = 1;` sau aruncă?
Răspuns verificare: Merge. `const` blochează reasignarea variabilei (`o = {}` ar arunca `TypeError`), nu modificarea obiectului.
Varianta greșită B: `typeof` pe o variabilă din TDZ aruncă, nu întoarce „undefined”. Doar `var` dă `undefined` înainte de declarație.
Varianta greșită C: Prima linie nu aruncă: `x` e declarat cu `var`, deci există de la început, cu `undefined`.
Varianta greșită D: Înainte de linia `var x = 1`, `typeof x` dă „undefined”, nu „number”: atribuirea nu a rulat încă.

### js-03
Pe scurt: Afișează `3 3 3`; cu `let` în loc de `var`, fiecare iterație are propria variabilă și afișează `0 1 2`.
Scop: Închizi un clasic de interviu: closures într-o buclă. Același mecanism produce bug-uri cu handlere și intervale în React.
Mecanism: `var i` e o singură variabilă pentru toată funcția. Cele trei callback-uri o țin pe ea, nu o copie a valorii. `setTimeout` le rulează după buclă, când `i` e 3. Cu `let`, fiecare iterație primește o variabilă nouă, cu valoarea din acea iterație.
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
Aplicare:
```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}
```
Legătură: PY-02 e aceeași capcană în Python, cu `lambda` într-o listă. În React, un `setInterval` dintr-un effect cu `[]` vede state-ul din primul render (FE-05).
Limită: `let` în antetul unui `for` e un caz special. Un `let` declarat în afara buclei ar fi iar o singură variabilă pentru toate callback-urile.
La interviu: „Un closure ține variabila, nu valoarea ei. `var` e o singură variabilă, deci toate callback-urile văd valoarea finală. `let` creează una nouă la fiecare iterație.”
Verificare: De ce `for (const i = 0; i < 3; i++)` nu rezolvă problema?
Răspuns verificare: `i++` încearcă să modifice un `const` și aruncă `TypeError` la a doua iterație. Pentru un contor folosești `let`; `const` merge în `for...of`.
Varianta greșită B: Callback-ul nu copiază valoarea la creare; ține variabila, iar `setTimeout` îl rulează după buclă.
Varianta greșită C: `const` nu poate fi incrementat: `i++` aruncă `TypeError` după prima iterație.
Varianta greșită D: `setTimeout` nu rulează înaintea buclei: callback-ul așteaptă până se termină codul curent, deci `i` e deja 3.

### js-04
Pe scurt: Callback-ul `function` nu primește `this` din clasă, ci de la cine îl apelează; o arrow function îl ia din `start()`.
Scop: Înțelegi că `this` se stabilește la apel. E sursa clasică de bug-uri la handlere și timere.
Mecanism: Funcția dată lui `setInterval` e apelată de timer, nu ca `timer.metoda()`. Deci `this` nu e instanța `Timer`, iar `this.seconds++` nu atinge câmpul ei. O arrow function nu are `this` propriu: îl ia din codul din jur, adică din `start()`, unde `this` e instanța.
Pas cu pas:
```text
t.start() → this = t
setInterval ia callback-ul
timerul îl apelează, fără t
  function: this ≠ t
  arrow: this din start() = t
```
Aplicare:
```js
setInterval(() => {
  this.seconds++;
}, 1000);
```
Legătură: Clasele React vechi legau handler-ele în constructor (`this.onClick = this.onClick.bind(this)`). În componentele-funcții n-ai `this`, deci problema dispare.
Limită: Ce e `this` într-un callback depinde de cine îl apelează: în Node, timerul îi dă obiectul `Timeout`; alte API-uri îl apelează fără obiect, deci `undefined` în cod strict. Sigur e doar că nu e instanța.
La interviu: „`this` depinde de cum e apelată funcția, nu de unde e scrisă. Într-un callback îl repar cu o arrow function, care ia `this` din jur, sau cu `bind`.”
Verificare: Ce valoare are `this` într-o arrow function scrisă în `start()`, când `start()` e apelată ca `t.start()`?
Răspuns verificare: `t`. Arrow function nu are `this` propriu: îl ia din `start()`, iar acolo `this` e obiectul pe care s-a făcut apelul.
Varianta greșită B: Câmpurile de clasă sunt private doar cu `#`, iar `seconds` nu are. Problema nu e accesul, ci `this`.
Varianta greșită C: `setInterval` nu are nevoie de `await`: primește un callback pe care îl apelează periodic, fără promisiuni.
Varianta greșită D: `this.seconds` e sintaxa corectă pentru un câmp de instanță. `Timer.seconds` ar fi un câmp `static`, altceva.

### js-05
Pe scurt: Afișează `10 0 5`: `||` cade pe dreapta la orice falsy, `??` doar la `null` sau `undefined`.
Scop: Alegi operatorul potrivit pentru valori implicite. `||` strică valorile valide, dar falsy: `0`, `''`, `false`.
Mecanism: `0 || 10` dă `10`, fiindcă `0` e falsy. `0 ?? 10` păstrează `0`, fiindcă `0` nu e nici `null`, nici `undefined`. `null ?? 5` dă `5`.
Aplicare:
```js
const qty = form.qty ?? 1;
const name = user?.name ?? "anonim";
```
Legătură: În Python, `x or 10` se comportă ca `||`, iar `x if x is not None else 10` ca `??`. Un `quantity` de `0` din API trebuie să rămână `0`, ca un `0` dintr-un câmp Django.
Limită: `??` nu se amestecă cu `||` sau `&&` fără paranteze: `a || b ?? c` e `SyntaxError`.
La interviu: „`||` ia dreapta la orice valoare falsy; `??` doar la `null` și `undefined`. Pentru valori implicite folosesc `??`, ca să nu pierd un `0` sau un șir gol.”
Verificare: Cum scrii „folosește `b` doar dacă `a` lipsește (`null` sau `undefined`), dar păstrează `0` și `''`”?
Răspuns verificare: `a ?? b`. Operatorul `??` tratează doar `null` și `undefined` ca valori lipsă.
Varianta greșită B: `0 ?? 10` e `0`, nu `10`: `??` nu tratează `0` ca lipsă. Varianta pune `??` să se poarte ca `||`.
Varianta greșită C: `0 || 10` e `10`: `||` sare peste `0`, ca peste orice valoare falsy.
Varianta greșită D: `null ?? 5` e `5`, nu `null`: `null` e exact valoarea pe care `??` o înlocuiește.

### js-06
Pe scurt: Afișează `[ 1, 10, 9 ] true`: `sort()` ordonează ca text, modifică array-ul pe loc și îl întoarce pe el însuși.
Scop: Eviți două greșeli: ordinea „ciudată” a numerelor și mutarea state-ului din React fără să vrei.
Mecanism: Fără comparator, `sort` convertește elementele în text și le compară: „10” vine înaintea lui „9”. Apoi modifică `a` și întoarce referința către `a`, deci `b === a`. Pentru numere: `a.sort((x, y) => x - y)`. Pentru o copie sortată: `a.toSorted()`.
Aplicare:
```js
const num = (x, y) => x - y;
const sorted = a.toSorted(num);
```
Legătură: În Python, `sorted(a)` e `toSorted`, iar `a.sort()` modifică pe loc, ca în JavaScript, dar compară numerele ca numere. În React, `setItems(items.toSorted())` dă o referință nouă și declanșează re-render-ul.
Limită: `toSorted`, `toReversed` și `toSpliced` sunt din ES2023. Într-un mediu mai vechi folosești `[...a].sort()`.
La interviu: „`sort` fără comparator compară ca text și modifică array-ul pe loc. Pentru numere dau un comparator, iar în React sortez o copie, cu `toSorted`.”
Verificare: Cum sortezi numeric `[10, 9, 1]` fără să modifici array-ul original?
Răspuns verificare: `a.toSorted((x, y) => x - y)` sau, în medii mai vechi, `[...a].sort((x, y) => x - y)`.
Varianta greșită B: Ordinea numerică ar cere comparatorul `(x, y) => x - y`; fără el, „10” vine înaintea lui „9”.
Varianta greșită C: `sort` modifică `a` pe loc și întoarce chiar `a`: `a` nu mai e `[10, 9, 1]`, iar `b === a` e `true`.
Varianta greșită D: Combină ambele greșeli: ordine numerică și `b` ca o copie. `sort` întoarce chiar `a`.

### js-07
Pe scurt: Pe rând, fiecare după cea dinainte; `await Promise.all(ids.map(fetchUser))` le pornește deodată.
Scop: Recunoști un `await` care strică performanța. E o întrebare frecventă despre cod `async` în frontend.
Mecanism: `await` oprește funcția `async` până se termină promisiunea. În `for...of`, cererea următoare pornește abia după ce s-a terminat cea dinainte, deci durează de 3 ori cât una. `ids.map(fetchUser)` pornește toate cererile, iar `Promise.all` așteaptă ultima.
Pas cu pas:
```text
buclă: await get(1)
  funcția stă, pagina merge
  get(1) gata → get(2) → get(3)
Promise.all pornește get(1..3)
  pornesc deodată
  gata când se termină ultima
```
Aplicare:
```js
const users = await Promise.all(
  ids.map(fetchUser));
```
Legătură: AIO-04 și FE-14: `Promise.all` respinge la primul eșec, dar nu oprește celelalte cereri, ca `gather` în asyncio. În Python, `await` într-o buclă e la fel de secvențial.
Limită: Deodată nu înseamnă oricâte: 20.000 de id-uri trimit 20.000 de cereri. Limitezi concurența, în loturi sau cu o bibliotecă.
La interviu: „`await` într-o buclă rulează pe rând. Pentru cereri independente folosesc `Promise.all`, iar `forEach(async …)` nu e așteptat, deci nu-l folosesc.”
Verificare: Ai cinci cereri independente și vrei rezultatele chiar dacă una eșuează. Ce folosești?
Răspuns verificare: `Promise.allSettled`. Așteaptă toate și întoarce, pentru fiecare, fie `fulfilled` cu valoare, fie `rejected` cu motiv.
Varianta greșită B: `await` oprește funcția până se termină cererea, deci nu doar o pornește: iterația următoare așteaptă.
Varianta greșită C: `forEach` ignoră promisiunile întoarse de callback: pornește cererile deodată, dar `load` se termină înainte de ele, iar o eroare rămâne netratată.
Varianta greșită D: `for...of` e sincron și nu așteaptă nimic singur. Așteptarea vine de la `await`.

### js-08
Pe scurt: Afișează `B`: metoda se caută pe prototip la fiecare apel, deci schimbarea se vede și la obiectele create înainte.
Scop: Înțelegi unde stau metodele unei clase. Întrebarea de interviu e „ce e un prototip?”.
Mecanism: `class` pune metodele pe `A.prototype`, nu pe fiecare instanță. La `a.hi()`, JavaScript caută `hi` pe `a`, apoi pe `A.prototype`. Când a rulat linia cu `B`, prototipul avea deja metoda nouă. Metodele nu se copiază în instanță la `new`.
Pas cu pas:
```text
a.hi() → caută hi pe a: nu e
  → caută pe A.prototype: găsit
A.prototype.hi se înlocuiește
a.hi() → același drum, cod nou
```
Legătură: Python are același mecanism: `A.hi = …` după `a = A()` schimbă și `a.hi()`. Diferența: Python are moștenire multiplă și MRO (fișa `oop`), iar JavaScript are un singur lanț de prototipuri.
Limită: `class` are reguli proprii pe care o funcție constructor obișnuită nu le are: `#câmp` privat, `super` și faptul că o clasă nu se apelează fără `new`.
La interviu: „`class` e o sintaxă peste prototipuri. Metodele stau pe `Clasa.prototype`, iar obiectele le găsesc urcând lanțul de prototipuri.”
Verificare: Unde stă metoda `hi` dacă `Object.keys(a)` e `[]`?
Răspuns verificare: Pe `A.prototype`. Obiectul `a` n-are proprietăți proprii; găsește `hi` urcând lanțul de prototipuri.
Varianta greșită B: Metodele nu se copiază în instanță la `new`; instanța doar le găsește pe prototip, deci vede versiunea de la momentul apelului.
Varianta greșită C: Atribuirea merge: metodele de clasă sunt proprietăți normale ale prototipului și se pot rescrie. Nu aruncă nicio eroare.
Varianta greșită D: `a.hi` există, găsit pe prototip. `undefined` ar apărea doar dacă metoda n-ar exista pe lanț.
