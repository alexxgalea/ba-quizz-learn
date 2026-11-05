<!-- Desfășurările fișei `frontend` (13 puncte), rescrise în formatul de frontend (tichetul 05 din frontend extins): 90–140 de cuvinte, ~250 la `Greu: da`, exemplu ≤ 14 rânduri cu ✗ / ✓, `Pas cu pas` ≤ 8 rânduri. Exemple TS / TSX / JS: blocurile `ts` trec prin desf_examples (tsc --strict), TSX-ul e verificat de mână în vitest + jsdom (react 19.3, katas/). Format și reguli: lib.mjs (checkDesf, DESF_LIMITS_FE), .scratch/frontend-extins/spec.md. Faptele: research/interview-facts.md, secțiunile 7, 17, 18, 22, 25 și 46. -->

### harta
Problema: Un frontend React pare simplu: câteva componente și un fetch. Apoi un buton adună greșit, un effect rulează de două ori, o listă amestecă input-urile, un răspuns vechi suprascrie unul nou, iar un comentariu rulează script străin. Cauzele sunt puține: cum randează React, ce e un effect, ce nu știe TypeScript la runtime și ce face JavaScript dedesubt. Modulul răspunde la patru întrebări: cum randează React, cum sincronizezi cu exteriorul, cum ții listele și performanța sub control și ce trebuie să știi dedesubt. Bazele (componentă, props, state, inputuri, `key`) sunt în fișa `react`, limbajul în `js`, iar tipurile în `ts`. Aici e mecanismul care le leagă.

Grupuri:
- 1–2: cum randează React (state ca snapshot, regulile hooks)
- 3–7: efectele: sincronizarea cu exteriorul și datele de la server
- 8–9: liste și performanță
- 10–13: dedesubt: TypeScript, teste, securitate și event loop-ul JavaScript

### 1
Greu: da
Problema: Un buton „+3” apelează `setN(n + 1)` de trei ori. După un click, ecranul arată 1, nu 3, deși codul pare corect.
Ideea: Fiecare render primește propriul `n`, o valoare fixă, o „fotografie” (snapshot) a state-ului din acel moment. Tot handlerul citește `n` din render-ul lui, deci cele trei apeluri pun toate `n + 1`. `setN` nu schimbă `n` din render-ul curent: cere următorul render. `setN(x => x + 1)` pune în coadă o funcție, iar React le aplică pe rând, fiecare pornind de la rezultatul precedent, deci +3. React aplică actualizările abia după ce se termină handlerul, toate odată (batching, adică gruparea lor).
Exemplu:
```tsx
const [n, setN] = useState(0);
const bad = () => {
  setN(n + 1);  // ✗ n = 0
  setN(n + 1);
  setN(n + 1);
};  // → n = 1
const ok = () => {
  setN(x => x + 1);  // ✓
  setN(x => x + 1);
  setN(x => x + 1);
};  // → n = 3
```
Pas cu pas:
```text
render 1: n = 0
bad(): setN(1), setN(1), setN(1)
render 2: n = 1
ok(), tot de la n = 0:
  coadă: 0→1, 1→2, 2→3
render 2: n = 3
```
În C++: O lambdă cu captură prin valoare, `[n]`, copiază `n` când e creată și vede în continuare valoarea veche, chiar dacă `n` se schimbă după. Handlerul unui render e la fel: ține valorile din render-ul lui.
Unde nu ține: În C++ copia e o alegere (`[n]` față de `[&n]`). Într-o closure JavaScript prinzi variabila, nu o copie. Aici variabila e un `const` nou la fiecare render și nu se mută, deci handlerul vede mereu valoarea lui. Iar `setN` nu schimbă `n`: programează următorul render.
Legătură: FE-05; closure-ul din fișa `js`, punctul 3. React-ul tău: același efect apare când un handler sau un interval citește state „vechi”.

