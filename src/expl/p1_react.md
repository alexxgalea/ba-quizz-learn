<!-- React: bazele (modulul react, frontend extins). Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). Fapte verificate pe react.dev și rulate în vitest (react 19.3, jsdom): research/interview-facts.md, secțiunea 44. -->

### re-01
Pe scurt: Afișează `2`: React apelează componenta de două ori în dev, iar randarea modifică `total`, o variabilă din afara funcției.
Scop: Recunoști o componentă impură. Întrebarea apare ca „de ce vezi valori duble în dev?” sau „ce e Strict Mode?”.
Mecanism: O componentă trebuie să dea același JSX pentru aceleași props și să nu modifice, în timpul randării, nimic din ce exista înainte. `total += n` modifică o variabilă din modul, deci e un efect lateral. În dev, Strict Mode apelează fiecare componentă de două ori, ca să scoată la iveală asemenea efecte: `total` ajunge la 2.
Pas cu pas:
```text
Strict Mode: apel 1 → total = 1
Strict Mode: apel 2 → total = 2
ecran: 2 (greșit)
varianta pură: <b>{n}</b>
→ apel 1: 1, apel 2: 1, ecran: 1
```
Aplicare:
```tsx
type P = { n: number };
function Badge({ n }: P) {
  return <b>{n}</b>;
}
```
Legătură: E ideea unei funcții pure din Python: fără efecte laterale, același rezultat pentru aceleași argumente. Un template Django face la fel: citește contextul și produce HTML. Strict Mode e și motivul pentru care un `useEffect` rulează de două ori în dev (FE-07).
Limită: Doar randarea trebuie să fie pură. Un handler de click sau un `useEffect` pot modifica ce vor.
La interviu: „O componentă e o funcție pură de props și state. În timpul randării nu modific variabile din afară, props sau state. Strict Mode o apelează de două ori în dev tocmai ca să prindă asta.”
Verificare: Ai `const items: string[] = []` declarat în interiorul componentei, iar în corp faci `items.push("x")`. Încalcă regula de puritate?
Răspuns verificare: Nu. Array-ul e creat chiar în funcție, la fiecare apel, deci modificarea lui e locală. Regula interzice doar modificarea a ce exista înainte de render.
Varianta greșită B: Strict Mode apelează componentele de două ori în dev, nu o dată. Tocmai de aceea impuritatea se vede.
Varianta greșită C: `total` e declarat în afara funcției, deci nu se resetează la apel. Rămâne între apeluri.
Varianta greșită D: O componentă poate citi o variabilă din modul. Problema e că o modifică.

### re-02
Pe scurt: `Parent`, `A` și `B`: copiii se re-randează odată cu părintele, chiar dacă nu au primit props noi.
Scop: Știi ce declanșează un re-render și ce nu. Întrebarea apare ca „de ce se redesenează copiii?” sau „când ajută `memo`?”.
Mecanism: `setQ` schimbă state-ul lui `Parent`, deci React îl apelează din nou. Apelul coboară în toți copiii lui, indiferent de props. Butonul „h” modifică `hits.current`, o ref: React nu urmărește refs, deci nu se apelează nimic.
Pas cu pas:
```text
click pe „q": setQ(q + 'a')
Parent se apelează
A se apelează (fără props)
B se apelează (fără props)
click pe „h": hits.current++
nu se apelează nimic
```
Aplicare:
```tsx
const Child = memo(() => {
  return <p>fix</p>;
});
```
Legătură: PY-07 tratează identitatea obiectelor; `memo` compară props tot după identitate. În `frontend` (FE-06) un effect pornește tot de la un render.
Limită: `memo` sare peste copil doar dacă props sunt aceleași după `Object.is`. Un obiect sau o funcție creată în părinte e nouă la fiecare render.
La interviu: „Re-render vine din state propriu, din re-render-ul părintelui sau dintr-un Context schimbat. Copiii se re-randează cu părintele, chiar fără props noi. Refs și variabilele locale nu declanșează nimic.”
Verificare: După `setQ`, `A` se apelează din nou, dar DOM-ul lui se reface?
Răspuns verificare: Nu neapărat. React apelează funcția, apoi aplică în DOM doar diferențele dintre randări. Dacă `A` întoarce același JSX, nodurile DOM nu se ating.
Varianta greșită B: Props identice nu opresc re-render-ul. Pentru asta ai nevoie de `memo`.
Varianta greșită C: State-ul propriu nu e condiția: un copil fără state se re-randează tot odată cu părintele.
Varianta greșită D: Faptul că `q` nu apare în JSX nu contează. Re-render-ul se declanșează de schimbarea state-ului, nu de ce e afișat.

