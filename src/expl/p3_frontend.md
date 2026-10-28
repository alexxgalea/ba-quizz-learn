<!-- Frontend: React, TypeScript, TanStack Query. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### fe-01
Pe scurt: Pentru erori prinse la compilare, nu în producție, și pentru refactoring sigur: compilatorul îți arată toate locurile afectate de o schimbare.
Scop: Într-un proiect React mare, lucrat de mai mulți oameni, tipurile devin documentație verificată automat și reduc bug-urile banale (props greșite, câmpuri lipsă).
Mecanism: TypeScript adaugă tipuri peste JavaScript. Compilatorul (`tsc`) verifică fiecare utilizare: dacă o componentă cere `alert: Alert`, iar tu îi dai altceva, primești eroare înainte de rulare. Apoi tipurile sunt șterse, iar în browser rulează JavaScript obișnuit.
Pas cu pas:
```text
type Props = { alert: Alert }
<AlertRow alert={alerts[0]} /> -> OK
<AlertRow alert={alerts} /> -> eroare
redenumești Alert.title -> tsc arată
  toate locurile de modificat
```
Aplicare: Migrezi treptat: activezi `allowJs`, treci fișier cu fișier de la `.js` la `.tsx`, cu `strict` activat pentru codul nou. Tipurile pentru API le generezi din schema OpenAPI sau GraphQL, ca să nu le scrii de mână.
Legătură: E pentru frontend ce sunt type hints-urile cu mypy pentru Python (RT-04): verificare statică, fără efect la runtime.
Limită: Tipurile dispar la runtime: dacă API-ul întoarce altceva decât ai declarat, TypeScript nu te salvează. Datele externe le validezi la runtime (zod) sau generezi tipurile din schema API-ului.
La interviu: „Migrez la TypeScript pentru erori prinse la compilare și refactoring sigur, mai ales în echipă. Tipurile dispar la runtime, deci validez datele de la API cu zod sau generez tipurile din schema OpenAPI.”
Verificare: Declari `type User = { name: string }`, dar API-ul întoarce uneori `name: null`. Ce se întâmplă?
Răspuns verificare: Compilarea trece, iar la runtime codul poate crăpa la `user.name.toUpperCase()`. TypeScript nu verifică datele reale, așa că le validezi la granița cu API-ul.
Varianta greșită B: TypeScript e compilat în JavaScript, deci rulează la aceeași viteză. Câștigul e la dezvoltare, nu la execuție.
Varianta greșită C: Tipurile sunt șterse la compilare, deci nu validează nimic la runtime. Pentru asta folosești o bibliotecă precum zod.
Varianta greșită D: React suportă în continuare JavaScript simplu: TypeScript e o alegere, nu o cerință.

### fe-02
Pe scurt: `{{ user, setUser }}` creează un obiect nou la fiecare render, iar React compară `value` după referință, deci toți consumatorii cred că s-a schimbat. Îl memoizezi cu `useMemo`.
Scop: Un Context folosit în toată aplicația poate re-randa sute de componente la fiecare render al providerului, fără nicio schimbare reală de date.
Mecanism: React compară noul `value` cu cel vechi prin `Object.is`: două obiecte cu același conținut, dar create separat, sunt diferite. Un obiect literal scris direct în JSX e recreat la fiecare render, deci fiecare render al providerului notifică toți consumatorii. Cu `useMemo`, obiectul se recreează doar când se schimbă `user`.
Pas cu pas:
```text
render 1: value = {user, setUser} -> A
render 2: value = {user, setUser} -> B
Object.is(A, B) -> false
-> toți consumatorii re-randează
cu useMemo(..., [user]) -> același obiect
```
Aplicare:
```tsx
const value = useMemo(() => ({ user, setUser }),
                      [user]);
return <UserContext.Provider value={value}>
  {children}
</UserContext.Provider>;
```
Legătură: E PY-07 în JavaScript: identitatea obiectelor față de egalitatea valorilor. React compară identitatea.
Limită: `useMemo` rezolvă re-randările fără schimbare reală. Dacă valoarea chiar se schimbă des, toți consumatorii tot re-randează: împarți contextul în mai multe sau folosești un store cu selectori (Zustand).
La interviu: „`value={{ user, setUser }}` creează un obiect nou la fiecare render, iar React compară după referință, deci toți consumatorii re-randează. Memoizez valoarea cu `useMemo`, iar pentru stare care se schimbă des folosesc un store cu selectori, ca Zustand.”
Verificare: Ai memoizat `value`, dar o componentă consumatoare folosește doar `setUser`. Re-randează când se schimbă `user`?
Răspuns verificare: Da: orice schimbare a valorii contextului re-randează toți consumatorii, indiferent ce câmp folosesc. Muți `setUser` într-un context separat sau folosești un store cu selectori.
Varianta greșită B: Context nu e lent prin design: problema e obiectul recreat la fiecare render. Redux sau MobX rezolvă alte probleme.
Varianta greșită C: `key` pe provider n-are legătură cu asta; un `key` care se schimbă l-ar recrea chiar mai des.
Varianta greșită D: `useEffect` rulează după render, deci nu poate opri re-randarea consumatorilor; ar adăuga doar un render în plus.