### 2
Greu: da
Problema: `Profile` face `return null` cât timp `user` lipsește și abia apoi apelează un al doilea `useState`. Când `user` apare, React aruncă „Rendered more hooks than during the previous render”.
Ideea: Un hook e o funcție `useX` pe care o apelezi în corpul unei componente, de exemplu `useState`. React nu dă nume hook-urilor: le identifică după ordinea apelurilor, la fiecare render, deci ordinea trebuie să fie mereu aceeași. Apelezi hook-urile doar la nivelul de sus al unei componente sau al unui custom hook, înaintea oricărui `return` timpuriu (un `return` înainte de finalul funcției), nu în bucle sau condiții. `eslint-plugin-react-hooks` prinde greșeala.
Exemplu:
```tsx
function Bad({ user }: Props) {
  const [tab] = useState(0);
  if (!user) return null;  // ✗
  const [edit] = useState(false);
  return <Tabs tab={tab} />;
}
function Ok({ user }: Props) {
  const [tab] = useState(0);
  const [edit] = useState(false);
  if (!user) return null;  // ✓
  return <Tabs tab={tab} />;
}
```
Pas cu pas:
```text
render 1: user = null
  useState (tab), apoi return
  hook-uri apelate: 1
render 2: user există
  useState (tab), useState (edit)
  hook-uri apelate: 2
→ „Rendered more hooks than…”
```
Legătură: punctul 3: și `useEffect` e un hook, deci are aceeași regulă. În `react`, punctul 7 (custom hooks) pornește de la ea.

### 3
Greu: da
Problema: Un effect pornește un `setInterval` după fiecare render. După zece randări rulează zece intervale, iar contorul sare din zece în zece.
Ideea: Un effect e cod care rulează după ce React a pus render-ul pe ecran. Array-ul de dependențe hotărăște când: fără array, după fiecare render; cu `[]`, doar după primul; cu `[a, b]`, când se schimbă una dintre ele. Ce întoarce effect-ul e cleanup-ul: React îl rulează înainte de următoarea rulare a aceluiași effect și la unmount (când componenta dispare). Cleanup-ul desface ce a făcut setup-ul: oprește intervalul, închide socketul.
Exemplu:
```tsx
// ✗ fără array și fără cleanup
useEffect(() => {
  setInterval(tick, ms);
});
// ✓ dependențe + cleanup
useEffect(() => {
  const id = setInterval(tick, ms);
  return () => clearInterval(id);
}, [ms]);
```
Pas cu pas:
```text
render 1: ms = 1000
  effect: pornește intervalul A
render 2: ms = 500
  cleanup: oprește A
  effect: pornește intervalul B
unmount
  cleanup: oprește B
```
Legătură: FE-06 și FE-07; custom hook-urile din `react` (punctul 7) ascund exact această pereche setup / cleanup.

### 4
Problema: În dev, mesajul „conectat” din effect apare de două ori la mount. Crezi că ai un bug și scoți `<StrictMode>`.
Ideea: În dev, Strict Mode (un înveliș care adaugă verificări doar în dev) face un ciclu în plus: setup, cleanup, setup. Așa verifică dacă cleanup-ul desface tot ce a făcut setup-ul. În producție effect-ul rulează o singură dată. Fără cleanup, un `setInterval` sau un subscribe (abonare la o sursă de evenimente) apare de două ori și se vede imediat. Remediul e cleanup-ul, nu scoaterea Strict Mode.
Exemplu:
```tsx
// ✗ setup fără cleanup: 2 conexiuni
useEffect(() => {
  socket.connect();
}, []);
// ✓ cleanup-ul desface setup-ul
useEffect(() => {
  socket.connect();
  return () => socket.disconnect();
}, []);
```
Pas cu pas:
```text
mount: effect → connect
Strict Mode: cleanup → disconnect
Strict Mode: effect → connect
  → o conexiune activă
fără cleanup:
  connect, connect → două conexiuni
```
Legătură: FE-07. Același ciclu verifică și efectele din custom hooks.