### re-03
Pe scurt: `push` modifică același array, iar `Object.is` îl vede neschimbat, deci React sare peste re-render.
Scop: Prinzi cea mai frecventă greșeală din React. Apare în orice listă ținută în state.
Mecanism: `setItems(valoare)` compară `valoare` cu state-ul curent prin `Object.is`, adică după referință. După `push`, `items` e același array, cu un element în plus. Referința nu s-a schimbat, deci React nu re-randează. Un array nou, `[...items, x]`, are altă referință.
Pas cu pas:
```text
render 1: items = A (gol)
push('x') → A = ['x']
setItems(A) → Object.is(A, A) = true
nu se re-randează
cu [...A, 'x'] → B ≠ A
render 2: items = B
```
Aplicare:
```tsx
const add = (x: string) =>
  setItems([...items, x]);
```
Legătură: JS-01 și PY-13: copia superficială împarte referințele. Același efect îl dă `sort()` pe state (JS-06).
Limită: Elementul adăugat cu `push` apare totuși la următorul render, produs de altceva (alt `setState`). De aceea bug-ul pare intermitent.
La interviu: „React compară state-ul prin `Object.is`. Dacă modific array-ul pe loc și îl dau înapoi, referința e aceeași și nu re-randează. Dau mereu o copie nouă.”
Verificare: De ce `setItems(prev => [...prev, x])` e mai sigur decât `setItems([...items, x])` când handlerul adaugă două elemente la rând?
Răspuns verificare: `items` e valoarea din render-ul curent. Două apeluri în același handler pleacă amândouă de la ea. `prev` e starea după actualizările deja puse în coadă.
Varianta greșită B: `setItems` nu amână nimic până la un click următor: comparația se face imediat.
Varianta greșită C: `push` întoarce lungimea, dar valoarea lui nu se folosește aici: `setItems` primește `items`.
Varianta greșită D: `const` nu împiedică `push`, fiindcă legarea nu se schimbă. Și `let` ar fi dat același rezultat.

### re-04
Pe scurt: Textul nu apare: `value` îl forțează la `""`, iar React avertizează că e un câmp fără `onChange`.
Scop: Distingi inputul controlat de cel necontrolat. Întrebarea apare la formulare.
Mecanism: Cu `value`, inputul e controlat: după fiecare tastă React pune în DOM valoarea din state. Fără `onChange`, state-ul nu se schimbă, deci valoarea rămâne `""`. Consola spune: „You provided a `value` prop to a form field without an `onChange` handler. This will render a read-only field.”
Pas cu pas:
```text
tastezi „a"
nimeni nu cheamă setName
state rămâne ""
React readuce câmpul la ""
cu onChange → setName('a') → 'a'
```
Aplicare:
```tsx
<input
  value={name}
  onChange={(e) =>
    setName(e.target.value)}
/>
```
Legătură: Un formular Django primește valorile la submit, ca un câmp necontrolat. Cu `value`, sursa adevărului trece în state, iar React o impune în DOM.
Limită: Un câmp necontrolat (`defaultValue`) e bun pentru formulare simple. Controlat folosești când validezi la fiecare tastă sau când valoarea apare și în altă parte.
La interviu: „Un input controlat are `value` din state și `onChange` care îl actualizează. Fără `onChange`, câmpul rămâne înghețat. `value` trebuie să fie mereu string, altfel React îl tratează ca necontrolat.”
Verificare: Ce eroare apare când `value` pornește ca `undefined` și devine mai târziu un string?
Răspuns verificare: React avertizează că o componentă trece de la un input necontrolat la unul controlat. Soluția: inițializezi state-ul cu `""` sau folosești `value={x ?? ""}`.
Varianta greșită B: State-ul nu se actualizează fără `setName`, iar textul nu apare nici în câmp.
Varianta greșită C: Nimic nu actualizează state-ul singur: `value` nu creează o legătură în ambele sensuri.
Varianta greșită D: React nu aruncă eroare și nu scoate componenta. Doar avertizează în consolă.

