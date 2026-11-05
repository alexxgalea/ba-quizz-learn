<!-- Desfășurările fișei `frontend` (13 puncte; exemple TS / TSX / JS, nerulate de desf_examples: verificate cu react 19.3, vitest, tsc 7 și node). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 7, 17, 18, 22 și 25. -->

### harta
Problema: Un frontend React pare simplu: câteva componente și un fetch. Apoi un buton adună greșit, un effect rulează de două ori, o listă amestecă input-urile, un răspuns vechi suprascrie unul nou, iar un comentariu rulează script străin. Cauzele sunt puține: cum randează React, ce e un effect, ce nu știe TypeScript la runtime și ce face JavaScript dedesubt. Modulul răspunde la patru întrebări: cum randează React, cum sincronizezi cu exteriorul, cum ții listele și performanța sub control și ce trebuie să știi dedesubt.

Grupuri:
- 1–2: cum randează React (state ca snapshot, regulile hooks)
- 3–7: efectele: sincronizarea cu exteriorul și datele de la server
- 8–9: liste și performanță
- 10–13: dedesubt: TypeScript, teste, securitate și event loop-ul JavaScript

### 1
Greu: da
Problema: Un buton „+3” apelează `setN(n + 1)` de trei ori. După un click, `n` e 1, nu 3.
Ideea: Fiecare render are propriul `n`, o valoare fixă, ca un snapshot. Handlerul vede `n` din render-ul lui, deci cele trei apeluri pun toate `n + 1`. `setN(x => x + 1)` pune în coadă o funcție, iar React le aplică pe rând, deci +3. React aplică actualizările abia după ce se termină handlerul (batching).
Exemplu:
```tsx
const [n, setN] = useState(0);
const bad = () => {
  setN(n + 1);
  setN(n + 1);
  setN(n + 1);
};  // → n = 1
const ok = () => setN(x => x + 1);
// de 3 ori → n = 3
```
În C++: O lambdă cu captură prin valoare, `[n]`, copiază `n` când e creată și vede în continuare valoarea veche, chiar dacă `n` se schimbă după. Handlerul unui render e la fel: ține valorile din render-ul lui.
Unde nu ține: În C++ copia e o alegere (`[n]` față de `[&n]`). Într-o closure JavaScript prinzi variabila, nu o copie. Aici variabila e un `const` nou la fiecare render și nu se mută, deci handlerul vede mereu valoarea lui. Iar `setN` nu schimbă `n`: programează următorul render.
Legătură: FE-05. React-ul tău: același efect apare când un handler sau un interval citește state „vechi”.

### 2
Greu: da
Problema: `Profile` face `return null` cât timp `user` lipsește și abia apoi apelează un al doilea `useState`. Când `user` apare, React aruncă „Rendered more hooks than during the previous render”.
Ideea: React nu dă nume hook-urilor: le identifică după ordinea apelurilor, la fiecare render. De aceea ordinea trebuie să fie mereu aceeași. Apelezi hook-urile doar la nivelul de sus al unei componente sau al unui custom hook, înaintea oricărui `return` timpuriu, nu în bucle sau condiții. `eslint-plugin-react-hooks` prinde greșeala.
Exemplu:
```tsx
function Profile({ user }: Props) {
  const [tab] = useState(0);
  if (!user) return null;  // ✗
  const [edit] = useState(false);
  // user apare: 2 hook-uri, nu 1
  return <Tabs tab={tab} />;
}
```
Legătură: punctul 3: și `useEffect` e un hook, deci are aceeași regulă.

### 3
Greu: da
Problema: Un effect pornește un `setInterval` după fiecare render. După zece randări rulează zece intervale, iar contorul sare din zece în zece.
Ideea: Fără array de dependențe, effect-ul rulează după fiecare render. Cu `[]`, doar după primul. Cu `[a, b]`, când se schimbă una dintre ele. Înainte de următorul effect, React rulează cleanup-ul celui precedent. Cleanup-ul rulează și la unmount.
Exemplu:
```tsx
useEffect(() => {
  const id = setInterval(tick, ms);
  return () => clearInterval(id);
}, [ms]);
```
Legătură: FE-06 și FE-07.

