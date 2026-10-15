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