### re-05
Pe scurt: State-ul urcă în părintele comun și coboară prin props; `Filter` primește un callback pentru schimbare.
Scop: Știi unde pui state-ul când două componente depind de el. E o întrebare clasică de design de componente.
Mecanism: Fiecare apel `useState` creează o variabilă separată, deci `q` din `Filter` și `q` din `List` sunt două variabile. Informația comună trebuie să aibă un singur proprietar: cel mai apropiat părinte. El dă valoarea în jos prin props și primește schimbarea printr-un callback.
Pas cu pas:
```text
Page: q = ""
Filter scrie „ro" → onQ('ro')
Page: setQ('ro')
Page se re-randează
List primește items filtrate cu 'ro'
```
Aplicare:
```tsx
const [q, setQ] = useState("");
const shown = all.filter(x =>
  x.includes(q));
<Filter q={q} onQ={setQ} />
<List items={shown} />
```
Legătură: E arhitectura unui view Django: ține datele și le trimite template-urilor. Când nivelurile se înmulțesc, mergi spre Context (RE-06) sau un store.
Limită: Nu urci tot state-ul în rădăcină. Doar ce este folosit de mai multe componente; restul rămâne local.
La interviu: „Ridic state-ul în cel mai apropiat părinte comun și îl dau în jos prin props, cu un callback pentru schimbare. Fiecare informație are un singur proprietar, iar ce pot calcula din state nu devine state.”
Verificare: Lista filtrată trebuie păstrată în state, în părinte?
Răspuns verificare: Nu. O calculezi în render din `all` și `q`. O copie în state ar putea ieși din sincron cu sursa.
Varianta greșită B: Un `useEffect` care copiază state-ul între frați duplică informația și adaugă un render în plus.
Varianta greșită C: Variabila din afara componentelor nu declanșează re-render: React nu știe că s-a schimbat.
Varianta greșită D: `memo` oprește re-randări, nu transmite date între componente.

### re-06
Pe scurt: Ecranul rămâne la fel: reducer-ul întoarce aceeași referință, iar React vede „neschimbat”.
Scop: Știi regula reducer-ului: pur, cu stare nouă. Apare la `useReducer` și la Redux.
Mecanism: `dispatch` pune acțiunea în coadă. La următorul render, React rulează reducer-ul cu starea curentă și acțiunea și compară rezultatul cu starea curentă prin `Object.is`. Aici `state.items.push(…)` modifică obiectul pe loc și `return state` întoarce același obiect: rezultat identic, ecran la fel. Reducer-ul nu aruncă nicio eroare.
Pas cu pas:
```text
dispatch({ type: 'add' })
reducer(state, a):
  state.items.push('x') (pe loc)
  return state (aceeași ref.)
Object.is(vechi, nou) → true
ecran la fel
```
Aplicare:
```tsx
return {
  ...state,
  items: [...state.items, a.item],
};
```
Legătură: Aceeași regulă ca la `useState` (RE-03). Redux Toolkit îți dă voie să scrii cod „mutabil” pentru că folosește Immer, care produce starea nouă dedesubt.
Limită: În Strict Mode, React apelează reducer-ul de două ori ca să prindă impuritățile. Un reducer care modifică starea pe loc ar modifica starea de două ori.
La interviu: „Un reducer e pur: ia starea și acțiunea și întoarce starea nouă. Dacă o modific pe loc și întorc același obiect, React compară prin `Object.is` și nu actualizează ecranul.”
Verificare: Ce e mai mult în cod decât un `useState`, și ce câștigi?
Răspuns verificare: Scrii reducer-ul și acțiunile. Câștigi logica de actualizare într-un singur loc, testabilă separat de componentă.
Varianta greșită B: Reducer-ul chiar rulează, dar asta nu ajunge: React afișează doar ce vede diferit de starea veche.
Varianta greșită C: React nu blochează modificarea pe loc și nu aruncă nicio eroare. Defectul se vede doar pe ecran.
Varianta greșită D: Ecranul nu se actualizează deloc la acest `dispatch`, deci nici cu un element, nici cu două.

