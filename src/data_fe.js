/* Frontend extins (5 nov. 2026, .scratch/frontend-extins): modulele surori ale lui `frontend`.
   Ordinea de citire: js → ts → react → frontend → fedebug; fiecare modul nou se inserează lângă `frontend` (ADR 0002) și poartă `fe: true`
   (aplicația îl citește în isFE; lib.mjs ține aceeași listă în DESF_FE_MODULES, iar validate.mjs verifică egalitatea).
   Varianta corectă e mereu la indexul 0 (a: 0). Explicațiile grilelor: src/expl/p1_<modul>.md; desfășurările: src/desf/<modul>.md. */
(function (P) {
  const R = String.raw;
  const Q = (m, list) => list.forEach(q => P.mcq.push(Object.assign({ m, a: 0 }, q)));
  const O = (m, list) => list.forEach(c => P.oral.push(Object.assign({ m }, c)));
  const before = (mod) => P.modules.splice(P.modules.findIndex(m => m.id === "frontend"), 0, mod);

  // ---------- js ----------
  before({ id: "js", code: "JS", name: "JavaScript esențial", short: "JavaScript", p: 1, src: "Anunț + panel FE", fe: true });
  P.sheets.js = {
    lead: "La un interviu de frontend, JavaScript e baza: ce valoare ajunge unde, ce vede o funcție din jurul ei și ce înseamnă `this`. React și TypeScript se sprijină pe asta.",
    points: [
      "Primitivele (număr, string, boolean, `null`, `undefined`, `bigint`, `symbol`) se copiază la atribuire. Obiectele și array-urile se transmit prin referință, iar `===` pe ele compară identitatea, nu conținutul. Spread-ul (`{ ...o }`, `[...a]`) copiază doar primul nivel: obiectele dinăuntru rămân aceleași.",
      "`let` și `const` au scope de bloc; `var` are scope de funcție. Un `var` citit înainte de linia lui dă `undefined`, iar un `let` sau `const` citit înainte (și `typeof` pe el) aruncă `ReferenceError`, fiindcă stă în TDZ de la începutul blocului. `const` interzice reasignarea, nu și modificarea obiectului.",
      "Un closure ține variabilele din locul unde a fost creată funcția, nu copii ale valorilor lor. Cu `var` într-o buclă, toate callback-urile văd aceeași variabilă, deci trei `setTimeout` afișează `3 3 3`; `let` creează o variabilă nouă la fiecare iterație și afișează `0 1 2`.",
      "`this` depinde de cum apelezi funcția, nu de unde e scrisă: în `obj.f()` e `obj`, într-un apel simplu `f()` e `undefined` în cod strict (clase, module) și obiectul global altfel. O arrow function nu are `this` propriu: îl ia din jur. O metodă pasată drept callback îl pierde; `bind` sau o arrow function îl repară.",
      "`===` nu convertește tipurile, `==` da (`0 == ''` e `true`). Falsy sunt `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined` și `NaN`; `[]` și `{}` sunt truthy. `??` alege dreapta doar la `null` sau `undefined`, `||` la orice falsy: `0 || 10` e `10`, dar `0 ?? 10` e `0`. `?.` oprește lanțul la `null` sau `undefined`.",
      "`map`, `filter`, `find` și `reduce` nu modifică array-ul; `push`, `splice`, `sort` și `reverse` îl modifică pe loc. Copiile sunt `toSorted`, `toSpliced`, `toReversed` (ES2023) sau `[...a].sort()`. `sort()` fără comparator ordonează ca text: `[10, 9, 1]` devine `[1, 10, 9]`. În React, state-ul se înlocuiește cu o copie, nu se modifică.",
      "O funcție `async` întoarce mereu o promisiune. `await` oprește funcția, nu thread-ul, iar o promisiune respinsă aruncă la `await`, deci o prinzi cu `try` / `catch`. Un `await` uitat lasă o promisiune (mereu truthy) în loc de valoare. `await` într-o buclă rulează pe rând; `Promise.all` pornește totul deodată.",
      "`class` e o sintaxă peste moștenirea prin prototipuri: metodele stau pe `Clasa.prototype`, iar un obiect le găsește urcând lanțul de prototipuri. `extends` leagă prototipurile, iar în constructorul unei subclase `super()` vine înaintea lui `this`. `#câmp` e privat la nivel de limbaj, `static` ține de clasă, nu de instanță."
    ],
    avoid: ["„Spread-ul face o copie completă.”", "„`const` face obiectul imutabil.”", "„`this` e obiectul în care e scrisă funcția.”", "„`await` blochează thread-ul până vine răspunsul.”"]
  };

  Q("js", [
    { id: "js-01", lvl: 1, q: "Ce afișează?", code: R`const a = { n: 1, tags: ["x"] };
const b = { ...a };
b.n = 2;
b.tags.push("y");
console.log(a.n, a.tags);`, o: ["`1 [ 'x', 'y' ]`", "`2 [ 'x', 'y' ]`", "`1 [ 'x' ]`", "`2 [ 'x' ]`"],
      ctx: "Spread-ul (`...`) creează un obiect nou și copiază proprietățile din primul nivel. Un obiect sau un array din interior nu se copiază: se copiază referința către el.",
      e: "`n` e un număr, deci se copiază: `b.n = 2` nu atinge `a`. `tags` e un array, deci `a.tags` și `b.tags` sunt același array, iar `push` se vede în ambele." },
    { id: "js-02", lvl: 1, q: "Ce se întâmplă când rulezi codul?", code: R`console.log(typeof x);
console.log(typeof y);
var x = 1;
let y = 2;`, o: ["Afișează `undefined`, apoi aruncă `ReferenceError`", "Afișează `undefined` de două ori", "Aruncă `ReferenceError` chiar la prima linie", "Afișează `number` de două ori"],
      ctx: "JavaScript înregistrează declarațiile înainte să ruleze codul. `var` primește imediat valoarea `undefined`, iar `let` și `const` rămân neinițializate până la linia lor.",
      e: "`x` există de la început, fără valoare: `typeof x` dă „undefined”. `y` e în TDZ până la linia `let y`, iar chiar și `typeof` aruncă `ReferenceError` pe o variabilă din TDZ." },
    { id: "js-03", lvl: 2, q: "Ce afișează codul și cum obții `0 1 2`?", code: R`for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i));
}`, o: ["`3 3 3`; cu `let` în loc de `var`, fiecare iterație are propria variabilă", "`0 1 2`; callback-ul prinde valoarea lui `i` din momentul creării", "`3 3 3`; cu `const` în loc de `var`", "`0 0 0`; `setTimeout` rulează înaintea buclei"],
      ctx: "Un closure ține variabila, nu valoarea ei. `setTimeout` rulează callback-ul abia după ce bucla s-a terminat.",
      e: "`var i` e o singură variabilă pentru toată funcția. Când rulează callback-urile, bucla s-a terminat și `i` e 3. Cu `let`, fiecare iterație primește o variabilă nouă, deci callback-urile văd 0, 1 și 2." },
    { id: "js-04", lvl: 2, q: "De ce contorul nu crește și ce îl repară?", code: R`class Timer {
  seconds = 0;
  start() {
    setInterval(function () {
      this.seconds++;
    }, 1000);
  }
}`, o: ["`function` primește `this` de la cine o apelează (timerul), nu din clasă; o arrow function îl ia din `start()`", "Câmpul `seconds` e privat, iar `setInterval` nu are voie să-l modifice", "`setInterval` are nevoie de `await`, altfel callback-ul nu rulează", "`this.seconds++` nu merge pe câmpuri de clasă; trebuie `Timer.seconds`"],
      ctx: "`this` se stabilește la apel. Un callback dat unui timer nu e apelat ca metodă a lui `Timer`.",
      e: "Callback-ul e o funcție obișnuită, apelată de timer, deci `this` nu e instanța `Timer`: `this.seconds++` nu atinge câmpul ei. O arrow function nu are `this` propriu și îl ia din `start()`, unde `this` e instanța." },
    { id: "js-05", lvl: 1, q: "Ce afișează?", code: R`console.log(0 || 10, 0 ?? 10, null ?? 5);`, o: ["`10 0 5`", "`10 10 5`", "`0 0 5`", "`10 0 null`"],
      ctx: "`||` ia partea dreaptă când stânga e orice valoare falsy. `??` o ia doar când stânga e `null` sau `undefined`.",
      e: "`0 || 10` dă `10`, fiindcă `0` e falsy. `0 ?? 10` păstrează `0`, fiindcă `0` nu e nici `null`, nici `undefined`. `null ?? 5` dă `5`." },
    { id: "js-06", lvl: 2, q: "Ce afișează?", code: R`const a = [10, 9, 1];
const b = a.sort();
console.log(a, b === a);`, o: ["`[ 1, 10, 9 ] true`", "`[ 1, 9, 10 ] true`", "`[ 10, 9, 1 ] false`", "`[ 1, 9, 10 ] false`"],
      ctx: "`sort()` fără comparator convertește elementele în text și le compară ca text. Modifică array-ul pe loc.",
      e: "Ca text, „10” vine înaintea lui „9”, deci ordinea e `1, 10, 9`. `sort` modifică `a` pe loc și întoarce chiar `a`, deci `b === a` e `true`. Pentru ordine numerică: `a.sort((x, y) => x - y)`." },
    { id: "js-07", lvl: 3, q: "Cum rulează cele trei cereri și cum le rulezi deodată?", code: R`async function load() {
  const ids = [1, 2, 3];
  for (const id of ids) {
    await fetchUser(id);
  }
}`, o: ["Pe rând, fiecare după cea dinainte; `await Promise.all(ids.map(fetchUser))` le pornește deodată", "Deodată, fiindcă `await` doar pornește cererea", "Pe rând; `ids.forEach(async id => { await fetchUser(id); })` e varianta deodată, iar `load` așteaptă după ea", "Deodată, fiindcă `for...of` e asincron"],
      ctx: "`await` oprește funcția `async` până se termină promisiunea. O buclă cu `await` la fiecare pas pornește cererea următoare abia după ce s-a terminat cea dinainte.",
      e: "Fiecare `await` din buclă așteaptă răspunsul înainte de iterația următoare, deci cererile rulează pe rând (de 3 ori cât durează una). `Promise.all` pornește toate promisiunile deodată și așteaptă ultima." },
    { id: "js-08", lvl: 3, q: "Ce afișează?", code: R`class A {
  hi() { return "A"; }
}
const a = new A();
A.prototype.hi = () => "B";
console.log(a.hi());`, o: ["`B`", "`A`", "`TypeError`", "`undefined`"],
      ctx: "Metodele unei clase stau pe `A.prototype`, nu pe fiecare instanță. La `a.hi()`, JavaScript caută `hi` întâi pe `a`, apoi pe prototip.",
      e: "`a` nu are un `hi` propriu, deci căutarea urcă la `A.prototype`, unde metoda a fost înlocuită înainte de apel. Rezultatul e `B`. Metodele nu se copiază în instanță la `new`." }
  ]);

  O("js", [
    { id: "o-js-1", q: "Explică-mi ce e un closure și de ce o buclă cu `var` și `setTimeout` afișează de trei ori `3`.", k: [
      "Closure = o funcție împreună cu variabilele din locul unde a fost creată; ține variabilele, nu copii ale valorilor",
      "`var` e o singură variabilă pentru toată funcția: la rularea callback-urilor, bucla s-a terminat și `i` e 3",
      "`let` creează o variabilă nouă la fiecare iterație, deci callback-urile văd 0, 1, 2",
      "Același efect în React: un handler sau un `setInterval` din render-ul vechi vede state-ul vechi (stale closure)",
      "Alte soluții: o funcție factory sau un IIFE care primește valoarea"],
      model: "Un closure e o funcție împreună cu variabilele din locul unde a fost creată. Ține variabilele însele, nu copii ale valorilor, deci vede valoarea de la momentul apelului. La bucla cu `var` există o singură variabilă `i` pentru toată funcția. `setTimeout` rulează callback-urile după buclă, când `i` a ajuns la 3, deci toate afișează 3. Cu `let`, fiecare iterație primește o variabilă nouă și afișez 0, 1, 2. Același mecanism apare în React: un `setInterval` dintr-un effect cu `[]` vede state-ul din primul render. Îl repar cu forma funcțională a setter-ului sau cu dependențele corecte." },
    { id: "o-js-2", q: "Cum decide JavaScript ce e `this`, și ce se întâmplă când pasezi o metodă drept callback?", k: [
      "`this` depinde de cum e apelată funcția: `obj.f()` → `obj`; `f()` simplu → `undefined` în cod strict, obiectul global altfel",
      "O metodă extrasă (`const f = obj.m`) sau pasată drept callback pierde obiectul",
      "Reparații: `bind`, o arrow function sau un handler care apelează `obj.m()`",
      "Arrow function nu are `this` propriu: îl ia din codul din jur (de aceea merge într-un `setInterval` din interiorul unei metode)",
      "Clasele React vechi legau handler-ele în constructor; componentele-funcții n-au `this`"],
      model: "`this` nu depinde de locul unde e scrisă funcția, ci de cum e apelată. La `obj.f()` e `obj`. La un apel simplu `f()` e `undefined` în cod strict, deci în clase și module, și obiectul global altfel. Dacă extrag metoda sau o dau drept callback, nu mai e apelată pe obiect, deci pierde `this`. Repar cu `bind`, cu un handler care apelează `obj.m()` sau cu o arrow function, care nu are `this` propriu și îl ia din codul din jur. În clasele React vechi legam handler-ele în constructor. În componentele-funcții nu mai am `this`." },
    { id: "o-js-3", q: "Ai o listă de 20 de id-uri și trebuie să aduci câte un utilizator pentru fiecare. Cum scrii codul `async` și ce greșeli eviți?", k: [
      "`await` într-o buclă rulează cererile pe rând; pentru deodată: `Promise.all(ids.map(fetchUser))`",
      "`forEach(async …)` nu e așteptat: funcția se termină înainte de cereri, iar erorile rămân netratate",
      "`Promise.all` respinge la primul eșec, dar nu oprește celelalte cereri; `allSettled` când vrei toate rezultatele",
      "Limitezi concurența (loturi sau o bibliotecă), ca să nu trimiți 20.000 de cereri deodată",
      "Erorile: `try` / `catch` în jurul lui `await`; un `await` uitat lasă o promisiune, mereu truthy"],
      model: "Pentru cereri independente nu fac `await` în buclă, fiindcă rulează pe rând și durează de 20 de ori mai mult. Folosesc `await Promise.all(ids.map(fetchUser))`, care le pornește pe toate odată. Evit `forEach(async …)`: nu e așteptat, deci funcția se termină înainte de cereri, iar erorile rămân netratate. `Promise.all` respinge la primul eșec, dar nu oprește celelalte cereri, așa că, dacă vreau toate rezultatele, folosesc `allSettled`. La 20 de id-uri e în regulă, dar la 20.000 aș limita concurența, în loturi sau cu o bibliotecă. Erorile le prind cu `try` / `catch` în jurul lui `await`." }
  ]);

  // ---------- react (bazele; tichetul 03) ----------
  before({ id: "react", code: "RE", name: "React: bazele", short: "React bazele", p: 1, src: "Anunț + panel FE", fe: true });
  P.sheets.react = {
    lead: "Înainte de efecte și de memoizare, React se reduce la câteva reguli: o componentă e o funcție pură, state-ul se înlocuiește, nu se modifică, iar React decide ce re-randează după reguli simple. `frontend` pornește de la ele.",
    points: [
      "O componentă e o funcție pură de props și state: aceleași intrări dau același JSX, iar în timpul randării nu modifică nimic din ce exista înainte (variabile din afară, props, state). Props sunt read-only; `children` e un prop obișnuit. Poți modifica ce ai creat chiar în funcție. În dev, Strict Mode o apelează de două ori, ca să arate impuritățile.",
      "Un re-render vine din trei motive: state-ul componentei s-a schimbat, părintele a făcut re-render (copiii se re-randează cu el, chiar dacă props sunt la fel) sau s-a schimbat un Context pe care îl citește. O variabilă locală și `useRef` nu declanșează nimic. `useRef` ține valori care nu apar pe ecran și noduri DOM (`ref.current.focus()`).",
      "State-ul se înlocuiește cu o copie, nu se modifică: React compară valoarea nouă cu cea veche prin `Object.is`, iar același array sau obiect înseamnă „neschimbat”. `items.push(x); setItems(items)` nu actualizează ecranul; `setItems([...items, x])` da. Spread-ul copiază doar primul nivel. Un updater (`setN(n => n + 1)`) trebuie să fie pur.",
      "Un input controlat primește `value` din state și îl schimbă prin `onChange`; React îl forțează în DOM după fiecare tastă. `value` fără `onChange` îngheață câmpul. `value` rămâne mereu string: `undefined` sau `null` îl fac necontrolat. Necontrolat = `defaultValue` plus citire din DOM (`ref` sau `FormData`) la submit.",
      "Când două componente au nevoie de aceeași informație, state-ul urcă în cel mai apropiat părinte comun și coboară prin props, iar schimbarea urcă printr-un callback. Datele curg într-o singură direcție, în jos. Fiecare bucată de state are un singur proprietar; ce se poate calcula din state nu devine state separat.",
      "`useReducer` mută logica de actualizare într-o funcție pură `reducer(state, action)`; handler-ele doar fac `dispatch({ type })`. Reducer-ul întoarce o stare nouă, nu o modifică. Context duce o valoare prin arbore fără props intermediare; când `value` se schimbă (`Object.is`), toți consumatorii re-randează. Context transportă, nu ține state: acesta stă în `useState` sau `useReducer`.",
      "Un custom hook e o funcție al cărei nume începe cu `use` și care apelează alte hook-uri. Partajează logică, nu state: fiecare apel are state-ul lui. Două componente care folosesc `useCounter()` au două contoare. State-ul comun urcă în părinte sau trece prin Context. Regulile hook-urilor rămân valabile în interiorul lui.",
      "La fiecare render React compară arborele nou cu cel vechi, poziție cu poziție (reconcilierea). Același tip de componentă pe aceeași poziție păstrează state-ul; alt tip îl distruge (unmount) și îl creează de la zero. `key` face parte din identitate: `key={id}` resetează un formular, iar în liste urmărește elementul, nu poziția. O componentă definită în interiorul alteia e alt tip la fiecare render, deci își pierde state-ul."
    ],
    avoid: ["„Schimb variabila și React redesenează.”", "„`push` pe array-ul din state și apoi `setItems`.”", "„Custom hook-ul partajează state-ul între componente.”", "„Context e un state manager.”"]
  };

  Q("react", [
    { id: "re-01", lvl: 2, q: "Ce afișează `<StrictMode><Badge n={1} /></StrictMode>` în dev și ce e greșit?", code: R`let total = 0;
function Badge({ n }: { n: number }) {
  total += n;
  return <b>{total}</b>;
}`, o: ["`2`: React apelează componenta de două ori, iar randarea modifică `total` din afara funcției", "`1`: Strict Mode apelează componenta o singură dată", "`1`: `total` e resetat la fiecare apel", "`0`: `total` nu se poate modifica dintr-o componentă"],
      ctx: "O componentă trebuie să fie pură: nu modifică în timpul randării nimic din ce exista înainte de ea. În dev, Strict Mode apelează funcția de două ori ca să scoată la iveală asta.",
      e: "`total` e declarat în afara funcției, deci `total += n` e un efect lateral al randării. Strict Mode apelează componenta de două ori, iar `total` ajunge la 2. Varianta pură calculează din props: `<b>{n}</b>`." },
    { id: "re-02", lvl: 2, q: "Apeși butonul „q”. Ce componente se apelează din nou?", code: R`function Parent() {
  const [q, setQ] = useState("");
  const hits = useRef(0);
  return (
    <>
      <button onClick={() => setQ(q + "a")}>q</button>
      <button onClick={() => hits.current++}>h</button>
      <A />
      <B />
    </>
  );
}`, o: ["`Parent`, `A` și `B`: copiii se re-randează odată cu părintele, chiar fără props noi", "Doar `Parent`: `A` și `B` n-au primit props noi", "Doar `Parent` și `B`, fiindcă `A` n-are state", "Niciuna: `q` nu apare nicăieri în JSX"],
      ctx: "Un re-render pornește de la componenta al cărei state s-a schimbat și coboară în toți copiii ei. Butonul „h” modifică doar o ref.",
      e: "`setQ` schimbă state-ul lui `Parent`, deci React îl apelează din nou, iar odată cu el pe `A` și `B`, indiferent de props. `hits.current++` (butonul „h”) nu declanșează nimic: ref-ul nu e state." },
    { id: "re-03", lvl: 1, q: "Apeși butonul, iar lista de pe ecran rămâne goală. De ce?", code: R`const [items, setItems] = useState<string[]>([]);
const add = (x: string) => {
  items.push(x);
  setItems(items);
};`, o: ["Array-ul e același: `Object.is` îl vede neschimbat, deci React sare peste re-render", "`setItems` e asincron și actualizează la click-ul următor", "`push` întoarce lungimea, nu array-ul, deci state-ul devine un număr", "`items` ar trebui declarat cu `let`, nu cu `const`"],
      ctx: "React decide dacă state-ul s-a schimbat comparând valoarea nouă cu cea veche prin `Object.is`, adică după referință.",
      e: "`push` modifică array-ul existent, iar `setItems(items)` îi dă lui React aceeași referință. `Object.is(items, items)` e `true`, deci nu se întâmplă re-render. Corect: `setItems([...items, x])`, un array nou." },
    { id: "re-04", lvl: 1, q: "Ce se întâmplă când tastezi în câmp?", code: R`const [name, setName] = useState("");
return <input value={name} />;`, o: ["Textul nu apare: `value` îl forțează la `\"\"`, iar React avertizează în consolă", "Textul apare, dar `name` rămâne `\"\"`", "Textul apare și `name` se actualizează singur", "Componenta aruncă o eroare și dispare din pagină"],
      ctx: "Cu `value`, inputul e controlat: React îi impune valoarea din state după fiecare tastă.",
      e: "Fără `onChange`, state-ul nu se schimbă niciodată, iar React readuce câmpul la `\"\"` după fiecare tastă. Consola spune că e un câmp read-only; îl repari cu `onChange={e => setName(e.target.value)}` sau, pentru un câmp necontrolat, cu `defaultValue`." },
    { id: "re-05", lvl: 2, q: "`Filter` și `List` sunt frați. Filtrul scrie „ro”, dar lista nu se filtrează. Ce schimbi?", code: R`function Filter() {
  const [q, setQ] = useState("");
  return <input value={q}
    onChange={e => setQ(e.target.value)} />;
}
function List({ items }: { items: string[] }) {
  const [q] = useState("");
  return <ul>{items.filter(x => x.includes(q))
    .map(x => <li key={x}>{x}</li>)}</ul>;
}`, o: ["Muți `q` în părintele comun și îl dai ambelor componente prin props, plus `setQ` către `Filter`", "Pui un `useEffect` în `List` care copiază valoarea din `Filter`", "Ții `q` într-o variabilă din afara componentelor, ca să o vadă amândouă", "Faci `List` cu `memo`, ca să se actualizeze la orice schimbare"],
      ctx: "Fiecare `useState` creează o variabilă separată. Cele două `q` n-au nicio legătură între ele.",
      e: "State-ul e duplicat: `Filter` își schimbă `q`-ul, iar `List` are altul, mereu gol. Informația comună urcă în cel mai apropiat părinte, care o pasează în jos și primește schimbarea printr-un callback. Datele curg într-un singur sens." },
    { id: "re-06", lvl: 3, q: "Ce se întâmplă la `dispatch({ type: \"add\", item: \"x\" })`?", code: R`function reducer(state: State, a: Act) {
  if (a.type === "add") {
    state.items.push(a.item);
    return state;
  }
  return state;
}`, o: ["Ecranul rămâne neschimbat: întoarce aceeași referință, iar React vede „neschimbat”", "Ecranul se actualizează cu `x`, fiindcă reducer-ul rulează la `dispatch`", "Aruncă eroare: un reducer nu poate modifica `state`", "Ecranul se actualizează cu `x` de două ori"],
      ctx: "Reducer-ul primește starea veche și o acțiune și întoarce starea nouă. React compară rezultatul cu starea veche prin `Object.is`.",
      e: "Reducer-ul modifică starea pe loc și întoarce același obiect, deci `Object.is` zice că nimic nu s-a schimbat și ecranul rămâne la fel. Nu aruncă nicio eroare. Reducer-ul trebuie să fie pur: `return { ...state, items: [...state.items, a.item] }`." },
    { id: "re-07", lvl: 1, q: "Apeși „+” din `A`. Ce arată `B`?", code: R`function useCounter() {
  const [n, setN] = useState(0);
  return { n, inc: () => setN(x => x + 1) };
}
function A() {
  const c = useCounter();
  return <button onClick={c.inc}>{c.n}</button>;
}
function B() {
  const c = useCounter();
  return <span>{c.n}</span>;
}`, o: ["`0`: fiecare apel al hook-ului are state-ul lui", "`1`: hook-ul partajează state-ul între componente", "`1`, dar abia după ce părintele se re-randează", "O eroare: un hook nu poate fi apelat în două componente"],
      ctx: "Un custom hook e o funcție care apelează alte hook-uri. State-ul stă în componenta care îl apelează, nu în hook.",
      e: "Fiecare `useCounter()` apelează propriul `useState`, deci `A` și `B` au câte un contor. Un custom hook partajează logica, nu valorile. Pentru un contor comun, state-ul urcă în părinte sau trece printr-un Context." },
    { id: "re-08", lvl: 3, q: "Scrii „ana” în formular și apeși „Înregistrare”. Ce arată câmpul și cum îl golești?", code: R`function Auth({ mode }: { mode: string }) {
  return mode === "login"
    ? <Form />
    : <Form />;
}`, o: ["„ana” rămâne: același tip pe aceeași poziție păstrează state-ul; `<Form key={mode} />` îl golește", "Câmpul se golește, fiindcă ramura a doua e alt element", "Câmpul se golește, fiindcă `mode` s-a schimbat și `Form` primește props noi", "„ana” rămâne; singura soluție e un `useEffect` care golește câmpul"],
      ctx: "React compară arborele nou cu cel vechi, poziție cu poziție. State-ul aparține unui tip de componentă aflat la o poziție.",
      e: "Ambele ramuri sunt `<Form />` pe aceeași poziție, deci React păstrează componenta și state-ul ei. O cheie diferită face din ea o componentă nouă: `key={mode}` distruge `Form` și montează altul, cu state-ul gol." }
  ]);

  O("react", [
    { id: "o-re-1", q: "Ai o pagină cu un filtru și o listă, iar filtrul trebuie să schimbe lista. Cum structurezi componentele și ce se re-randează la fiecare tastă?", k: [
      "State-ul stă în părintele comun, nu duplicat în frați: `value` și `onChange` coboară în `Filter`, lista filtrată în `List`",
      "Lista filtrată se calculează în render din state, nu devine state separat",
      "Inputul e controlat: `value={q}` plus `onChange`; fără `onChange`, câmpul îngheață",
      "La fiecare tastă `setQ` re-randează părintele și, odată cu el, ambii copii (props noi sau nu)",
      "Dacă lista e grea: memoizare sau `useDeferredValue`, după ce măsori"],
      model: "Pun state-ul `q` în părintele comun al lui `Filter` și `List`. `Filter` primește `value` și `onChange`, deci inputul e controlat: sursa adevărului e state-ul, nu DOM-ul. `List` primește lista deja filtrată, pe care o calculez în render din `q`, fără s-o țin ca state separat. La fiecare tastă `setQ` re-randează părintele și, odată cu el, copiii. Dacă lista e mare, măsor cu Profiler și abia apoi memoizez sau amân filtrarea cu `useDeferredValue`." },
    { id: "o-re-2", q: "Un coleg scrie `items.push(x); setItems(items)`, iar lista nu se actualizează. Explică de ce și cum repari.", k: [
      "React compară state-ul nou cu cel vechi prin `Object.is`: același array înseamnă „neschimbat”",
      "Reparația: o copie nouă, `setItems([...items, x])`, `filter`, `map`, `{ ...o, câmp }`",
      "Spread-ul copiază doar primul nivel; la state imbricat copiezi și nivelul pe care îl schimbi",
      "Un updater (`setItems(prev => [...prev, x])`) e pur și se aplică în ordine; Strict Mode îl apelează de două ori în dev",
      "Aceeași regulă la `useReducer`: reducer-ul întoarce o stare nouă, nu o modifică"],
      model: "React nu urmărește modificările din interiorul unui obiect. La `setItems` compară valoarea nouă cu cea veche prin `Object.is`, adică după referință. `push` modifică array-ul existent, iar eu îi dau aceeași referință, deci React crede că nu s-a schimbat nimic și sare peste re-render. Repar cu o copie: `setItems([...items, x])` sau, dacă depinde de valoarea precedentă, `setItems(prev => [...prev, x])`. Spread-ul copiază doar primul nivel, deci la un obiect imbricat copiez și nivelul pe care îl modific. Aceeași regulă e valabilă într-un reducer: întoarce o stare nouă și nu o modifică." },
    { id: "o-re-3", q: "Un formular de editare arată textul vechi când treci de la un utilizator la altul. De ce se întâmplă și cum repari?", k: [
      "Reconcilierea: același tip de componentă pe aceeași poziție păstrează state-ul; alt tip îl distruge",
      "Reparația: `<EditForm key={user.id} />`, o cheie nouă distruge și remontează componenta",
      "Alternativa: state-ul ridicat în părinte și controlat prin props, dacă datele trebuie păstrate",
      "O componentă definită în interiorul alteia e alt tip la fiecare render, deci își pierde state-ul",
      "Un `useEffect` care resetează state-ul la schimbarea prop-ului e varianta mai slabă: un render în plus cu valoarea veche"],
      model: "React compară arborele nou cu cel vechi, poziție cu poziție. Dacă pe aceeași poziție e același tip de componentă, o păstrează, iar state-ul ei rămâne, de aceea formularul arată textul vechi. Repar cu o cheie: `<EditForm key={user.id} />`. O cheie nouă înseamnă o componentă nouă, deci React distruge formularul vechi și îl montează pe cel nou, cu state-ul gol. Un `useEffect` care resetează state-ul ar merge, dar adaugă un render cu valorile vechi. Atenție și la componentele definite în interiorul altora: sunt alt tip la fiecare render, deci își pierd state-ul mereu." }
  ]);

  // ---------- fedebug (depanare frontend; tichetul 04) ----------
  P.modules.splice(P.modules.findIndex(m => m.id === "frontend") + 1, 0, { id: "fedebug", code: "FD", name: "Depanare frontend", short: "Depanare FE", p: 1, src: "Anunț + panel FE", fe: true });
  P.sheets.fedebug = {
    lead: "La un interviu de frontend ți se dă adesea cod stricat și ți se cere să-l repari cu voce tare. Contează procesul: citești eroarea, restrângi cauza, verifici ipoteza și abia apoi umbli la cod.",
    points: [
      "Un proces fix: reproduc bug-ul (pași, date, browser), îl izolez (scot cod până rămâne minimul), formulez o ipoteză, o verific cu un experiment (breakpoint sau log), repar și scriu un test de regresie care pică fără reparație. Citești întâi eroarea, nu ghicești.",
      "Un mesaj de eroare se citește întreg, apoi stack trace-ul de sus în jos: primul rând din codul tău arată locul. `Cannot read properties of undefined (reading 'x')` înseamnă că valoarea dinaintea punctului e `undefined`, nu `x`. `x is not a function` înseamnă că `x` nu e funcție. Source maps leagă codul minificat de sursa originală, dacă build-ul le generează și serverul le servește.",
      "`debugger;` oprește execuția la acea linie cât timp DevTools e deschis. Un breakpoint condițional se oprește doar când condiția e adevărată, iar „pause on exceptions” oprește chiar la linia care aruncă. Un logpoint scrie în consolă fără să modifici codul. `console.table` afișează un array de obiecte ca tabel. În CoderPad nu te bazezi pe DevTools: pregătește-te cu `console.log` cu etichetă.",
      "Tab-ul Network arată pentru fiecare cerere statusul (200, 4xx, 5xx sau `CORS error`), payload-ul trimis și răspunsul primit. O cerere către alt origin cu `Content-Type: application/json` sau cu un header propriu face browserul să trimită întâi un preflight `OPTIONS`; serverul trebuie să răspundă cu `Access-Control-Allow-Origin`, `-Methods` și `-Headers`. Postman și curl nu aplică CORS: îl aplică doar browserul.",
      "React DevTools are tab-ul Components (props și state pe fiecare componentă) și Profiler (înregistrezi randările și cât durează). `Too many re-renders` vine dintr-un `setState` necondiționat în render, de obicei `onClick={f()}` în loc de `onClick={f}`. Un effect fără array de dependențe care setează state intră într-o buclă; React avertizează cu `Maximum update depth exceeded`.",
      "Un error boundary e o componentă-clasă cu `getDerivedStateFromError` (sau pachetul `react-error-boundary`) care arată un fallback când un copil aruncă la randare. Nu prinde erorile din event handlers, din cod asincron (`setTimeout`, promisiuni), din SSR sau din el însuși. Acolo folosești `try` / `catch`, `.catch` și, ca plasă de siguranță, evenimentul `unhandledrejection`."
    ],
    avoid: ["„Pun `console.log` peste tot și mă uit.”", "„Error boundary-ul prinde orice eroare.”", "„Merge în Postman, deci problema e în browser.”", "„TypeScript a compilat, deci răspunsul de la API are forma asta.”"]
  };

  Q("fedebug", [
    { id: "fd-01", lvl: 1, q: "Mesajul e `TypeError: Cannot read properties of undefined (reading 'name')`. Ce e `undefined`?", code: R`const label = user.profile.name;`, o: ["`user.profile`: eroarea citește `name` dintr-o valoare `undefined`", "`name`: proprietatea nu există pe obiect", "`user`: altfel obiectul din care se citește ar fi fost `user`", "Nu poți ști fără să rulezi codul cu un breakpoint"],
      ctx: "Mesajul numește proprietatea pe care codul a încercat s-o citească, nu valoarea care lipsește. Valoarea lipsă e cea din fața punctului.",
      e: "`reading 'name'` spune că `name` s-a citit dintr-o valoare `undefined`. Valoarea din fața lui `.name` e `user.profile`. Dacă `user` ar fi fost `undefined`, mesajul ar fi spus `reading 'profile'`." },
    { id: "fd-02", lvl: 2, q: "Pagina e pe alt origin decât API-ul. Ce apare în Network înainte de POST?", code: R`void fetch("https://api.x.ro/items", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ n: 1 }),
});`, o: ["O cerere `OPTIONS` (preflight): `application/json` nu e un `Content-Type` permis fără verificare", "Nimic: un POST e întotdeauna o cerere simplă", "Un GET de verificare către același URL", "Preflight apare doar dacă adaugi `credentials: \"include\"`"],
      ctx: "Browserul trimite cereri simple direct. Pentru celelalte întreabă mai întâi serverul dacă are voie, cu o cerere `OPTIONS`.",
      e: "O cerere e simplă doar cu `GET`, `HEAD` sau `POST`, cu headere obișnuite și cu `Content-Type` de tip `text/plain`, `multipart/form-data` sau `application/x-www-form-urlencoded`. `application/json` iese din listă, deci browserul trimite întâi `OPTIONS`, iar serverul trebuie să răspundă cu `Access-Control-Allow-*`." },
    { id: "fd-03", lvl: 1, q: "Ce se întâmplă la click pe buton?", code: R`<ErrorBoundary fallback={<p>Eroare</p>}>
  <button onClick={() => {
    throw new Error("x");
  }}>
    Salvează
  </button>
</ErrorBoundary>`, o: ["Fallback-ul nu apare: boundary-ul nu prinde erorile din handlere, iar eroarea ajunge în consolă", "Apare fallback-ul `Eroare`", "Pagina rămâne albă, fiindcă React demontează tot arborele", "Apare fallback-ul, dar abia după următorul re-render"],
      ctx: "Un error boundary prinde erorile aruncate de copii în timpul randării. Un handler rulează mai târziu, la click.",
      e: "Documentația React spune că error boundaries nu prind erorile din event handlers (nici din cod asincron, SSR sau din boundary însuși). Handlerul rulează după randare, deci eroarea ajunge în consolă, iar UI-ul rămâne cum era. În handler folosești `try` / `catch`." },
    { id: "fd-04", lvl: 1, q: "Stack trace-ul arată `main.4f2a.js:1:48210`. Cum ajungi la rândul din codul tău?", o: ["Cu source maps: build-ul generează fișierele `.map`, iar DevTools arată sursa originală", "Cu „pretty print” în Sources: formatează codul și revine la sursa originală", "Pui `debugger;` în bundle și cauți rândul 1, coloana 48210", "Dezactivezi minificarea în producție: nu există altă cale"],
      ctx: "Codul de producție e minificat, adică tot pe un singur rând, cu nume scurte. Browserul rulează acel cod, nu sursa ta.",
      e: "Un source map leagă fișierul minificat de fișierele originale. DevTools îl găsește prin comentariul `//# sourceMappingURL`, iar stack trace-urile, erorile și breakpoint-urile apar apoi în codul scris de tine. Build-ul trebuie să genereze `.map`, iar serverul să-l servească." }
  ]);

  O("fedebug", [
    { id: "o-fd-1", q: "Contorul se oprește la 1. Ce nu merge, de ce și cum repari?", code: R`function Timer() {
  const [n, setN] = useState(0);
  useEffect(() => {
    setInterval(() => {
      setN(n + 1);
    }, 1000);
  }, []);
  return <b>{n}</b>;
}`, k: [
      "Simptom: contorul ajunge la 1 și rămâne acolo",
      "Cauză: callback-ul prinde `n` din primul render (`n` = 0), iar efectul cu `[]` nu rulează iar, deci setează mereu 1 (stale closure)",
      "Reparație: `setN(x => x + 1)`, care nu depinde de `n` din render",
      "Al doilea defect: lipsește cleanup-ul, intervalul rămâne după unmount și în Strict Mode rulează două; `return () => clearInterval(id)`",
      "Cum verific: un log în callback sau fake timers într-un test"],
      model: "Simptomul e că `n` ajunge la 1 și apoi nu mai crește. Cauza e un closure vechi: callback-ul din `setInterval` a fost creat în primul render, unde `n` e 0, iar efectul are `[]` ca dependențe, deci nu e recreat. De fiecare dată setează `0 + 1`. Repar cu un updater, `setN(x => x + 1)`, care nu citește `n` din render. Mai e un defect: intervalul nu e oprit niciodată. Salvez id-ul și întorc `() => clearInterval(id)`, altfel rămâne după unmount și în Strict Mode rulează de două ori." },
    { id: "o-fd-2", q: "Pagina cade cu eroare. Ce nu merge, de ce și cum repari?", code: R`function Counter() {
  const [n, setN] = useState(0);
  setN(n + 1);
  return <b>{n}</b>;
}`, k: [
      "Simptom: eroarea „Too many re-renders. React limits the number of renders to prevent an infinite loop.”",
      "Cauză: `setN` apelat necondiționat în timpul randării: render → setState → render nou, la nesfârșit",
      "Reparație: starea se schimbă într-un handler sau într-un effect, nu în corpul componentei; ce se poate calcula se calculează direct",
      "Varianta clasică: `onClick={inc()}` în loc de `onClick={inc}`, care apelează funcția la render",
      "Cum verific: stack trace-ul din consolă arată apelul lui `setN`"],
      model: "Eroarea e „Too many re-renders”: React taie bucla ca să nu înghețe pagina. Cauza e că apelez `setN` direct în corpul componentei, deci fiecare render cere alt render. Starea se schimbă în răspuns la un eveniment: o mut într-un handler, de pildă `onClick={() => setN(n + 1)}`, sau într-un effect dacă e sincronizare cu exteriorul. Aceeași eroare apare când scriu `onClick={inc()}`: funcția se apelează la randare, nu la click. Mă uit în stack trace la apelul lui `setN` ca să găsesc linia." },
    { id: "o-fd-3", q: "Tab-ul Network arată zeci de cereri pe secundă. Ce nu merge, de ce și cum repari?", code: R`function Feed({ id }: P) {
  const [res, setRes] = useState({});
  useEffect(() => {
    fetch("/api/" + id)
      .then(r => r.json())
      .then(d => setRes(d));
  });
  return (
    <pre>{JSON.stringify(res)}</pre>
  );
}`, k: [
      "Simptom: aceeași cerere se repetă la nesfârșit, iar CPU-ul și rețeaua urcă",
      "Cauză: fără array de dependențe efectul rulează după fiecare render, iar `setRes(d)` cu un obiect nou produce alt render",
      "Reparație: dependențe `[id]`, ca efectul să ruleze doar când se schimbă `id`",
      "Răspunsurile vechi pot suprascrie unul nou: flag `ignore` sau `AbortController` în cleanup",
      "Cum verific: Network și un `console.log` în effect; sau TanStack Query în locul fetch-ului manual"],
      model: "Efectul nu are array de dependențe, deci rulează după fiecare render. Fiecare răspuns face `setRes` cu un obiect nou, ceea ce produce un render, care rulează efectul, care face altă cerere. Din asta văd în Network cereri la nesfârșit. Repar cu `[id]`, ca efectul să ruleze doar când se schimbă `id`. Adaug și cleanup cu `AbortController` sau un flag `ignore`, ca un răspuns întârziat să nu-l suprascrie pe cel nou. În proiect aș folosi TanStack Query, care se ocupă de asta." },
    { id: "o-fd-4", q: "Butonul adaugă elemente, dar contorul rămâne la 1. Ce nu merge, de ce și cum repari?", code: R`function Todos() {
  const [l, setL] = useState(["a"]);
  const add = () => {
    l.push("nou");
    setL(l);
  };
  return (
    <button onClick={add}>
      {l.length}
    </button>
  );
}`, k: [
      "Simptom: la click nimic nu se schimbă pe ecran",
      "Cauză: `push` modifică același array, iar `setL(l)` dă aceeași referință; `Object.is` zice „neschimbat”, deci nu se re-randează",
      "Reparație: o copie, `setL([...l, \"nou\"])`",
      "De ce pare intermitent: elementul din array există în memorie și apare la un alt render",
      "Cum verific: Components din React DevTools arată state-ul, iar un log arată că funcția rulează"],
      model: "Handlerul rulează, dar ecranul nu se schimbă. `push` modifică array-ul existent, iar `setL(l)` îi dă lui React aceeași referință. React compară cu `Object.is`, vede același array și nu re-randează. Repar cu o copie: `setL([...l, \"nou\"])`. Bug-ul pare ciudat, fiindcă elementul chiar e în array și apare la un alt render. Pentru verificare mă uit în Components la state sau pun un log, care arată că funcția rulează." },
    { id: "o-fd-5", q: "După ce ștergi primul rând, textul tastat apare pe alt rând. Ce nu merge, de ce și cum repari?", code: R`function Rows({ rows }: Props) {
  return rows.map((r, i) => (
    <li key={i}>
      <input defaultValue={r.name} />
    </li>
  ));
}`, k: [
      "Simptom: ștergi „Ana”, iar textul tastat în ea rămâne în primul input, care acum e rândul „Dan”",
      "Cauză: `key={i}` identifică poziția, nu elementul; React păstrează componenta de pe poziția 0, cu tot state-ul ei",
      "Reparație: un `key` stabil din date, `key={r.id}`",
      "`Math.random()` ca key e greșit: recreează elementele la fiecare render",
      "Cum verific: în React DevTools văd key-urile; reordonez lista și urmăresc inputurile"],
      model: "Cu `key={i}`, cheia e poziția în listă. Când șterg primul rând, rândul „Dan” ajunge pe poziția 0, iar React crede că e aceeași componentă ca înainte și îi păstrează inputul cu textul tastat. Repar cu un key stabil luat din date, `key={r.id}`: așa React urmărește elementul, nu poziția. Nu folosesc `Math.random()`, fiindcă schimbă cheia la fiecare render și recreează tot." },
    { id: "o-fd-6", q: "Pe ecran apare un `0` ciudat. Ce nu merge, de ce și cum repari?", code: R`function Cart({ count }: P) {
  return (
    <div>
      {count && <Badge n={count} />}
    </div>
  );
}`, k: [
      "Simptom: când `count` e 0, apare cifra `0` în loc de nimic",
      "Cauză: `0 && x` dă `0`, nu `false`, iar React afișează numerele (`false`, `null` și `undefined` nu apar)",
      "Reparație: o condiție booleană, `count > 0 && <Badge … />`, sau un ternar cu `null`",
      "TypeScript nu prinde asta: un număr e valid ca nod în JSX",
      "Cum verific: un test cu `count = 0` care caută textul `0`"],
      model: "`count && <Badge />` dă `0` când `count` e 0, fiindcă `&&` întoarce primul operand falsy. React nu afișează `false`, `null` sau `undefined`, dar afișează numerele, deci apare un `0` pe ecran. Repar cu o condiție booleană: `count > 0 && <Badge n={count} />` sau `count ? <Badge … /> : null`. TypeScript nu avertizează, pentru că un număr e un nod valid. Un test cu `count = 0` prinde asta." },
    { id: "o-fd-7", q: "Un utilizator `guest` primește „ok”. Ce nu merge, de ce și cum repari?", code: R`async function isAdmin(id) {
  const u = await getUser(id);
  return u.role === "admin";
}
async function guard(id) {
  if (isAdmin(id)) {
    return "ok";
  }
  return "denied";
}`, k: [
      "Simptom: toți utilizatorii trec de verificare, inclusiv cei fără drepturi",
      "Cauză: lipsește `await`; `isAdmin(id)` întoarce o promisiune, iar o promisiune e mereu truthy",
      "Reparație: `if (await isAdmin(id))`",
      "TypeScript prinde cazul: eroarea TS2801, „This condition will always return true since this 'Promise<boolean>' is always defined”",
      "Cum verific: `console.log(isAdmin(id))` arată `Promise { <pending> }`"],
      model: "`isAdmin` e `async`, deci întoarce o promisiune, iar în `guard` o folosesc fără `await`. O promisiune e un obiect, deci mereu truthy, iar condiția trece pentru oricine. E și o problemă de securitate. Repar cu `if (await isAdmin(id))`. În TypeScript, compilatorul avertizează cu TS2801 că o condiție pe o promisiune e mereu adevărată. Dacă nu am TypeScript, un `console.log(isAdmin(id))` arată `Promise { <pending> }`." },
    { id: "o-fd-8", q: "Aplicația aruncă o eroare la `addAll`. Ce nu merge, de ce și cum repari?", code: R`class Cart {
  items = [];
  add(x) {
    this.items.push(x);
  }
  addAll(list) {
    list.forEach(this.add);
  }
}
new Cart().addAll(["a"]);`, k: [
      "Simptom: `TypeError: Cannot read properties of undefined (reading 'items')`",
      "Cauză: `this.add` e pasată drept callback, fără obiect; `forEach` o apelează ca funcție simplă, iar în clasă `this` e `undefined`",
      "Reparație: `list.forEach(x => this.add(x))`, sau `this.add.bind(this)`, sau metodă-arrow: `add = (x) => { … }`",
      "Cum verific: un log `console.log(this)` la începutul metodei",
      "Aceeași greșeală apare la handlere de click în clase React vechi"],
      model: "Eroarea spune că citesc `items` dintr-un `undefined`, deci `this` e `undefined`. `this` depinde de cum e apelată funcția: când pasez `this.add` drept callback, `forEach` o apelează ca funcție simplă, fără obiect, iar în codul unei clase `this` e `undefined`. Repar cu o arrow function, `x => this.add(x)`, care ia `this` din jur, sau cu `bind(this)`. Un `console.log(this)` la începutul metodei confirmă ipoteza." },
    { id: "o-fd-9", q: "Se afișează de trei ori același număr. Ce nu merge, de ce și cum repari?", code: R`for (var i = 0; i < 3; i++) {
  setTimeout(() => {
    console.log("tab", i);
  }, 0);
}`, k: [
      "Simptom: apare `tab 3` de trei ori, nu `tab 0`, `tab 1`, `tab 2`",
      "Cauză: `var i` e o singură variabilă pentru toată funcția; callback-urile rulează după buclă, când `i` e 3 (closure peste variabilă, nu peste valoare)",
      "Reparație: `let i`, care creează o variabilă nouă la fiecare iterație",
      "Alternativă: o funcție care primește valoarea ca parametru",
      "Cum verific: un log în buclă și unul în callback, ca să văd ordinea"],
      model: "`var` are scope de funcție, deci există un singur `i`. `setTimeout` rulează callback-urile după ce bucla s-a terminat, când `i` e 3, iar toate trei citesc aceeași variabilă. Repar cu `let i`: fiecare iterație primește o variabilă nouă cu valoarea ei. O alternativă e să trec valoarea ca parametru. Ordinea o văd punând un log în buclă și unul în callback." },
    { id: "o-fd-10", q: "TypeScript compilează fără erori, dar aplicația crapă la runtime. Ce nu merge, de ce și cum repari?", code: R`type User = {
  name: { first: string };
};
async function load() {
  const res = await fetch("/api/me");
  const data = await res.json();
  const u = data as User;
  return u.name.first;
}`, k: [
      "Simptom: `TypeError: Cannot read properties of undefined (reading 'first')` deși `tsc` e curat",
      "Cauză: `as User` e o asertare, nu o validare; tipurile dispar la runtime, iar serverul a trimis alt format (de pildă fără `name`)",
      "Reparație: tratezi răspunsul ca `unknown` și îl validezi (type guard sau zod) înainte să-l folosești",
      "Prevenție: tipuri generate din OpenAPI-ul FastAPI și teste de contract",
      "Cum verific: Network, tab-ul Response, ca să văd ce a venit de fapt"],
      model: "Compilatorul a acceptat `data as User`, fiindcă `res.json()` dă `any`, iar `as` doar afirmă un tip, nu îl verifică. La runtime serverul a trimis alt format, fără `name`, deci `u.name` e `undefined` și `.first` aruncă. Repar tratând răspunsul ca `unknown` și validându-l la graniță, cu un type guard sau cu zod. Ca să previn, generez tipurile din OpenAPI-ul FastAPI. Ca să verific, mă uit în Network, în Response, la ce a venit de fapt." },
    { id: "o-fd-11", q: "Un utilizator scrie: „Pagina cu comenzi nu merge.” Cum depanezi?", k: [
      "Reproduc: pașii exacți, contul, datele, browserul; fără reproducere nu repar, ghicesc",
      "Citesc eroarea întreagă și stack trace-ul; primul rând din codul meu arată locul",
      "Izolez: în Network văd dacă cererea a plecat, ce status are și ce payload; frontend sau backend?",
      "Formulez o ipoteză și o verific cu un experiment (breakpoint, log cu etichetă, un test mic), nu o presupun adevărată",
      "Repar și scriu un test de regresie care pică fără reparație; verific și cazurile vecine"],
      model: "Întâi reproduc: cer pașii, contul și browserul și încerc să obțin același rezultat. Apoi citesc eroarea din consolă, tot mesajul și stack trace-ul, și caut primul rând din codul meu. Mă uit în Network: dacă cererea a plecat, ce status are și ce a venit în răspuns, ca să văd dacă problema e în frontend sau în backend. Formulez o singură ipoteză și o verific cu un breakpoint sau un log, nu o iau drept adevărată. Când o confirm, repar și scriu un test de regresie care pică fără reparație. La final verific și cazurile apropiate." },
    { id: "o-fd-12", q: "O cerere merge în Postman, dar în browser pică. Cum investighezi?", k: [
      "Network: statusul arată `CORS error` sau un cod HTTP? Ce cerere a plecat, OPTIONS sau cea reală?",
      "Preflight: `Content-Type: application/json` sau headere proprii declanșează `OPTIONS`; serverul răspunde cu `Access-Control-Allow-Origin`, `-Methods` și `-Headers`",
      "Postman și curl nu aplică CORS: e o regulă a browserului, de aceea merge acolo",
      "Cu `credentials: \"include\"`, `Access-Control-Allow-Origin` nu poate fi `*`, iar serverul cere `Access-Control-Allow-Credentials: true`",
      "Reparația stă pe server (în FastAPI, `CORSMiddleware`) sau într-un proxy de dev, nu în frontend"],
      model: "Postman nu aplică CORS, deci faptul că merge acolo nu spune nimic despre browser. Deschid Network: dacă statusul e `CORS error`, caut cererea `OPTIONS` (preflight), pe care browserul o trimite pentru `Content-Type: application/json` sau pentru headere proprii. Verific dacă serverul răspunde cu `Access-Control-Allow-Origin`, `Allow-Methods` și `Allow-Headers`. Dacă folosesc cookie-uri, `credentials: \"include\"` cere un origin explicit, nu `*`, plus `Access-Control-Allow-Credentials: true`. Reparația se face pe server, de pildă cu `CORSMiddleware` în FastAPI." }
  ]);
})(window.PREP);