### 5
Problema: Lista filtrată stă în state și se recalculează într-un `useEffect` când se schimbă `items`. La fiecare schimbare React randează de două ori, prima dată cu lista veche.
Ideea: Un effect e pentru sincronizarea cu un sistem extern: rețea, DOM, socket. Ce poți calcula din props și state (o valoare derivată) calculezi direct în render. State în plus și un effect înseamnă o randare în plus și riscul ca valorile să se desincronizeze. Pentru un calcul scump folosești `useMemo`, nu `useEffect`.
Exemplu:
```tsx
// ✗ stare + effect
const [f, setF] = useState(items);
useEffect(() => {
  setF(items.filter(match));
}, [items]);
// ✓ direct în render
const f = items.filter(match);
```
Legătură: FE-06 și formularea de evitat „Calculez datele derivate într-un `useEffect`”. Același principiu stă în `react`, la ridicarea state-ului (punctul 5): o singură sursă de adevăr.

### 6
Greu: da
Problema: Userul tastează „ab”, apoi „abc”. Răspunsul pentru „ab” sosește după cel pentru „abc” și suprascrie lista.
Ideea: Aceasta e o cursă (race condition): două cereri în zbor, iar ordinea răspunsurilor nu e cea a cererilor. Cleanup-ul effect-ului setează `ignore = true`, deci effect-ul vechi nu mai scrie în state. Alternativ, `AbortController` anulează cererea, dar docs spun că flag-ul `ignore` e cea mai sigură variantă. În practică folosești TanStack Query, o bibliotecă pentru date de la server, care rezolvă cursa din start.
Exemplu:
```tsx
// ✗ răspunsul vechi poate câștiga
useEffect(() => {
  fetchList(q).then(setList);
}, [q]);
// ✓ cleanup-ul ignoră cel vechi
useEffect(() => {
  let ignore = false;
  fetchList(q).then((r) => {
    if (!ignore) setList(r);
  });
  return () => { ignore = true; };
}, [q]);
```
Pas cu pas:
```text
q = "ab": pleacă cererea A
q = "abc":
  cleanup(A): ignore A = true
  pleacă cererea B
B răspunde → setList(B)
A răspunde târziu → ignorată
fără ignore: setList(A) peste B
```
Legătură: FE-08. Punctul 7 scapă de cursă și de `ignore`: TanStack Query ține cache-ul pe `queryKey`.

### 7
Greu: da
Problema: O listă de utilizatori apare în trei componente. Fiecare mount pornește un fetch nou, deși datele au venit acum 2 secunde. Iar la întoarcerea pe tab, rețeaua pornește din nou.
Ideea: TanStack Query ține datele într-un cache (o memorie locală) după `queryKey`, cheia cererii. `staleTime` (implicit 0) e cât timp datele sunt proaspete. Când devin stale (vechi), se reîncarcă la mount, la focus și la reconectare, iar ecranul arată între timp datele din cache. `gcTime` (implicit 5 min) e cât stau în cache datele pe care nu le mai folosește nimeni. O cerere eșuată se reîncearcă de 3 ori, cu pauze tot mai lungi (backoff exponențial).
Exemplu:
```tsx
// ✗ un fetch la fiecare mount
useEffect(() => {
  fetchUsers().then(setUsers);
}, []);
// ✓ un cache pe queryKey
useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  staleTime: 60_000,  // 1 min
});
```
Pas cu pas:
```text
t = 0: fetch; datele sunt proaspete
t = 30 s: alt mount → din cache
t = 61 s: datele devin stale
t = 62 s: mount sau focus
  → arată cache-ul + refetch
nefolosite 5 min → ies din cache
```
Legătură: FE-04. Un singur `useQuery` ia locul punctului 6: cache, cursa și retry-urile vin gata.