### re-07
Pe scurt: `B` arată `0`: fiecare apel al hook-ului are propriul state, deci `A` și `B` au câte un contor.
Scop: Știi ce partajează un custom hook. Răspunsul greșit apare des: „hook-ul meu partajează state-ul”.
Mecanism: Un custom hook e o funcție care apelează alte hook-uri. `useState` din `useCounter` creează state în componenta care apelează hook-ul. `A` și `B` îl apelează separat, deci au două variabile. Hook-ul partajează codul, nu valorile.
Pas cu pas:
```text
A apelează useCounter() → n_A = 0
B apelează useCounter() → n_B = 0
click în A: n_A = 1
n_B rămâne 0
```
Aplicare:
```tsx
function Page() {
  const c = useCounter();
  return (
    <>
      <A c={c} />
      <B c={c} />
    </>
  );
}
```
Legătură: E ca o funcție fabrică în Python: fiecare apel `Counter()` dă un obiect nou. `useQuery` din TanStack Query e tot un custom hook (FE-04).
Limită: Două componente care cer același cache de date par să partajeze state-ul, dar îl partajează biblioteca, în afara hook-ului.
La interviu: „Un custom hook partajează logică, nu state. Fiecare componentă care îl apelează are state-ul ei. Pentru state comun îl ridic în părinte sau folosesc Context.”
Verificare: Ce reguli respecți când scrii un custom hook?
Răspuns verificare: Numele începe cu `use`, iar hook-urile se apelează doar la nivelul de sus, nu în condiții sau bucle. Linter-ul din `eslint-plugin-react-hooks` le verifică.
Varianta greșită B: Un hook nu e un loc comun de stocare: `useState` din interiorul lui creează state pentru cine îl apelează.
Varianta greșită C: Re-render-ul părintelui nu leagă cele două contoare. Fiecare are propria valoare.
Varianta greșită D: Un hook poate fi apelat în câte componente vrei. Regula este doar despre locul apelului.

### re-08
Pe scurt: „ana” rămâne: același tip pe aceeași poziție păstrează state-ul. `<Form key={mode} />` îl golește.
Scop: Înțelegi când React păstrează și când distruge state-ul. Apare la formulare care nu se resetează și la liste.
Mecanism: React compară arborele nou cu cel vechi, poziție cu poziție. Ambele ramuri ale ternarului sunt `<Form />` pe aceeași poziție, deci React păstrează componenta și state-ul ei. O cheie schimbă identitatea: `key={mode}` nou înseamnă componentă nouă, deci React o distruge pe cea veche și o montează pe cea nouă, cu state-ul gol.
Pas cu pas:
```text
render 1: <Form/> poz.0, 'ana'
mode = 'register' → render 2
<Form/> poz. 0, același tip
→ state păstrat: 'ana'
cu key={mode}: cheie nouă
→ unmount, mount → text ''
```
Aplicare:
```tsx
<Form key={mode} />
```
Legătură: FE-03: la liste, `key={index}` mută state-ul pe alt rând la reordonare. La fel în Django: un formular nou are câmpuri goale, dar acolo creezi alt obiect, nu reutilizezi unul.
Limită: O componentă definită în interiorul alteia e un tip nou la fiecare render. React o distruge și o recreează, deci își pierde state-ul la fiecare re-render.
La interviu: „React păstrează state-ul unei componente cât timp același tip rămâne pe aceeași poziție. Ca să resetez un formular, îi dau o `key` care se schimbă. Nu definesc componente în interiorul altora.”
Verificare: De ce un `useEffect` care golește câmpul la schimbarea `mode` e mai slab decât `key`?
Răspuns verificare: Effect-ul rulează după randare, deci utilizatorul vede un render cu textul vechi, apoi altul cu câmpul gol. `key` reface componenta din prima, fără render în plus.
Varianta greșită B: Pentru React contează tipul și poziția, nu ramura de cod din care vine elementul.
Varianta greșită C: Props noi nu resetează state-ul. Resetarea cere alt tip sau altă cheie.
Varianta greșită D: Un `useEffect` ar merge, dar nu e singura soluție; `key` e cea recomandată.

