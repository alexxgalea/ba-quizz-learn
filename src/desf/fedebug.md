<!-- Desfășurările fișei `fedebug` (6 puncte; exemple JS rulate de tools/desf_examples.mjs în Node 22, un exemplu TS trecut prin tsc --strict, TSX verificat de mână în vitest cu react 19.3 și jsdom: tichetul 04). Format frontend: 90–140 de cuvinte, ~250 la `Greu: da`, exemplu ≤ 14 rânduri, Pas cu pas ≤ 8 rânduri. Format și reguli: lib.mjs (checkDesf, DESF_LIMITS_FE), .scratch/frontend-extins/spec.md. Faptele: research/interview-facts.md, secțiunea 45. -->

### harta

Problema: La un interviu de frontend primești cod care nu merge și ți se cere să-l repari cu voce tare. Cine începe să schimbe linii la întâmplare pierde timp și pare nesigur. Cine are un proces calm îl arată imediat. Modulul are două părți: întâi procesul și uneltele (eroarea, stack trace-ul, DevTools, Network, React DevTools), apoi capcanele după care se recunosc bug-urile clasice. Snippet-urile stricate din acest modul sunt carduri orale: spui ce nu merge, de ce și cum repari.

Grupuri:
- 1: procesul de depanare
- 2–3: citirea erorii și oprirea codului (stack trace, source maps, breakpoints)
- 4: ce vezi în Network (status, payload, CORS)
- 5–6: React: DevTools, bucle de randare, error boundaries

### 1

Greu: da
Problema: Un coleg spune că „pagina cu comenzi nu merge”. Începi să comentezi linii și să schimbi lucruri, iar după o oră nu mai știi ce ai modificat și dacă problema a dispărut.
Ideea: Depanarea are cinci pași. Reproduci bug-ul: aceiași pași, același cont, același browser. Îl izolezi: scoți cod până rămâne minimul care îl produce. Formulezi o ipoteză, una singură, care se poate dovedi falsă. O verifici cu un experiment: un breakpoint, un log cu etichetă, un test mic. Repari și scrii un test de regresie, adică un test care pică fără reparație și rămâne în proiect. Eroarea o citești înainte de orice altceva.
Exemplu:
```tsx
// ✗ ghicești și treci mai departe
console.log(user);
// ✓ test de regresie
test("fără name nu crapă", () => {
  render(<Card user={{ id: 1 }} />);
  expect(screen.getByText("—"))
    .toBeTruthy();
});
```
Pas cu pas:
```text
1 reproduc: pași, cont, browser
2 izolez: scot cod, rămâne minimul
3 ipoteză: una, care se poate dovedi
4 verific: breakpoint, log, test
5 repar + test de regresie
```
Legătură: FE-06 și FE-08 sunt bug-uri de efecte pe care le găsești cu acest proces. În Python, un test `pytest` scris înainte de reparație joacă același rol.

### 2

Greu: da
Problema: Consola spune `Cannot read properties of undefined (reading 'name')`. Te uiți la `name` și nu găsești nimic greșit, dar cauza e în altă parte.
Ideea: Citești mesajul întreg, apoi stack trace-ul, adică lista apelurilor care au dus la eroare, de sus în jos. Primul rând din codul tău arată locul. Mesajul `Cannot read properties of undefined (reading 'x')` spune că valoarea din fața punctului e `undefined`: `x` e proprietatea citită, nu cea lipsă. `x is not a function` înseamnă că ai apelat ceva care nu e funcție. În producție codul e minificat, deci stack trace-ul arată `main.4f2a.js:1:48210`. Source maps leagă fișierul minificat de sursa ta: build-ul generează un `.map`, serverul îl servește, iar DevTools arată fișierul original.
Exemplu:
```js
const log = console.log;
const user = {};
try {
  user.profile.name;  // ✗
} catch (e) {
  log(e.message.slice(-15));
  // → reading 'name')
}
log(user.profile?.name);  // ✓
// → undefined
```
Pas cu pas:
```text
TypeError: … (reading 'name')
  at Card (Card.tsx:12)  ← al tău
  at renderWithHooks (react-dom…)
  at … (react-dom…)
caut primul rând din codul meu
```
Legătură: FD-01 și FE-10: un `user.profile` care lipsește vine adesea dintr-un răspuns de API cu altă formă decât cea așteptată. Un traceback Python se citește invers, de jos în sus; un stack trace JavaScript, de sus în jos.

### 3