### fe-03
Pe scurt: Pentru că React leagă starea unei componente de `key`; la reordonare, indexul rămâne pe poziție, deci starea (de exemplu textul dintr-un input) ajunge la alt element.
Scop: Bug-urile de acest tip sunt subtile: lista arată corect, dar un checkbox bifat sau un text introdus „sare” pe alt rând.
Mecanism: Între două render-uri, React identifică fiecare element după `key`. Dacă key-ul e indexul și ștergi primul element, fostul element 2 primește key-ul 0, iar React îi dă componenta (și starea) fostului element 0. Cu un ID stabil din date, fiecare element își păstrează componenta.
Pas cu pas:
```text
[A (key 0, input „x”), B (key 1)]
ștergi A -> [B (key 0)]
React: key 0 există -> refolosește
  componenta lui A -> „x” apare la B
cu key = id: B își păstrează starea
```
Aplicare:
```tsx
{alerts.map(a => (
  <AlertRow key={a.id} alert={a} />
))}
```
Legătură: E aceeași idee ca o cheie primară stabilă în DB: identitatea unui rând nu depinde de poziția lui în rezultat.
Limită: Indexul e acceptabil doar pentru liste statice, care nu se reordonează, nu se filtrează și nu primesc elemente la mijloc. Iar `key={Math.random()}` e și mai rău: recreează componenta la fiecare render.
La interviu: „React leagă starea componentelor de `key`. Cu indexul pe post de key, la reordonare sau ștergere starea ajunge la alt element, așa că folosesc un ID stabil din date.”
Verificare: Generezi key-ul cu `crypto.randomUUID()` direct în `map`, la fiecare render. Ce se întâmplă?
Răspuns verificare: La fiecare render toate key-urile sunt noi, deci React distruge și recreează toate componentele: pierzi starea și performanța. Key-ul trebuie să fie stabil, deci vine din date.
Varianta greșită B: JSX acceptă indexul ca key, iar React doar avertizează când key-ul lipsește. Problema apare la rulare, nu la compilare.
Varianta greșită C: Key-ul n-are legătură cu compilarea: îl folosește React la runtime, ca să potrivească elementele între render-uri.
Varianta greșită D: Problema nu ține de mărimea listei: și o listă de 3 elemente își amestecă starea la reordonare.

