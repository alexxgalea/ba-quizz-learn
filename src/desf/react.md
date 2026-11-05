<!-- Desfășurările fișei `react` (8 puncte; exemple TSX, verificate de mână în vitest cu react 19.3, jsdom și Testing Library: tichetul 03). Format frontend: 90–140 de cuvinte, ~250 la `Greu: da`, exemplu ≤ 14 rânduri, Pas cu pas ≤ 8 rânduri. Format și reguli: lib.mjs (checkDesf, DESF_LIMITS_FE), .scratch/frontend-extins/spec.md. Faptele: research/interview-facts.md, secțiunea 44. -->

### harta

Problema: React pare simplu până apar bug-urile care nu au o eroare în consolă: un contor care nu se mișcă, o listă care nu se actualizează, un câmp în care nu poți scrie, un formular care ține textul utilizatorului precedent. Toate pornesc din câteva reguli pe care React le aplică la fiecare render și pe care nu le vezi în cod. Modulul le ia pe rând: ce e o componentă, ce declanșează un re-render, cum se schimbă state-ul, unde stă state-ul și cum își dă seama React ce păstrează. Mecanismul efectelor și al memoizării vine după el, în `frontend`; limbajul de dedesubt, în `js` și `ts`.

Grupuri:
- 1–2: componenta și re-render-ul (funcție pură, ce declanșează randarea)
- 3–4: state-ul și câmpurile (copie, nu modificare; input controlat)
- 5–7: unde stă state-ul (ridicare, reducer și Context, custom hooks)
- 8: cum alege React ce păstrează (reconcilierea și `key`)

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
