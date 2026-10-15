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
    }
  ];
})(window.PREP);
