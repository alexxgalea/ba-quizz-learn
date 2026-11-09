<!-- Desfășurările fișei `react` (14 puncte: 1–8 din tichetul 03, 9–14 harta hook-urilor, 9 nov. 2026; exemple TSX, verificate de mână în vitest cu react 19.3, jsdom și Testing Library). Format frontend: 90–140 de cuvinte, ~250 la `Greu: da`, exemplu ≤ 14 rânduri, Pas cu pas ≤ 8 rânduri. Format și reguli: lib.mjs (checkDesf, DESF_LIMITS_FE), .scratch/frontend-extins/spec.md. Faptele: research/interview-facts.md, secțiunile 44 și 48. -->

### harta

Problema: React pare simplu până apar bug-urile care nu au o eroare în consolă: un contor care nu se mișcă, o listă care nu se actualizează, un câmp în care nu poți scrie, un formular care ține textul utilizatorului precedent. Toate pornesc din câteva reguli pe care React le aplică la fiecare render și pe care nu le vezi în cod. Modulul le ia pe rând: ce e o componentă, ce declanșează un re-render, cum se schimbă state-ul, unde stă state-ul și cum își dă seama React ce păstrează. Ultimele șase puncte sunt harta hook-urilor: pentru fiecare, ce face, când îl alegi și ce capcană are. Mecanismul efectelor pe larg e în `frontend`; limbajul de dedesubt, în `js` și `ts`.

Grupuri:
- 1–2: componenta și re-render-ul (funcție pură, ce declanșează randarea)
- 3–4: state-ul și câmpurile (copie, nu modificare; input controlat)
- 5–7: unde stă state-ul (ridicare, reducer și Context, custom hooks)
- 8: cum alege React ce păstrează (reconcilierea și `key`)
- 9–10: hook-urile de bază (unde ții o valoare; unde pui un efect lateral)
- 11–12: hook-urile de performanță (memoizare; prioritate cu tranziții)
- 13–14: hook-uri pentru cazuri precise (id-uri, store extern, ref; acțiunile din React 19)

### 1

Greu: da
Problema: O componentă adună într-o variabilă din afara funcției, cu `total += n` în corpul ei. În dev, un `<Badge n={1} />` arată `2`, iar două instanțe își strică numerele una alteia.
Ideea: O componentă e o funcție care primește props și state și întoarce JSX. Trebuie să fie pură: aceleași intrări dau același JSX, iar în timpul randării ea nu modifică nimic din ce exista înainte, nici variabile din afară, nici props, nici state. Props sunt read-only; schimbarea vine de la părinte, cu alte props. `children` e un prop obișnuit: JSX-ul pus între etichetele componentei. Poți modifica liber ce ai creat chiar în funcție, de exemplu un array local. În dev, Strict Mode apelează funcția de două ori, ca să scoată la iveală impuritățile.
Exemplu:
```tsx
let total = 0;
function Bad({ n }: Props) {
  total += n;  // ✗ exteriorul
  return <b>{total}</b>;
}
// Strict Mode: <Bad n={1} /> → 2
function Ok({ n }: Props) {
  return <b>{n}</b>;  // ✓ props
}
```
Legătură: RE-01. Ca un template Django: primește un context și produce HTML, fără să scrie în baza de date. Strict Mode e și motivul din FE-07.

### 2

Greu: da
Problema: Un buton face `count++` pe o variabilă obișnuită și ecranul rămâne la `0`. Alt buton schimbă state-ul părintelui, iar zece copii se redesenează fără niciun motiv vizibil.
Ideea: React apelează din nou o componentă (re-render) din trei motive: i s-a schimbat propriul state, a făcut re-render părintele sau s-a schimbat un Context pe care îl citește. La a doua cauză copiii se re-randează cu părintele, chiar dacă props sunt la fel. O variabilă locală sau o ref (`useRef`) nu declanșează nimic, fiindcă React nu le urmărește. Re-render nu înseamnă că se rescrie pagina: React atinge DOM-ul doar unde iese diferit. `useRef` ține valori care nu apar pe ecran și noduri DOM (`ref.current.focus()`).
Exemplu:
```tsx
function Bad() {
  let n = 0;  // ✗ React n-o vede
  const up = () => n++;
  return <b onClick={up}>{n}</b>;
}
function Ok() {  // ✓
  const [n, setN] = useState(0);
  const up = () => setN(n + 1);
  return <b onClick={up}>{n}</b>;
}
```
Pas cu pas:
```text
Parent: setQ('a') → re-render
  Parent se apelează din nou
  A (props la fel) se apelează
  B se apelează
Context schimbat: doar cititorii
ref.current = x → nimic
```
Legătură: RE-02. Punctul 6 explică Context-ul; efectele din `frontend` pornesc tot de la un render (FE-06).