Problema: Un bug apare doar la al 4872-lea element dintr-o listă. Pui `console.log` în buclă și primești cinci mii de rânduri.
Ideea: `debugger;` oprește execuția la acea linie cât timp DevTools e deschis. Un breakpoint condițional, setat din Sources, se oprește doar când condiția e adevărată. „Pause on exceptions” oprește chiar la linia care aruncă. Un logpoint scrie în consolă fără să modifici codul. `console.table` afișează un array de obiecte ca tabel. Un log bun are etichetă și arată valoarea împreună cu tipul. În CoderPad documentația pentru React nu pomenește DevTools, deci pregătește-te cu `console.log`.
Exemplu:
```js
const log = console.log;
const xs = [3, 0, 7];
for (const [i, x] of xs.entries()) {
  if (x === 0) {  // ✓ cazul rău
    log("i =", i, "x =", x);
    // → i = 1 x = 0
    debugger;
  }
}
```
Legătură: JS-03 și JS-04: un log cu `typeof` ar fi arătat din prima ce valoare ajunge în callback. În Django, `django-debug-toolbar` joacă un rol asemănător pentru cereri și SQL.

### 4

Greu: da
Problema: O cerere merge în Postman, dar în browser pică cu o eroare de CORS. Serverul pare în regulă, iar mesajul din consolă nu spune ce lipsește.
Ideea: Tab-ul Network arată pentru fiecare cerere statusul (200, 4xx, 5xx sau `CORS error`), payload-ul trimis și răspunsul primit. CORS e o regulă a browserului: o cerere către alt origin e simplă doar cu `GET`, `HEAD` sau `POST` și cu `Content-Type` de tip `text/plain`, `multipart/form-data` sau `application/x-www-form-urlencoded`. `application/json` iese din listă, deci browserul trimite întâi un preflight, o cerere `OPTIONS`. Serverul răspunde cu `Access-Control-Allow-Origin`, `Allow-Methods` și `Allow-Headers`. Postman și curl nu aplică CORS. Cu `credentials`, `Access-Control-Allow-Origin` nu poate fi `*`.
Exemplu:
```ts
// ✗ trimite OPTIONS înainte de POST
void fetch("https://api.x.ro/a", {
  method: "POST",
  headers: {
    "Content-Type":
      "application/json",
  },
  body: JSON.stringify({ n: 1 }),
});
// ✓ serverul răspunde la OPTIONS:
// Allow-Origin: <origin>
// Allow-Headers: content-type
```
Legătură: FE-13 (`Access-Control-Allow-Origin: *` și `credentials`). În FastAPI, `CORSMiddleware` pune aceste headere, iar în dev un proxy evită problema.

### 5

Greu: da
Problema: Pagina îngheață, iar consola scrie `Too many re-renders`. Alt component face sute de cereri pe secundă, deși codul pare corect.
Ideea: React DevTools are două tab-uri: Components arată props și state pe fiecare componentă, iar Profiler înregistrează randările și cât durează. `Too many re-renders` apare când un `setState` rulează necondiționat în timpul randării: render, setState, render nou. Cea mai frecventă cauză e `onClick={inc()}` în loc de `onClick={inc}`, care apelează funcția la randare. Un effect fără array de dependențe, care face `setState` cu un obiect nou, intră tot într-o buclă: render, effect, setState, render. React avertizează cu `Maximum update depth exceeded`. Repari dând dependențele corecte.
Exemplu:
```tsx
// ✗ efect fără dependențe
useEffect(() => {
  setData({ ...data });
});
// ✓ rulează doar când se schimbă id
useEffect(() => {
  load(id).then(setData);
}, [id]);
```
Pas cu pas:
```text
render 1
effect: setData(obiect nou)
render 2 (obiect nou)
effect: setData(obiect nou)
render 3 …
React: Maximum update depth exceeded
```
Legătură: FE-06 (efect fără array) și FE-08 (răspunsuri vechi). RE-02: ce declanșează un re-render.

### 6

Greu: da
Problema: O componentă aruncă o eroare la randare și toată pagina devine albă. Un handler de click aruncă o eroare, dar „fallback-ul” nu apare deloc.
Ideea: Un error boundary e o componentă-clasă cu `getDerivedStateFromError`, sau pachetul `react-error-boundary`. Când un copil aruncă la randare, boundary-ul arată un fallback în loc de pagina albă. Nu prinde erorile din event handlers, din cod asincron (`setTimeout`, promisiuni), din SSR și nici pe cele aruncate chiar de boundary. Acolo folosești `try` / `catch` în handler și `.catch` la promisiuni. Ca plasă de siguranță, evenimentul `unhandledrejection` pe `window` prinde promisiunile respinse fără handler.
Exemplu:
```tsx
// ✓ eroare de randare: prinsă
<Boundary><Bomb /></Boundary>
// ✗ eroare din handler: neprinsă
<Boundary>
  <button onClick={() => {
    throw new Error("x");
  }}>go</button>
</Boundary>
// ✓ try / catch în handler
```
Legătură: FD-03. JS-07: o promisiune respinsă fără `.catch` ajunge la `unhandledrejection`. În Django, un middleware de erori joacă un rol asemănător pentru 500.