### 4
Problema: În dev, mesajul „conectat” din effect apare de două ori la mount. Crezi că ai un bug și scoți `<StrictMode>`.
Ideea: În dev, Strict Mode face un ciclu în plus: setup, cleanup, setup. Așa verifică dacă cleanup-ul desface tot ce a făcut setup-ul. În producție effect-ul rulează o singură dată. Un `setInterval` sau un subscribe fără cleanup se vede imediat: apar două. Remediul e cleanup-ul, nu scoaterea Strict Mode.
Exemplu:
```tsx
const log = console.log;
useEffect(() => {
  log("setup");
  return () => log("cleanup");
}, []);
// dev: setup, cleanup, setup
```
Legătură: FE-07.

### 5
Problema: Lista filtrată stă în state și se recalculează într-un `useEffect` când se schimbă `items`. La fiecare schimbare React randează de două ori, prima dată cu lista veche.
Ideea: Un effect e pentru sincronizarea cu un sistem extern: rețea, DOM, socket. Ce poți calcula din props și state calculezi direct în render. State în plus și un effect înseamnă o randare în plus și riscul să se desincronizeze valorile. Pentru un calcul scump folosești `useMemo`, nu `useEffect`.
Exemplu:
```tsx
// greșit: stare + effect
const [f, setF] = useState(items);
useEffect(() => {
  setF(items.filter(match));
}, [items]);
// bun: direct în render
const f = items.filter(match);
```
Legătură: FE-06 și formularea de evitat „Calculez datele derivate într-un `useEffect`”.

### 6
Greu: da
Problema: Userul tastează „ab”, apoi „abc”. Răspunsul pentru „ab” sosește după cel pentru „abc” și suprascrie lista.
Ideea: Cleanup-ul effect-ului setează `ignore = true`, iar effect-ul vechi nu mai scrie în state. Alternativ, `AbortController` anulează cererea, dar docs spun că flag-ul `ignore` e cea mai sigură variantă. În practică folosești TanStack Query.
Exemplu:
```tsx
useEffect(() => {
  let ignore = false;
  fetchList(q).then((r) => {
    if (!ignore) setList(r);
  });
  return () => { ignore = true; };
}, [q]);
```
Legătură: FE-08. Punctul 7 scapă de cursă și de `ignore`: TanStack Query ține cache-ul pe `queryKey`.

### 7
Greu: da
Problema: O listă de utilizatori apare în trei componente. Fiecare mount pornește un fetch nou, deși datele au venit acum 2 secunde. Iar la întoarcerea pe tab, rețeaua pornește din nou.
Ideea: TanStack Query ține datele într-un cache după `queryKey`. `staleTime` (implicit 0) e cât timp datele sunt proaspete. Când devin stale, se refetch-uiesc la mount, la focus și la reconectare. `gcTime` (implicit 5 min) e cât stau în cache datele nefolosite. Erorile se reîncearcă de 3 ori, cu backoff exponențial.
Exemplu:
```tsx
useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  staleTime: 60_000,  // 1 min
});
```
Legătură: FE-04. Un singur `useQuery` ia locul punctului 6: cache, cursa și retry-urile vin gata.

### 8
Greu: da
Problema: Lista de taskuri se reordonează, iar textul tastat într-un input de pe un rând apare pe alt rând.
Ideea: `key` ajută React să recunoască un element între randări. Trebuie să fie stabil și unic între frați și să vină din date, de exemplu `id`. Indexul identifică poziția, nu elementul: la reordonare starea rămâne la poziție și ajunge la alt element. `Math.random()` dă o cheie nouă la fiecare render, deci React recreează elementele și pierde starea.
Exemplu:
```tsx
{todos.map((t) => (
  <Row key={t.id} todo={t} />
))}
// nu: key={i}, key={Math.random()}
```
Legătură: FE-03 și formularea de evitat „Indexul e un `key` bun pentru orice listă.”