### fe-04
Pe scurt: `staleTime` spune cât timp datele sunt considerate proaspete (fără refetch); `gcTime` spune cât stau în cache datele nefolosite de nicio componentă, înainte să fie șterse.
Scop: Reglezi cât de des face aplicația request-uri și cât de repede afișează date când revii pe un ecran.
Mecanism: Cât timp datele sunt proaspete (sub `staleTime`), TanStack Query le servește direct, fără request. După aceea devin „vechi”: le afișează imediat, dar face refetch în fundal la mount, la focus pe fereastră sau la reconectare. Când nicio componentă nu mai folosește query-ul, datele mai stau în cache cât `gcTime` (implicit 5 minute), apoi sunt șterse. Implicit, `staleTime` e 0.
Pas cu pas:
```text
staleTime 30 s, gcTime 5 min
t=0: fetch -> afișat
t=10 s: alt ecran le cere -> din cache
t=40 s: vechi -> afișat + refetch
pleci de pe ecran -> șterse după 5 min
```
Aplicare:
```tsx
useQuery({
  queryKey: ["alerts", tenantId],
  queryFn: fetchAlerts,
  staleTime: 30_000,
});
```
Legătură: Seamănă cu TTL-ul din Redis (RD-11) combinat cu stale-while-revalidate (RD-04): datele vechi se servesc imediat, iar reîmprospătarea vine în fundal.
Limită: Un `staleTime` mare reduce request-urile, dar arată date vechi mai mult timp. Pentru alerte de securitate vrei date proaspete, deci valori mici sau invalidare explicită după mutații (`invalidateQueries`).
La interviu: „`staleTime` e cât timp datele sunt proaspete și nu se face refetch; `gcTime` e cât stau în cache datele nefolosite. Implicit, `staleTime` e 0 și `gcTime` 5 minute. După o mutație invalidez explicit query-urile afectate.”
Verificare: Cu valorile implicite, comuți pe alt tab și revii. Ce face TanStack Query?
Răspuns verificare: Afișează imediat datele din cache și face refetch în fundal: cu `staleTime` 0, datele sunt imediat vechi, iar focusul pe fereastră declanșează reîmprospătarea.
Varianta greșită B: Nu sunt identice: `gcTime` e noul nume al lui `cacheTime` (din v5), nu al lui `staleTime`.
Varianta greșită C: Timeout-urile și retry-ul se configurează separat (`retry`, `retryDelay`); `staleTime` și `gcTime` țin de cache.
Varianta greșită D: Polling-ul se configurează cu `refetchInterval`; `staleTime` doar marchează datele ca vechi, fără să declanșeze request-uri periodice.

### fe-05
Pe scurt: 1. În render-ul curent `n` e 0, deci toate trei apelurile cer același lucru: `n = 1`.
Scop: E cea mai des întâlnită surpriză din React. Arată dacă înțelegi că state-ul e un snapshot, nu o variabilă care se schimbă pe loc.
Mecanism: `setN(valoare)` nu schimbă `n`. Pune în coadă o cerere pentru render-ul următor. Până se termină handlerul, `n` rămâne 0, deci `n + 1` e 1 de trei ori. React grupează cererile (batching) și randează o singură dată.
Pas cu pas:
```text
render 1: n = 0
click: setN(0 + 1) -> coadă: 1
       setN(0 + 1) -> coadă: 1
       setN(0 + 1) -> coadă: 1
render 2: n = 1
cu setN(x => x + 1) x3:
  0 -> 1 -> 2 -> 3
```
Aplicare:
```tsx
function onClick() {
  setN(x => x + 1);
  setN(x => x + 1);
  setN(x => x + 1); // n = 3
}
```
Legătură: Seamănă cu `oop-01`: întrebarea e ce obiect vezi de fapt. Aici vezi valoarea „înghețată” a render-ului curent.
Limită: Updater function-ul contează doar când noua valoare depinde de cea veche. `setN(5)` de trei ori dă tot 5.
La interviu: „State-ul e un snapshot al render-ului: `setN(n + 1)` de trei ori cere de trei ori același 1. Când noua valoare depinde de cea veche, folosesc forma cu funcție, `setN(x => x + 1)`.”
Verificare: Ce afișează `console.log(n)` scris imediat după cele trei `setN` din handler?
Răspuns verificare: 0. `n` e valoarea render-ului curent; noua valoare apare abia în render-ul următor.
Varianta greșită B: 3 ar fi corect doar cu `setN(x => x + 1)`. Cu `n + 1` toate cererile pornesc de la același 0.
Varianta greșită C: `setN` chiar schimbă valoarea, doar că în render-ul următor. După click componenta arată 1, nu 0.
Varianta greșită D: Trei actualizări într-un handler sunt normale și se grupează într-un singur render. Eroarea „Too many re-renders” apare când chemi `setN` direct în corpul componentei.