### 3

Greu: da
Problema: Ai `items.push(x); setItems(items)`. În memorie lista are un element nou, dar ecranul rămâne la fel.
Ideea: După `setItems`, React compară valoarea nouă cu cea veche prin `Object.is`, adică după referință. Același array sau același obiect înseamnă „neschimbat”, deci sare peste re-render. De aceea tratezi state-ul ca read-only și îl înlocuiești cu o copie: `[...items, x]`, `items.filter(…)`, `{ ...user, name }`. Spread-ul copiază doar primul nivel, deci un câmp imbricat se copiază separat. Un updater (`setN(n => n + 1)`) trebuie să fie pur, fiindcă Strict Mode îl apelează de două ori în dev.
Exemplu:
```tsx
const [items, setItems] =
  useState<string[]>([]);
const bad = (x: string) => {
  items.push(x);  // ✗ aceeași ref
  setItems(items);
};
const ok = (x: string) =>
  setItems([...items, x]);  // ✓
const rename = (u: User) =>
  setUser({ ...u, name: "Ana" });
```
Pas cu pas:
```text
render 1: items = A (gol)
push('x') → A = ['x'] (aceeași A)
setItems(A): Object.is(A, A) → true
React: neschimbat → ecran la fel
cu [...A, 'x'] → B ≠ A → render 2
```
Legătură: RE-03. JS-01: spread-ul e superficial. Un reducer urmează aceeași regulă (RE-06).

### 4

Greu: da
Problema: Un `<input value={name} />` nu mai acceptă text: tastezi și nu se schimbă nimic. Alt câmp pornește cu `value={undefined}`, iar când primește un string, React avertizează în consolă.
Ideea: Un input controlat primește valoarea din state (`value`) și o schimbă printr-un handler (`onChange`). State-ul e sursa adevărului, iar React forțează valoarea lui în DOM după fiecare tastă. Fără `onChange`, câmpul rămâne înghețat. `value` trebuie să fie mereu string: `undefined` sau `null` îl fac necontrolat, iar trecerea la string produce avertismentul. Un input necontrolat folosește `defaultValue` și își ține valoarea în DOM; o citești la submit, cu un `ref` sau cu `FormData`. Controlat alegi când validezi sau reacționezi la fiecare tastă.
Exemplu:
```tsx
const [name, setName] =
  useState("");
// ✗ înghețat: nu are onChange
<input value={name} />
// ✓ controlat
<input
  value={name}
  onChange={(e) =>
    setName(e.target.value)}
/>
// ✓ necontrolat
<input defaultValue="Ana" />
```
Pas cu pas:
```text
tastezi „a”
onChange → setName('a')
render 2: name = 'a'
React pune value='a' în input
fără onChange: value rămâne '' și
React readuce câmpul la ''
```
Legătură: RE-04. În Django, un `ModelForm` primește datele la submit, ca un câmp necontrolat; React Hook Form pornește tot de la câmpuri necontrolate.

### 5

Problema: `Filter` și `List` au fiecare propriul `useState` pentru textul căutat. Filtrul scrie „ro”, iar lista nu află.
Ideea: Când două componente au nevoie de aceeași informație, o muți în cel mai apropiat părinte comun. Părintele ține state-ul și îl dă copiilor prin props, împreună cu un callback prin care copilul cere schimbarea. Datele curg într-o singură direcție, în jos, iar evenimentele urcă prin callback-uri. Fiecare bucată de state are un singur proprietar: o copie în doi copii ajunge să difere. Ce se poate calcula din state, cum e lista filtrată, nu devine state separat.
Exemplu:
```tsx
// ✓ q stă în părintele comun
function Page({ all }: Props) {
  const [q, setQ] = useState("");
  const shown = all.filter((x) =>
    x.includes(q));
  return (
    <>
      <Filter q={q} onQ={setQ} />
      <List items={shown} />
    </>
  );
}
```
Legătură: RE-05. Ca view-ul din Django: ține datele și le trimite template-urilor. La scară mare folosești Context (punctul 6) sau un store.