### 8
Greu: da
Problema: Lista de taskuri se reordonează, iar textul tastat într-un input de pe un rând apare pe alt rând.
Ideea: `key` ajută React să recunoască un element între randări. Trebuie să fie stabil și unic între frați și să vină din date, de exemplu `id`. Indexul identifică poziția, nu elementul: la reordonare, state-ul rămâne la poziție și ajunge la alt element. `Math.random()` dă o cheie nouă la fiecare render, deci React recreează elementele și pierde state-ul.
Exemplu:
```tsx
// ✗ poziția, nu elementul
{todos.map((t, i) => (
  <Row key={i} todo={t} />
))}
// ✓ id-ul din date
{todos.map((t) => (
  <Row key={t.id} todo={t} />
))}
```
Pas cu pas:
```text
key = index: [A, B] → A: 0, B: 1
inversezi: [B, A]
  poziția 0 era A, acum e B
  React păstrează state-ul poziției
  textul din inputul lui A
  apare la B
key = id: state-ul urmează id-ul
```
Legătură: FE-03 și formularea de evitat „Indexul e un `key` bun pentru orice listă.”; reconcilierea din `react` (punctul 8) explică de ce.

### 9
Problema: O listă mare se re-randează încet. Pui `useMemo` și `useCallback` peste tot, iar codul se umple de dependențe, fără să știi dacă ajută.
Ideea: Memoizarea păstrează rezultatul unui calcul sau al unei funcții între randări. React Compiler 1.0 (oct. 2025), un compilator care rulează la build, o adaugă automat. `useMemo`, `useCallback` și `memo` rămân pentru cazuri speciale, de exemplu un calcul scump. Întâi măsori cu Profiler-ul din React DevTools, care arată ce componente se re-randează și cât durează, apoi optimizezi doar ce iese în față.
Exemplu:
```tsx
// ✗ din reflex, fără măsurătoare
const label = useMemo(
  () => `${first} ${last}`,
  [first, last],
);
// ✓ doar un calcul scump, măsurat
const sorted = useMemo(
  () => sortAll(items),
  [items],
);
```
Legătură: FE-02 și punctul 5: Profiler-ul arată ce se re-randează, deci nu memoizezi din reflex.

### 10
Greu: da
Problema: `const u = await res.json()` e tipat `any`. API-ul trimite `{ "name": null }`, iar aplicația crapă la `u.name.toUpperCase()`, deși TypeScript n-a avertizat.
Ideea: `res.json()` întoarce `any`, un tip pe care TypeScript nu-l verifică deloc. Pentru date externe folosești `unknown`, care te obligă să verifici înainte de folosire. O uniune discriminată (tipuri cu un câmp-etichetă, `k`) plus `never` (tipul fără nicio valoare) în cazul final face un `switch` exhaustiv: un caz nou nu compilează până nu-l tratezi. Tipurile dispar la runtime, deci validezi la graniță, cu zod (o bibliotecă de validare), sau generezi tipurile din OpenAPI-ul FastAPI.
Exemplu:
```ts
async function f(res: Response) {
  const a = await res.json();
  a.name.toUpperCase();  // ✗ any
  const b: unknown =
    await res.json();
  // ✓ pică la compilare, nu la user
  b.name;  // ! TS18046
}
type E = { k: "a" } | { k: "b" };
function g(e: E) {
  if (e.k === "a") return 1;
  if (e.k === "b") return 2;
  return e satisfies never;
}
```
În C++: O uniune discriminată seamănă cu `std::variant<A, B>` și `std::visit`: un visitor care nu acoperă un tip nu compilează.
Unde nu ține: `std::variant` ține singur indexul tipului activ, iar compilatorul îl verifică la `visit`. În TypeScript tag-ul `k` e un câmp pus de tine în date, iar tipurile nu există la runtime: un JSON din rețea poate avea orice formă.
Legătură: FE-10 și FE-11; fișa `ts`: narrowing (punctul 3) și `strict` (punctul 8). FastAPI generează OpenAPI din modelele Pydantic, iar `openapi-typescript` face din el tipuri TS.