### fe-06
Pe scurt: După fiecare render. Fără array de dependențe, React nu are ce compara, deci rulează efectul de fiecare dată.
Scop: Un efect fără array care face fetch sau `setState` poate crea o buclă: render → efect → setState → render.
Mecanism: După fiecare commit (DOM-ul e actualizat), React verifică efectele. Fără array, efectul rulează mereu. Cu `[]` rulează doar după primul render. Cu `[a, b]` compară fiecare dependență cu `Object.is` și rulează doar dacă una s-a schimbat. Înaintea fiecărei rulări noi se execută cleanup-ul celei vechi.
Pas cu pas:
```text
useEffect(f)
  -> după fiecare render
useEffect(f, [])
  -> doar după primul
useEffect(f, [q])
  -> când se schimbă q
cleanup -> înainte de rularea
  următoare și la unmount
```
Aplicare:
```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```
Legătură: Cleanup-ul seamănă cu `finally` sau cu un context manager din Python (PY-08): eliberezi resursa pe care ai luat-o.
Limită: Dependențele trebuie să fie complete. Un array incomplet nu „optimizează”, ci te lasă cu valori vechi; regula ESLint `react-hooks/exhaustive-deps` le verifică.
La interviu: „Fără array, efectul rulează după fiecare render; cu `[]`, doar o dată; cu dependențe, când se schimbă una. Cleanup-ul rulează înaintea următoarei execuții și la unmount.”
Verificare: Un efect fără array face `setCount(count + 1)`. Ce se întâmplă?
Răspuns verificare: Buclă infinită: fiecare render rulează efectul, efectul schimbă state-ul, iar asta cere un render nou.
Varianta greșită B: Așa se comportă un array gol, `[]`. Lipsa array-ului înseamnă „după fiecare render”.
Varianta greșită C: React nu se uită separat la props: fără array, orice render (din props, state sau părinte) rulează efectul.
Varianta greșită D: Efectele rulează după render, nu înainte. Logica dinaintea randării stă direct în corpul componentei.

### fe-07
Pe scurt: Strict Mode, doar în development, face după primul mount un unmount și un mount simulat. Scopul e să vadă dacă efectul are cleanup corect.
Scop: Un efect fără cleanup (interval, subscribe, conexiune WebSocket) lasă resurse agățate la fiecare navigare. Strict Mode face bug-ul vizibil imediat, nu după o oră de folosire.
Mecanism: La mount, React rulează efectul, apoi cleanup-ul, apoi efectul din nou. Dacă cleanup-ul anulează exact ce a făcut setup-ul, userul nu vede nicio diferență. Dacă lipsește, vezi două intervale, două conexiuni sau două request-uri. În producție ciclul în plus nu există.
Pas cu pas:
```text
dev, StrictMode:
  setup   -> conectează
  cleanup -> deconectează
  setup   -> conectează
producție:
  setup   -> conectează
```
Aplicare:
```tsx
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = onAlert;
  return () => ws.close();
}, [url]);
```
Legătură: E ideea de la task-urile Celery cu `acks_late` (CEL-03): un pas care poate rula de două ori trebuie să fie sigur la repetare. Strict Mode îți verifică exact asta.
Limită: Un request dublat în dev e inofensiv dacă ignori răspunsul vechi în cleanup. Nu dezactivezi Strict Mode ca să scapi de el; repari cleanup-ul.
La interviu: „E Strict Mode: în dev React face setup, cleanup și iar setup, ca să verifice că efectul se curăță corect. În producție rulează o singură dată. Soluția e un cleanup corect, nu scoaterea lui StrictMode.”
Verificare: Efectul face `setInterval(tick, 1000)` fără cleanup. Ce vezi în dev?
Răspuns verificare: Două intervale active, deci `tick` rulează de două ori pe secundă. Cu `return () => clearInterval(id)` rămâne unul.
Varianta greșită B: Montarea dublă e simulată de Strict Mode, nu de părinte. Nu e un bug al aplicației.
Varianta greșită C: Ciclul în plus există doar în development. În producție efectul rulează o dată.
Varianta greșită D: `key` contează la liste și la resetarea unei componente. Nu provoacă rularea dublă a efectelor la mount.