### 6

Greu: da
Problema: Un formular are șapte `useState` care se schimbă împreună. Tema aplicației trece prin props prin cinci niveluri, deși o citește un singur buton, jos.
Ideea: `useReducer` strânge logica de actualizare într-o funcție pură `reducer(state, action)`: primește starea și un eveniment (`action`) și întoarce starea nouă, fără s-o modifice. Handler-ele doar fac `dispatch({ type: "add" })`. Context duce o valoare printr-un arbore fără props intermediare: `Provider` o pune, `useContext` o citește. Când `value` se schimbă după `Object.is`, toți consumatorii re-randează, deci un obiect literal în `value` îi trezește la fiecare render al providerului. Context transportă valoarea, nu ține state: acesta rămâne în `useState` sau `useReducer`.
Exemplu:
```tsx
// ✗ obiect nou la fiecare render
<Ctx value={{ user, setUser }}>
  <Page />
</Ctx>
// ✓ stabil cât timp user e la fel
const v = useMemo(
  () => ({ user, setUser }),
  [user],
);
<Ctx value={v}>
  <Page />
</Ctx>
```
Pas cu pas:
```text
click → dispatch({ type: 'add' })
React pune acțiunea în coadă
render: reducer(0, add) → 1
render 2: n = 1
reducer care întoarce același obiect
→ Object.is true → ecran la fel
```
Legătură: RE-06. FE-02 detaliază re-randarea consumatorilor. În React 19 provider-ul e `<Ctx value>`; înainte era `<Ctx.Provider value>`. Redux are același tipar: reducer plus acțiuni.

### 7

Greu: da
Problema: Două componente au același cod de zece rânduri pentru un contor cu `useState`. Îl muți într-un hook și te aștepți ca ambele să arate același număr, dar fiecare numără pe cont propriu.
Ideea: Un custom hook e o funcție al cărei nume începe cu `use` și care apelează alte hook-uri. Partajează logică, nu valori: fiecare componentă care îl apelează primește propriul state, independent de celelalte. Dacă două componente trebuie să vadă același număr, state-ul urcă în părinte (punctul 5) sau trece prin Context (punctul 6). Regulile hook-urilor se aplică și în interiorul lui: apel doar la nivelul de sus.
Exemplu:
```tsx
function useCounter(start = 0) {
  const [n, setN] = useState(start);
  const inc = () =>
    setN((x) => x + 1);
  return { n, inc };
}
// ✗ nu sunt legate
const a = useCounter();
const b = useCounter();
// inc din a: a.n = 1, b.n = 0
// ✓ comun: state în părinte
```
Legătură: RE-07. Ca o funcție fabrică în Python: fiecare apel `Counter()` produce un obiect nou. `useQuery` din TanStack Query e tot un custom hook (FE-04).

### 8

Greu: da
Problema: Treci de la „Autentificare” la „Înregistrare” și textul tastat în câmp rămâne acolo, deși voiai un câmp gol. În alt caz, o componentă definită în interiorul alteia își pierde textul la fiecare tastă.
Ideea: La fiecare render React compară arborele nou cu cel vechi, poziție cu poziție (reconcilierea). Același tip de componentă pe aceeași poziție: React o păstrează, cu tot state-ul. Alt tip: o distruge (unmount) și creează una nouă, cu state-ul gol. `key` face parte din identitate: o cheie nouă înseamnă componentă nouă, deci `key={mode}` resetează formularul. În liste, un `key` stabil, luat din date, urmărește elementul, nu poziția. O componentă definită în interiorul alteia e un tip nou la fiecare render, deci își pierde state-ul la fiecare tastă.
Exemplu:
```tsx
// ✗ același tip, aceeași poziție
{mode === "login"
  ? <Form />
  : <Form />}
// ✓ cheie nouă → componentă nouă
<Form key={mode} />
function Page() {
  // ✗ tip nou la fiecare render
  const Row = () => <input />;
  return <Row />;
}
```
Pas cu pas:
```text
render 1: <Form/> poz. 0, 'ana'
mode se schimbă → render 2
<Form/> pe poz. 0, același tip
→ state păstrat: 'ana'
cu key={mode}: cheie nouă
→ unmount Form, mount Form nou
→ text ''
```
Legătură: RE-08. FE-03 aplică regula la liste (`key={index}` mută state-ul pe alt rând). Strict Mode (FE-07) montează de două ori ca să verifice cleanup-ul.

