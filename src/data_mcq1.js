/* MCQ bank 1: GIL & concurență, runtime, WSGI/ASGI, indexuri, Python core.
   a = indexul variantei corecte în o (variantele se amestecă în aplicație).
   Variantele au lungimi comparabile, ca răspunsul să nu se poată ghici după lungime. */
(function (P) {
  const R = String.raw;
  const Q = (m, list) => list.forEach(q => P.mcq.push(Object.assign({ m }, q)));

  Q("gil", [
    { id: "gil-01", q: "Ce garantează GIL-ul în CPython?", o: [
      "Că un singur thread execută bytecode Python la un moment dat",
      "Că operațiile pe structuri partajate din codul tău sunt atomice",
      "Că un proces Python folosește un singur core, inclusiv în extensiile native",
      "Că threadurile primesc timp de CPU în ordinea în care au fost pornite"], a: 0,
      e: "GIL-ul serializează execuția bytecode-ului. Nu face codul tău thread-safe (`counter += 1` se poate intercala), iar extensiile native care îl eliberează pot folosi mai multe core-uri." },
    { id: "gil-02", q: "Ai de descărcat 500 de fișiere prin HTTP, apoi de parsat și agregat milioane de linii în Python pur. Ce combinație alegi?", o: [
      "Threads (sau asyncio) pentru download, procese pentru parsare",
      "Procese pentru amândouă, ca să ocolești GIL-ul peste tot",
      "Threads pentru amândouă, pentru că GIL-ul se eliberează oricum la fiecare linie",
      "asyncio pentru amândouă, pentru că rulează corutinele pe mai multe core-uri"], a: 0,
      e: "Download-ul e I/O-bound: GIL-ul se eliberează cât aștepți rețeaua. Parsarea în Python pur e CPU-bound: threadurile s-ar bate pe GIL, procesele rulează pe core-uri diferite. Procese pentru I/O merg, dar plătești memorie și IPC fără câștig." },
    { id: "gil-03", q: "Ce poți spune despre valoarea afișată?", code: R`import threading

counter = 0

def work():
    global counter
    for _ in range(1_000_000):
        counter += 1

threads = [threading.Thread(target=work) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)`, o: [
      "Poate fi sub 4.000.000: `counter += 1` nu e atomic, deci codul e greșit fără Lock",
      "E mereu 4.000.000, pentru că GIL-ul face fiecare instrucțiune Python atomică",
      "Aruncă RuntimeError, pentru că un thread nu poate modifica o variabilă globală",
      "E mereu 1.000.000, pentru că fiecare thread își incrementează propria copie"], a: 0,
      e: "`+=` pe un global înseamnă load, add, store; GIL-ul poate trece la alt thread între ele, deci se pot pierde update-uri. În versiunile recente race-ul apare mai rar în practică, dar codul rămâne greșit. Fix: `threading.Lock`." },
    { id: "gil-04", q: "Ce se întâmplă dacă apelezi `time.sleep(2)` într-o funcție `async def` care rulează pe event loop?", o: [
      "Tot event loop-ul stă 2 secunde: nicio altă corutină nu progresează",
      "Doar corutina curentă așteaptă, celelalte continuă normal",
      "Python îl transformă automat în `await asyncio.sleep(2)`",
      "Interpretorul aruncă excepție: apelurile sincrone sunt interzise în async def"], a: 0,
      e: "asyncio e cooperativ: o corutină cedează controlul doar la `await`. `time.sleep` blochează threadul loop-ului. Folosești `await asyncio.sleep()` sau muți codul blocant cu `await asyncio.to_thread(...)`." },
    { id: "gil-05", q: "Ce e adevărat despre cod nativ (NumPy, OpenCV) și GIL?", o: [
      "Multe operații native eliberează GIL-ul, deci pot rula în paralel din threaduri",
      "Codul nativ ține GIL-ul tot timpul, deci nu poate rula niciodată în paralel",
      "NumPy pornește automat câte un proces separat pentru fiecare operație mare pe array-uri",
      "GIL-ul se aplică doar operațiilor de I/O, nu și calculelor făcute în extensii C"], a: 0,
      e: "O extensie C poate elibera GIL-ul cât timp nu atinge obiecte Python (calcule NumPy mari, `cv2.resize`). De aceea un thread pool peste OpenCV poate folosi mai multe core-uri, iar același calcul scris în Python pur nu." },
    { id: "gil-06", q: "Ce trebuie să fie adevărat despre argumentele trimise la un `ProcessPoolExecutor`?", o: [
      "Să poată fi serializate cu pickle",
      "Să fie obiecte imutabile",
      "Să fie doar tipuri primitive (int, str, float)",
      "Nicio restricție: procesele partajează memoria părintelui"], a: 0,
      e: "Procesele au memorie separată; argumentele și rezultatele trec granița prin pickling. Lambdas, conexiuni DB sau socket-uri nu se pot trimite. Overhead-ul face ca task-urile foarte mici să nu merite." },
    { id: "gil-07", q: "Ai 10.000 de request-uri HTTP de făcut în asyncio, cu maximum 50 simultan. Ce folosești?", o: [
      "Un `asyncio.Semaphore(50)` în jurul fiecărui request, plus `gather`",
      "`asyncio.gather` pe toate 10.000, pentru că event loop-ul le dozează singur",
      "Un `ThreadPoolExecutor(max_workers=10_000)` peste un client HTTP sincron",
      "`time.sleep(0.02)` între request-uri, ca să nu depășești 50 de conexiuni deschise"], a: 0,
      e: "`gather` pornește toate corutinele deodată; fără limită deschizi 10.000 de conexiuni. Semaforul sau N workeri pe o `asyncio.Queue` limitează concurența. `TaskGroup` (3.11+) anulează și restul task-urilor la prima eroare." },
    { id: "gil-08", q: "Diferența dintre `await coro()` și `asyncio.create_task(coro())`?", o: [
      "`create_task` o pornește concurent și întoarce un Task; `await` așteaptă pe loc",
      "Sunt echivalente; `create_task` e doar sintaxa veche, dinainte de `async/await`",
      "`create_task` rulează corutina într-un thread separat din pool-ul implicit",
      "`await` pornește corutina într-un proces nou, `create_task` în același thread"], a: 0,
      e: "Cu `create_task` poți face altceva și aștepți task-ul mai târziu. Păstrezi o referință la el (altfel poate fi colectat) și îi tratezi excepțiile." },
    { id: "gil-09", tag: "formulare", q: "Ce formulare ai folosi la interviu?", o: [
      "„GIL-ul limitează paralelismul bytecode-ului, nu concurența: pentru I/O folosesc threads sau asyncio, pentru CPU procese.”",
      "„GIL-ul împiedică orice execuție paralelă în procesul Python, deci folosesc mereu procese, inclusiv pentru operațiile I/O.”",
      "„GIL-ul face codul multi-threaded thread-safe, deci în Python nu am nevoie de Lock pentru contoare partajate.”",
      "„asyncio ocolește GIL-ul rulând corutinele pe mai multe core-uri, de aceea e mai rapid decât threadurile.”"], a: 0,
      e: "Codul nativ poate rula în paralel, GIL-ul nu protejează invariantele tale, iar asyncio e concurent pe un singur thread, nu paralel." },
    { id: "gil-10", q: "Ce aduce build-ul „free-threaded” al CPython (PEP 703)?", o: [
      "Un build opțional fără GIL, în care threadurile rulează bytecode în paralel",
      "Eliminarea GIL-ului din build-ul implicit, începând cu Python 3.12",
      "Un GIL separat pentru fiecare thread, în locul unui singur GIL per proces",
      "Un mod care rulează automat buclele Python pe GPU, când e disponibil"], a: 0,
      e: "Experimental în 3.13, suportat oficial din 3.14, dar tot opțional: build-ul standard are GIL. Extensiile C trebuie adaptate. Îl menționezi ca nuanță, nu ca soluție implicită." },
    { id: "gil-11", q: "Ce face `asyncio.to_thread(func, *args)`?", o: [
      "Rulează funcția blocantă într-un thread separat și întoarce un awaitable",
      "Transformă funcția sincronă într-o corutină care rulează direct pe event loop",
      "Rulează funcția într-un proces separat, ca să ocolească GIL-ul",
      "Programează funcția să ruleze după ce event loop-ul își termină task-urile"], a: 0,
      e: "Disponibil din 3.9, e o scurtătură pentru `loop.run_in_executor(None, ...)`: loop-ul nu se blochează cât rulează funcția. Util pentru biblioteci sincrone (driver DB, `requests`). Pentru CPU greu: un executor de procese." },
    { id: "gil-12", q: "Folosești `asyncio.TaskGroup` (3.11+) pentru 5 sub-task-uri și unul aruncă excepție. Ce se întâmplă?", o: [
      "Celelalte task-uri sunt anulate, iar erorile ies ca `ExceptionGroup`",
      "Celelalte continuă până la final, iar excepția apare doar în log",
      "Tot event loop-ul se oprește imediat, iar procesul iese cu cod de eroare",
      "Task-ul care a eșuat e reluat automat, iar celelalte îl așteaptă"], a: 0,
      e: "Concurență structurată: niciun task nu rămâne orfan. Le prinzi cu `except*`. `gather(..., return_exceptions=True)` e alternativa când vrei să continue toate." }
  ]);

  Q("runtime", [
    { id: "rt-01", q: "Ce se întâmplă când rulezi `python app.py` în CPython?", o: [
      "Sursa e compilată în bytecode, apoi bytecode-ul e executat de interpretor",
      "Sursa e tradusă în C++ și compilată cu un compilator nativ",
      "Sursa e citită și executată ca text, linie cu linie, fără nicio compilare",
      "Fiecare funcție e compilată JIT în cod mașină înainte de prima rulare"], a: 0,
      e: "CPython parsează sursa în AST, o compilează în bytecode și o execută în bucla de evaluare. Importurile se cache-uiesc ca `.pyc`. Există un JIT experimental, oprit implicit; nu e pasul standard." },
    { id: "rt-02", q: "De ce primești `TypeError` abia când rulezi linia respectivă?", o: [
      "Tipurile aparțin obiectelor și se verifică dinamic, când se execută operația",
      "Pentru că Python nu are deloc tipuri, doar valori fără tip",
      "Pentru că compilatorul Python ignoră erorile de tip ca să meargă mai repede",
      "Pentru că verificarea tipurilor se face doar în modul debug"], a: 0,
      e: "Variabilele sunt nume legate de obiecte; `a + b` se rezolvă după tipul obiectelor, la runtime. Nu există un pas de compilare care să verifice tipurile: asta fac, opțional, mypy sau pyright." },
    { id: "rt-03", q: "Ce face `\"1\" + 1` în Python?", o: ["Aruncă TypeError", "Returnează \"11\"", "Returnează 2", "Returnează None"], a: 0,
      e: "Python e dinamic, dar puternic tipat: nu face conversii implicite între str și int. În JavaScript rezultatul ar fi \"11\"." },
    { id: "rt-04", q: "Ce fac type hints-urile la runtime în CPython?", o: [
      "Nimic: sunt metadate, folosite de mypy/pyright sau citite de Pydantic",
      "Interpretorul aruncă TypeError dacă un argument nu respectă hint-ul",
      "Accelerează execuția: interpretorul generează cod specializat pe tipuri",
      "Sunt eliminate la compilare și nu mai pot fi citite la runtime"], a: 0,
      e: "Hint-urile stau în `__annotations__` (evaluate leneș din 3.14) și sunt ignorate de interpretor. mypy/pyright verifică static; Pydantic și FastAPI le citesc ca să valideze date." },
    { id: "rt-05", q: "Cum gestionează CPython memoria?", o: [
      "Reference counting + un GC generațional pentru cicluri de referințe",
      "Doar un garbage collector mark-and-sweep, rulat periodic, ca în Java",
      "Manual: obiectele sunt eliberate doar când apelezi explicit `del`",
      "Memoria nu se eliberează deloc până la terminarea procesului"], a: 0,
      e: "La contor 0, obiectul e eliberat imediat. Ciclurile (a → b → a) le colectează modulul `gc`. `del` șterge doar un nume, nu forțează eliberarea." },
    { id: "rt-06", q: "Ce e un fișier `.pyc`?", o: [
      "Bytecode cache-uit, ca importurile următoare să nu mai compileze",
      "Cod mașină nativ generat de CPython pentru procesorul curent",
      "Un fișier de configurare pe care pip îl citește la instalarea pachetelor",
      "Codul sursă minificat, folosit ca să se încarce mai repede"], a: 0,
      e: "Stă în `__pycache__/`, e specific versiunii de Python și se regenerează când se schimbă sursa. Accelerează pornirea, nu execuția." },
    { id: "rt-07", tag: "formulare", q: "Care formulare e cea mai precisă?", o: [
      "„Python e compilat în bytecode, rulat de VM-ul CPython; tipurile se verifică la runtime.”",
      "„Python e interpretat linie cu linie, deci nu are niciun pas de compilare înainte de execuție.”",
      "„Python se transformă întâi în cod C++, care apoi e compilat și rulează pe procesor.”",
      "„Python e compilat în bytecode ca Java, deci tipurile se verifică încă de la compilare.”"], a: 0,
      e: "Există compilare, dar în bytecode, nu în cod mașină, și fără verificare de tipuri: spre deosebire de Java, bytecode-ul nu vine cu tipuri verificate. Formularea cu C++ e exact cea de evitat." },
    { id: "rt-08", q: "De ce pui codul de pornire sub `if __name__ == \"__main__\":`?", o: [
      "Ca să nu ruleze când modulul e importat de alt modul sau de teste",
      "Ca să ruleze mai repede, fiind compilat separat de restul modulului",
      "Pentru că altfel interpretorul nu găsește funcția `main` la pornire",
      "Ca să ruleze doar pe Linux, nu și pe Windows sau macOS"], a: 0,
      e: "La import, tot codul de la nivelul modulului se execută. `__name__` e `\"__main__\"` doar când fișierul e rulat direct. Contează și pentru `multiprocessing` cu metoda spawn." }
  ]);

  Q("asgi", [
    { id: "asgi-01", q: "De ce pui Gunicorn în fața Uvicorn în producție?", o: [
      "Gunicorn gestionează workerii; fiecare rulează un event loop Uvicorn",
      "Gunicorn face aplicația asincronă, iar Uvicorn îi adaugă suport HTTPS",
      "Uvicorn nu poate accepta conexiuni HTTP fără un server WSGI în fața lui",
      "Gunicorn elimină GIL-ul din procesele worker, deci totul rulează în paralel"], a: 0,
      e: "Un proces Uvicorn = un event loop = un core. Gunicorn aduce modelul pre-fork: N procese, restart la crash, timeouts, reload grațios. Alternativ: `uvicorn --workers N` sau un proces per container, cu replici din orchestrator." },
    { id: "asgi-02", q: "Un endpoint FastAPI declarat cu `def` (nu `async def`) face un query sincron la DB. Ce se întâmplă?", o: [
      "Rulează într-un threadpool, deci nu blochează event loop-ul",
      "Blochează tot event loop-ul până termină query-ul",
      "FastAPI refuză să pornească: cu Session sincron trebuie `async def`",
      "Rulează automat într-un proces separat, creat per request"], a: 0,
      e: "Starlette rulează endpointurile `def` în threadpool-ul AnyIO (implicit, cel mult 40 de apeluri sincrone în paralel). Regula: driver sync → `def`; driver async (asyncpg, httpx) → `async def` cu `await`." },
    { id: "asgi-03", q: "Ce e greșit sub încărcare?", code: R`@app.get("/report")
async def report():
    data = requests.get("https://stats.internal/api").json()
    return summarize(data)`, o: [
      "`requests` e sincron și blochează event loop-ul cât durează apelul",
      "Nimic: FastAPI detectează `requests` și îl mută automat într-un thread",
      "Un endpoint `async def` nu poate returna un dict, ci doar un Response",
      "Lipsește `await` în fața lui `summarize`, deci răspunsul e o corutină"], a: 0,
      e: "Toate request-urile acelui worker așteaptă după acest apel. Fix: `httpx.AsyncClient` cu `await`, endpoint `def`, sau `await asyncio.to_thread(...)`." },
    { id: "asgi-04", q: "Ce diferențiază ASGI de WSGI?", o: [
      "ASGI e o interfață async (inclusiv WebSockets); WSGI e una sincronă",
      "ASGI e un server web, iar WSGI e un framework pentru aplicații",
      "ASGI e mereu mai rapid decât WSGI, indiferent de tipul de încărcare",
      "WSGI e o interfață depreciată, care nu se mai folosește în producție"], a: 0,
      e: "Ambele sunt specificații (contracte server ↔ aplicație), nu servere. În WSGI un request = un apel blocant; ASGI suportă și conexiuni lungi. Async nu face automat codul mai rapid; ajută când ai mult I/O concurent." },
    { id: "asgi-05", q: "Un worker Gunicorn sync primește un request care durează 45 s, cu setările implicite. Ce se întâmplă?", o: [
      "După `--timeout` (implicit 30 s), masterul omoară workerul și pornește altul",
      "Workerul servește între timp alte request-uri, pentru că așteaptă după I/O",
      "Gunicorn mută automat request-ul într-o coadă și răspunde 202",
      "Masterul îl mută automat pe un worker async ca să nu blocheze"], a: 0,
      e: "Un worker sync servește un request odată. Munca lungă nu are ce căuta în request: o pui în coadă și răspunzi 202, cu status prin polling sau notificare." },
    { id: "asgi-06", q: "Ce rol are Nginx (sau un load balancer) în fața Gunicorn?", o: [
      "TLS, fișiere statice și buffering pentru clienții lenți",
      "Execută codul Python mai repede printr-un cache de bytecode",
      "Înlocuiește procesele worker: Nginx rulează direct aplicația",
      "Transformă automat aplicația WSGI în una ASGI"], a: 0,
      e: "Documentația Gunicorn recomandă un proxy cu buffering: un client lent ar ține ocupat un worker sync. Proxy-ul preia conexiunea lentă, livrează request-ul complet și distribuie traficul între instanțe." },
    { id: "asgi-07", q: "Ce face dependența cu `yield`?", code: R`def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/alerts")
def list_alerts(db: Session = Depends(get_db)): ...`, o: [
      "O sesiune per request, închisă la final, chiar și la eroare",
      "Trimite clientului răspunsul în streaming, bucată cu bucată, cu `yield`",
      "Face endpointul asincron, deși e declarat cu `def`",
      "Creează o sesiune globală partajată de toate request-urile"], a: 0,
      e: "Pattern standard pentru resurse per request. În teste o înlocuiești cu `app.dependency_overrides[get_db] = ...`." },
    { id: "asgi-08", q: "Ce face FastAPI cu un body JSON care nu respectă modelul Pydantic al endpointului?", o: [
      "Răspunde automat 422 cu erorile de validare, fără să intre în funcție",
      "Intră în funcție și setează câmpurile invalide la valoarea implicită",
      "Răspunde 500 și scrie traceback-ul validării în logul serverului",
      "Ignoră câmpurile invalide și apelează funcția cu restul datelor"], a: 0,
      e: "FastAPI citește type hints-urile la runtime și validează cu Pydantic (v2 are nucleul în Rust). Același model generează schema OpenAPI." },
    { id: "asgi-09", q: "Câți workeri Gunicorn sync, ca punct de plecare, pe o mașină cu 4 core-uri?", o: [
      "În jur de 9 (2 × core + 1), apoi ajustezi după măsurători",
      "Exact 1, pentru că GIL-ul nu permite mai mult",
      "400, pentru că mai mulți workeri înseamnă mereu mai mult throughput",
      "4 threaduri într-un singur proces, obligatoriu"], a: 0,
      e: "Formula din documentația Gunicorn presupune că workerii sync așteaptă des după I/O. Prea mulți = memorie și context switching. Măsori sub încărcare." },
    { id: "asgi-10", q: "Rulezi FastAPI în Kubernetes. Ce variantă de procese e cea mai simplă și corectă?", o: [
      "Un proces Uvicorn per container și scalare prin numărul de replici",
      "Gunicorn cu 32 de workeri în fiecare pod, indiferent de limitele de CPU",
      "Un singur pod cu `--reload` activat",
      "Uvicorn cu `--workers` egal cu numărul de noduri din cluster"], a: 0,
      e: "Orchestratorul face deja ce face Gunicorn: repornește, scalează, verifică sănătatea. Gunicorn + UvicornWorker rămâne util pe VM-uri sau când vrei mai multe procese per container." }
  ]);

  Q("index", [
    { id: "idx-01", q: "`SELECT * FROM users WHERE email = $1` e lent pe 5M de rânduri. Primul pas?", o: [
      "`EXPLAIN ANALYZE`, apoi un index UNIQUE pe `email`, creat CONCURRENTLY",
      "Muți tabela în Elasticsearch, care e făcut pentru volume mari",
      "Mărești RAM-ul serverului ca toată tabela să încapă în shared_buffers",
      "Pui index pe toate coloanele tabelei, ca să acoperi orice query"], a: 0,
      e: "Măsori (confirmi Seq Scan), apoi indexezi coloana din WHERE. Email-ul e de obicei unic, deci UNIQUE index (și constrângere de integritate). CONCURRENTLY nu blochează scrierile în producție." },
    { id: "idx-02", q: "Ai indexul compus `(tenant_id, created_at)`. Care query îl folosește cel mai eficient?", o: [
      "`WHERE tenant_id = 7 AND created_at > now() - interval '1 day'`",
      "`WHERE created_at > now() - interval '1 day'`",
      "`WHERE tenant_id = 7 OR created_at > now() - interval '1 day'`",
      "`WHERE created_at::date = '2026-10-19'`"], a: 0,
      e: "Egalitate pe prima coloană și interval pe a doua: exact forma pentru care e construit. Doar pe a doua coloană indexul ajută rar (PG 18 are skip scan în unele cazuri). OR-ul și cast-ul pe coloană îi strică folosirea." },
    { id: "idx-03", q: "De ce un index pe `is_active` (99% true) ajută rar pentru `WHERE is_active = true`?", o: [
      "Selectivitate mică: planner-ul preferă oricum Seq Scan",
      "Postgres nu permite indexuri B-tree pe coloane de tip boolean",
      "Indexurile pe boolean ocupă mai mult spațiu decât tabela",
      "Coloanele boolean sunt deja indexate implicit de Postgres"], a: 0,
      e: "Query-ul ar citi aproape toată tabela, iar un index ajută când filtrează puține rânduri. Dacă interoghezi des minoritatea, un index parțial `WHERE NOT is_active` e mic și eficient." },
    { id: "idx-04", q: "Ce cost are un index?", o: [
      "Scrieri mai lente, spațiu pe disc și întreținere",
      "Niciun cost real, de aceea merită pe fiecare coloană",
      "SELECT-uri mai lente pe coloana indexată, din cauza lookup-ului",
      "Blocarea permanentă a tabelei pentru scrieri"], a: 0,
      e: "Fiecare INSERT/UPDATE/DELETE actualizează și indexurile. Pe tabele cu multe inserturi (evenimente, loguri) păstrezi doar indexurile justificate de query-uri reale." },
    { id: "idx-05", q: "`WHERE lower(email) = 'a@b.com'` nu folosește indexul de pe `email`. Ce faci?", o: [
      "Un index pe expresie: `CREATE INDEX ON users (lower(email))`",
      "Înlocuiești indexul B-tree cu un index Hash pe `email`",
      "Mărești `work_mem` ca planner-ul să aleagă indexul existent",
      "Rulezi `VACUUM FULL` ca să reconstruiești indexul existent"], a: 0,
      e: "Indexul stochează valorile lui `email`, nu ale lui `lower(email)`. Query-ul trebuie să folosească exact expresia indexată. Alternativ: tipul citext." },
    { id: "idx-06", q: "Ce index pentru `WHERE payload @> '{\"type\": \"login\"}'` pe o coloană JSONB?", o: ["GIN", "B-tree pe toată coloana", "Hash", "BRIN"], a: 0,
      e: "GIN e un index inversat: indexează cheile și valorile din JSONB, elementele din array-uri, lexemele din full-text. Pentru o singură cheie interogată des merge și un B-tree pe `(payload->>'type')`." },
    { id: "idx-07", q: "Tabelă de evenimente de 2 miliarde de rânduri, inserate în ordinea timpului, interogată pe intervale de `created_at`. Ce index e foarte compact?", o: [
      "BRIN pe `created_at`, eventual împreună cu partiționare pe timp",
      "Hash pe `created_at`, care e cel mai mic tip de index",
      "GIN pe `created_at`, potrivit pentru intervale de timp",
      "Câte un B-tree pe fiecare coloană, ca să acoperi orice filtru"], a: 0,
      e: "BRIN reține min/max per bloc de pagini: minuscul și eficient când datele sunt corelate fizic cu coloana (append-only pe timp). Partiționarea ajută și la retenție." },
    { id: "idx-08", q: "În `EXPLAIN ANALYZE` vezi `Seq Scan on users` cu `Rows Removed by Filter: 4999999`. Ce înseamnă?", o: [
      "Seq Scan pe toată tabela: lipsește un index utilizabil",
      "Indexul a fost folosit corect, iar filtrul s-a aplicat ulterior",
      "Rezultatul a venit din cache, de aceea apare Seq Scan",
      "Query-ul a rulat în paralel pe 5 milioane de procese"], a: 0,
      e: "Seq Scan plus un filtru care aruncă milioane de rânduri e semnalul clasic. Compari și rândurile estimate cu cele reale: diferențe mari → statistici vechi (`ANALYZE`)." },
    { id: "idx-09", q: "Cum creezi un index pe o tabelă mare în producție fără să blochezi scrierile?", o: [
      "`CREATE INDEX CONCURRENTLY`, în afara unei tranzacții",
      "`CREATE INDEX` obișnuit, care e oricum instantaneu",
      "`LOCK TABLE ... IN SHARE MODE`, apoi `CREATE INDEX`",
      "Nu se poate fără o fereastră de mentenanță cu downtime"], a: 0,
      e: "Durează mai mult și face mai multe treceri, dar nu ia lock exclusiv pe scrieri. Dacă eșuează lasă un index INVALID de șters. În Alembic: `postgresql_concurrently=True` într-un `autocommit_block()`." },
    { id: "idx-10", q: "Ce înseamnă „index” în Elasticsearch?", o: [
      "O colecție de documente (≈ tabel), cu index inversat dedesubt",
      "Un B-tree pe un singur câmp, la fel ca indexurile din Postgres",
      "Un alias pentru întregul cluster, folosit la căutare",
      "Fișierul în care un nod își scrie logul de tranzacții"], a: 0,
      e: "Indexul e împărțit în shard-uri; indexul inversat mapează fiecare termen la documentele care îl conțin, de aceea căutarea full-text e rapidă. La interviu clarifici la ce „index” te referi." },
    { id: "idx-11", q: "Ce aduce `INCLUDE`?", code: R`CREATE INDEX ON orders (customer_id) INCLUDE (total, status);`, o: [
      "Index-only scan pentru query-uri care cer doar aceste coloane",
      "Sortează fizic tabela după `total` la fiecare inserare",
      "Adaugă o constrângere de unicitate pe perechea (total, status)",
      "Permite căutări independente după total și după status"], a: 0,
      e: "Coloanele din INCLUDE stau în frunzele indexului, dar nu fac parte din cheie. Index-only scan evită accesul la tabelă când visibility map-ul e la zi." }
  ]);

  Q("python", [
    { id: "py-01", q: "Ce afișează?", code: R`def add_event(e, events=[]):
    events.append(e)
    return events

add_event("a")
print(add_event("b"))`, o: ["['a', 'b']", "['b']", "TypeError", "['a']"], a: 0,
      e: "Valoarea implicită e evaluată o dată, la definirea funcției, și partajată între apeluri. Fix: `events=None` și `if events is None: events = []`." },
    { id: "py-02", q: "Ce afișează?", code: R`funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])`, o: ["[2, 2, 2]", "[0, 1, 2]", "[0, 0, 0]", "NameError"], a: 0,
      e: "Late binding: lambda caută `i` la apel, după ce bucla s-a terminat. Fix: `lambda i=i: i`." },
    { id: "py-03", q: "Procesezi un fișier de log de 50 GB pe o mașină cu 8 GB RAM. Ce abordare?", o: [
      "Iterezi linie cu linie (`for line in f`), cu generatori și loturi",
      "`f.read().splitlines()`, apoi procesezi lista de linii în buclă",
      "`f.readlines()` o dată, apoi procesezi lista în paralel",
      "Încarci tot fișierul într-un DataFrame pandas și filtrezi după"], a: 0,
      e: "Fișierul e un iterator leneș: memoria rămâne constantă. Generatorii compun etapele (parse → filtrare → loturi) fără liste intermediare." },
    { id: "py-04", q: "Ce face `functools.wraps` într-un decorator?", o: [
      "Copiază pe wrapper `__name__`, `__doc__` și alte metadate",
      "Face decoratorul să funcționeze și pentru funcții async",
      "Cache-uiește rezultatele funcției decorate, ca `lru_cache`",
      "Prinde și loghează excepțiile aruncate de funcția decorată"], a: 0,
      e: "Fără el, logurile, debugger-ul și framework-urile (FastAPI, pytest) văd un `wrapper` anonim în loc de funcția ta. Setează și `__wrapped__`." },
    { id: "py-05", q: "Verifici de milioane de ori dacă un IP e într-o colecție de 100.000 de IP-uri blocate. Ce structură?", o: [
      "Un `set` (căutare O(1) în medie)",
      "O `list`, parcursă la fiecare verificare",
      "Un `tuple`, pentru că e imutabil",
      "Un string concatenat și `in` pe el"], a: 0,
      e: "`in` pe listă e O(n); pe set/dict e O(1) în medie, prin hash. Elementele trebuie să fie hashable." },
    { id: "py-06", q: "Ai nevoie de o fereastră glisantă cu adăugare la dreapta și scoatere de la stânga în O(1). Ce folosești?", o: ["`collections.deque`", "`list` cu `pop(0)`", "`dict` cu chei numerice", "`heapq`"], a: 0,
      e: "`list.pop(0)` mută toate elementele: O(n). `deque(maxlen=N)` e ideal pentru ferestre (structura din kata-ul de brute force)." },
    { id: "py-07", q: "`a is b` vs `a == b`?", o: [
      "`is` compară identitatea obiectelor; `==` compară valorile",
      "Sunt identice ca rezultat; `is` e doar varianta mai rapidă",
      "`is` compară valorile, iar `==` compară adresele de memorie",
      "`is` funcționează doar pentru numere și stringuri scurte"], a: 0,
      e: "`is` se folosește pentru singleton-uri (`is None`); `==` apelează `__eq__`. `[1] == [1]` e True, `[1] is [1]` e False. `is` pe int-uri mici sau string-uri „merge” uneori doar din cauza cache-ului intern." },
    { id: "py-08", q: "Ce garantează un context manager (`with`)?", o: [
      "Că `__exit__` (cleanup) rulează și când blocul aruncă o excepție",
      "Că blocul rulează într-un thread separat de restul funcției",
      "Că excepțiile din bloc sunt prinse și ignorate automat",
      "Că resursa e partajată între toate threadurile"], a: 0,
      e: "Fișiere, lock-uri, sesiuni și tranzacții DB, conexiuni. Cu `contextlib.contextmanager` scrii unul ca generator cu try/yield/finally." },
    { id: "py-09", q: "Ce afișează?", code: R`gen = (x * 2 for x in range(3))
print(sum(gen), sum(gen))`, o: ["6 0", "6 6", "0 0", "TypeError"], a: 0,
      e: "Un generator se epuizează după o parcurgere. Pentru mai multe treceri materializezi o listă sau recreezi generatorul." },
    { id: "py-10", q: "`itertools.groupby(events, key=lambda e: e.user)` pe o listă nesortată:", o: [
      "Grupează doar elemente consecutive; sortezi întâi",
      "Grupează corect indiferent de ordine, ca un GROUP BY din SQL",
      "Aruncă ValueError dacă lista nu e sortată după cheie",
      "Sortează automat lista după cheie înainte de grupare"], a: 0,
      e: "Capcană clasică. Pentru agregări pe date nesortate: `defaultdict(list)` sau `Counter`." },
    { id: "py-11", q: "Ce face `raise DomainError(\"...\") from e`?", o: [
      "Înlănțuiește excepțiile, păstrând cauza originală în traceback",
      "Ascunde complet excepția originală, ca să nu apară în log",
      "Reîncearcă o dată operația care a eșuat, apoi ridică eroarea",
      "Transformă excepția originală într-un warning și continuă"], a: 0,
      e: "Cauza ajunge în `__cause__`. Util la granița dintre straturi: o eroare de driver devine o eroare de domeniu fără să pierzi cauza. `from None` suprimă explicit contextul." },
    { id: "py-12", q: "Ce aduce `@dataclass(frozen=True, slots=True)`?", o: [
      "Instanțe imutabile, hashable, cu memorie mai mică",
      "Validarea tipurilor câmpurilor la runtime, ca în Pydantic",
      "Serializare JSON automată prin metoda generată `to_json()`",
      "Persistență automată a instanțelor într-o bază de date"], a: 0,
      e: "dataclass nu validează tipurile; pentru asta e Pydantic. `slots=True` (3.10+) elimină `__dict__` per instanță." },
    { id: "py-13", q: "Ce afișează?", code: R`a = [[0] * 2] * 2
a[0][0] = 1
print(a)`, o: ["[[1, 0], [1, 0]]", "[[1, 0], [0, 0]]", "[[1, 1], [0, 0]]", "TypeError"], a: 0,
      e: "`* 2` pe lista exterioară copiază referința la aceeași listă interioară. Corect: `[[0] * 2 for _ in range(2)]`." }
  ]);
})(window.PREP);