### re-09
Pe scurt: `let id` se recreează cu `0` la fiecare render, deci `stop` șterge alt id. ID-ul stă într-un `useRef`.
Scop: Știi unde ții o valoare care trebuie păstrată între randări, dar nu apare pe ecran. Întrebarea apare ca „când folosești `useRef` în loc de `useState`?”.
Mecanism: O componentă e o funcție, iar React o apelează din nou la fiecare render. `let id = 0` e o variabilă locală a apelului. După primul tick, `setN` re-randează `Timer`: apare un `id` nou, egal cu `0`, iar `stop` din randarea curentă îl vede pe acesta. Intervalul real are alt id și rămâne pornit. `useRef` dă un obiect `{ current }` care e același la fiecare render, iar schimbarea lui nu cere re-render.
Pas cu pas:
```text
render 1: id = 0
start: id = 7 (în render 1)
tick: setN(1) → render 2
render 2: id = 0 (variabilă nouă)
stop (din render 2): clear(0)
intervalul 7 rulează mai departe
```
Aplicare:
```tsx
const id = useRef(0);
const start = () => {
  id.current =
    window.setInterval(tick, 1000);
};
const stop = () =>
  clearInterval(id.current);
```
Legătură: RE-02: o ref nu declanșează re-render. În Python ar fi diferența dintre o variabilă locală a unei funcții și un atribut al unui obiect care trăiește între apeluri.
Limită: `useState` ar merge și el, fiindcă `stop` din randarea următoare ar vedea id-ul nou, dar fiecare pornire ar cere un re-render inutil. ID-ul nu apare pe ecran, deci locul lui e în ref.
La interviu: „Ce apare pe ecran ține de `useState`. Ce trebuie doar păstrat între randări, cum e ID-ul unui timer, stă în `useRef`: e același obiect la fiecare render și nu cere re-render.”
Verificare: Poți citi `id.current` în JSX, ca să afișezi id-ul?
Răspuns verificare: Nu e o idee bună. Ref-ul nu cere re-render când se schimbă, deci ecranul ar arăta o valoare veche. Documentația cere să nu citești și să nu scrii `ref.current` în timpul randării; ce apare pe ecran ține de state.
Varianta greșită B: `clearInterval` merge oriunde, inclusiv într-un handler. Problema e id-ul pe care îl primește.
Varianta greșită C: `setN` doar schimbă numărul; nimic din render nu pornește alt interval.
Varianta greșită D: `window.setInterval` întoarce un număr, id-ul intervalului, nu o promisiune.

### re-10
Pe scurt: `useLayoutEffect` în loc de `useEffect`: măsurarea și `setUp` se aplică înainte ca browserul să deseneze ecranul.
Scop: Știi diferența dintre cele două efecte și singurul caz în care alegi `useLayoutEffect`. Întrebarea apare ca „ce diferență e între `useEffect` și `useLayoutEffect`?”.
Mecanism: După render, React scrie modificările în DOM. `useEffect` rulează după ce browserul a desenat ecranul, deci utilizatorul vede întâi tooltip-ul sub buton, apoi `setUp(true)` îl mută. `useLayoutEffect` rulează după scrierea în DOM, dar înainte de desenare, iar re-render-ul cerut din el se termină tot înainte de desenare. Utilizatorul vede doar poziția finală.
Pas cu pas:
```text
useEffect:
render → DOM → desenare (jos)
effect: h = 60 → setUp(true)
render → DOM → desenare (sus)
useLayoutEffect:
render → DOM → effect → setUp
render → DOM → desenare (sus)
```
Aplicare:
```tsx
useLayoutEffect(() => {
  const h = ref.current!.offsetHeight;
  setUp(h > 40);
}, []);
```
Legătură: FE-06: dependențele funcționează la fel la ambele efecte. E aceeași idee ca la double buffering în grafică: pregătești cadrul complet înainte să-l afișezi.
Limită: `useLayoutEffect` blochează desenarea, deci un calcul lent în el face pagina să pară înghețată. Nu rulează pe server: acolo nu există layout.
La interviu: „`useEffect` rulează după ce browserul desenează, deci nu blochează nimic. `useLayoutEffect` rulează înainte de desenare și îl folosesc doar ca să măsor DOM-ul, de exemplu poziția unui tooltip, fără pâlpâire.”
Verificare: De ce nu muți pur și simplu măsurarea în corpul componentei?
Răspuns verificare: În timpul randării DOM-ul nou nu există încă: la primul render `ref.current` e `null`. Iar documentația cere să nu citești refs în timpul randării.
Varianta greșită B: În corpul componentei DOM-ul nu e încă scris, iar `ref.current` e `null` la primul render.
Varianta greșită C: `up` în dependențe doar ar rula effect-ul din nou, tot după desenare. Pâlpâirea rămâne.
Varianta greșită D: `useMemo` rulează în timpul randării, înainte să existe DOM-ul de măsurat.