### 9

Greu: da
Problema: Un timer pornit la click ține ID-ul într-o variabilă `let id`, iar „stop” nu mai oprește nimic după primul tick. În altă componentă, lista filtrată e ținută ca state separat și rămâne în urmă față de listă.
Ideea: Alegerea pornește de la întrebarea „apare pe ecran?”. Ce se poate calcula din props sau state e o variabilă calculată în render, nu state. O valoare care apare pe ecran și se schimbă stă în `useState`: setter-ul cere un re-render, iar valoarea nouă o vezi abia la randarea următoare. O valoare păstrată între randări, dar invizibilă (ID-ul unui timer, un nod DOM, valoarea precedentă) stă în `useRef`: o cutie `{ current }` pe care o schimbi fără re-render, în handler sau în effect, nu în render. O variabilă `let` se pierde la fiecare render. Când mai multe câmpuri se schimbă împreună, treci la `useReducer` (punctul 6). O inițializare scumpă primește funcția, `useState(calc)`, nu rezultatul, `useState(calc())`, care rulează la fiecare render.
Exemplu:
```tsx
// ✗ let id: recreat la render
// ✗ useState: re-render degeaba
// ✓ ref: păstrat, fără re-render
const id = useRef(0);
const start = () => {
  id.current =
    window.setInterval(tick, 1000);
};
const stop = () =>
  clearInterval(id.current);
// ✓ derivat: calculat în render
const shown = all.filter(ok);
// ✓ calc rulează o singură dată
const [db] = useState(loadDb);
```
Pas cu pas:
```text
se calculează din props? → render
apare pe ecran? → useState
câmpuri legate → useReducer
invizibil, dar păstrat → useRef
departe în arbore → + Context
```
Legătură: RE-09. RE-02: o ref nu declanșează re-render; RE-05: ce se calculează nu devine state. Seamănă cu diferența dintre un câmp de model Django, salvat și afișat, și o variabilă locală din view.

### 10

Greu: da
Problema: Un tooltip apare o clipă sub buton, apoi sare deasupra, fiindcă poziția se calculează într-un `useEffect`. Într-un formular, salvarea stă într-un `useEffect` care urmărește un flag `sent`.
Ideea: Un efect lateral are trei locuri posibile. Ce pornește de la o acțiune a userului (click, submit) stă în handler: știi exact de ce rulează. `useEffect` sincronizează componenta cu ceva din afară (socket, timer, abonare) și rulează după ce browserul a desenat ecranul, deci nu îl blochează. `useLayoutEffect` rulează după ce React a scris în DOM, dar înainte de desenare, iar un `setState` din el se aplică tot înainte de desenare. Îl folosești ca să măsori DOM-ul (`getBoundingClientRect`) fără pâlpâire. Blochează desenarea și nu rulează pe server, deci rămâne excepția. `useEffectEvent` (React 19.2) scoate dintr-un effect o bucată care citește valorile cele mai noi, cum e tema la o notificare, fără să intre în dependențe și să reconecteze effect-ul.
Exemplu:
```tsx
// ✗ salvarea ca effect pe un flag
useEffect(() => {
  if (sent) save(form);
}, [sent]);
// ✓ în handler
const onSubmit = () => save(form);
// ✓ măsurare înainte de desenare
useLayoutEffect(() => {
  const r = ref.current!
    .getBoundingClientRect();
  setUp(r.height > 40);
}, []);
```
Pas cu pas:
```text
render → React scrie în DOM
useLayoutEffect (blochează)
  setUp → render, tot înainte
browserul desenează ecranul
useEffect rulează după desenare
```
Legătură: RE-10. FE-06 detaliază dependențele, iar FE-08 cursa din fetch. În Django, salvarea stă în view-ul de POST, nu într-un semnal care ghicește intenția.

