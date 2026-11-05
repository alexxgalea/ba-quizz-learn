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
Limită: Doar randarea trebuie să fie pură. Un handler de click sau un effect pot modifica ce vor.
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
Verificare: De ce `setItems(prev => [...prev, x])` e mai sigur decât `setItems([...items, x])` când apeși de două ori repede?
Răspuns verificare: `items` e valoarea din render-ul curent. Două apeluri în același handler pleacă amândouă de la ea. `prev` e starea după actualizările deja puse în coadă.
Varianta greșită B: `setItems` nu așteaptă un click următor. Problema e referința neschimbată.
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
Varianta greșită B: Reducer-ul rulează la `dispatch`, dar rezultatul lui e aceeași referință, deci ecranul nu se schimbă.
Varianta greșită C: Nu aruncă nicio eroare: React nu blochează modificarea pe loc. Efectul este o stare neschimbată.
Varianta greșită D: `dispatch` nu amână acțiunea cu un click. Problema este referința, nu momentul.

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
Varianta greșită B: Contorul din `A` nu ajunge în `B`: state-ul nu stă în hook, ci în componentă.
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
Varianta greșită B: Ramura a doua nu e alt element: e același tip pe aceeași poziție.
Varianta greșită C: Props noi nu resetează state-ul. Resetarea cere alt tip sau altă cheie.
Varianta greșită D: Un `useEffect` ar merge, dar nu e singura soluție; `key` e cea recomandată.