### 11
Problema: Testul caută butonul după clasa CSS `.btn-save`. Redenumești clasa și testul pică, deși pentru utilizator nimic nu s-a schimbat.
Ideea: Testing Library testează ce vede utilizatorul: `getByRole("button", { name: "Salvează" })` caută după rolul elementului (buton, link, câmp de text) și după numele lui vizibil, nu după clasa CSS. Așa testul rămâne verde la o refactorizare care nu schimbă comportamentul și pică doar când se strică ceva ce utilizatorul vede. `getBy` aruncă dacă elementul lipsește, `queryBy` dă `null` (pentru a verifica absența), `findBy` așteaptă să apară. `user-event` simulează interacțiunile, MSW interceptează cererile de rețea, iar Playwright rulează fluxurile complete (E2E) într-un browser real.
Exemplu:
```tsx
// ✗ legat de CSS, nu de utilizator
container
  .querySelector(".btn-save");
// ✓ rolul și numele
render(<Save />);
await userEvent.click(
  screen.getByRole("button", {
    name: "Salvează",
  }));
await screen.findByText("Salvat");
expect(screen.queryByText("Eroare"))
  .toBeNull();
```
Legătură: FE-09. La Playwright, același principiu: locatori după rol (PT-17).

### 12
Greu: da
Problema: Afișezi comentariile utilizatorilor cu `dangerouslySetInnerHTML`. Cineva postează `<img src=x onerror=...>`, iar scriptul rulează în sesiunea celorlalți utilizatori.
Ideea: JSX escapează textul, deci `{comment}` e sigur. `dangerouslySetInnerHTML` cu date nesigure e XSS (script străin rulat în pagina ta). Cu `credentials: "include"`, browserul respinge un răspuns cu `Access-Control-Allow-Origin: *`: serverul trebuie să dea originea exactă și `Access-Control-Allow-Credentials: true`. Într-un SPA (aplicație încărcată o singură dată în browser), OAuth se face cu Authorization Code + PKCE (clientul creează la fiecare login un cod secret de unică folosință). RFC 10017 (2026) recomandă un BFF, un server propriu care ține token-urile în locul browserului, pentru aplicațiile de business.
Exemplu:
```tsx
// ✓ escapat: se vede ca text
<p>{comment}</p>
// ✗ XSS
<p dangerouslySetInnerHTML={{
  __html: comment,
}} />
```
Legătură: FE-12 și FE-13. La Keycloak, metoda PKCE se setează pe client; fără setare, PKCE nu e cerut, doar folosit dacă clientul îl trimite.

### 13
Greu: da
Problema: Te aștepți ca `setTimeout(…, 0)` să se vadă înaintea unui `.then`, dar în consolă `.then` apare primul.
Ideea: JavaScript are un singur thread, cu un event loop: o buclă care ia pe rând lucrări din cozi, doar când stiva de apeluri e goală. Promisiunile (microtasks) rulează imediat ce se golește stiva, înaintea timerelor (tasks). `Promise.all` respinge la primul eșec, dar nu oprește restul, ca `gather`. `allSettled` le așteaptă pe toate.
Exemplu:
```ts
const log = console.log;
setTimeout(() => log("timer"), 0);
Promise.resolve().then(() =>
  log("promise"));
log("sync");
// → sync, promise, timer
```
Pas cu pas:
```text
stiva: log("sync") → „sync”
stiva se golește
microtask: .then → „promise”
task: timerul → „timer”
```
Legătură: FE-14; fișa `js`, punctul 7 (`await` și `Promise.all`). Din fișa asyncio, punctul 3: `gather` nu anulează restul, ca `Promise.all`. O promisiune JavaScript pornește imediat, o corutină Python abia când o aștepți sau o programezi.