### 11

Greu: da
Problema: Un coleg pune `useCallback` pe fiecare handler, ca să „optimizeze”. Copilul care primește handler-ul nu e în `memo`, deci se re-randează la fel de des, iar codul e mai greu de citit.
Ideea: Trei unelte, trei ținte. `useMemo(() => calc(a), [a])` ține minte rezultatul unui calcul și îl refolosește cât `a` e același. `useCallback(fn, [a])` ține minte funcția însăși, fără s-o apeleze, ca `useMemo(() => fn, [a])`. `memo(Comp)` ține minte componenta: React sare peste re-render-ul ei când toate props sunt egale după `Object.is`. Lucrează împreună: un obiect sau o funcție creată în părinte e nouă la fiecare render, deci strică `memo` dacă nu e stabilizată. `useCallback` ajută doar dacă funcția ajunge la un copil în `memo` sau în dependențele unui hook. React Compiler 1.0 memoizează automat; manual le adaugi după ce măsori cu Profiler.
Exemplu:
```tsx
const Row = memo(RowView); // ✓
function List({ items, rm }: P) {
  // ✓ aceeași cât rm nu se schimbă
  const del = useCallback(
    (id: string) => rm(id), [rm]);
  // ✓ calcul scump, refolosit
  const rows = useMemo(
    () => sortBy(items), [items]);
  return rows.map((x) => (
    <Row key={x.id} x={x}
      onDel={del} />
  ));
}
// ✗ useCallback cu Row fără memo
```
Pas cu pas:
```text
List render 2, items la fel
useMemo: [items] la fel → rows
useCallback: [rm] la fel → del
Row (memo): props egale
→ React sare peste Row
fără memo: Row se apelează oricum
```
Legătură: RE-11. RE-02: copiii se re-randează cu părintele; RE-06: același tipar stabilizează `value` la Context. Ca `functools.lru_cache` din Python, dar cu o singură intrare: React ține minte doar ultimul rezultat.

### 12

Greu: da
Problema: La fiecare tastă în căutare, o listă de 5.000 de rânduri se re-randează, iar literele apar în câmp cu întârziere. Un coleg pune `startTransition` în jurul lui `setQ`, iar câmpul nu se mai comportă normal.
Ideea: React împarte actualizările în urgente (tasta, click-ul, care trebuie să apară imediat) și neurgente (lista filtrată, tab-ul nou). `useTransition` dă `[isPending, startTransition]`: actualizările din `startTransition(() => setTab(t))` devin neurgente, se randează în fundal și pot fi întrerupte de o tastă, iar `isPending` arată că se lucrează. State-ul unui input controlat nu poate sta într-o tranziție. `useDeferredValue(q)` întoarce o copie a lui `q` care rămâne în urmă: React randează întâi cu valoarea veche, apoi încearcă în fundal cu cea nouă. Alegi `startTransition` când ai setter-ul și `useDeferredValue` când primești doar valoarea (un prop, rezultatul unui hook). Nu e debounce: nu are întârziere fixă și se adaptează la viteza dispozitivului. Lista grea stă în `memo`, altfel se re-randează și cu valoarea veche.
Exemplu:
```tsx
const [q, setQ] = useState("");
// ✗ inputul controlat în tranziție:
// start(() => setQ(v))
// ✓ câmpul urgent, lista amânată
const dq = useDeferredValue(q);
return (
  <>
    <input value={q}
      onChange={(e) =>
        setQ(e.target.value)} />
    <Slow q={dq} />
  </>
);
// Slow = memo(SlowView)
```
Pas cu pas:
```text
tastezi „a”: q = 'a', dq = ''
render urgent: câmpul arată 'a'
Slow (memo): dq la fel → sărit
fundal: render cu dq = 'a'
tastezi „b” între timp
→ render-ul din fundal se oprește
→ reia cu dq = 'ab'
```
Legătură: RE-12. Punctul 11 explică de ce `Slow` are nevoie de `memo`. Seamănă cu o corutină asyncio care cedează controlul la `await`: React randează în bucăți și lasă browserul să proceseze tastele între ele.