### re-11
Pe scurt: `memo(Row)`. `del` e deja stabilă, dar fără `memo` copilul se re-randează odată cu părintele oricum.
Scop: Înțelegi că `useCallback`, `useMemo` și `memo` lucrează împreună. Întrebarea apare ca „când folosești `useCallback`?”.
Mecanism: La fiecare tastă `setQ` re-randează `List`, iar React apelează din nou toți copiii. `useCallback` face ca `del` să fie aceeași funcție între randări, dar asta contează doar pentru cine compară props. Un copil obișnuit nu compară nimic. `memo(Row)` compară props cu `Object.is`: `x` și `onDel` sunt aceleași, deci React sare peste `Row`.
Pas cu pas:
```text
tastă: setQ('a') → List render 2
del: aceeași funcție (useCallback)
Row fără memo → se apelează
Row cu memo:
  x la fel, onDel la fel → sărit
```
Aplicare:
```tsx
const Row = memo(function Row(
  { x, onDel }: RowProps,
) {
  return <li onClick={() =>
    onDel(x.id)}>{x.t}</li>;
});
```
Legătură: RE-02: copiii se re-randează cu părintele. RE-06 aplică același tipar la `value` din Context.
Limită: Cu React Compiler 1.0, memoizarea se face automat la build, iar `useCallback` manual devine rar. Fără compilator, memoizezi după ce măsori cu Profiler.
La interviu: „`useCallback` ține minte funcția, dar ajută doar dacă o primește un copil în `memo` sau un hook în dependențe. Fără `memo` pe copil, nu schimbă nimic.”
Verificare: Ce ține minte `useMemo` și ce ține minte `useCallback`?
Răspuns verificare: `useMemo` ține minte rezultatul unei funcții, pe care o apelează. `useCallback` ține minte funcția însăși, fără s-o apeleze. `useCallback(fn, deps)` e ca `useMemo(() => fn, deps)`.
Varianta greșită B: Cu `q` în dependențe, `del` ar deveni o funcție nouă la fiecare tastă, deci și mai rău.
Varianta greșită C: `useMemo(() => fn, [])` dă exact același lucru ca `useCallback(fn, [])`. Lipsește tot `memo`.
Varianta greșită D: `useCallback` nu oprește niciun re-render; doar păstrează identitatea funcției.

### re-12
Pe scurt: State-ul unui input controlat nu poate sta într-o tranziție. Câmpul rămâne urgent, iar `Slow` primește `useDeferredValue(q)` și stă în `memo`.
Scop: Știi diferența dintre actualizările urgente și cele amânate. Întrebarea apare ca „cum faci ca o listă grea să nu blocheze tastarea?”.
Mecanism: O tranziție marchează o actualizare ca neurgentă: React o poate amâna sau întrerupe. Un câmp de text are nevoie să arate tasta imediat, iar documentația spune explicit că o tranziție nu poate controla un input. Soluția separă valorile: `q` rămâne urgent pentru `value`, iar `dq = useDeferredValue(q)` rămâne în urmă. La tastă, React randează întâi cu `dq` vechi și sare peste `Slow` (în `memo`), apoi randează în fundal cu `dq` nou.
Pas cu pas:
```text
tastă „a”: q = 'a', dq = ''
render urgent: câmpul → 'a'
Slow (memo): dq la fel → sărit
fundal: dq = 'a' → Slow lucrează
tastă „b” → fundalul se oprește
```
Aplicare:
```tsx
const dq = useDeferredValue(q);
<input value={q} onChange={(e) =>
  setQ(e.target.value)} />
<Slow q={dq} />
```
Legătură: RE-11: fără `memo`, `Slow` se re-randează și cu valoarea veche. Seamănă cu asyncio: o corutină lungă trebuie să cedeze controlul ca restul să meargă.
Limită: `useDeferredValue` nu face randarea mai rapidă; o face întreruptibilă. Dacă lista e prea mare, ajută și virtualizarea (doar rândurile vizibile).
La interviu: „O tranziție marchează o actualizare ca neurgentă, dar nu o pot folosi pentru state-ul unui input. Las câmpul urgent și dau listei `useDeferredValue(q)`, cu lista în `memo`. Spre deosebire de debounce, nu am o întârziere fixă.”
Verificare: Când alegi `startTransition` în loc de `useDeferredValue`?
Răspuns verificare: Când ai acces la setter și actualizarea nu controlează un input, de exemplu schimbarea unui tab: `startTransition(() => setTab(t))`, cu `isPending` pentru un indicator. `useDeferredValue` e pentru o valoare primită: un prop sau rezultatul unui hook.
Varianta greșită B: `isPending` doar raportează o tranziție; poți ignora valoarea, ca în cod, și tranziția pornește oricum.
Varianta greșită C: `startTransition` primește și funcții sincrone, și asincrone.
Varianta greșită D: Documentația spune exact opusul: tranzițiile nu pot controla un input de text.