### fe-08
Pe scurt: Un race condition: cererile pot reveni în altă ordine decât au plecat, iar ultimul răspuns sosit suprascrie rezultatul corect.
Scop: Bug-ul apare doar pe rețele lente sau sub încărcare, deci trece de testele locale. Un inginer de frontend îl întreabă des.
Mecanism: Fiecare literă schimbă `q` și pornește un request nou. Răspunsul pentru „ad” poate întârzia mai mult decât cel pentru „adm”. Fără cleanup, `.then(setAlerts)` al cererii vechi rulează ultimul și afișează rezultate pentru „ad” deși userul vede „adm” în input. Cleanup-ul rulează înaintea efectului următor, deci poate marca cererea veche drept ignorată.
Pas cu pas:
```text
q="ad"  -> request 1 (lent)
q="adm" -> request 2 (rapid)
răspuns 2 -> setAlerts(adm)
răspuns 1 -> setAlerts(ad)  ← greșit
cu ignore: cleanup 1 -> ignore = true
  răspuns 1 e aruncat
```
Aplicare:
```tsx
useEffect(() => {
  let ignore = false;
  fetch("/api/alerts?q=" + q)
    .then(r => r.json())
    .then(d => {
      if (!ignore) setAlerts(d);
    });
  return () => { ignore = true; };
}, [q]);
```
Legătură: Seamănă cu anularea din asyncio (AIO-04): o operație pornită nu se oprește singură, trebuie s-o anulezi sau să-i ignori rezultatul.
Limită: Flag-ul `ignore` nu oprește request-ul, doar rezultatul. Ca să eliberezi și rețeaua, folosești `AbortController` și `signal`. În aplicații reale, TanStack Query rezolvă asta împreună cu cache-ul și retry-ul.
La interviu: „E un race condition: răspunsurile pot veni în altă ordine. Pun în cleanup un flag `ignore` sau un `AbortController`, iar în aplicații reale folosesc TanStack Query, care se ocupă de asta.”
Verificare: Folosești `AbortController` și chemi `abort()` în cleanup. Ce se întâmplă cu promisiunea `fetch` veche?
Răspuns verificare: Respinge cu un `AbortError`, pe care îl prinzi și îl ignori. Request-ul e oprit și în rețea.
Varianta greșită B: Cu `[q]`, efectul rulează la fiecare schimbare a lui `q`, nu doar o dată.
Varianta greșită C: React nu anulează nimic singur. Doar cleanup-ul tău poate opri sau ignora cererea veche.
Varianta greșită D: Dependențele spun când rulează efectul. Nu spun nimic despre ordinea în care rețeaua întoarce răspunsurile.

### fe-09
Pe scurt: `queryByText`. E singurul care întoarce `null` când elementul lipsește, deci poți verifica absența fără excepție.
Scop: Testele de componente verifică des și ce nu trebuie să apară: eroarea după un submit valid, un buton ascuns pentru un user fără drepturi.
Mecanism: Cele trei familii diferă prin ce fac când nu găsesc nimic. `getBy` aruncă excepție imediat, deci e bun când elementul trebuie să existe acum. `queryBy` întoarce `null`, deci e bun pentru absență. `findBy` întoarce un Promise care reîncearcă până la timeout, deci e bun pentru ce apare după un fetch. Variantele `All` întorc liste și au aceeași regulă.
Pas cu pas:
```text
există acum?        -> getBy
trebuie să lipsească -> queryBy
apare mai târziu?    -> await findBy
```
Aplicare:
```tsx
render(<LoginForm />);
expect(
  screen.queryByText(/greșită/i)
).not.toBeInTheDocument();
expect(
  await screen.findByRole("alert")
).toBeVisible();
```
Legătură: E la fel ca în pytest (PT-11): fiecare aserție spune exact ce aștepți, inclusiv când aștepți să lipsească ceva.
Limită: `queryBy` verifică absența doar în momentul apelului. Dacă eroarea poate apărea după un fetch, aștepți întâi să se termine acel fetch (de exemplu cu `waitFor`), altfel testul trece prea devreme.
La interviu: „`getBy` când elementul trebuie să existe, `queryBy` când verific că lipsește, pentru că dă `null`, și `await findBy` pentru ce apare după un request. Prefer query-urile după rol, ca `getByRole`, pentru că seamănă cu ce vede userul.”
Verificare: Lista de alerte se încarcă după un fetch. Ce folosești ca să aștepți primul rând?
Răspuns verificare: `await screen.findByRole("row", ...)` sau `findAllByRole("row")`: reîncearcă până apare rândul sau până expiră timeout-ul.
Varianta greșită B: `getByText` nu întoarce `null`: aruncă o eroare când nu găsește elementul, deci testul pică.
Varianta greșită C: `findByText` nu întoarce `null`. Promisiunea lui eșuează după timeout când elementul lipsește.
Varianta greșită D: `getAllByText` aruncă excepție dacă nu găsește niciun element. Lista goală o dă `queryAllByText`.