### 13

Greu: da
Problema: Un `<label htmlFor="mail">` stă într-o componentă folosită de două ori pe pagină, iar click pe a doua etichetă mută focusul în primul câmp. Altă componentă copiază un store propriu în state cu un `useEffect` și un `useState`, iar codul se repetă în cinci locuri.
Ideea: Trei hook-uri pentru cazuri precise. `useId()` dă un id unic și stabil pentru fiecare instanță, pentru `htmlFor` și `aria-*`. E identic pe server și în client, unde un contor global sau `Math.random()` ar strica hidratarea. Nu e pentru `key`: cheile vin din date. `useSyncExternalStore(subscribe, getSnapshot)` abonează componenta la un store din afara React. `subscribe` primește un callback și întoarce dezabonarea; `getSnapshot` dă aceeași valoare cât store-ul nu se schimbă, altfel React intră într-o buclă de re-randări. Pentru state obișnuit rămân `useState` și `useReducer`. `useImperativeHandle(ref, () => ({ focus }))` expune printr-un ref doar câteva metode alese, nu tot nodul DOM. În React 19 `ref` vine ca prop obișnuit, fără `forwardRef`. Un ref e pentru comenzi (focus, scroll): `<Modal isOpen>`, nu `ref.open()`.
Exemplu:
```tsx
// ✗ id fix, dublat pe pagină:
// <input id="mail" />
const id = useId(); // ✓
<label htmlFor={id}>Email</label>
<input id={id} />
// ✓ subscribe în afara componentei
function sub(cb: () => void) {
  store.on(cb);
  return () => store.off(cb);
}
const n = useSyncExternalStore(
  sub, store.count);
```
Legătură: RE-13, RE-14. FE-03: cheile vin din date, nu din `useId`. Un SDK care își ține starea în afara React, cum e clientul Keycloak, e cazul tipic pentru `useSyncExternalStore`; TanStack Query și Zustand îl folosesc intern.

### 14

Greu: da
Problema: Un formular de salvare are trei `useState` (eroare, încărcare, rezultat), un `onSubmit` cu `preventDefault`, un `try` / `finally` și un buton care trebuie dezactivat cât durează cererea.
Ideea: React 19 numește acțiune (Action) o funcție, de obicei asincronă, care rulează într-o tranziție, și îi dă hook-uri. `useActionState(fn, initial)` întoarce `[state, formAction, isPending]`; `fn(prev, formData)` primește starea precedentă și datele formularului și întoarce starea nouă, de exemplu o eroare. Pui `<form action={formAction}>`, iar React rulează trimiterea într-o tranziție, fără `preventDefault`. `useFormStatus()` (din `react-dom`) dă `pending` pentru formularul părinte, deci îl apelezi într-un copil, cum e butonul; în componenta care randează `<form>` rămâne `false`. `useOptimistic(value)` arată valoarea așteptată cât rulează acțiunea; la final se vede din nou `value`, deci un eșec readuce ecranul la ce era. `use(promise)` suspendă componenta până se rezolvă promisiunea, iar `Suspense` arată fallback-ul; promisiunea vine din cache sau din părinte, nu e creată în render. `use(Ctx)` citește un Context, ca `useContext`, dar poate sta într-un `if`.
Exemplu:
```tsx
async function save(
  prev: string, fd: FormData,
) {
  const r = await post(fd);
  return r.ok ? "" : "Eroare";
}
const [err, act, busy] =
  useActionState(save, "");
<form action={act}>
  <input name="title" />
  <Submit /> {/* ✓ pending */}
  <p>{busy ? "Se trimite" : err}</p>
</form>
// ✗ use(fetch(url)) în render
```
Pas cu pas:
```text
submit → act(formData)
tranziție: busy = true
Submit: pending = true
save(prev, fd) → await post
return "Eroare" → err
busy = false, pending = false
```
Legătură: RE-15, RE-16. Ca un view Django care primește `request.POST` și întoarce formularul cu erori, aici `fn(prev, formData)`. `useActionState` urmează tiparul `reducer(state, action)` din punctul 6.
