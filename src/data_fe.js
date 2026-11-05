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
}`, o: ["Ecranul rămâne neschimbat: întoarce aceeași referință, iar React vede „neschimbat”", "Ecranul se actualizează cu `x`, fiindcă reducer-ul rulează la `dispatch`", "Aruncă eroare: un reducer nu poate modifica `state`", "Ecranul se actualizează, dar abia la `dispatch`-ul următor"],
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
})(window.PREP);