### fe-10
Pe scurt: `unknown`. Te obligă să verifici forma datelor înainte să le folosești, pe când `any` dezactivează orice verificare.
Scop: Datele de la API sunt cel mai des loc unde tipurile mint. Cu `any`, o schimbare în backend se vede abia în producție.
Mecanism: `any` spune compilatorului „nu verifica nimic”: poți accesa orice câmp, iar `any` se propagă în tot codul. `unknown` acceptă orice valoare, dar nu te lasă s-o folosești. Ca să citești un câmp, îngustezi întâi tipul: `typeof`, `in`, un type guard (`x is Alert`) sau o schemă zod care validează la runtime și întoarce tipul corect.
Pas cu pas:
```text
const d: any = await res.json()
  d.items.map(...)  -> compilează
  runtime: undefined -> crash
const d: unknown = await res.json()
  d.items           -> eroare tsc
  AlertList.parse(d) -> tip sigur
```
Aplicare:
```ts
const AlertList = z.array(z.object({
  id: z.string(),
  severity: z.enum(["low", "high"]),
}));
const data: unknown =
  await res.json();
const alerts = AlertList.parse(data);
```
Legătură: E rolul pe care îl are Pydantic în FastAPI (ASGI-08): validezi la granița sistemului, iar în interior lucrezi cu tipuri sigure. Tipurile TS singure sunt ca type hints-urile Python (RT-04): dispar la runtime.
Limită: `unknown` nu validează nimic singur; doar te obligă să validezi. Dacă tipurile sunt generate din OpenAPI-ul backendului, ai contractul, dar tot nu ai verificare la runtime.
La interviu: „Pentru date externe folosesc `unknown`, nu `any`: compilatorul mă obligă să validez forma. La graniță pun o schemă zod sau generez tipurile din OpenAPI-ul FastAPI, pentru că tipurile TS dispar la runtime.”
Verificare: Scrii `const a = data as Alert[]` pe o valoare `unknown`. E sigur?
Răspuns verificare: Nu. `as` e o afirmație a ta, nu o verificare: compilatorul te crede, iar la runtime datele pot avea altă formă.
Varianta greșită B: `any` nu e mai sigur: oprește verificările, deci greșelile ajung la runtime.
Varianta greșită C: TypeScript nu verifică nimic la runtime; tipurile sunt șterse la compilare. Validarea o faci tu, de exemplu cu zod.
Varianta greșită D: Nu se comportă identic: cu `any` poți folosi orice câmp direct, iar cu `unknown` compilatorul te oprește până îngustezi tipul.

### fe-11
Pe scurt: Dă eroare la compilare. Cazul `error` a rămas netratat, iar `{ s: "error" }` nu se poate atribui lui `never`.
Scop: Când adaugi o stare nouă (de exemplu `empty`), compilatorul îți arată fiecare `switch` care trebuie actualizat. Fără asta, cazul nou cade tăcut pe ramura `default`.
Mecanism: Un union discriminat are un câmp comun cu valori literale (`s`). În fiecare `case`, TypeScript îngustează `x` la varianta potrivită. În `default` rămân doar variantele netratate. Dacă le-ai tratat pe toate, tipul rămas e `never` și atribuirea merge. Dacă a rămas una, atribuirea pică la compilare.
Pas cu pas:
```text
x: loading | error | ok
"loading" -> rămân error, ok
"ok" -> rămâne error
default: never = error
  -> eroare tsc
adaugi case "error"
  -> rămâne never: compilează
```
Aplicare:
```tsx
function Alerts(
  { st }: { st: State }
) {
  switch (st.s) {
    case "loading":
      return <Spinner />;
    case "error":
      return <Err m={st.msg} />;
    case "ok":
      return (
        <List d={st.data} />
      );
  }
}
```
Legătură: Seamănă cu `match` din Python 3.10, verificat cu mypy și `assert_never` (`typing`, 3.11). În ambele, verificarea e statică, nu la runtime.
Limită: Verificarea ține doar cât tipurile sunt corecte. Dacă datele vin de la API cu o valoare nouă pentru `s`, compilatorul nu o vede; o prinzi cu validare la graniță (FE-10).
La interviu: „Modelez starea ca union discriminat (`loading`, `error`, `ok`), așa că nu pot avea `data` și `error` în același timp. Cu `never` în `default`, compilatorul îmi spune ce caz am uitat.”
Verificare: De ce e mai bun un union decât `{ loading: boolean; error?: string; data?: Alert[] }`?
Răspuns verificare: Cu booleene separate poți ajunge în stări imposibile (`loading` și `error` în același timp). Union-ul permite doar combinațiile valide, iar TypeScript știe ce câmpuri există în fiecare.
Varianta greșită B: `never` e verificat de compilator, iar tipurile nu există la runtime. Linia nu aruncă nimic singură.
Varianta greșită C: Compilatorul nu ignoră `never`: e tipul fără valori, deci nimic nu i se poate atribui. Tocmai asta face verificarea să funcționeze.
Varianta greșită D: Codul nu convertește nimic: e doar o atribuire de tip, verificată la compilare.