### 9
Problema: O listă mare se re-randează încet. Pui `useMemo` și `useCallback` peste tot, iar codul se umple de dependențe, fără să știi dacă ajută.
Ideea: React Compiler 1.0 (oct. 2025) memoizează automat, la build. `useMemo`, `useCallback` și `memo` rămân pentru cazuri speciale, de exemplu un calcul scump. Întâi măsori cu Profiler-ul din React DevTools, apoi optimizezi doar ce iese în față.
Exemplu:
```tsx
const sorted = useMemo(
  () => sortAll(items),
  [items],
);
```
Legătură: FE-02 și punctul 5: Profiler-ul arată ce se re-randează, deci nu memoizezi din reflex.

### 10
Greu: da
Problema: `const u = await res.json()` e tipat `any`. API-ul trimite `{ "name": null }`, iar aplicația crapă la `u.name.toUpperCase()`, deși TypeScript n-a avertizat.
Ideea: `res.json()` întoarce `any`, deci TypeScript nu verifică nimic. Pentru date externe folosești `unknown`, care te obligă să verifici înainte de folosire. O uniune discriminată plus `never` în `default` face un `switch` exhaustiv: un caz nou nu compilează până nu-l tratezi. Tipurile dispar la runtime, deci validezi la graniță (zod) sau generezi tipurile din OpenAPI-ul FastAPI.
Exemplu:
```ts
type E = { k: "a" } | { k: "b" };
function f(e: E): number {
  switch (e.k) {
  case "a": return 1;
  case "b": return 2;
  default: throw e satisfies never;
  }
}
```
În C++: O uniune discriminată seamănă cu `std::variant<A, B>` și `std::visit`: un visitor care nu acoperă un tip nu compilează.
Unde nu ține: `std::variant` ține singur indexul tipului activ, iar compilatorul îl verifică la `visit`. În TypeScript tag-ul `k` e un câmp pus de tine în date, iar tipurile nu există la runtime: un JSON din rețea poate avea orice formă.
Legătură: FE-10 și FE-11. FastAPI generează OpenAPI din modelele Pydantic, iar `openapi-typescript` face din el tipuri TS.

### 11
Problema: Testul caută butonul după clasa CSS `.btn-save`. Redenumești clasa și testul pică, deși pentru utilizator nimic nu s-a schimbat.
Ideea: Testing Library testează ce vede utilizatorul: `getByRole("button", { name: "Salvează" })`. `getBy` aruncă dacă lipsește, `queryBy` dă `null` (pentru absență), `findBy` așteaptă. `user-event` simulează interacțiunile, MSW interceptează rețeaua, Playwright rulează fluxurile E2E.
Exemplu:
```tsx
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
Ideea: JSX escapează textul, deci `{comment}` e sigur. `dangerouslySetInnerHTML` cu date nesigure e XSS. Cu `credentials: "include"`, browserul respinge un răspuns cu `Access-Control-Allow-Origin: *`: serverul trebuie să dea originea exactă și `Access-Control-Allow-Credentials: true`. Într-un SPA, OAuth se face cu Authorization Code + PKCE. RFC 10017 (2026) recomandă un BFF pentru aplicațiile de business.
Exemplu:
```tsx
<p>{comment}</p>
// escapat: se vede ca text
<p dangerouslySetInnerHTML={{
  __html: comment,
}} />  // XSS
```
Legătură: FE-12 și FE-13. La Keycloak, metoda PKCE se setează pe client; fără setare, PKCE nu e cerut, doar folosit dacă clientul îl trimite.

### 13
Greu: da
Problema: Te aștepți ca `setTimeout(…, 0)` să se vadă înaintea unui `.then`, dar în consolă `.then` apare primul.
Ideea: JavaScript are un singur thread, cu un event loop. Promisiunile (microtasks) rulează imediat ce se golește stiva, înaintea timerelor (tasks). `Promise.all` respinge la primul eșec, dar nu oprește restul, ca `gather`. `allSettled` le așteaptă pe toate.
Exemplu:
```ts
const log = console.log;
setTimeout(() => log("timer"), 0);
Promise.resolve().then(() =>
  log("promise"));
log("sync");
// → sync, promise, timer
```
Legătură: FE-14 și punctul 3 din fișa asyncio: `gather` nu anulează restul, ca `Promise.all`. O promisiune JavaScript pornește imediat, o corutină Python abia când o aștepți sau o programezi.