### re-13
Pe scurt: Focusul merge în primul câmp, fiindcă id-ul se repetă. `const id = useId()` dă un id per instanță.
Scop: Știi pentru ce e `useId`. Întrebarea apare la componente reutilizabile de formular și la accesibilitate.
Mecanism: `htmlFor="mail"` caută în document elementul cu id-ul `mail`, iar browserul îl alege pe primul. Cu două instanțe, ambele etichete arată spre primul câmp. `useId()` dă fiecărei instanțe un id diferit, care rămâne același între randări și e identic pe server și în client.
Pas cu pas:
```text
Field 1: label → #mail (câmp 1)
Field 2: label → #mail (câmp 1)
cu useId:
Field 1: _r_0_ → câmp 1
Field 2: _r_1_ → câmp 2
```
Aplicare:
```tsx
function Field() {
  const id = useId();
  return (<>
    <label htmlFor={id}>Email</label>
    <input id={id} />
  </>);
}
```
Legătură: FE-03: cheile din liste vin din date, nu din `useId`. În Django, un formset dă un prefix fiecărui formular din același motiv.
Limită: `useId` nu e pentru `key` și nici pentru selectori CSS. Pentru un grup de câmpuri, iei un singur id și adaugi sufixe: `id + "-mail"`.
La interviu: „Un id fix într-o componentă reutilizabilă se dublează pe pagină. `useId` dă un id unic per instanță, stabil și identic între server și client, deci nu strică hidratarea.”
Verificare: De ce nu folosești un contor global, `let next = 0; id = next++`?
Răspuns verificare: Pe server și în client componentele pot fi randate în altă ordine, deci id-urile ar diferi și hidratarea ar eșua. Un contor crește și la fiecare render, nu doar o dată pe instanță.
Varianta greșită B: React nu modifică valoarea unui atribut `id`; o pune în DOM exact cum o scrii.
Varianta greșită C: `htmlFor` nu caută câmpul vecin: caută după id în tot documentul.
Varianta greșită D: `Math.random()` dă alt id la fiecare render și altul pe server decât în client.

### re-14
Pe scurt: O buclă de re-randări: `getSnapshot` dă un obiect nou la fiecare apel. React avertizează, apoi aruncă `Maximum update depth exceeded`.
Scop: Știi cum se conectează o componentă la un store din afara React și capcana principală. Întrebarea apare la integrarea unei biblioteci sau a unui SDK.
Mecanism: React apelează `getSnapshot` de mai multe ori și compară rezultatele cu `Object.is`. Dacă diferă, consideră că store-ul s-a schimbat și randează din nou. Funcția din cod construiește `{ n: 1 }` nou la fiecare apel, deci rezultatul diferă mereu. React scrie în consolă „The result of getSnapshot should be cached to avoid an infinite loop”, apoi oprește bucla cu eroarea.
Pas cu pas:
```text
getSnapshot() → obiect A
getSnapshot() → obiect B
Object.is(A, B) → false
→ „s-a schimbat” → render
→ iar A ≠ B → render …
→ Maximum update depth
```
Aplicare:
```tsx
const n = useSyncExternalStore(
  store.subscribe,
  () => store.n,
);
```
Legătură: RE-03: aceeași comparație prin `Object.is` decide și la `useState`. TanStack Query și Zustand folosesc `useSyncExternalStore` intern.
Limită: Pentru state obișnuit, documentația recomandă `useState` și `useReducer`. `useSyncExternalStore` e pentru cod din afara React.
La interviu: „`useSyncExternalStore` primește `subscribe` și `getSnapshot`. `getSnapshot` trebuie să dea aceeași valoare cât store-ul nu s-a schimbat; un obiect nou la fiecare apel produce o buclă de re-randări.”
Verificare: De ce declari `subscribe` în afara componentei?
Răspuns verificare: Dacă primește altă funcție `subscribe` la un re-render, React se dezabonează și se abonează din nou. O funcție declarată în afara componentei rămâne aceeași.
Varianta greșită B: React compară doar referințe, prin `Object.is`, nu conținutul obiectelor.
Varianta greșită C: Componenta nu ajunge să afișeze nimic stabil: obiectul nou declanșează randări repetate.
Varianta greșită D: `subscribe` poate fi declarat oriunde; în afara componentei e chiar varianta recomandată.

