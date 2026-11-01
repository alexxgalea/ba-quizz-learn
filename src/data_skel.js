// Schelete: codul minim, canonic, al unui concept, scris din memorie în câteva minute (vezi CONTEXT.md).
// id: „s-<modul>-<nume>”; referința e secțiunea „=== <id> ===” din katas/skel_*.{py,mjs,ts,tsx,sql}, testată.
// t titlul, p cerința, k punctele esențiale (3–5), lang limbajul referinței (py, js, ts, tsx, sql, yaml, docker),
// v marcajul de versiune (de pildă „3.11+”), st = true pentru „verificat structural”, g grupa (doar la frontend: react, js, ts).
window.PREP.skel = [
  {
    id: "s-gil-bq", m: "gil", lang: "py",
    t: "Coadă blocantă mărginită cu Condition",
    p: "Scrie o clasă `BoundedQueue(cap)` cu `put(item)` și `get()`, sigure între thread-uri: `put` așteaptă cât coada e plină, `get` așteaptă cât e goală. Fără `queue.Queue`; doar `threading`.",
    k: [
      "`while`, nu `if`, în jurul lui `wait()`: la trezire condiția se verifică din nou (trezire falsă sau alt thread a luat locul).",
      "Ambele condiții (`not_full` / `not_empty`) folosesc același lock, iar bufferul se citește și se modifică doar sub el.",
      "`put` face `notify` pe condiția „nu e goală”, `get` pe „nu e plină”, după ce au schimbat bufferul.",
      "Bufferul e un `deque` (`popleft` în O(1)), iar o capacitate < 1 e respinsă."
    ]
  },
  {
    id: "s-gil-lock", m: "gil", lang: "py",
    t: "Counter sigur între thread-uri, cu Lock",
    p: "Scrie o clasă `Counter` cu `inc()` sigur între thread-uri și funcția `run_threads(fn, count)`, care pornește `count` thread-uri pe `fn` și le așteaptă pe toate. Doar `threading`.",
    k: [
      "`with self.lock` acoperă tot `self.n += 1`: citirea, adunarea și scrierea nu sunt atomice, deci fără lock două thread-uri pot citi aceeași valoare și o actualizare se pierde (GIL-ul nu te scapă).",
      "Un singur lock pe instanță, creat în `__init__` și partajat de toate thread-urile; un lock nou creat în `inc()` nu exclude nimic.",
      "`start()` pe toate thread-urile, apoi `join()` pe toate, în bucle separate: `start()` urmat imediat de `join()` le rulează unul după altul, adică fără paralelism.",
      "`target=fn`, fără paranteze: `target=fn()` apelează funcția în thread-ul curent și îi dă thread-ului rezultatul ei."
    ]
  },
  {
    id: "s-gil-queue", m: "gil", lang: "py",
    t: "Producer/consumer pe queue.Queue",
    p: "Scrie `pipeline(items, handle, workers=3)`: thread-ul curent pune itemii pe un `queue.Queue` mărginit, iar `workers` thread-uri apelează `handle(item)`. La final totul se oprește curat, fără item pierdut și fără thread rămas. Presupune că `handle` nu aruncă.",
    k: [
      "Un sentinel pentru fiecare consumator (`STOP` pus de `workers` ori): cu un singur sentinel, ceilalți consumatori rămân blocați pe `get()` pentru totdeauna. Sentinelul e un `object()` comparat cu `is`, nu `None`, care ar putea fi un item.",
      "`task_done()` după fiecare `get()`, inclusiv pentru sentinel, în `finally`: `join()` se deblochează doar când contorul ajunge la zero, altfel atârnă.",
      "`q.join()` așteaptă ca itemii să fie procesați, nu doar scoși din coadă; abia apoi faci `join()` pe thread-uri.",
      "`maxsize` dă backpressure: `put()` blochează producătorul când consumatorii nu țin pasul, în loc să umple memoria.",
      "`queue.Queue` e pentru comunicare între thread-uri (are lock-ul inclus); într-un singur thread, pentru BFS sau o fereastră glisantă, folosești `collections.deque`."
    ]
  },
  {
    id: "s-gil-proc", m: "gil", lang: "py",
    t: "Process cu garda __main__ și rezultat prin Queue",
    p: "Pornește 4 procese care calculează pătratul unui număr și trimit rezultatul înapoi părintelui, care îl adună într-un `dict`. Scriptul trebuie să meargă cu orice start method (`spawn`, `forkserver`, `fork`).",
    k: [
      "`if __name__ == \"__main__\":` în jurul pornirii: cu `spawn` și `forkserver` copilul reimportă modulul, iar fără gardă ar porni la rândul lui procese (eroare de bootstrapping).",
      "`target` e o funcție de nivel înalt (picklable), iar datele merg în `args=(...)`; nu o lambda și nu o funcție locală.",
      "Procesele au memorie separată: rezultatul se întoarce printr-un `mp.Queue` (sau `Pipe`), nu printr-o listă globală pe care o modifică copilul.",
      "Citești din coadă înainte de `join()`: un copil care a pus date în coadă nu se termină până nu sunt consumate, deci `join()` primul poate bloca definitiv.",
      "Nu te bazezi pe start method-ul implicit: e `spawn` pe Windows și macOS, `fork` pe Linux până la 3.13 și `forkserver` de la 3.14."
    ]
  },
  {
    id: "s-gil-pool", m: "gil", lang: "py",
    t: "ThreadPoolExecutor cu as_completed și excepții",
    p: "Scrie `run_all(fn, items, pool=ThreadPoolExecutor)`: rulează `fn(x)` pentru fiecare item într-un executor cu 4 workeri și întoarce două dicturi, `done` (item → rezultat) și `failed` (item → excepție). Un item care eșuează nu trebuie să piardă rezultatele celorlalte.",
    k: [
      "`with pool(...) as ex:` face `shutdown(wait=True)` la ieșire, deci nu rămân thread-uri sau procese în urmă.",
      "`as_completed` dă future-urile în ordinea terminării, nu a intrării: ții un dict `future → item`, ca să știi al cui e fiecare rezultat.",
      "Excepția din `fn` nu urcă singură: stă în future și se ridică la `result()`. Pui `result()` într-un `try/except` pe fiecare future; fără el, eroarea oprește colectarea restului.",
      "Pentru CPU-bound schimbi doar clasa în `ProcessPoolExecutor`: `fn` și argumentele trebuie să fie picklable (funcție de nivel înalt, nu lambda), iar scriptul are garda `__main__`."
    ]
  },
  {
    id: "s-gil-event", m: "gil", lang: "py",
    t: "Oprire curată a unui thread cu Event",
    p: "Scrie `start_loop(step, every=0.5)`: pornește un thread care apelează `step()` periodic și întoarce `(stop, thread)`. Oprirea (`stop.set()`, apoi `t.join()`) trebuie să fie imediată, chiar dacă `every` e mare.",
    k: [
      "`while not stop.is_set()`: un `Event` ca semnal de oprire, verificat la fiecare iterație, nu un `bool` global modificat din afară.",
      "`stop.wait(every)` în loc de `time.sleep(every)`: servește și ca pauză, dar se trezește imediat la `set()`, deci oprirea nu așteaptă o pauză întreagă.",
      "`set()` singur doar cere oprirea; `join()` așteaptă ca pasul în curs să se termine, deci după `join()` nu mai rulează nimic.",
      "Thread nedaemon, oprit explicit: un thread `daemon=True` e tăiat brusc la ieșirea din program, fără să-și termine pasul și curățenia."
    ]
  },
  {
    id: "s-asyncio-sem", m: "asyncio", lang: "py",
    t: "Semaphore și gather cu return_exceptions",
    p: "`fns` e o listă de funcții async fără argumente. Scrie `run_limited(fns, limit=5)`: le rulează cu cel mult `limit` în paralel și întoarce rezultatele în ordinea lui `fns`; o excepție apare în locul rezultatului ei, fără să le oprească pe celelalte.",
    k: [
      "`async with sem:` în jurul apelului: permisul se eliberează și când `fn` aruncă; cu `acquire()` fără `release()` în `finally`, o eroare ține permisul pentru totdeauna.",
      "Un singur semafor, creat în `run_limited` și partajat de toate task-urile; unul nou la fiecare apel (în `one`) nu limitează nimic.",
      "`gather(..., return_exceptions=True)`: fără el, prima excepție ajunge imediat la `await`, dar celelalte task-uri nu sunt anulate și continuă să ruleze în fundal; cu el, excepțiile vin ca valori în lista de rezultate.",
      "Toate task-urile există de la început, dar doar `limit` trec de `async with sem` în același timp; rezultatele păstrează ordinea lui `fns`, nu a terminării."
    ]
  },
  {
    id: "s-asyncio-workers", m: "asyncio", lang: "py",
    t: "Workeri pe asyncio.Queue, cu oprire curată",
    p: "Scrie `pipeline(items, handle, n=3)`: pui itemii pe un `asyncio.Queue` mărginit, iar `n` workeri apelează `await handle(item)`. La final workerii sunt opriți și așteptați. Întoarce lista excepțiilor aruncate de `handle`.",
    k: [
      "`task_done()` în `finally`, după fiecare `get()`: altfel `q.join()` nu se mai deblochează după o eroare.",
      "Workerii rulează `while True`, deci nu se opresc singuri: după `join()` îi anulezi cu `cancel()`, iar `gather(*ws, return_exceptions=True)` așteaptă anularea efectivă, ca să nu rămână task-uri pending în loop.",
      "Oprirea stă într-un `finally`: dacă producătorul e anulat sau pică, workerii nu rămân orfani.",
      "În worker, `except Exception`, nu `BaseException`: o eroare din `handle` nu omoară workerul, dar `CancelledError` (subclasă de `BaseException`) trebuie să treacă.",
      "`maxsize` + `await q.put(...)`: producătorul așteaptă când coada e plină (backpressure). Task-urile se țin într-o listă (`ws`), fiindcă loop-ul păstrează doar referințe slabe."
    ]
  },
  {
    id: "s-asyncio-tg", m: "asyncio", lang: "py", v: "3.11+",
    t: "TaskGroup și asyncio.timeout",
    p: "Python 3.11+. Scrie `run_all(fns, limit=2.0)`: rulează funcțiile async fără argumente în paralel, într-un `TaskGroup`, cu o limită totală de timp, și întoarce rezultatele în ordinea lui `fns`. Dacă una eșuează, celelalte se anulează. Fără `gather` și fără `wait_for`.",
    k: [
      "`TaskGroup`: la ieșirea din `async with` toate task-urile sunt gata, iar prima excepție le anulează pe restul (`gather` le lasă să ruleze).",
      "Erorile ies înfășurate într-un `ExceptionGroup`: le prinzi cu `except*`; un `except ValueError` simplu nu se potrivește cu grupul.",
      "`asyncio.timeout(limit)` e un context manager async care stă în afara grupului, ca să acopere tot grupul; la depășire anulează și ridică `TimeoutError`.",
      "Task-urile se creează doar cu `tg.create_task(...)`: grupul le ține referințele și le așteaptă (un `create_task` fără referință poate fi colectat de GC)."
    ]
  },
  {
    id: "s-asyncio-thread", m: "asyncio", lang: "py",
    t: "to_thread și run_in_executor",
    p: "Scrie `io_many(fn, items)`, care rulează o funcție blocantă (I/O) pe fiecare item fără să blocheze event loop-ul, și `cpu_many(fn, items, pool)`, care face același lucru pentru o funcție CPU-bound, într-un `ProcessPoolExecutor` primit ca argument. Ambele întorc rezultatele în ordine.",
    k: [
      "`asyncio.to_thread(fn, x)`: funcția și argumentele separat. `to_thread(fn(x))` apelează `fn` chiar în loop, îl blochează și dă lui `to_thread` rezultatul, nu o funcție.",
      "Un apel blocant direct într-o corutină (`time.sleep`, un client HTTP sincron) îngheață tot loop-ul; `to_thread` îl mută într-un thread din executorul implicit, iar loop-ul merge mai departe.",
      "Thread-urile ajută doar la I/O blocant (GIL): pentru CPU-bound folosești `loop.run_in_executor(pool, fn, x)` cu `ProcessPoolExecutor`, iar `fn` și argumentele trebuie să fie picklable.",
      "`asyncio.get_running_loop()` din corutină; din thread-ul lui `fn` nu atingi obiecte asyncio (`Queue`, `Task`), fiindcă nu sunt thread-safe: folosești `run_coroutine_threadsafe` sau `call_soon_threadsafe`."
    ]
  },
  {
    id: "s-asyncio-cancel", m: "asyncio", lang: "py",
    t: "Anulare corectă: finally și CancelledError",
    p: "Scrie `worker(res)`, care rulează la nesfârșit și lasă în `res` urmele curățeniei când e anulat, și `cancel(task)`, care anulează task-ul și așteaptă să se termine. Anularea trebuie să ajungă la cine a cerut-o: `wait_for`, `timeout` și `TaskGroup` se bazează pe ea.",
    k: [
      "Curățenia stă în `finally`: rulează la anulare, la excepție și la ieșire normală.",
      "Dacă prinzi `CancelledError`, o re-ridici cu `raise` după curățenie: e `BaseException`, deci `except Exception` nu o prinde, iar dacă o înghiți, `wait_for`, `timeout` și `TaskGroup` nu mai pot opri task-ul.",
      "`task.cancel()` doar cere anularea; `await task` (cu `CancelledError` prins în `cancel`) așteaptă să se termine curățenia înainte să mergi mai departe.",
      "`CancelledError` o ignori doar în `cancel()`, acolo unde ai cerut tu anularea, niciodată în worker."
    ]
  },
  {
    id: "s-asyncio-agen", m: "asyncio", lang: "py",
    t: "async with și generator async",
    p: "Scrie un context manager async `resource(log)` (cu `@asynccontextmanager`) care deschide și închide mereu o resursă, și un generator async `ticks(n, log)`. Consumă `ticks` cu `async for`, ieși devreme cu `break` și asigură închiderea lui determinist.",
    k: [
      "`yield` într-un `async def` îl face generator async: îl consumi cu `async for`, nu cu `for`; `yield from` e eroare de sintaxă în el.",
      "În `@asynccontextmanager`, `yield` stă într-un `try/finally`: altfel închiderea nu rulează când blocul `async with` aruncă.",
      "La ieșire anticipată (`break`, excepție, anulare), `finally`-ul generatorului rulează doar dacă generatorul e închis; `aclosing(...)` (3.10+) cheamă `aclose()` determinist, în același task și context.",
      "`async with` apelează `__aenter__` / `__aexit__` (awaitable): `@asynccontextmanager` e doar scurtătura lor, iar un `with` simplu nu merge pe un context manager async."
    ]
  }
];