### fe-12
Pe scurt: Authorization Code cu PKCE. Pentru aplicații de business, un BFF e și mai sigur, pentru că tokenurile nu ajung deloc în browser.
Scop: Un SPA e client public: oricine îi poate citi codul. Fluxul ales decide dacă un XSS îți poate fura tokenurile.
Mecanism: Cu Authorization Code, Keycloak întoarce în browser doar un cod de unică folosință, pe care clientul îl schimbă pe tokenuri. PKCE leagă codul de un `code_verifier` generat de client: cine interceptează codul nu îl poate folosi fără verifier. Într-un BFF, backendul face tot schimbul, ține tokenurile și dă browserului doar un cookie de sesiune `HttpOnly`.
Pas cu pas:
```text
SPA: verifier -> challenge = SHA256
-> Keycloak /auth?code_challenge=..
<- redirect cu ?code=XYZ
SPA: POST /token code + verifier
<- access + refresh token
BFF: același flux, dar pe server
  browserul primește doar un cookie
```
Aplicare:
```ts
const kc = new Keycloak({ url, realm,
  clientId: "web" });
await kc.init({
  onLoad: "login-required",
  pkceMethod: "S256",
});
await kc.updateToken(30);
```
Legătură: Ai integrat deja Keycloak (SEC-03, SEC-04). Aici e partea de browser: de ce clientul web nu are secret și de ce PKCE înlocuiește secretul.
Limită: PKCE protejează schimbul codului, nu tokenurile odată ajunse în browser. Dacă ai XSS, tokenurile din memorie pot fi folosite. De aceea RFC 10017 pune BFF-ul pe primul loc.
La interviu: „Pentru SPA folosesc Authorization Code cu PKCE: clientul nu are secret, iar PKCE leagă codul de cel care l-a cerut. Pentru o aplicație de business aș pune un BFF, ca tokenurile să stea pe server și browserul să aibă doar un cookie HttpOnly.”
Verificare: De ce nu pui tokenul în `localStorage`?
Răspuns verificare: Orice script de pe pagină îl poate citi, deci un singur XSS îl poate fura. Adaptorul Keycloak îl ține în memorie, iar un BFF îl ține pe server.
Varianta greșită B: Implicit grant pune tokenul în URL, unde ajunge în istoric și în loguri. RFC 9700 spune că nu ar trebui folosit.
Varianta greșită C: Password grant îi dă aplicației parola userului și ocolește login-ul Keycloak (MFA, SSO). RFC 9700 spune că nu trebuie folosit.
Varianta greșită D: Un secret pus în bundle-ul JS e public: oricine îl citește din browser. Client Credentials e pentru comunicarea între servicii.

