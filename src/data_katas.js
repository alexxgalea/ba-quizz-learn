/* Live-coding katas. Reference solutions are injected at build time from katas/katas.py (tested with pytest). */
(function (P) {
  const R = String.raw;
  P.katas = [
    {
      id: "k1", n: 1, title: "Detecție brute force", level: "mediu",
      why: "Exact logica unui modul de detecție: stare per entitate într-o fereastră de timp.",
      prompt: "Primești un stream de evenimente `(ts, user, ok)`, sortat după timp (ts în secunde). Emite `(user, ts)` când un user ajunge la 5 login-uri eșuate în ultimele 120 de secunde, adică în fereastra `(ts - 120, ts]`. După o alertă golești fereastra userului, ca o rafală să producă o singură alertă.",
      example: R`events = [(0, "jdoe", False), (10, "jdoe", False), (20, "jdoe", False),
          (30, "jdoe", False), (40, "jdoe", False), (45, "ana", True)]
list(detect_bruteforce(events))   # [("jdoe", 40)]`,
      hints: [
        "Ce stare ții per user? Doar timestamp-urile eșecurilor recente.",
        "`defaultdict(deque)`: adaugi la dreapta, scoți de la stânga ce a ieșit din fereastră.",
        "Scrie funcția ca generator (`yield`), ca să meargă și pe un stream infinit."],
      complexity: "O(1) amortizat per eveniment; memorie proporțională cu userii activi × prag.",
      follow: [
        "Evenimentele vin și în dezordine (întârzieri de rețea). Ce schimbi?",
        "Milioane de useri: cum eviți să ții în memorie useri inactivi?",
        "Mai mulți workeri: partiționezi după user sau muți starea în Redis (sorted set + ZREMRANGEBYSCORE)?",
        "Varianta „5 eșecuri urmate de un succes” (brute force reușit)."]
    },
    {
      id: "k2", n: 2, title: "Deduplicare de alerte", level: "ușor",
      why: "Fără deduplicare, un SOC primește aceeași alertă de sute de ori: alert fatigue.",
      prompt: "Primești alerte `(ts, rule_id, host)`, sortate după timp. Emite o alertă doar dacă aceeași pereche `(rule_id, host)` n-a fost emisă în ultimele 300 de secunde. Cooldown-ul se măsoară de la ultima alertă emisă, nu de la ultima văzută.",
      example: R`alerts = [(0, "R1", "h1"), (200, "R1", "h1"), (400, "R1", "h1")]
list(dedupe_alerts(alerts, cooldown=300))
# [(0, "R1", "h1"), (400, "R1", "h1")]`,
      hints: [
        "Un dict cu cheia `(rule_id, host)` și valoarea = momentul ultimei emiteri.",
        "Exemplul cu 0, 200, 400 separă „ultima emisă” de „ultima văzută”."],
      complexity: "O(1) per alertă; memorie O(perechi distincte).",
      follow: [
        "Cum cureți cheile vechi din dict?",
        "Pe mai multe instanțe: `SET dedupe:{rule}:{host} 1 NX EX 300` în Redis.",
        "Vrei în alerta emisă și numărul de alerte suprimate. Ce stare adaugi?"]
    },
    {
      id: "k3", n: 3, title: "Decorator retry cu backoff", level: "mediu",
      why: "Integrările cu sisteme externe eșuează tranzitoriu; un retry corect e reflex de senior.",
      prompt: "Scrie `@retry(exceptions, max_attempts, base_delay, max_delay)`. Reîncearcă doar pe excepțiile date, cu backoff exponențial (`base_delay · 2^(încercare − 1)`, plafonat la `max_delay`) și full jitter (pauză aleatoare între 0 și plafon). După ultima încercare re-ridică excepția originală. Păstrează `__name__` și `__doc__`.",
      example: R`@retry((ConnectionError,), max_attempts=3, base_delay=0.5)
def fetch_audit_log(system_id):
    ...`,
      hints: [
        "Decorator cu parametri = trei niveluri: factory → decorator → wrapper.",
        "`functools.wraps(func)` pe wrapper.",
        "Ca să-l testezi fără să aștepți, primește funcția de `sleep` ca parametru."],
      complexity: "Așteptarea totală e plafonată de max_attempts × max_delay.",
      follow: [
        "Varianta pentru funcții async (`await asyncio.sleep`).",
        "Cum testezi că nu reîncearcă pe `ValueError`?",
        "De ce full jitter și nu o pauză fixă?",
        "Când nu ai voie să faci retry (operații ne-idempotente)?"]
    },
    {
      id: "k4", n: 4, title: "LRU cache", level: "mediu",
      why: "Clasic de interviu: structuri de date și complexitate.",
      prompt: "Implementează `LRUCache(capacity)` cu `get(key)` și `put(key, value)` în O(1). Când se depășește capacitatea, scoți cheia folosită cel mai demult.",
      example: R`c = LRUCache(2)
c.put("a", 1); c.put("b", 2)
c.get("a")       # 1, "a" devine cea mai recentă
c.put("c", 3)    # scoate "b"
c.get("b")       # None`,
      hints: [
        "`OrderedDict` ține ordinea; `move_to_end(key)` și `popitem(last=False)` sunt O(1).",
        "Fără OrderedDict: dict + listă dublu înlănțuită."],
      complexity: "O(1) per operație; memorie O(capacitate).",
      follow: [
        "Thread-safe: un `threading.Lock` în jurul operațiilor.",
        "TTL pe intrări.",
        "Implementarea fără OrderedDict.",
        "Când folosești direct `functools.lru_cache`?"]
    },
    {
      id: "k5", n: 5, title: "Token bucket", level: "mediu",
      why: "Rate limiting per tenant sau per sursă: protejezi pipeline-ul de rafale.",
      prompt: "Implementează `TokenBucket(rate, capacity)` cu `allow()` → bool. Găleata pornește plină, se reumple cu `rate` tokeni pe secundă până la `capacity`, iar fiecare cerere consumă un token.",
      example: R`b = TokenBucket(rate=2, capacity=3)
[b.allow() for _ in range(4)]   # [True, True, True, False]
# după 0,5 s mai e disponibil un token`,
      hints: [
        "Nu-ți trebuie un thread de reumplere: calculezi tokenii la fiecare apel, din timpul scurs.",
        "Primește ceasul ca parametru (`clock=time.monotonic`) ca să-l testezi determinist.",
        "`time.monotonic`, nu `time.time`: nu sare când se schimbă ora sistemului."],
      complexity: "O(1) per apel.",
      follow: [
        "Câte un bucket per API key (dict de bucket-uri).",
        "Distribuit: Redis + script Lua.",
        "Thread safety."]
    },
    {
      id: "k6", n: 6, title: "Top K IP-uri dintr-un log", level: "ușor",
      why: "Parsare + agregare pe stream: munca de zi cu zi în procesarea de loguri.",
      prompt: "Primești linii de access log în care IP-ul clientului e primul câmp. Returnează cele mai frecvente K IP-uri, ca perechi `(ip, count)`. Liniile malformate se ignoră.",
      example: R`lines = ['10.0.0.1 - - "GET /"', '10.0.0.2 - - "GET /"',
         '10.0.0.1 - - "POST /login"', 'garbage']
top_ips(lines, k=1)   # [("10.0.0.1", 2)]`,
      hints: [
        "`collections.Counter` + `most_common(k)`.",
        "Regex precompilat, ancorat la începutul liniei (`^`).",
        "Iterezi direct pe fișier: liniile vin una câte una."],
      complexity: "O(n log k) cu heap (`most_common(k)`); memorie O(IP-uri distincte).",
      follow: [
        "Loguri pe mai multe mașini: un Counter per fișier, apoi le aduni (map-reduce).",
        "Prea multe IP-uri distincte pentru memorie: Count-Min Sketch, heavy hitters.",
        "Echivalentul în shell: `awk | sort | uniq -c | sort -rn | head`."]
    },
    {
      id: "k7", n: 7, title: "Pipeline de generatori", level: "ușor–mediu",
      why: "Procesare în memorie constantă: exact optimizarea pipeline-urilor de date cerută în fișa postului.",
      prompt: "Linii de audit în formatul (inventat) `TS=…|USER=…|EVENT=…`. Scrie `parse_kv(line)` (un dict sau None pentru linii stricate), `batched(iterable, n)` și `failed_logon_batches(lines, size)`, care produce loturi de evenimente `EVENT=LOGON_FAILED`, gata de bulk insert.",
      example: R`lines = ["TS=1|USER=JDOE|EVENT=LOGON_FAILED",
         "TS=2|USER=ANA|EVENT=LOGON_OK", "corrupted"]
list(failed_logon_batches(lines, size=500))
# [({"TS": "1", "USER": "JDOE", "EVENT": "LOGON_FAILED"},)]`,
      hints: [
        "`str.partition(\"=\")` îți dă cheia, separatorul și valoarea.",
        "`itertools.islice` pentru loturi; în 3.12+ există `itertools.batched`.",
        "Fiecare etapă e un generator; la final, `yield from`."],
      complexity: "O(n); memorie O(size).",
      follow: [
        "Cum demonstrezi într-un test că pipeline-ul e leneș?",
        "Unde numeri liniile stricate (ca metrică)?",
        "Paralelizare: procese pe bucăți de fișier."]
    },
    {
      id: "k8", n: 8, title: "Fetch async cu limită de concurență", level: "mediu",
      why: "asyncio corect: concurență mare fără să copleșești serviciul din aval.",
      prompt: "Scrie `async def fetch_all(urls, fetch, limit=10)`: apelează `await fetch(url)` pentru fiecare URL, cu cel mult `limit` apeluri simultan. Rezultatele păstrează ordinea; o excepție apare în locul rezultatului ei, fără să le oprească pe celelalte.",
      example: R`results = asyncio.run(fetch_all(urls, fetch, limit=4))`,
      hints: [
        "`asyncio.Semaphore(limit)` + `async with sem:`.",
        "`asyncio.gather(..., return_exceptions=True)` păstrează ordinea."],
      complexity: "Timp ≈ (n / limit) × latența medie.",
      follow: [
        "100.000 de URL-uri: de ce ai prefera N workeri pe o `asyncio.Queue` (fără 100.000 de task-uri create deodată)?",
        "`TaskGroup` vs `gather`: ce se întâmplă la prima eroare?",
        "Timeout per request (`asyncio.timeout`, 3.11+)."]
    },
    {
      id: "k9", n: 9, title: "Unire de intervale", level: "ușor",
      why: "Algoritm clasic, util pentru ferestre de mentenanță sau incidente care se suprapun.",
      prompt: "Primești intervale `(start, end)`. Returnează intervalele unite, sortate. Intervalele care doar se ating se unesc și ele.",
      example: R`merge_intervals([(8, 10), (1, 3), (2, 6)])   # [(1, 6), (8, 10)]`,
      hints: ["Sortezi după start.", "Compari fiecare interval cu ultimul din rezultat."],
      complexity: "O(n log n), din sortare.",
      follow: [
        "Intervalele vin în stream, deja sortate?",
        "Câte intervale se suprapun maxim într-un punct (sweep line)?"]
    },
    {
      id: "k10", n: 10, title: "Parser tolerant de audit log", level: "ușor–mediu",
      why: "Cod de zi cu zi într-un produs de detecție: date murdare, fără să se oprească la prima linie stricată.",
      prompt: "Linii de forma `2026-10-28T10:00:00Z user=ana action=login result=fail`. Scrie `parse_log(lines, errors=None)`: un generator de obiecte `Event(ts, user, action, ok)` (dataclass) care sare peste liniile goale și pune în `errors` numărul liniilor stricate, fără să se oprească. Apoi `summarize(events)` → `{user: (eșecuri, ultima acțiune)}`, cu ultima acțiune după timp, nu după ordinea liniilor.",
      example: R`errors = []
events = parse_log(lines, errors)
summarize(events)  # {"ana": (1, "login"), ...}
errors             # [3, 6]`,
      hints: [
        "Pe CoderPad rulează întâi `import sys; print(sys.version)`. Pe 3.10, `fromisoformat` nu acceptă `Z`: îl înlocuiești cu `+00:00`.",
        "`stamp, *pairs = line.split()`, apoi `dict(p.split(\"=\", 1) for p in pairs)`.",
        "Prinzi doar `ValueError` și `KeyError`, nu `Exception`: un bug în codul tău nu trebuie ascuns ca „linie stricată”."],
      complexity: "O(n) timp; parserul e leneș (generator), iar sumarul ține O(useri) în memorie.",
      follow: [
        "Fișierul are 20 GB. Ce rămâne neschimbat și ce schimbi?",
        "Vrei și motivul pentru fiecare linie stricată. Cum îl raportezi fără să complici generatorul?",
        "Cum testezi că parserul e cu adevărat leneș?",
        "Timestamp-uri fără fus orar amestecate cu cele cu `Z`: ce faci?"]
    },
    {
      id: "k11", n: 11, title: "Scrie testele (găsește bug-ul)", level: "ușor",
      why: "Managerul a insistat pe testare, iar rolul are și partea de calitate: arăți cum gândești cazurile limită.",
      prompt: "Specificație: `parse_duration(text)` primește perechi număr + unitate, în ordinea h, m, s, fiecare cel mult o dată („1h30m”, „90s”, „2m30s”); spațiile de la capete se ignoră; orice altceva ridică `ValueError`. Implementarea primită e mai jos. Scrie întâi teste pytest (`parametrize` pentru cazuri valide și invalide) până prinzi bug-ul, apoi repar-o.",
      example: R`UNITS = {"h": 3600, "m": 60, "s": 1}

def parse_duration(text):
    total = 0
    for num, unit in re.findall(
            r"(\d+)([hms])", text):
        total += int(num) * UNITS[unit]
    return total`,
      hints: [
        "Începe cu exemplele din specificație, apoi întreabă-te ce intrări invalide ar trece.",
        "Ce întoarce funcția pentru `\"\"`, `\"1x\"` sau `\"30m1h\"`?",
        "Fix: o expresie regulată cu `fullmatch`, nu `findall`, plus o verificare că ai cel puțin o unitate."],
      complexity: "O(lungimea textului).",
      follow: [
        "Ce caz ai adăuga ca test de regresie după un bug raportat de un client?",
        "Când ai folosi Hypothesis (property-based) aici? Ce proprietate ai verifica?",
        "Cum ai testa o funcție care depinde de ora curentă?",
        "De ce `parametrize` și nu o buclă `for` în test?"]
    },
    {
      id: "k12", n: 12, title: "Motor de reguli de detecție", level: "mediu",
      why: "OOP pe un caz Onapsis: reguli noi fără să atingi motorul (open/closed), ușor de testat.",
      prompt: "Definește `Rule` (clasă abstractă) cu `rule_id`, `severity` și `match(event) -> bool`. Un decorator `@register` pune regulile într-un registry, iar `Engine.default()` le instanțiază pe toate. `Engine.run(events)` produce `Alert(rule_id, severity, event)`. Scrie două reguli: profil critic acordat (`SAP_ALL`, `SAP_NEW`) și login în afara orelor 8–20. O regulă care aruncă excepție nu trebuie să oprească motorul.",
      example: R`events = [
  {"type": "profile_grant",
   "user": "x", "profile": "SAP_ALL"},
  {"type": "login", "user": "y",
   "hour": 3},
]
[a.rule_id for a in
 Engine.default().run(events)]
# ["PRIV-001", "LOGIN-002"]`,
      hints: [
        "`class Rule(ABC)` cu `@abstractmethod match`: o subclasă care uită `match` nu se poate instanția.",
        "Registry: un dict `rule_id → clasă`, completat de decorator. Motorul nu știe numele regulilor.",
        "Izolezi fiecare regulă cu `try/except` și `log.exception`, ca o regulă stricată să nu oprească restul.",
        "`Engine.run` ca generator: alertele ies pe măsură ce vin evenimentele."],
      complexity: "O(evenimente × reguli). Cu multe reguli, le indexezi după `event[\"type\"]`.",
      follow: [
        "Ai 2.000 de reguli. Cum eviți să rulezi toate regulile pe fiecare eveniment?",
        "O regulă cu stare (5 eșecuri în 2 minute, ca în k1): unde ține starea?",
        "Cum ai încărca regulile din configurare (YAML) în loc de cod?",
        "Ce teste scrii pentru o regulă nouă?"]
    },
    {
      id: "k13", n: 13, title: "Endpoint FastAPI idempotent, cu test", level: "mediu",
      why: "Backendul din rol: un contract HTTP corect, validare cu Pydantic, dependency injection și un test.",
      prompt: "`POST /alerts` primește `{rule_id, host, severity}` și headerul `Idempotency-Key`. Aceeași cheie cu același body întoarce aceeași alertă, fără duplicat; aceeași cheie cu alt body → 409; body invalid sau cheie lipsă → 422. `GET /alerts?limit=&cursor=` paginează după id. „Baza de date” e un obiect în memorie dat prin `Depends`, înlocuit în teste cu `app.dependency_overrides`. Pe CoderPad: proiect multi-file și `pip3 install fastapi httpx` din Shell.",
      example: R`c = make_client()
h = {"Idempotency-Key": "abc"}
b = {"rule_id": "R1", "host": "h1"}
c.post("/alerts", json=b, headers=h)
c.post("/alerts", json=b, headers=h)
# același răspuns, o singură alertă`,
      hints: [
        "`idempotency_key: str = Header()` citește headerul `Idempotency-Key`; dacă lipsește, FastAPI dă 422.",
        "Ții `cheie → (body, alertă)`: compari body-ul ca să deosebești un retry de o greșeală.",
        "Cursorul e ultimul id văzut, nu un offset: rămâne stabil când apar alerte noi.",
        "În test, `app.dependency_overrides[get_store] = lambda: store` îți dă un store curat."],
      complexity: "O(1) la creare; listarea e O(n) în memorie, O(limit) cu un index pe id într-o bază reală.",
      follow: [
        "Două request-uri cu aceeași cheie ajung simultan pe doi workeri. Ce se întâmplă și cum rezolvi (constrângere unică în Postgres)?",
        "Cât timp păstrezi cheile de idempotență?",
        "De ce `def` și nu `async def` aici? Ce s-ar schimba cu un driver DB async?",
        "Cum ai testa endpoint-ul împotriva unui Postgres real (testcontainers)?"]
    },
    {
      id: "k14", n: 14, title: "Worker pool async cu timeout", level: "mediu",
      why: "asyncio scris corect: concurență limitată, timeout per job, oprire curată, fără task-uri orfane.",
      prompt: "Scrie `async def run_jobs(jobs, handler, workers=4, timeout=5.0)`: N workeri consumă dintr-o `asyncio.Queue`, fiecare job are timeout, iar rezultatele vin în ordinea joburilor, cu excepția (inclusiv `TimeoutError`) în locul rezultatului. La final nu rămâne niciun worker pornit. Scrie-l compatibil cu Python 3.10 (fără `TaskGroup` și `asyncio.timeout`).",
      example: R`res = asyncio.run(run_jobs(
    ["a", "boom", "slow"], handler,
    workers=2, timeout=0.2))
# ["A", ValueError("boom"),
#  TimeoutError()]`,
      hints: [
        "Pui în coadă `(index, job)`, ca să scrii rezultatul la locul lui.",
        "`await asyncio.wait_for(handler(job), timeout)`; prinzi `Exception`, nu `BaseException`, ca anularea să treacă.",
        "`queue.task_done()` în `finally`, apoi `await queue.join()`.",
        "La final: `cancel()` pe workeri și `gather(..., return_exceptions=True)`, ca să aștepți să se oprească."],
      complexity: "Timp ≈ (n / workers) × durata medie; memorie O(n) pentru rezultate.",
      follow: [
        "Joburile vin dintr-un stream infinit. Ce schimbi (coadă mărginită, backpressure)?",
        "Pe 3.11+, cum arată varianta cu `TaskGroup` și `asyncio.timeout`?",
        "Un handler apelează o bibliotecă sincronă care blochează 2 s. Ce se întâmplă cu ceilalți workeri?",
        "Cum testezi timeout-ul fără să aștepți secunde reale?"]
    },
    {
      id: "k15", n: 15, title: "Listă de alerte în React + TypeScript", level: "mediu", lang: "ts",
      check: "verificată cu React 19, Testing Library și tsc --strict",
      why: "Pentru inginerul de frontend: hooks corecte, stări explicite, TypeScript și un test.",
      prompt: "Pe pad-ul React (Vite + TypeScript), scrie `AlertList`: ia alertele de la `/api/alerts`, arată „Se încarcă…”, eroarea (cu `role=\"alert\"`) sau lista, și are un `<select>` care filtrează după severitate. Starea e un union discriminat (`loading` / `error` / `ok`), datele de la API sunt `unknown` până le verifici, iar request-ul se anulează la unmount. Bonus: un test cu Testing Library.",
      example: R`<AlertList url="/api/alerts" />
// Se încarcă… → listă cu 2 alerte
// select „high” → 1 alertă`,
      hints: [
        "`useState<State>({ s: \"loading\" })` și un `type State` cu trei variante.",
        "În `useEffect`: `AbortController`, `fetch(url, { signal })`, verifici `r.ok`, iar cleanup-ul face `abort()`.",
        "Ignori `AbortError` în `catch`, altfel la unmount afișezi o eroare falsă.",
        "Filtrul se calculează în render, nu într-un effect separat.",
        "Testul: înlocuiești `fetch`, `findAllByRole(\"listitem\")`, apoi `userEvent.selectOptions`."],
      complexity: "Filtrarea e O(n) la fiecare render; la mii de rânduri: `useMemo` sau virtualizare.",
      follow: [
        "Cum ai face filtrarea pe server și ai păstra filtrul în URL?",
        "Cum ai înlocui codul de fetch cu TanStack Query? Ce câștigi?",
        "Alertele noi vin pe WebSocket. Unde le integrezi?",
        "De ce `queryByText` și nu `getByText` când verifici că o alertă a dispărut?"]
    },
    {
      id: "k16", n: 16, title: "Promise pool în JavaScript", level: "ușor–mediu", lang: "js",
      check: "testată cu node:test",
      why: "Analogul JS al lui k8: concurență limitată pe un singur thread, cu event loop.",
      prompt: "Scrie `runWithLimit(tasks, limit)`: `tasks` sunt funcții care întorc o promisiune. Rulează cel mult `limit` simultan, întoarce rezultatele în ordinea task-urilor și respinge dacă un task eșuează. `limit < 1` → `RangeError`.",
      example: R`const tasks = urls.map(u => () => fetch(u));
const res = await runWithLimit(tasks, 4);`,
      hints: [
        "Pornești `min(limit, n)` workeri; fiecare ia următorul index liber până se termină lista.",
        "Pe un singur thread, `const i = next++` între două `await`-uri nu are race condition.",
        "`await Promise.all(workers)` așteaptă să se termine toți."],
      complexity: "Timp ≈ (n / limit) × durata medie; memorie O(n) pentru rezultate.",
      follow: [
        "Vrei toate rezultatele chiar dacă unele eșuează (ca `allSettled`). Ce schimbi?",
        "Cum oprești task-urile rămase la primul eșec (`AbortController`)?",
        "De ce în Python ai nevoie de `Semaphore` sau `Queue`, iar aici ajunge un contor?",
        "Scrie semnătura în TypeScript cu generice."]
    }
  ];
})(window.PREP);