### re-15
Pe scurt: `useFormStatus` vede doar un `<form>` părinte. Într-o componentă `Submit`, randată în formular, merge.
Scop: Știi cum afișezi starea unei trimiteri în React 19. Întrebarea apare la formulare cu acțiuni.
Mecanism: `useFormStatus` citește starea formularului în care e randată componenta care îl apelează. `Form` randează `<form>`, deci formularul e copilul lui, nu părintele: `pending` rămâne `false`. Când butonul stă într-o componentă `Submit` pusă în `<form>`, `useFormStatus` din `Submit` vede formularul, iar `pending` e `true` cât rulează `save`.
Pas cu pas:
```text
Form: useFormStatus → fără părinte
click → save rulează
Form: pending = false (mereu)
Submit în <form>:
click → pending = true
save gata → pending = false
```
Aplicare:
```tsx
function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending}>
      Salvează
    </button>
  );
}
```
Legătură: RE-16 și punctul 14: acțiunile din React 19. În Django, ai dezactiva butonul cu JavaScript la `submit`; aici starea vine din React.
Limită: `useFormStatus` se importă din `react-dom`, nu din `react`. Pentru starea întoarsă de acțiune (eroarea), folosești `useActionState`.
La interviu: „`useFormStatus` dă `pending` pentru formularul părinte, deci îl apelez într-o componentă din interiorul formularului, de obicei butonul.”
Verificare: Ce dă `useActionState` și ce nu dă `useFormStatus`?
Răspuns verificare: `useActionState(fn, initial)` dă `[state, formAction, isPending]`: starea întoarsă de acțiune, de exemplu o eroare, și propriul `isPending`. `useFormStatus` dă doar starea trimiterii (`pending`, `data`, `method`, `action`), fără rezultat.
Varianta greșită B: O acțiune poate fi asincronă; tocmai atunci are rost `pending`.
Varianta greșită C: `pending` e `true` cât rulează acțiunea și redevine `false` la final.
Varianta greșită D: Cu `action={save}`, React trimite formularul și apelează `save` cu `FormData`, fără `onSubmit`.

### re-16
Pe scurt: Fallback-ul la nesfârșit: fiecare render creează altă promisiune, deci componenta se suspendă din nou.
Scop: Știi ce face `use(promise)` și condiția pe care o cere. Întrebarea apare la React 19 și Suspense.
Mecanism: `use(promise)` suspendă componenta cât promisiunea e în așteptare, iar `Suspense` arată fallback-ul. Când promisiunea se rezolvă, React apelează din nou `Albums`. Apelul face alt `fetch`, deci primește altă promisiune, încă în așteptare, și se suspendă iar. Lista nu apare niciodată. Promisiunea trebuie să fie aceeași între randări: vine din cache sau din părinte.
Pas cu pas:
```text
render 1: fetch → P1 → suspendat
P1 gata → React reia Albums
render 2: fetch → P2 → suspendat
P2 gata → render 3: P3 …
ecran: fallback mereu
```
Aplicare:
```tsx
function Albums(
  { p }: { p: Promise<Album[]> },
) {
  const list = use(p);
  return <List items={list} />;
}
```
Legătură: RE-15 și punctul 14: hook-urile din React 19. FE-08: în client, datele de la API le aduce de obicei TanStack Query, cu cache.
Limită: `use` nu poate sta într-un `try` / `catch`; o promisiune respinsă ajunge la cel mai apropiat error boundary. Spre deosebire de hook-uri, `use` poate fi apelat într-un `if`.
La interviu: „`use(promise)` suspendă componenta până se rezolvă promisiunea, cu `Suspense` deasupra. Promisiunea trebuie să fie aceeași între randări, deci vine din cache sau din părinte, nu e creată în render.”
Verificare: Ce diferență e între `use(Ctx)` și `useContext(Ctx)`?
Răspuns verificare: Citesc același Context, dar `use` poate fi apelat într-un `if` sau într-o buclă, iar `useContext` doar la nivelul de sus al componentei.
Varianta greșită B: Lista nu apare, fiindcă fiecare reluare a randării creează o promisiune nouă.
Varianta greșită C: `use` primește promisiuni și Context; asta e chiar rolul lui.
Varianta greșită D: Cât promisiunea e în așteptare, componenta e suspendată, deci se vede fallback-ul, nu o listă goală.