### fe-13
Pe scurt: Browserul nu te lasă să citești răspunsul. Cu credentials, serverul trebuie să numească exact originea și să trimită `Access-Control-Allow-Credentials: true`.
Scop: E o eroare foarte des întâlnită când frontendul și API-ul stau pe domenii diferite și autentificarea merge prin cookie.
Mecanism: CORS e o regulă a browserului. Browserul trimite `Origin`, serverul răspunde cu headerele CORS. Cu cookie-uri, `*` nu e acceptat: browserul blochează răspunsul, iar codul JS primește o eroare de rețea. Pentru cereri care nu sunt „simple” (de exemplu JSON), browserul trimite întâi un preflight `OPTIONS`; dacă acesta eșuează, cererea nici nu pleacă.
Pas cu pas:
```text
fetch(..., credentials: "include")
-> Origin: https://app.example.com
<- ACAO: *               -> blocat
<- ACAO: https://app.example.com
   ACAC: true            -> permis
```
Aplicare:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[APP_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
)
```
Legătură: În Django ai configurat asta cu `django-cors-headers` (`CORS_ALLOWED_ORIGINS`, `CORS_ALLOW_CREDENTIALS`). Cu un BFF (FE-12), autentificarea merge prin cookie, deci regula asta devine obligatorie.
Limită: CORS protejează userul în browser, nu API-ul. Un script sau `curl` ignoră CORS complet, deci autorizarea tot pe server o faci.
La interviu: „Cu credentials, browserul refuză `Access-Control-Allow-Origin: *`. Pe server pun lista exactă de origini și `allow_credentials=True`. CORS e o protecție a browserului, nu autorizare: verificarea accesului rămâne pe server.”
Verificare: Cererea merge din Postman, dar nu din browser. Ce verifici întâi?
Răspuns verificare: Headerele CORS din răspuns și din preflight-ul `OPTIONS`. Postman nu aplică CORS, browserul da.
Varianta greșită B: `*` nu e acceptat când trimiți cookies. Browserul blochează răspunsul.
Varianta greșită C: Serverul poate răspunde normal, cu 200. Blocajul îl face browserul, care nu dă răspunsul codului JS.
Varianta greșită D: Body-ul nu ajunge „gol” la JS: `fetch` eșuează cu o eroare de rețea, iar codul nu vede nimic din răspuns.

### fe-14
Pe scurt: `await` aruncă eroarea lui `fetchB` după ~100 ms. `fetchA` și `fetchC` continuă să ruleze, pentru că o promisiune nu se poate anula.
Scop: E aceeași capcană ca la `asyncio.gather`: crezi că eșecul oprește tot, dar operațiile pornite merg mai departe și consumă resurse.
Mecanism: Toate trei request-urile pornesc când apelezi funcțiile, înainte de `Promise.all`. `Promise.all` așteaptă toate rezultatele, dar respinge la primul eșec. Promisiunile n-au mecanism de anulare, deci celelalte cereri se termină normal, doar că nimeni nu le mai folosește rezultatul. `Promise.allSettled` așteaptă toate și dă pentru fiecare `{ status, value | reason }`.
Pas cu pas:
```text
t=0      A, B, C pornesc
t=100ms  B respinge
         -> Promise.all respinge
         -> await aruncă
t=2s     A și C se termină
         rezultatele sunt ignorate
```
Aplicare:
```ts
const ctrl = new AbortController();
const s = ctrl.signal;
try {
  await Promise.all([
    fetch(a, { signal: s }),
    fetch(b, { signal: s }),
  ]);
} catch (e) { ctrl.abort(); throw e; }
```
Legătură: E aproape identic cu AIO-04: `gather` fără `return_exceptions` propagă prima excepție și lasă restul să ruleze. `allSettled` e echivalentul lui `return_exceptions=True`, iar `AbortController` ține locul anulării pe care o face `TaskGroup`.
Limită: `abort()` oprește doar operațiile care acceptă un `signal` (fetch, multe API-uri moderne). O promisiune oarecare nu poate fi oprită din afară.
La interviu: „`Promise.all` respinge la primul eșec, dar nu oprește celelalte cereri. Dacă vreau toate rezultatele folosesc `allSettled`, iar dacă vreau să le opresc le dau un `AbortController` comun.”
Verificare: Ce întoarce `Promise.allSettled` pentru același cod?
Răspuns verificare: După 2 s, o listă cu trei obiecte: `fulfilled` cu valoarea pentru A și C și `rejected` cu motivul pentru B.
Varianta greșită B: `Promise.all` nu așteaptă restul după un eșec. Respinge imediat ce una dintre promisiuni respinge.
Varianta greșită C: Promisiunile nu se anulează automat. Fără `AbortController`, A și C se termină normal.
Varianta greșită D: Asta face `allSettled`, nu `all`. `Promise.all` fie dă toate valorile, fie respinge.
