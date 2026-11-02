# Fapte verificate pentru interviu (Python, asyncio, FastAPI, pytest)

Verificat la: **2026-10-22** (versiunile și secțiunea 7: **2026-10-28**; secțiunea 9: **2026-11-01**), doar din surse primare (docs.python.org și sursele lor din `python/cpython`, fastapi.tiangolo.com și `fastapi/fastapi`, Starlette docs și sursă, AnyIO docs, docs.pytest.org și `pytest-dev/*`, docs.pydantic.dev, pypi.org, docs.celeryq.dev, pyjwt.readthedocs.io, cheatsheetseries.owasp.org).

Legendă: ✅ corect · ⚠️ corect, dar depinde de versiune sau are o nuanță · ❌ greșit sau depășit.

## Versiuni stabile curente (2026-10-28)

| Proiect | Ultima versiune | Data | Requires-Python |
|---|---|---|---|
| Python | **3.15.1** (seria 3.15, bugfix) | 2026-10-21 | – |
| Python 3.14 | 3.14.9 (bugfix) | 2026-10-21 | – |
| Python 3.13 | 3.13.17 (doar security) | 2026-10-21 | – |
| FastAPI | **0.162.0** | 2026-10-23 | >=3.10 |
| Starlette | **1.10.0** | 2026-10-24 | >=3.11 |
| Pydantic | **2.14.1** | 2026-10-11 | >=3.10 |
| pytest | **9.2.0** | 2026-10-27 | >=3.10 |
| pytest-asyncio | 1.4.1 | 2026-10-25 | >=3.10 |
| AnyIO | 4.15.1 | 2026-09-05 | >=3.10 |
| httpx / httpx2 | 0.28.1 / 2.16.0 | 2024-12-06 / 2026-10-21 | – |

- Python 3.10 e EOL (ultima: 3.10.22). 3.11 și 3.12 primesc doar patch-uri de securitate. Sursă: https://www.python.org/downloads/
- Versiunile pachetelor vin din `https://pypi.org/pypi/<pachet>/json` (câmpul `info.version` și `upload_time`).
- Starlette a ajuns la 1.0.0 pe 2026-03-22. De la 1.8.0 (2026-10-13) cere Python ≥ 3.11. Sursă: https://github.com/encode/starlette/blob/master/docs/release-notes.md

---

## 1. asyncio

- ✅ **`asyncio.TaskGroup`**: adăugat în **3.11**.
  - Prima excepție dintr-un task, alta decât `CancelledError`, anulează task-urile rămase din grup. Dacă blocul `async with` încă rulează, e anulat și task-ul care conține `async with`.
  - După ce se termină toate task-urile, excepțiile se adună într-un **`ExceptionGroup`** (sau `BaseExceptionGroup`) și se ridică. Le prinzi cu `except*`.
  - Nuanță: `KeyboardInterrupt` și `SystemExit` nu sunt împachetate. Se ridică direct, după ce grupul anulează și așteaptă celelalte task-uri.
  - Nuanță: o excepție din corpul `async with` e tratată la fel ca eșecul unui task și intră și ea în grup.
  - 3.13: tratează mai bine anulările interne și externe simultane. Un `create_task` pe un grup inactiv închide corutina și ridică `RuntimeError`.
  - Sursă: https://docs.python.org/3.14/library/asyncio-task.html#task-groups
- ✅ **`asyncio.timeout(delay)`**: context manager async, adăugat în **3.11**. Există și `timeout_at(when)`.
  - La depășire anulează task-ul curent și transformă `CancelledError` în **`TimeoutError`** (builtin).
  - `asyncio.TimeoutError` e alias pentru builtin-ul `TimeoutError` din 3.11.
  - `delay=None` înseamnă fără limită; limita se poate muta cu `reschedule()`.
  - Sursă: https://docs.python.org/3.14/library/asyncio-task.html#timeouts și https://docs.python.org/3.14/library/asyncio-exceptions.html
- ✅ **`asyncio.CancelledError`** e subclasă directă de `BaseException`, nu de `Exception`, din **3.8**.
  - De aceea un `except Exception:` nu o prinde.
  - Dacă o prinzi, trebuie re-ridicată. `TaskGroup` și `timeout()` se bazează pe anulare și se pot strica dacă o înghiți.
  - Sursă: https://docs.python.org/3.14/library/asyncio-exceptions.html#asyncio.CancelledError
- ✅ **`asyncio.to_thread(func, /, *args, **kwargs)`**: adăugat în **3.9**.
  - Propagă `contextvars` în thread.
  - Codul sursă apelează `loop.run_in_executor(None, ...)`, adică **executorul implicit** al loop-ului. Acesta e un `ThreadPoolExecutor` creat la prima nevoie, dacă nu ai setat altul cu `loop.set_default_executor`.
  - Din cauza GIL-ului ajută la I/O, nu la CPU (excepție: build-ul free-threaded).
  - Sursă: https://docs.python.org/3.14/library/asyncio-task.html#asyncio.to_thread și https://github.com/python/cpython/blob/3.14/Lib/asyncio/threads.py
- ✅ **`asyncio.gather(*aws, return_exceptions=False)`**:
  - Cu `False` (implicit), prima excepție ajunge imediat la cel care face `await`, dar celelalte awaitable-uri **nu sunt anulate** și continuă să ruleze.
  - Cu `True`, excepțiile apar ca rezultate în listă, în ordinea din `aws`.
  - Dacă anulezi `gather()`, se anulează tot ce nu s-a terminat.
  - Un copil anulat contează ca o excepție `CancelledError`; `gather` însuși nu e anulat.
  - Capcană: după ce `gather` a propagat o excepție, e deja „done”, deci un `gather.cancel()` nu mai anulează nimic.
  - Docs recomandă `TaskGroup` când vrei ca restul să fie anulat.
  - Sursă: https://docs.python.org/3.14/library/asyncio-task.html#asyncio.gather
- ✅ **`asyncio.Semaphore(value=1)`**: contor intern; `acquire()` blochează la 0. Se folosește cu `async with sem:`.
  - `value < 0` ridică `ValueError`.
  - `BoundedSemaphore` ridică `ValueError` dacă faci `release()` peste valoarea inițială.
  - **Nu e thread-safe**, ca toate primitivele asyncio.
  - Sursă: https://docs.python.org/3.14/library/asyncio-sync.html#semaphore
- ✅ **Cod blocant într-o corutină** (de exemplu `time.sleep`, CPU intensiv): blochează tot event loop-ul, deci toate task-urile și tot I/O-ul.
  - Docs: „dacă o funcție face un calcul de 1 s, toate task-urile asyncio și operațiile I/O sunt întârziate cu 1 s”.
  - Soluția: `to_thread` / `run_in_executor` (thread sau proces) sau `await asyncio.sleep`.
  - Verificat local pe 3.13: un task care face doar `await asyncio.sleep(0)` a așteptat 0,30 s în spatele unui `time.sleep(0.3)`.
  - Sursă: https://docs.python.org/3.14/library/asyncio-dev.html#running-blocking-code
- ✅ **Debug mode**: îl activezi cu `PYTHONASYNCIODEBUG=1`, `python -X dev`, `asyncio.run(debug=True)` sau `loop.set_debug(True)`.
  - Callback-urile mai lungi de **100 ms** sunt logate; pragul e **`loop.slow_callback_duration`**, implicit 0,1 s.
  - În plus, apelurile non-threadsafe făcute din alt thread ridică excepție.
  - Sursă: https://docs.python.org/3.14/library/asyncio-dev.html#debug-mode și https://docs.python.org/3.14/library/asyncio-eventloop.html#asyncio.loop.slow_callback_duration
- ✅ **`asyncio.Queue` nu e thread-safe** (docs: „not thread safe”).
  - Din alt thread folosești `loop.call_soon_threadsafe(...)` sau `asyncio.run_coroutine_threadsafe(coro, loop)`; al doilea întoarce un `concurrent.futures.Future`.
  - Nou în **3.13**: `Queue.shutdown(immediate=False)` și excepția `QueueShutDown`.
  - Sursă: https://docs.python.org/3.14/library/asyncio-queue.html și https://docs.python.org/3.14/library/asyncio-dev.html#concurrency-and-multithreading

## 2. threading și concurrent.futures

- ✅ **`Lock` vs `RLock`**:
  - `Lock` (primitiv) nu are proprietar: îl poate elibera orice thread. `release()` pe un lock deblocat ridică `RuntimeError`.
  - `RLock` (reentrant) are un thread proprietar și un nivel de recursivitate. Același thread îl poate lua de mai multe ori și trebuie să-l elibereze de tot atâtea ori. Doar proprietarul îl poate elibera.
  - Sursă: https://docs.python.org/3.14/library/threading.html#lock-objects și #rlock-objects
- ✅ **`Condition(lock=None)`**: fără argument își creează un **`RLock`**.
  - `wait()` cere lock-ul ținut (altfel `RuntimeError`), îl eliberează cât așteaptă și îl reia la trezire.
  - `notify(n=1)` și `notify_all()` cer și ele lock-ul ținut.
  - `wait_for(predicate, timeout=None)` (din 3.2) e echivalent cu `while not predicate(): cv.wait()` și întoarce ultima valoare a predicatului (`False` la timeout).
  - Sursă: https://docs.python.org/3.14/library/threading.html#condition-objects
- ✅ **`Event`**: un flag, inițial `False`; ai `set()`, `clear()`, `is_set()`.
  - `wait(timeout)` întoarce `True` dacă flag-ul e setat și `False` la timeout.
  - Sursă: https://docs.python.org/3.14/library/threading.html#event-objects
- ✅ **`Semaphore(value=1)` / `BoundedSemaphore(value=1)`**: `BoundedSemaphore` ridică `ValueError` dacă `release()` ar depăși valoarea inițială. Docs: prea multe release-uri sunt „semn de bug”.
  - Sursă: https://docs.python.org/3.14/library/threading.html#semaphore-objects
- ✅ **`queue.Queue` e thread-safe**: implementează intern tot locking-ul necesar.
  - `task_done()` vine după fiecare `get()` procesat. `join()` blochează până ajunge la zero contorul de task-uri neterminate (crește la `put`, scade la `task_done`).
  - `task_done()` apelat de mai multe ori decât `put` ridică `ValueError`.
  - Nou în **3.13**: `Queue.shutdown()` și `queue.ShutDown`.
  - Sursă: https://docs.python.org/3.14/library/queue.html
- ⚠️ **`ThreadPoolExecutor` `max_workers` implicit**:
  - 3.5–3.7: `os.cpu_count() * 5`.
  - **3.8–3.12**: `min(32, os.cpu_count() + 4)`; în cod e `(os.cpu_count() or 1) + 4`.
  - **3.13+** (la fel în 3.14, 3.15 și `main`): **`min(32, (os.process_cpu_count() or 1) + 4)`**. Diferența: `os.process_cpu_count()` numără doar CPU-urile utilizabile de proces (afinitate), nu toate CPU-urile mașinii.
  - Din 3.8, executorul refolosește worker-ii inactivi înainte să pornească alții noi.
  - Sursă: https://docs.python.org/3.14/library/concurrent.futures.html#threadpoolexecutor și https://github.com/python/cpython/blob/3.13/Lib/concurrent/futures/thread.py
- ✅ **`concurrent.futures.as_completed(fs, timeout=None)`**: iterator care dă future-urile pe măsură ce se termină (sau sunt anulate).
  - Dublurile apar o singură dată; cele deja terminate apar primele.
  - `__next__` ridică `TimeoutError` dacă trece `timeout` de la apelul inițial.
  - Pentru ordinea de intrare folosești `executor.map`.
  - Sursă: https://docs.python.org/3.14/library/concurrent.futures.html#concurrent.futures.as_completed
- ✅ **Free-threading (fără GIL)**:
  - **3.13**: suport **experimental** (PEP 703). Build separat (`--disable-gil`, executabil `python3.13t`), instalat opțional din installerele de Windows și macOS.
  - **3.14**: PEP 779, „**officially supported but still optional**” (faza II). Nu mai e experimental, dar nici build implicit. Trecerea la faza III (build implicit sau unic) e „încă nedecisă”.
  - **3.15**: installerele oficiale de macOS instalează implicit și suportul free-threading. Apare PEP 803, un stable ABI pentru build-urile free-threaded (`abi3t`). Tot nu e build-ul implicit.
  - Cum verifici: `sys._is_gil_enabled()`, `sysconfig.get_config_var("Py_GIL_DISABLED")`; `PYTHON_GIL=0/1` sau `-X gil` pornește sau oprește GIL-ul la rulare.
  - Atenție: GIL-ul se poate reactiva automat la importul unei extensii C nemarcate ca free-threading-safe.
  - Sursă: https://docs.python.org/3.14/whatsnew/3.14.html (secțiunea „Free-threaded Python is officially supported”), https://docs.python.org/3.13/whatsnew/3.13.html, https://docs.python.org/3.15/whatsnew/3.15.html, https://docs.python.org/3.14/howto/free-threading-python.html
- ⚠️ **`sys.getswitchinterval()` = 0,005 s (5 ms)**: valoarea e corectă, dar docs-ul `sys` **nu precizează valoarea implicită**.
  - Ea vine din sursa CPython, `#define DEFAULT_INTERVAL 5000` (microsecunde) în `Python/ceval_gil.c`, aceeași în 3.14, 3.15 și `main`. Verificat și local: `sys.getswitchinterval()` întoarce `0.005`.
  - Se schimbă cu `sys.setswitchinterval()` (din 3.2).
  - Sursă: https://docs.python.org/3.14/library/sys.html#sys.setswitchinterval și https://github.com/python/cpython/blob/3.14/Python/ceval_gil.c

## 3. Generatori și iteratori

- ✅ **`yield from <iterabil>`** (PEP 380, **3.3**):
  - Valorile trec direct la cel care apelează.
  - `send()` și `throw()` se transmit sub-iteratorului.
  - **Expresia `yield from` ia valoarea `StopIteration.value`**, adică valoarea din `return` a subgeneratorului.
  - Într-un generator async, `yield from` e SyntaxError.
  - Sursă: https://docs.python.org/3.14/reference/expressions.html#yield-expressions
- ✅ **`send(value)`**: valoarea devine rezultatul expresiei `yield` curente, iar `send` întoarce următoarea valoare produsă.
  - **La pornire trebuie `send(None)`** (sau `next(gen)`).
  - Verificat local: `send(5)` pe un generator neînceput ridică `TypeError: can't send non-None value to a just-started generator`.
  - Sursă: https://docs.python.org/3.14/reference/expressions.html#generator.send
- ⚠️ **`throw(exc)`**: ridică excepția în punctul unde generatorul e suspendat.
  - Întoarce următorul `yield` dacă generatorul o prinde. Altfel excepția se propagă.
  - Semnătura veche `throw(type, value, tb)` e **deprecated din 3.12**.
  - Sursă: https://docs.python.org/3.14/reference/expressions.html#generator.throw
- ⚠️ **`close()`**: ridică `GeneratorExit` în punctul de suspendare.
  - Dacă generatorul face `yield` în loc să iasă, apare `RuntimeError`.
  - Nou în **3.13**: dacă generatorul prinde `GeneratorExit` și face `return x`, **`close()` întoarce `x`** (înainte întorcea mereu `None`).
  - Sursă: https://docs.python.org/3.14/reference/expressions.html#generator.close
- ✅ **Generator expressions** sunt leneșe și de unică folosință.
  - Excepție de la lenevie: primul iterabil (cel mai din stânga) e evaluat imediat, deci `(x for x in None)` ridică `TypeError` pe loc.
  - Restul expresiei se evaluează abia la iterare.
  - Verificat local: `list(ge)` de două ori dă `[0, 1, 2]`, apoi `[]`.
  - Sursă: https://docs.python.org/3.14/reference/expressions.html#generator-expressions
- ✅ **`itertools.islice(it, [start,] stop[, step])`**: slicing leneș, fără valori negative. `itertools.chain(*its)` și `chain.from_iterable` concatenează iterabile.
  - Sursă: https://docs.python.org/3.14/library/itertools.html
- ✅ **`itertools.groupby(it, key=None)`**: grupează doar cheile **consecutive**, ca `uniq` din Unix și spre deosebire de `GROUP BY` din SQL. De obicei sortezi întâi după aceeași cheie.
  - Grupul împarte iteratorul de bază cu `groupby`, deci dispare când avansezi; îl salvezi cu `list(g)`.
  - Verificat local: `groupby('aabaa')` dă `a:2, b:1, a:2`.
  - Sursă: https://docs.python.org/3.14/library/itertools.html#itertools.groupby
- ⚠️ **`itertools.batched(iterable, n, *, strict=False)`**: adăugat în **3.12**; parametrul `strict` vine din **3.13**.
  - Produce **tupluri**; ultimul poate fi mai scurt. Cu `strict=True`, un ultim lot incomplet ridică `ValueError`.
  - Sursă: https://docs.python.org/3.14/library/itertools.html#itertools.batched
- ✅ **Generatori async** (PEP 525, **3.6**): `async def` cu `yield`, consumați cu `async for`.
  - Metode: `asend()`, `athrow()`, `aclose()`.
  - `return valoare` e SyntaxError într-un generator async.
  - Pentru finalizare sigură apelezi explicit `aclose()`, de exemplu cu `contextlib.aclosing`.
  - Sursă: https://docs.python.org/3.14/reference/expressions.html#asynchronous-generator-functions

## 4. OOP

- ✅ **MRO C3** (din Python 2.3) dă o ordine liniară corectă și la moștenirea „diamant”.
  - `super()` urmează MRO-ul **instanței**, nu clasa părinte scrisă în cod. De aceea `super().__init__(**kw)` cooperativ trebuie apelat în fiecare clasă.
  - Sursă: https://docs.python.org/3.14/reference/datamodel.html (secțiunea despre clase, „C3 method resolution order”) și https://docs.python.org/3/howto/mro.html
- ✅ **`__new__` vs `__init__`**:
  - `__new__(cls, ...)` e metodă statică implicită și creează instanța.
  - `__init__` rulează **doar dacă `__new__` întoarce o instanță de `cls`**.
  - `__new__` servește mai ales la subclasarea tipurilor imuabile (`int`, `str`, `tuple`) și la metaclase.
  - Sursă: https://docs.python.org/3.14/reference/datamodel.html#object.__new__
- ✅ **`__eq__` fără `__hash__`**: `__hash__` devine implicit `None`, deci instanțele nu sunt hashable (`TypeError` la `hash()`, iar `isinstance(x, Hashable)` dă `False`).
  - Ca să păstrezi hash-ul părintelui: `__hash__ = Parent.__hash__`.
  - Verificat local: `E.__hash__ is None`.
  - Sursă: https://docs.python.org/3.14/reference/datamodel.html#object.__hash__
- ✅ **dataclasses** (modul din **3.7**). Semnătura: `@dataclass(*, init=True, repr=True, eq=True, order=False, unsafe_hash=False, frozen=False, match_args=True, kw_only=False, slots=False, weakref_slot=False)`.
  - `eq=True` e implicit. ⚠️ Din **3.13** `__eq__` compară câmp cu câmp, nu ca tupluri (contează la `nan`).
  - `order=True` cere `eq=True` (altfel `ValueError`); `TypeError` dacă clasa definește deja `__lt__` și celelalte.
  - Hash: `eq=True, frozen=True` generează `__hash__`; `eq=True, frozen=False` pune `__hash__ = None`; `eq=False` păstrează hash-ul părintelui (id).
  - `unsafe_hash=True` forțează `__hash__`; combinat cu un `__hash__` explicit dă `TypeError`.
  - `frozen=True`: atribuirea ridică `FrozenInstanceError`, subclasă de `AttributeError`.
  - `match_args`, `kw_only` și `slots` sunt din **3.10**; `weakref_slot` din **3.11**.
  - Default-urile mutabile (orice valoare unhashable, din 3.11) dau `ValueError`; folosești `field(default_factory=list)`.
  - Sursă: https://docs.python.org/3.14/library/dataclasses.html
- ✅ **`abc.ABC` + `@abstractmethod`**: instanțierea unei clase cu metode abstracte neimplementate ridică `TypeError`.
  - Verificat local pe 3.13: „Can't instantiate abstract class A without an implementation for abstract method 'f'”.
  - Sursă: https://docs.python.org/3.14/library/abc.html#abc.abstractmethod
- ✅ **`typing.Protocol`** (PEP 544, **3.8**): subtipare structurală, verificată static.
  - Fără `@runtime_checkable`, un protocol nu poate fi folosit cu `isinstance` sau `issubclass`.
  - `@runtime_checkable` (3.8) verifică **doar prezența** metodelor și atributelor, nu semnăturile sau tipurile.
  - ⚠️ Din 3.12, verificarea folosește `inspect.getattr_static` în loc de `hasattr`, iar membrii protocolului sunt „înghețați” la crearea clasei.
  - Sursă: https://docs.python.org/3.14/library/typing.html#typing.Protocol și #typing.runtime_checkable
- ✅ **`@property`**: getter, setter, deleter. Fără setter, atribuirea dă `AttributeError`.
- ⚠️ **`classmethod` vs `staticmethod`**: `classmethod` primește clasa (`cls`), iar `staticmethod` nu primește argument implicit.
  - Din 3.10 ambele au `__wrapped__`, iar `staticmethod` e apelabil ca funcție obișnuită.
  - Combinația `@classmethod` + `@property` („class property”) a fost permisă în 3.9, e deprecated din 3.11 și **eliminată în 3.13**.
  - Sursă: https://docs.python.org/3.14/library/functions.html#classmethod
- ✅ **`__slots__`**: rezervă spațiu pentru atributele declarate și nu mai creează `__dict__` și `__weakref__`, dacă nu le declari sau nu vin de la un părinte.
  - Economisești memorie („can be significant”) și lookup-ul e mai rapid.
  - Dacă moștenești o clasă fără `__slots__`, `__dict__` rămâne.
  - Sursă: https://docs.python.org/3.14/reference/datamodel.html#slots
- ✅ **`functools.cached_property`** (**3.8**): calculează o dată și scrie rezultatul în `__dict__` sub același nume. Se șterge cu `del obj.attr`.
  - **Cere un `__dict__` mutabil** pe instanță, deci nu merge cu `__slots__` fără `__dict__` și nici pe metaclase.
  - Strică key-sharing-ul din PEP 412.
  - **Lock-ul a fost eliminat în 3.12.** Înainte exista un lock nedocumentat, per proprietate și nu per instanță, care dădea contenție mare. Acum getter-ul poate rula de mai multe ori dacă două thread-uri intră în cursă; dacă îți trebuie sincronizare, o pui tu.
  - Sursă: https://docs.python.org/3.14/library/functools.html#functools.cached_property și https://docs.python.org/3.12/whatsnew/3.12.html

## 5. FastAPI, Starlette, Pydantic

- ✅ **Path operation cu `def`**: rulează „într-un threadpool extern care e apoi awaited”. La fel și dependențele `def`.
  - Funcțiile utilitare pe care le apelezi tu nu sunt mutate în threadpool.
  - În cod: `fastapi/routing.py` folosește `starlette.concurrency.run_in_threadpool`, adică `anyio.to_thread.run_sync`.
  - Sursă: https://fastapi.tiangolo.com/async/#path-operation-functions și https://github.com/encode/starlette/blob/master/starlette/concurrency.py
- ✅ **Limitatorul implicit e 40 de token-uri** (AnyIO): cel mult 40 de thread-uri worker simultane pentru `to_thread.run_sync` fără `limiter`.
  - Docs Starlette: limita e **comună** cu dependențele sync din FastAPI, `FileResponse`, `UploadFile` și background task-urile sync.
  - O crești cu `anyio.to_thread.current_default_thread_limiter().total_tokens = N`.
  - Nu afectează executorul implicit din asyncio (cel din `asyncio.to_thread`).
  - Sursă: https://anyio.readthedocs.io/en/stable/threads.html și https://www.starlette.io/threadpool/
- ✅ **`async def` rulează direct pe event loop**: cod blocant acolo (`time.sleep`, un driver DB sync, `requests`) blochează **toate** request-urile din acel worker. Docs recomandă `def` când folosești biblioteci blocante.
  - Sursă: https://fastapi.tiangolo.com/async/
- ⚠️ **Dependențe cu `yield`**: momentul în care rulează codul de după `yield` s-a schimbat de mai multe ori.
  - **< 0.106.0**: după trimiterea răspunsului; excepțiile de după `yield` nu mai ajungeau la exception handlers.
  - **0.106.0** (2023-12-25): exit code-ul rula **înainte** de trimiterea răspunsului, după path operation. Asta strica `StreamingResponse` (sesiunea DB era deja închisă).
  - **0.110.0**: dacă prinzi o excepție cu `except` într-o dependență cu `yield` și nu o re-ridici, nu se mai propagă automat. Regula: **re-ridici mereu** (`raise`).
  - **0.118.0** (2025-09-29): s-a revenit, iar exit code-ul rulează **după** trimiterea răspunsului.
  - **0.121.0** (2025-11-03): a apărut **`Depends(scope="function")`** (exit înainte de răspuns) și `scope="request"`, care e **implicit** (exit după răspuns).
  - Comportament verificat pe 0.159.1: implicit după răspuns; cu `scope="function"`, înainte.
  - O dependență cu `scope="request"` nu poate depinde de una cu `scope="function"`.
  - Sursă: https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/#early-exit-and-scope și https://fastapi.tiangolo.com/advanced/advanced-dependencies/#dependencies-with-yield-httpexception-except-and-background-tasks
- ⚠️ **Lifespan**: `@asynccontextmanager async def lifespan(app): ...; yield; ...` și `FastAPI(lifespan=lifespan)`. A apărut în FastAPI **0.93.0** (2023-03-07).
  - `@app.on_event("startup"/"shutdown")` e **deprecated** (marcat `@deprecated` în cod) și încă funcționează în FastAPI.
  - Dacă dai `lifespan`, handler-ele `startup` și `shutdown` **nu mai sunt apelate**: ori doar lifespan, ori doar evenimente.
  - Nou: **Starlette 1.0** (rc1 din 2026-02-23) a **eliminat** `on_startup`, `on_shutdown`, `on_event()`, `add_event_handler()` și `@app.route()`. FastAPI le reimplementează intern (`_DefaultLifespan` în `fastapi/routing.py`) ca să păstreze compatibilitatea. În Starlette pur nu mai există.
  - Sursă: https://fastapi.tiangolo.com/advanced/events/ și https://github.com/encode/starlette/blob/master/docs/release-notes.md (1.0.0rc1)
- ✅ **`BackgroundTasks`** rulează **după** trimiterea răspunsului, **în același proces**. Nu e o coadă și nu e durabil: dacă procesul moare, task-ul se pierde.
  - Vine din `starlette.background`. Task-urile rulează în ordine, iar dacă unul ridică excepție, următoarele nu mai rulează.
  - Task-urile sync trec prin threadpool-ul de 40.
  - Pentru calcule grele sau pe mai multe servere, docs FastAPI trimit la Celery și la o coadă (RabbitMQ, Redis).
  - Sursă: https://fastapi.tiangolo.com/tutorial/background-tasks/ și https://www.starlette.io/background/
- ✅ **`app.dependency_overrides`**: un `dict` simplu `{dependenta_originala: dependenta_falsa}`; îl resetezi cu `app.dependency_overrides = {}`.
  - Sursă: https://fastapi.tiangolo.com/advanced/testing-dependencies/
- ⚠️ **`TestClient`**: `fastapi.testclient.TestClient` e un re-export al `starlette.testclient.TestClient`. Docs FastAPI spun că e „bazat pe HTTPX” și că testele sunt `def` normale.
  - Nuanță nouă: din **Starlette 1.2.0** (2026-05-28), TestClient-ul preferă pachetul **`httpx2`** (`pydantic/httpx2`, „next generation HTTP client”). Dacă găsește doar `httpx`, merge, dar emite `StarletteDeprecationWarning` („install `httpx2` instead”).
  - FastAPI are `httpx2` în extras (0.143.4) și în dependențele de test (0.137.0).
  - Pentru teste async: `httpx.AsyncClient(transport=ASGITransport(app=app), ...)` cu `@pytest.mark.anyio`. `AsyncClient` nu pornește lifespan-ul; pentru asta docs recomandă `asgi-lifespan` (`LifespanManager`).
  - Sursă: https://fastapi.tiangolo.com/tutorial/testing/, https://fastapi.tiangolo.com/advanced/async-tests/, https://github.com/encode/starlette/blob/1.9.0/starlette/testclient.py
- ✅ **Versiunea FastAPI curentă**: 0.162.0 (2026-10-23). Încă e 0.x (ZeroVer), spre deosebire de Starlette, care a trecut la 1.x.
- ⚠️ **Pydantic v2 vs v1**:

  | v1 | v2 |
  |---|---|
  | `parse_obj()` | `model_validate()` |
  | `parse_raw()` | `model_validate_json()` |
  | `from_orm()` + `orm_mode` | `model_validate()` + `from_attributes=True` |
  | `dict()` | `model_dump()` |
  | `json()` | `model_dump_json()` |
  | `copy()` | `model_copy()` |
  | `schema()` | `model_json_schema()` |
  | `construct()` | `model_construct()` |
  | `update_forward_refs()` | `model_rebuild()` |
  | `__fields__` | `model_fields` |
  | `@validator` | `@field_validator` |
  | `@root_validator` | `@model_validator` |
  | `class Config:` | `model_config = ConfigDict(...)` |
  | `pydantic.BaseSettings` | `pydantic_settings.BaseSettings` |

  - Metodele vechi există încă, dar emit `DeprecationWarning`.
  - FastAPI **a renunțat la Pydantic v1 în 0.126.0** (2025-12-20) și la `pydantic.v1` în **0.128.0** (2025-12-27). Acum cere `pydantic>=2.9.0`.
  - Sursă: https://docs.pydantic.dev/latest/migration/, https://fastapi.tiangolo.com/release-notes/, https://github.com/fastapi/fastapi/blob/master/pyproject.toml

## 6. pytest (faptele verificate pe 9.1.1; curent 9.2.0)

- ✅ **Scope-uri de fixture**: `function` (implicit), `class`, `module`, `package`, `session`.
  - `package`: fixture-ul e distrus la teardown-ul ultimului test din pachetul în care e definit, inclusiv subpachetele.
  - Sursă: https://docs.pytest.org/en/stable/how-to/fixtures.html#scope-sharing-fixtures-across-classes-modules-packages-or-session
- ✅ **Fixture-uri cu `yield`**: codul de după `yield` e teardown-ul. Teardown-urile rulează în **ordinea inversă** setup-ului (LIFO), doar pentru fixture-urile care au ajuns la `yield`.
  - Alternativă: `request.addfinalizer`.
  - Sursă: https://docs.pytest.org/en/stable/how-to/fixtures.html#yield-fixtures-recommended
- ✅ **`conftest.py`**: plugin local per director, descoperit automat.
  - La pornire se încarcă `conftest.py` din căile de test, `test*/conftest.py`, și cele din directoarele părinte până la rootdir sau confcutdir.
  - Fixture-urile din `conftest.py` sunt vizibile fără import în directorul lui și în subdirectoare.
  - Sursă: https://docs.pytest.org/en/stable/how-to/writing_plugins.html#conftest-py-local-per-directory-plugins
- ✅ **`@pytest.mark.parametrize("a,b", [(1, 2), ...])`**: generează câte un test pentru fiecare set. Decoratorii se pot stivui (produs cartezian); există și `pytest.param(..., id=..., marks=...)` și `indirect=`.
  - Sursă: https://docs.pytest.org/en/stable/how-to/parametrize.html
- ✅ **`monkeypatch` vs `unittest.mock.patch`**:
  - `monkeypatch` are `setattr`, `delattr`, `setitem`, `delitem`, `setenv`, `delenv`, `syspath_prepend`, `chdir`, `context()`. Toate se anulează automat la finalul testului sau fixture-ului.
  - `mock.patch` lucrează ca decorator sau context manager și creează `MagicMock`.
  - Regula comună: **patch-uiești unde e căutat numele, nu unde e definit**. Dacă `a.py` face `from b import f`, patch-uiești `a.f`, nu `b.f`.
  - Sursă: https://docs.pytest.org/en/stable/how-to/monkeypatch.html și https://docs.python.org/3.14/library/unittest.mock.html#where-to-patch
- ✅ **`tmp_path`**: un `pathlib.Path`, director temporar unic pentru fiecare test. Pentru scope mai larg: `tmp_path_factory` (scope session).
  - Sursă: https://docs.pytest.org/en/stable/how-to/tmp_path.html
- ✅ **`pytest.raises(Exc, match=r"...")`**: `match` folosește **`re.search`**, deci un fragment ajunge. Se potrivește și cu `__notes__` (PEP 678). Ai acces la excepție prin `with ... as excinfo:` și `excinfo.value`.
  - Sursă: https://docs.pytest.org/en/stable/how-to/assert.html#assertions-about-expected-exceptions
- ⚠️ **Mark-uri custom**:
  - Le înregistrezi în config (`markers = [...]`) sau în `pytest_configure` cu `config.addinivalue_line("markers", ...)`.
  - Un mark neînregistrat dă **warning** (`PytestUnknownMarkWarning`). Cu `--strict-markers` sau `strict_markers = true` devine **eroare**, și pentru mark-urile din `@pytest.mark.x` și pentru cele din expresiile `-m`.
  - Nou în **pytest 9.0**: opțiunea `strict = true` activează împreună `strict_config`, `strict_markers`, `strict_parametrization_ids` și `strict_xfail`.
  - Sursă: https://docs.pytest.org/en/stable/how-to/mark.html și https://docs.pytest.org/en/stable/reference/reference.html#confval-strict
- ⚠️ **Teste async**: pytest **nu are suport nativ**; ai nevoie de un plugin (`pytest-asyncio`, `anyio`, `pytest-trio`).
  - Din **pytest 8.4.0** (2025-06-02), un test `async def` fără plugin **eșuează**. Înainte era sărit, cu warning.
  - `pytest-asyncio` (1.4.0) e implicit în modul **`strict`**: rulează doar testele marcate `@pytest.mark.asyncio` și fixture-urile `@pytest_asyncio.fixture`. Modul `auto` le ia pe toate.
  - FastAPI folosește în docs plugin-ul AnyIO (`@pytest.mark.anyio`), care vine cu AnyIO, deci nu cere `pytest-asyncio`.
  - Sursă: https://docs.pytest.org/en/stable/changelog.html (8.4.0, #11372), https://pytest-asyncio.readthedocs.io/en/stable/concepts.html, https://pytest-asyncio.readthedocs.io/en/stable/reference/configuration.html

---

## 7. Pentru rolul SDET (RO-1186): HTTP, testare, frontend

Analiza completă și sursele pentru fiecare afirmație sunt în `research/job-8805551002-gaps.md`. Aici sunt doar faptele folosite în grile.

- ✅ **HTTP (RFC 9110)**: GET, HEAD, OPTIONS și TRACE sunt safe; PUT, DELETE și metodele safe sunt idempotente. PATCH nu e nici safe, nici idempotent (RFC 5789). 401 cere `WWW-Authenticate`; 403 = cerere înțeleasă, dar refuzată; 409 = conflict cu starea resursei; 422 = Unprocessable Content; 429 = rate limiting (RFC 6585). Surse: https://www.rfc-editor.org/rfc/rfc9110, https://www.rfc-editor.org/rfc/rfc5789, https://www.rfc-editor.org/rfc/rfc6585
- ✅ **pytest-xdist**: fiecare worker își face colectarea, deci un fixture `session` rulează în fiecare worker; `worker_id` e `gw0`, `gw1` … sau `master`; pentru o singură creare, lock pe fișier. Sursă: https://pytest-xdist.readthedocs.io/en/stable/how-to.html
- ✅ **Playwright**: `expect` reîncearcă, cu timeout implicit de 5 s; `locator.is_visible()` nu așteaptă. Surse: https://playwright.dev/python/docs/test-assertions, https://playwright.dev/python/docs/api/class-locator#locator-is-visible
- ✅ **React**: state ca snapshot și updater function (https://react.dev/learn/queueing-a-series-of-state-updates); Strict Mode rulează în dev un ciclu setup + cleanup în plus (https://react.dev/reference/react/useEffect); React Compiler 1.0 pe 2025-10-07 (https://react.dev/blog/2025/10/07/react-compiler-1); React 19.3 pe 2026-09-09, cu `<ViewTransition>` stabil (https://react.dev/blog/2026/09/09/react-19-3).
- ✅ **TypeScript 7**: port nativ, „10x faster”. Sursă: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- ✅ **OAuth în browser**: RFC 9700 cere PKCE pentru clienții publici, descurajează implicit grant și interzice password grant. RFC 10017 (august 2026) prezintă BFF, token-mediating backend și client în browser „in decreasing order of security”; BFF e „strongly recommended for business applications”. Surse: https://www.rfc-editor.org/rfc/rfc9700, https://www.rfc-editor.org/rfc/rfc10017
- ✅ **Onapsis**: Control e „the only SAP-endorsed automated SAP application security testing software”; Defend are „over 2,600 detection rules”; OVERPASS e CVE-2026-44756. Surse: https://onapsis.com/platform/control/, https://onapsis.com/platform/defend/, https://onapsis.com/blog/sap-overpass-remediation/
- ⚠️ **CoderPad**: pagina Python 3 spune CPython 3.10, iar docs-ul CoderPad Screen spune 3.11.5. Rulezi `sys.version` la început. Surse: https://coderpad.io/languages/python-3/, https://coderpad.io/resources/docs/screen/more-screen-resources/supported-languages-frameworks-technologies/what-compiler-does-my-test-run-on/

## 8. Gemini Live și Web Audio, pentru lecție (Jarvis)

- ✅ **Sfârșitul fluxului audio**: când microfonul se oprește (sau poarta lui se închide), clientul trimite `realtimeInput: { audioStreamEnd: true }` (în JS `sendRealtimeInput({ audioStreamEnd: true })`, în Python `audio_stream_end`). Serverul golește audio-ul păstrat; după aceea se poate trimite din nou audio. Documentația spune că trebuie trimis când fluxul stă mai mult de o secundă, de exemplu când utilizatorul oprește microfonul. Folosit la „Vorbește” și la sfârșitul ferestrei de ascultare (`audioEnd` în `src/live.js`). Sursă: https://ai.google.dev/gemini-api/docs/live-guide (verificat 2026-10-28)
- ✅ **Sesiuni lungi**: sesiunile doar audio au 15 minute; reluarea cu `sessionResumption` (token valabil 2 ore) și `contextWindowCompression` le leagă între ele; `GoAway` anunță închiderea. Pentru lecție, reîncercările de reconectare sunt de ~60 s (`retryMs` în configurația sesiunii; celelalte moduri au cele trei din GeminiLive). Sursă: https://ai.google.dev/gemini-api/docs/live-session
- ✅ **`AudioContext.suspend()` îngheață timpul contextului**: sursele deja programate rămân în coadă și continuă din aceeași secundă la `resume()`, iar `ended` nu se declanșează cât durează pauza (verificat în Chromium, `tools/test_audio.py`). Pauza lecției se sprijină pe asta. Sursă: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend
- ⚠️ **Nepublicat**: limita zilnică a nivelului gratuit pentru Live; rămâne de văzut în AI Studio. Butoanele căștilor (Media Session), conexiunea cu ecranul stins și reconectarea într-un tunel adevărat se află doar prin proba din metrou (`docs/probe-lectie-metrou.html`).

## 9. Unelte de dev pentru referințele TypeScript / TSX (`katas/package.json`)

- ✅ **Versiuni pe registry (1 nov. 2026), fixate exact în manifest**: `typescript` 7.0.2, `vitest` 5.0.5, `jsdom` 30.1.3, `@testing-library/react` 16.3.3 (cu `@testing-library/dom` 10.4.2 ca peer), `@testing-library/user-event` 14.6.8, `react` / `react-dom` 19.3.1, `@types/react` 19.3.0, `@types/react-dom` 19.3.0. Sursă: `npm view <pachet> version` pe https://registry.npmjs.org/ (verificat 2026-11-01).
- ✅ **`tsc --strict --noEmit` cu TypeScript 7** (portul nativ): aceleași opțiuni, `-p katas` citește `tsconfig.json`; `// @ts-expect-error` produce eroarea TS2578 („Unused directive”) când eroarea așteptată dispare, deci un test de tip se poate strica. Verificat local: cu `assertNever(x: unknown)` în loc de `x: never`, `tsc` pică pe testul „caz nou în union”.
- ⚠️ **`jsdom` 30 declară `engines.node` ≥ 22.22.2 (sau ≥ 24.15)**. Mediul de lucru are Node 22.22.0: `npm install` dă doar avertismente `EBADENGINE`, iar testele rulează. Pe o mașină cu Node mai vechi de 22.22.2 trebuie un Node mai nou sau un `jsdom` mai vechi.
- ✅ **vitest** include implicit și `*.test.mjs`; testele `node:test` din `katas/` n-ar rula acolo, de aceea `vitest.config.ts` limitează `include` la `*.test.ts` / `*.test.tsx`, iar `.mjs` rămân pe `node --test`.

## 10. Schelete python și oop (tichetul 05)

Verificat la **2026-11-01** pe docs.python.org/3 (documentația curentă; fragmentele citate nu depind de versiune). Referințele din `katas/skel_python.py` și `katas/skel_oop.py` folosesc doar sintaxă compatibilă cu 3.10 (verificat cu `ast.parse(..., feature_version=(3, 10))`) și rulează în teste pe 3.13.

- ✅ **`@contextlib.contextmanager`**: funcția decorată întoarce un generator care cedează **exact o valoare**, legată de `as`. O excepție din bloc e re-ridicată în generator, la punctul `yield`; ca să faci curățenie folosești `try/finally`. Dacă o prinzi doar ca s-o loghezi, trebuie s-o re-ridici, altfel context managerul spune lui `with` că a fost tratată. Sursă: https://docs.python.org/3/library/contextlib.html#contextlib.contextmanager
- ✅ **`__exit__(self, exc_type, exc_value, traceback)`**: pentru a înghiți excepția întorci o valoare adevărată; altfel excepția se propagă. Metoda nu trebuie să re-ridice excepția primită: asta e treaba apelantului. Sursă: https://docs.python.org/3/reference/datamodel.html#object.__exit__
- ✅ **`functools.wraps` / `update_wrapper`**: copiază `__module__`, `__name__`, `__qualname__`, `__annotations__`, `__type_params__` și `__doc__`, actualizează `__dict__` și adaugă `__wrapped__` către funcția originală (din 3.2). Sursă: https://docs.python.org/3/library/functools.html#functools.update_wrapper
- ✅ **Protocolul iteratorului**: `iterator.__iter__()` întoarce iteratorul însuși, `iterator.__next__()` ridică `StopIteration` la sfârșit, iar după aceea trebuie să continue să-l ridice (un iterator care nu respectă asta e „stricat”). `container.__iter__()` întoarce un iterator. Sursă: https://docs.python.org/3/library/stdtypes.html#iterator-types
- ✅ **Protocolul vechi de secvență**: `iter(obj)` merge și cu un obiect fără `__iter__`, dacă are `__getitem__` cu indici întregi de la 0 (se oprește la `IndexError`). Sursă: https://docs.python.org/3/library/functions.html#iter
- ✅ **`x in y` pe clase proprii**, în ordine: `__contains__`; dacă lipsește, `__iter__` (compară cu `is` sau `==`); la urmă `__getitem__` cu indici de la 0 până la primul `IndexError`. Sursă: https://docs.python.org/3/reference/expressions.html#membership-test-operations
- ✅ **`__len__` și valoarea de adevăr**: fără `__bool__`, un obiect cu `__len__() == 0` e considerat fals. Sursă: https://docs.python.org/3/reference/datamodel.html#object.__len__ și #object.__bool__
- ✅ **`__hash__`**: singura proprietate cerută e că obiectele egale au același hash (se recomandă `hash((a, b))` pe componentele din `__eq__`). O clasă cu `__eq__` dar fără `__hash__` nu poate sta în colecții hashable; una mutabilă cu `__eq__` nu ar trebui să definească `__hash__`. Sursă: https://docs.python.org/3/reference/datamodel.html#object.__hash__
- ✅ **`NotImplemented` din compararea bogată**: o metodă `__eq__` poate întoarce `NotImplemented` când nu știe să compare tipurile date; implicit `object.__eq__` face `x is y` și întoarce `NotImplemented` la fals. Sursă: https://docs.python.org/3/reference/datamodel.html#object.__eq__
- ✅ **`Counter.most_common(n)`**: elementele cu număr egal rămân în ordinea primei apariții (exemplul din docs: `Counter('abracadabra').most_common(3)` dă `a:5, b:2, r:2`). Sursă: https://docs.python.org/3/library/collections.html#collections.Counter.most_common
- ✅ **`defaultdict.__missing__`**: e apelat doar din `__getitem__`; `get()` întoarce `None`, ca la un dict obișnuit, și nu folosește `default_factory`. Cheia creată prin `d[key]` rămâne în dict. Sursă: https://docs.python.org/3/library/collections.html#collections.defaultdict
- ✅ **`deque`**: `maxlen` aruncă elementele de la capătul opus când e plin; `append`/`pop` de la ambele capete sunt ~O(1), iar `list.pop(0)` și `insert(0, v)` costă O(n). Sursă: https://docs.python.org/3/library/collections.html#collections.deque
- ✅ **`heapq.nlargest(n, iterable, key=None)`**: echivalent cu `sorted(iterable, key=key, reverse=True)[:n]`; „merge cel mai bine pentru n mic”, pentru n mare e mai eficient `sorted()`, iar pentru n == 1 `min()` / `max()`. Sursă: https://docs.python.org/3/library/heapq.html#heapq.nlargest
- ✅ **`super()`**: `object_or_type` stabilește MRO-ul, iar căutarea începe cu clasa de după `type`; de pildă pentru MRO `D -> B -> C -> A -> object` și `type` = `B`, caută în `C -> A -> object`. `super()` fără argumente nu merge cum te aștepți în funcții imbricate, inclusiv generator expressions. Sursă: https://docs.python.org/3/library/functions.html#super
- ✅ **`itertools.islice(it, n)`** nu consumă elementul n+1 (verificat în teste: pe o sursă numărată, `head(grep(sursa, "7"), 2)` citește exact 18 linii). Verificat local pe 3.13, în `katas/test_skel_python.py`.

## 11. Schelete pytest și asgi (valul 2; verificat 1 noiembrie 2026)

Referințele din `katas/skel_pytest.py` și `katas/skel_asgi.py` rulează pe pytest 9.2.0, FastAPI 0.162.0, Starlette 1.7.0, Pydantic 2.13.5 și AnyIO 4.15.1 (cu `httpx2` instalat, pe care TestClient-ul îl preferă din Starlette 1.2.0). Fiecare afirmație de mai jos e din documentația oficială, iar cele marcate „rulat” au fost confirmate și cu un experiment pe versiunile de sus (testele din `katas/test_skel_*.py` le acoperă).

- ✅ **`monkeypatch.delenv(name, raising=True)`**: implicit ridică `KeyError` când variabila lipsește; `raising=False` o ignoră. Toate schimbările se anulează după testul sau fixture-ul care a cerut `monkeypatch` (rulat: o atribuire directă la `os.environ` sau la un atribut de clasă rămâne în testele următoare). Sursă: https://docs.pytest.org/en/stable/how-to/monkeypatch.html
- ✅ **`caplog`**: pytest prinde automat mesajele de nivel `WARNING` sau peste; `caplog.at_level(nivel)` schimbă temporar nivelul (implicit pe root logger) și îl restaurează la ieșirea din `with`. Rulat: un `log.info` fără `at_level` nu apare în `caplog.text`. `caplog.messages` are mesajele formatate. Sursă: https://docs.pytest.org/en/stable/how-to/logging.html
- ✅ **`unittest.mock`**: `patch(..., autospec=True)` copiază specificația obiectului înlocuit, iar o funcție mock-uită apelată cu semnătură greșită ridică `TypeError`. `side_effect` cu o clasă sau o instanță de excepție o ridică la apel; cu un iterabil întoarce următoarea valoare la fiecare apel, iar membrii care sunt excepții se ridică. Regula „unde patch-uiești”: unde e căutat obiectul (după `from b import X`, patch-uiești `b.X`). Sursă: https://docs.python.org/3/library/unittest.mock.html
- ✅ **`response_model`**: FastAPI filtrează datele de ieșire după modelul declarat (modelul fără `password` taie parola din răspuns, deși funcția întoarce utilizatorul cu parolă). Rulat și pe GET. Sursă: https://fastapi.tiangolo.com/tutorial/response-model/
- ✅ **Dependență cu `yield` și `except`**: dacă prinzi o excepție în dependență și nu o ridici din nou, FastAPI n-o mai vede: clientul primește 500, iar serverul nu are nimic în loguri; regula din docs e să ridici din nou excepția originală. `finally` rulează mereu. Rulat pe 0.162.0: în testele cu `TestClient`, varianta fără `raise` ridică `FastAPIError` („Response not awaited”), iar cu `raise_server_exceptions=False` dă 500. Sursă: https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/
- ✅ **Când rulează codul de după `yield`**: implicit (`scope="request"`) după trimiterea răspunsului, `scope="function"` îl aduce înainte. Rulat pe 0.162.0, direct pe interfața ASGI: `http.response.start` și `http.response.body` ies înainte de cleanup; de aceea `commit()` stă în endpoint. Sursă: același link și notele din secțiunea 5.
- ✅ **Lifespan în teste**: `with TestClient(app) as client:` pornește lifespan-ul (startup la intrare, shutdown la ieșire). Rulat: fără `with`, `app.state.pool` nu există și o cerere dă `AttributeError`. Rulat: cu `lifespan` dat, un handler `@app.on_event("startup")` nu mai e apelat (și emite avertisment de deprecare). Surse: https://fastapi.tiangolo.com/advanced/testing-events/ și https://fastapi.tiangolo.com/advanced/events/
- ✅ **`def` vs `async def`**: un endpoint `def` rulează într-un threadpool extern, ca să nu blocheze serverul; un `async def` rulează direct pe event loop. Docs nu descriu explicit apelul blocant dintr-un `async def`; consecința (îngheață loop-ul) e arătată de testele noastre: `blocking_io` apelat direct din `async def` rulează pe thread-ul loop-ului, iar cinci cereri deodată durează ~1 s în loc de ~0,2 s; cu `to_thread`, ~0,2 s. Sursă: https://fastapi.tiangolo.com/async/

## 12. Schelete: Celery, securitate, runtime

Verificat la **2026-11-01**, pe docs.celeryq.dev, pyjwt.readthedocs.io, cheatsheetseries.owasp.org, docs.python.org și pypi.org. Referințele (`katas/skel_celery_*.py`, `katas/skel_security.py`, `katas/skel_runtime.py`) rulează cu pytest în `katas/`; mutațiile pe ele (21) sunt toate prinse de teste.

- ✅ **Versiuni (pypi.org, 2026-11-01)**: Celery **5.6.3** (2026-03-26, Python ≥ 3.9); PyJWT **2.15.1** (2026-09-28, Python ≥ 3.9). Testele au rulat cu Celery 5.6.3 și PyJWT 2.15.0, pe Python 3.13.16.
- ✅ **`autoretry_for`**: implicit, nicio excepție nu se reîncearcă. `retry_kwargs` trece argumente către `retry()`. Sursă: https://docs.celeryq.dev/en/stable/userguide/tasks.html#automatic-retry-for-known-exceptions
- ✅ **`max_retries`**: implicit **3**; `None` înseamnă reîncercări fără sfârșit. Sursă: aceeași pagină, `Task.max_retries`.
- ✅ **`retry_backoff`**: implicit `False` (reîncercările nu așteaptă). `True` = factor 1, deci întârzieri de 1, 2, 4, 8 s…; un număr e factorul (3 dă 3, 6, 12, 24 s). **`retry_backoff_max`** implicit **600** s. **`retry_jitter`** implicit **`True`**: întârzierea reală e un număr aleator între 0 și valoarea calculată. Verificat și în sursă: `get_exponential_backoff_interval` face `min(maximum, factor * 2**retries)` și, cu jitter, `random.randrange(countdown + 1)`. `default_retry_delay` (pentru `retry()` manual) e 3 minute.
- ✅ **`acks_late`**: implicit, workerul confirmă mesajul **înainte** de rulare, deci un task început nu se mai repetă. Cu `acks_late` îl confirmă după rulare, iar un worker care cade îl primește din nou; de aceea task-ul trebuie să fie idempotent („function won’t cause unintended effects even if called multiple times with the same arguments”). ⚠️ Nuanță: dacă procesul copil care rulează task-ul e oprit (`sys.exit()` sau semnal), mesajul se confirmă oricum. Sursă: pagina de task-uri, secțiunea despre idempotență.
- ✅ **Canvas**: `group` = semnături aplicate în paralel; `chain` = semnături legate, una după alta; argumentele date la `delay` / `apply_async` se pun **înaintea** celor din semnătură, iar într-un lanț rezultatul pasului anterior intră ca prim argument (`store(info, url)` în exemplul din docs). `.si()` face o semnătură imutabilă, care ignoră rezultatul anterior. Surse: https://docs.celeryq.dev/en/stable/userguide/canvas.html
- ✅ **Fără subtask-uri sincrone**: „Having a task wait for the result of another task is really inefficient, and may even cause a deadlock if the worker pool is exhausted.” Se compun cu `chain` / callback-uri (exemplul „Good”: `fetch_page.s(url) | parse_page.s() | store_page_info.s(url)`). Sursă: https://docs.celeryq.dev/en/stable/userguide/tasks.html#avoid-launching-synchronous-subtasks
- ⚠️ **Testare eager**: `task_always_eager` e dezactivat implicit și face `delay` / `apply_async` să întoarcă `EagerResult`. Ghidul de testare spune că modul eager „is by definition not suitable for unit tests” (emulează un worker), iar metoda preferată e mocking-ul; rezultatele eager nu se scriu în backend decât cu `task_store_eager_result` (din 5.1). `task_eager_propagates` e dezactivat implicit (echivalent cu `apply(throw=True)`). De aceea scheletele testează corpul task-ului apelat direct, iar `.apply()` doar legătura dintre pași. Surse: https://docs.celeryq.dev/en/stable/userguide/testing.html, https://docs.celeryq.dev/en/stable/userguide/configuration.html
- ✅ **Verificat prin rulare (Celery 5.6.3)**: în `.apply()`, `autoretry_for` reface apelul pe loc și ignoră întârzierea; după `max_retries` excepția ajunge în rezultat (`failed()`), cu 1 + `max_retries` apeluri; `group(...).apply().get()` întoarce lista în ordinea intrării, iar `chain(...).apply().get()` rezultatul ultimului pas.
- ✅ **Query parametrizat**: docs `sqlite3` spun să folosești întotdeauna placeholdere, nu formatarea șirurilor, pentru a evita SQL injection (`?` la sqlite3; `%s` la psycopg). OWASP: prepared statements cu query-uri parametrizate sunt prima apărare; numele de tabel sau coloană nu se parametrizează, deci se mapează pe o listă albă. Surse: https://docs.python.org/3/library/sqlite3.html#how-to-use-placeholders-to-bind-values-in-sql-queries, https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- ✅ **Parole (OWASP Password Storage)**: Argon2id cu minimum 19 MiB memorie, 2 iterații, paralelism 1; dacă nu e disponibil, scrypt cu N = 2^17, r = 8, p = 1; bcrypt cu factor ≥ 10 și limită de 72 de octeți; PBKDF2 (cerut de FIPS-140): **PBKDF2-HMAC-SHA256 cu 600 000 de iterații**, SHA-512 cu 220 000, SHA-1 cu 1 400 000 (doar legacy). Salt-ul unic și aleator per parolă îl face pe atacator să spargă hash-urile pe rând și anulează tabelele precalculate. Sursă: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html (valorile se schimbă în timp; recitește înainte de a le cita).
- ✅ **`hmac.compare_digest`**: docs `hmac` recomandă `compare_digest()` în locul lui `==` la compararea unui digest primit din exterior, ca să reducă vulnerabilitatea la atacuri prin timp. `secrets.compare_digest` e același lucru. Sursă: https://docs.python.org/3/library/hmac.html
- ✅ **PyJWT**: `jwt.decode(token, key, algorithms=[...])` ia lista algoritmilor acceptați; `exp` se verifică automat și ridică `ExpiredSignatureError` când e în trecut, dar doar dacă tokenul îl conține; `options={"require": [...]}` ridică `MissingRequiredClaimError` când un claim lipsește; `audience=` care nu se potrivește ridică `InvalidAudienceError`; `InvalidTokenError` e baza erorilor de validare. Verificat și prin rulare (PyJWT 2.15.0): un token `alg: none` făcut de mână și unul semnat HS384 sunt respinse când lista e `["HS256"]`. Surse: https://pyjwt.readthedocs.io/en/stable/usage.html, https://pyjwt.readthedocs.io/en/stable/api.html
- ✅ **`__slots__`**: declară atributele și interzice `__dict__` și `__weakref__` (dacă nu sunt declarate sau moștenite); un atribut nedeclarat dă `AttributeError`; „the space saved over using `__dict__` can be significant”. Sursă: https://docs.python.org/3/reference/datamodel.html#slots
- ⚠️ **`__slots__` din 3.11**: „Objects now require less memory due to lazily created object namespaces” (What’s New 3.11, Misc), deci câștigul din `__slots__` e mai mic decât în 3.10. Măsurat pe 3.13.16, 100 000 de instanțe cu două atribute întregi: ~127 B pe instanță fără slots, ~87 B cu slots. În plus, accesul la `obj.__dict__` creează dicționarul, deci `sys.getsizeof(obj) + sys.getsizeof(obj.__dict__)` (344 B) supraestimează o instanță la care nu l-ai accesat; memoria reală se măsoară cu `tracemalloc`. Sursă: https://docs.python.org/3/whatsnew/3.11.html
- ✅ **`sys.getsizeof`**: „Only the memory consumption directly attributed to the object is accounted for, not the memory consumption of objects it refers to”; apelează `__sizeof__` și adaugă overhead-ul GC. Un generator are mărime constantă (200 B pe 3.13.16, la `n = 10` și la `n = 10**9`). Sursă: https://docs.python.org/3/library/sys.html#sys.getsizeof

## 13. Schelete P3: Redis, RabbitMQ, SIGTERM, profilare, AWS (verificat 2026-11-01)

Surse primare: redis.io, rabbitmq.com, docs.python.org, docs.docker.com, docs.aws.amazon.com, man7.org. Referințele rulează în `katas/skel_{redis,rabbitmq,linux,perf,aws}.py`, cu testele `katas/test_skel_*.py`; pachetele de dev sunt în `katas/requirements-dev.txt`. Versiuni folosite la teste: Redis server 7.0.15, redis-py 8.1.0, pika 1.4.4, boto3 1.43.123, moto 5.2.5.

**Redis**
- ✅ `SET key value NX PX ms` ia lock-ul într-o singură comandă (`NX` = doar dacă lipsește, `PX` = TTL în milisecunde; opțiunile `EX`/`PX` există din 2.6.12). La `NX` pe o cheie existentă răspunsul e nil. Pagina de comandă notează că `SETNX`, `SETEX`, `PSETEX` pot fi deprecate în viitor. Sursă: https://redis.io/docs/latest/commands/set/
- ✅ Lock-ul corect pe o singură instanță: valoare unică pe client, iar eliberarea șterge cheia doar dacă valoarea e a ta. Din **Redis 8.4**: `DELEX key IFEQ valoare`; pe versiuni mai vechi, un script Lua (`get` și `del` comparate pe `ARGV[1]`). Un `DEL` simplu poate șterge lock-ul altuia după ce al tău a expirat. Redlock (mai multe instanțe) e alt subiect; versiunea cu o singură instanță nu e tolerantă la căderea instanței. Sursă: https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/
- ✅ Rate limiter, varianta 1 din documentație: cheie pe IP și pe secundă, `MULTI` / `INCR` / `EXPIRE` / `EXEC`, apoi `current > limită` respinge. Varianta cu `INCR` urmat separat de `EXPIRE` pierde cheia (fără TTL) dacă clientul cade între ele. Sursă: https://redis.io/docs/latest/commands/incr/
- ✅ `redis-py` 8.1.0: `Redis.set(name, value, ex=, px=, nx=, ...)`, `Redis.eval(script, numkeys, *keys_and_args)`, `Redis.pipeline()` (tranzacție `MULTI`/`EXEC` implicit). Verificat cu `inspect.signature` și cu testele pe un `redis-server` real.
- ⚠️ Cache-aside e un tipar, nu o comandă: pagina de comandă nu îl definește. Comenzile din el (`GET`, `SET ... EX`, `DEL`) sunt verificate; ordinea „scrii sursa, apoi ștergi cheia” e alegerea standard, dar nu elimină complet o citire concurentă care repune o valoare veche.

**RabbitMQ**
- ✅ Un mesaj ajunge în dead letter exchange când consumerul îl respinge cu `basic.reject` sau `basic.nack` cu `requeue=false` (și la TTL expirat, coadă plină, delivery limit la quorum). `x-dead-letter-exchange` și `x-dead-letter-routing-key` se pun ca argumente de coadă sau prin policy; **documentația recomandă policy**, iar argumentele fixe în cod nu se pot schimba fără redeploy (argumentul de coadă are prioritate peste policy). Schelet-ul le pune ca argumente, fiindcă declarația stă în consumer. Sursă: https://www.rabbitmq.com/docs/dlx
- ✅ `x-dead-letter-exchange` = `""` publică mesajul pe exchange-ul implicit, iar cu `x-dead-letter-routing-key` = numele cozii mesajul ajunge în acea coadă, fără binding. Exchange-ul implicit e un direct exchange fără nume, la care fiecare coadă e legată cu cheia = numele ei. Surse: https://www.rabbitmq.com/blog/2022/03/29/at-least-once-dead-lettering, https://www.rabbitmq.com/tutorials/amqp-concepts
- ✅ La confirmare manuală, un mesaj neconfirmat se repune în coadă când conexiunea cade (`redeliver=true`), deci consumerul trebuie să suporte redelivery. `nack` cu `requeue=true`, făcut de toți consumerii pentru o condiție trecătoare, creează o buclă costisitoare. Tag-urile de livrare sunt pe canal: confirmi pe același canal. `basic.qos` limitează numărul de mesaje neconfirmate; `0` = fără limită. Surse: https://www.rabbitmq.com/docs/confirms, https://www.rabbitmq.com/docs/consumer-prefetch
- ✅ În RabbitMQ, `prefetch_count` din `basic.qos` fără `global` se aplică fiecărui consumer nou de pe canal, iar cu `global=true` e partajat pe canal (în AMQP 0-9-1 era partajat). Sursă: https://www.rabbitmq.com/docs/consumer-prefetch
- ✅ `pika` 1.4.4, `BlockingChannel` (verificat cu `inspect.signature`): `basic_consume(queue, on_message_callback, auto_ack=False, ...)`, `basic_qos(prefetch_size=0, prefetch_count=0, global_qos=False)`, `basic_ack(delivery_tag=0, multiple=False)`, `basic_nack(delivery_tag=0, multiple=False, requeue=True)`, `queue_declare(queue, passive=False, durable=False, ...)`. Testul legă fiecare apel al channel-ului fals de aceste semnături.
- ⚠️ Nerulat pe un broker real (RabbitMQ lipsește din mediu): topologia DLQ e verificată doar pe documentație și pe channel-ul fals.

**Linux / Python: SIGTERM**
- ✅ Handlerele Python rulează mereu în thread-ul principal al interpretorului principal, între instrucțiuni de bytecode; un calcul lung în C nu e întrerupt până se termină. `signal.signal()` doar din thread-ul principal, altfel `ValueError`. Handlerul primește `(signum, frame)`. Implicit, SIGINT devine `KeyboardInterrupt`. Sursă: https://docs.python.org/3/library/signal.html
- ✅ Acțiunea implicită a SIGTERM este terminarea procesului (fără `finally`, fără cleanup), iar SIGKILL nu poate fi prins, blocat sau ignorat. Sursă: https://man7.org/linux/man-pages/man7/signal.7.html
- ✅ `docker stop` trimite SIGTERM (sau `STOPSIGNAL`), apoi SIGKILL după 10 s pe Linux (30 s pe Windows); se schimbă cu `-t` / `--timeout`. Sursă: https://docs.docker.com/reference/cli/docker/container/stop/

**Performanță**
- ✅ `cProfile.Profile` e context manager din 3.8. `pstats.Stats(pr, stream=...)`; chei de sortare `'tottime'` (`'time'`) și `'cumulative'` (`'cumtime'`); `print_stats(n)` cu un întreg limitează numărul de intrări. Coloane: `tottime` = timpul în funcție, fără subapeluri; `cumtime` = cu toate subapelurile; `ncalls` = numărul de apeluri. Surse: https://docs.python.org/3.13/library/profile.html, https://docs.python.org/3/library/pstats.html
- ✅ `timeit.repeat(stmt, setup, timer, repeat=5, number=1000000)` (`repeat` e 5 din 3.7). Documentația spune că `min()` e singurul număr util din rezultat: valorile mari vin de la alte procese, nu din Python. `stmt` poate fi un callable fără argumente (documentat explicit pentru `Timer` și `timeit.timeit`; `repeat` creează un `Timer`). Sursă: https://docs.python.org/3/library/timeit.html

**AWS**
- ✅ `generate_presigned_url(ClientMethod, Params={'Bucket': ..., 'Key': ...}, ExpiresIn=...)`. Ghidul boto3 recomandă clientul configurat cu **SigV4 (`s3v4`)**, cu **regiunea bucket-ului** și cu adresare virtual-hosted. Sursă: https://docs.aws.amazon.com/boto3/latest/guide/s3-presigned-urls.html
- ⚠️ **Observat, nu citit în docs**: cu `boto3.client("s3", region_name="us-east-1")` și config implicit, boto3 1.43.123 a întors un URL SigV2 (`AWSAccessKeyId`, `Signature`, `Expires`), iar cu regiunea `eu-central-1` unul SigV4 (`X-Amz-Algorithm=AWS4-HMAC-SHA256`). Cu `Config(signature_version="s3v4")` e SigV4 în ambele (test: `test_semnatura_v4_si_in_us_east_1`). Comportamentul ține de versiunea botocore.
- ✅ URL-ul presemnat e un bearer token: cine îl are poate face operația semnată, cu drepturile creatorului, de câte ori vrea până expiră. Cu credențiale temporare (rol IAM, STS) expiră odată cu ele, chiar dacă `ExpiresIn` e mai mare; cu utilizator IAM și SigV4 poate dura până la 7 zile. S3 verifică expirarea la momentul cererii HTTP: o descărcare începută înainte de expirare continuă. Sursă: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- ✅ Generarea e locală: testul cere un URL pentru un bucket care nu există și primește unul semnat; eroarea apare abia la folosire. Documentația boto3 nu spune explicit asta (verificat prin test, sub moto).

## 14. Schelete: Docker, compose, logging, CI, GraphQL, Django (tichetul 16)

Verificat pe 1 noiembrie 2026. Referințele rulate (logging, GraphQL, Django + SQLAlchemy) sunt în `katas/` și trec cu Django 6.1.2, strawberry-graphql 0.339.1, SQLAlchemy 2.1.6, Python 3.13; cele de config sunt verificate structural, nu rulate.

- ✅ **Strawberry `DataLoader`**: `from strawberry.dataloader import DataLoader`, `DataLoader(load_fn=...)`. `load_fn` e `async`, primește lista de chei și întoarce valorile pe aceleași poziții; o eroare pe o cheie se marchează cu o excepție în poziția ei, iar dacă `load_fn` ridică o excepție, cad toate `load`-urile. Loaderul se creează în contextul cererii, ca să țină cache doar în cadrul ei; `load` repetat pe aceeași cheie cheamă `load_fn` o singură dată; `load` / `gather` / `load_many` din același moment se adună într-un apel. Sursă: https://strawberry.rocks/docs/guides/dataloaders
  - Verificat prin rulare (0.339.1): tipurile `@strawberry.type` au constructor doar cu argumente numite (`Book(title=…)`), `strawberry.Info` și `strawberry.Private` există, `schema.execute(...)` e coroutine (`asyncio.run`), iar un loader refolosit între cereri servește valori vechi.
- ✅ **Django**: `select_related` = un singur query cu JOIN, doar relații cu o singură valoare (FK, one-to-one); `prefetch_related` = un query separat per relație, „joining” în Python, pentru many-to-many și FK invers (2 query-uri pentru `Pizza.objects.prefetch_related("toppings")`). `pizza.toppings.filter()` e un query nou, iar cache-ul prefetch nu ajută. Sursă: https://docs.djangoproject.com/en/6.0/ref/models/querysets/ (citit doar primele 100 000 de caractere ale paginii, unde sunt toate trei fragmentele).
  - ⚠️ Nescris în docs, verificat prin rulare (6.1.2): `a.books.count()` pe o relație prefetch-uită **nu** mai întreabă baza (2 query-uri în total), la fel `.all()`; `.filter()` și `.order_by()` costă câte un query per autor.
  - ⚠️ Doar pentru teste: un model cu `app_label` neînregistrat în `INSTALLED_APPS` merge cu `select_related` / `prefetch_related`, dar `delete()` nu face cascadă (relațiile inverse nu apar în `_meta.related_objects`). Schela din `katas/skel_django.py` înregistrează o `AppConfig`.
- ✅ **SQLAlchemy 2.x**: `joinedload` e strategia pentru many-to-one (JOIN, LEFT OUTER implicit); `selectinload` e „generally the best loading strategy” pentru colecții (un al doilea SELECT cu `IN`, în loturi de până la 500 de chei primare). `joinedload` pe o colecție cere `Result.unique()` în stilul 2.0, altfel ORM ridică eroare. Query API e „Legacy”; exemplele folosesc `select()` și `session.scalars()`. Sursă: https://docs.sqlalchemy.org/en/21/orm/queryguide/relationships.html (ultimele 9 876 de caractere necitite).
  - Verificat prin rulare (2.1.6): `select(...).options(joinedload(...))` = 1 SELECT cu JOIN, `selectinload` = 2 SELECT-uri (al doilea cu `IN`), fără `options` ORM face lazy loading, 1 + autorii distincți (identity map).
- ✅ **Compose**: `depends_on` în forma lungă are `condition: service_started | service_healthy | service_completed_successfully`; „Compose guarantees dependency services marked with `service_healthy` are healthy before starting a dependent service”, iar cu forma scurtă „does not wait for … healthy”. `healthcheck.test`: listă cu primul element `NONE`, `CMD` sau `CMD-SHELL`; un șir e echivalent cu `CMD-SHELL` + șirul. Mapările de porturi `HOST:CONTAINER` se scriu mereu ca șiruri (între ghilimele), din cauza YAML base-60 float. Surse: https://docs.docker.com/reference/compose-file/services/ (secțiunile `depends_on`, `healthcheck`, `ports`).
  - Verificat prin rulare: în PyYAML (YAML 1.1) `22:22` neghilimelat devine numărul 1342, iar `8000:8000` rămâne șir; `docker compose config -q` (Compose v5.6.0) validează referința fără daemon.
  - ⚠️ Valorile implicite ale `interval`, `timeout`, `retries` nu sunt pe pagina de compose (trimite la `HEALTHCHECK` din Dockerfile); schela le scrie explicit.
- ✅ **Dockerfile**: `FROM … AS nume`, `COPY --from=<etapă>` (și `--chown`, cu nume sau ID-uri rezolvate din `/etc/passwd`); `USER` setează utilizatorul implicit pentru pașii următori, iar bunele practici creează utilizatorul cu `useradd`; forma shell a lui `ENTRYPOINT` pornește comanda „as a subcommand of `/bin/sh -c`, which does not pass signals”, deci procesul nu e PID 1 și nu primește SIGTERM de la `docker stop`, iar forma exec e cea recomandată; tag-urile sunt mutabile, deci pentru control complet se fixează un digest; fișierul trebuie să înceapă cu `FROM` (doar `ARG` poate să-l preceadă); `\` la capăt continuă instrucțiunea. Surse: https://docs.docker.com/reference/dockerfile/, https://docs.docker.com/build/building/best-practices/, https://docs.docker.com/get-started/docker-concepts/building-images/multi-stage-builds/
  - ⚠️ Pagina nu spune explicit că `COPY requirements.txt` vine înaintea lui `COPY . .`; ordinea e practica obișnuită pentru cache-ul straturilor, nu o regulă din docs.
  - ⚠️ Fără daemon n-am putut face `docker build`, deci Dockerfile-ul e verificat doar structural (`katas/test_skel_docker.py`).
- ✅ **GitLab CI**: `stages` grupează joburile (implicit `.pre`, build, test, deploy, `.post`); `default:` setează valori de rezervă pentru cuvinte-cheie ca `image`, `services`, `cache`, `retry`; `rules:if` adaugă jobul când expresia e adevărată, iar dacă nicio regulă nu se potrivește jobul nu intră în pipeline; cache-ul și artefactele își definesc căile relativ la directorul proiectului și nu pot indica în afara lui; cache pentru dependențe, artefacte pentru rezultate intermediare între etape; `CI_COMMIT_SHORT_SHA` = primele opt caractere din `CI_COMMIT_SHA`; `CI_DEFAULT_BRANCH` = ramura implicită; `CI_COMMIT_BRANCH` = ramura commit-ului (în pipeline-uri de ramură); `CI_PROJECT_DIR` = locul unde se clonează depozitul și de unde rulează jobul. Docker-in-Docker cere `privileged = true` pe runner; exemplul TLS din docs folosește `docker:24.0.5-cli`, `docker:24.0.5-dind` și `DOCKER_TLS_CERTDIR: "/certs"`, iar docs recomandă fixarea versiunii. Surse: https://docs.gitlab.com/ci/yaml/, https://docs.gitlab.com/ci/caching/, https://docs.gitlab.com/ci/variables/predefined_variables/, https://docs.gitlab.com/ci/docker/docker_in_docker/
  - ⚠️ Pagina de caching nu are un exemplu cu pip; `PIP_CACHE_DIR: $CI_PROJECT_DIR/.pip` cu `cache:paths: [.pip]` e construit pe regula căilor din proiect.
  - ✅ Tag-urile `docker:29-cli` și `docker:29-dind` există pe Docker Hub (ultima actualizare 22 oct. 2026), la fel `python:3.12-slim` și `postgres:16` (API-ul Docker Hub, 1 nov. 2026).
  - ⚠️ Pipeline-ul nu a rulat niciodată (nu avem GitLab); `katas/test_skel_ops_ci.py` verifică structura și variabilele predefinite folosite.
- ✅ **`logging`**: `extra` „populates the `__dict__` of the `LogRecord`”, iar cheile lui „should not clash” cu cele ale sistemului; `LogRecord.getMessage()` aplică `msg % args`, iar `message` se setează abia când rulează `Formatter.format()`; `formatException` folosește `traceback.print_exception`. Sursă: https://docs.python.org/3/library/logging.html
  - ⚠️ Docs nu pomenesc `KeyError`; verificat prin rulare (3.13) că `extra={"message": …}`, `asctime`, `name` sau `msg` ridică `KeyError("Attempt to overwrite … in LogRecord")` (`Logger.makeRecord` din CPython). Un `Formatter` obișnuit care a rulat înainte pe același record lasă `message` și `asctime` în `vars(record)`, deci referința le scoate din câmpurile `extra`.

## 15. SQLAlchemy, Alembic și PostgreSQL 16 (scheletele s-sqlalchemy-*, s-postgres-*, s-index-*)

Verificat la: **2026-11-01**, din documentația oficială (docs.sqlalchemy.org, alembic.sqlalchemy.org, postgresql.org/docs/16) și din rulări reale pe PostgreSQL 16.15, cu SQLAlchemy 2.1.6 și 2.0.55, Alembic 1.20.1, psycopg 3.3.6 (`katas/test_skel_sqlalchemy.py`, `test_skel_pg.py`, `test_skel_idx.py`). Versiunile vin din `https://pypi.org/pypi/<pachet>/json`.

| Proiect | Ultima versiune | Data | Requires-Python |
|---|---|---|---|
| SQLAlchemy | **2.1.6** (seria 2.0: 2.0.55) | 2026-10-21 | >=3.11 |
| Alembic | **1.20.1** | 2026-10-22 | >=3.10 |
| psycopg | **3.3.6** | 2026-09-18 | >=3.10 |

- ✅ **Model 2.0**: `class Base(DeclarativeBase)`, coloane `Mapped[tip] = mapped_column(...)`. Nullabilitatea vine din adnotare dacă nu pui `nullable` sau `primary_key`: `Optional[]` (sau `| None`) înseamnă NULL, fără el NOT NULL. `str` fără lungime e `String()`, adică `VARCHAR` fără lungime pe Postgres. Testat: `Mapped[str | None]` dă `nullable=True`. Sursă: https://docs.sqlalchemy.org/en/21/orm/declarative_tables.html
- ✅ **Tranzacții**: `with Session(engine) as s, s.begin():` comite la ieșirea normală și face rollback la excepție; `sessionmaker.begin()` face cele două deodată. Fără `begin()`, sesiunea pornește tranzacția singură (autobegin) și comiți tu. Sursă: https://docs.sqlalchemy.org/en/21/orm/session_transaction.html
- ✅ **N+1 și `selectinload`**: încărcarea implicită a relațiilor e leneșă, deci pentru N obiecte, accesul la atributele leneșe dă N+1 SELECT-uri. `selectinload` emite un al doilea SELECT cu `IN` pe cheile primare ale părinților (cel mult 500 de chei pe query) și e strategia obișnuită pentru colecții; `joinedload` pe o colecție cere `Result.unique()`. Testat: 2 query-uri pentru 20 de autori cu `selectinload`, 21 fără. Sursă: https://docs.sqlalchemy.org/en/21/orm/queryguide/relationships.html
- ✅ **Alembic**: fișierul de revizie are `revision`, `down_revision`, `upgrade()` și `downgrade()` (cel din urmă doar dacă vrei coborâre); `alembic upgrade head`, `alembic downgrade -1`. Autogenerate detectează tabele și coloane adăugate sau șterse și schimbări de nullable, dar nu redenumiri de tabel sau coloană (apar ca drop + add) și nici constrângeri fără nume; migrarea generată se verifică mereu de mână. Sursă: https://alembic.sqlalchemy.org/en/latest/tutorial.html, https://alembic.sqlalchemy.org/en/latest/autogenerate.html
- ⚠️ **`NOT NULL` pe tabel cu rânduri**: `op.add_column(... nullable=False)` fără `server_default` pică pe Postgres dacă tabelul nu e gol. Verificat prin rulare (migrarea 0002 cu `server_default="RON"` umple rândurile existente); nu e o afirmație din documentație.
- ✅ **`ON CONFLICT`**: pentru `DO UPDATE` ținta (`conflict_target`) e obligatorie; se deduc ca arbitri indexurile unice care conțin exact coloanele date, iar dacă nu există, e eroare (testat: `InvalidColumnReference`). Doar constrângeri și indexuri unice `NOT DEFERRABLE` merg ca arbitri. `EXCLUDED` e rândul propus pentru inserare; `SET qty = qty + EXCLUDED.qty` e ambiguu (testat: `AmbiguousColumn`), de aceea `stock.qty`. Un singur statement nu poate afecta același rând de două ori (eroare de cardinalitate). `DO NOTHING` are ținta opțională; `RETURNING` întoarce doar rândurile inserate sau actualizate, deci nu pe cele sărite (testat). Sursă: https://www.postgresql.org/docs/16/sql-insert.html
- ✅ **Window functions**: `row_number()` numără de la 1 în partiție; `lag(value, offset, default)` dă valoarea de acum `offset` rânduri în partiție, iar dacă nu există un asemenea rând, `default` (implicit `NULL`; offset implicit 1). Funcțiile depind de `ORDER BY` din fereastră. O funcție fereastră în `WHERE` e eroare (testat: `WindowingError`), deci filtrezi `rn = 1` într-un subquery. Sursă: https://www.postgresql.org/docs/16/functions-window.html
- ✅ **`SELECT … FOR UPDATE SKIP LOCKED`**: rândurile care nu pot fi blocate imediat sunt sărite. Documentația: „inconsistent view of the data”, deci nu e pentru uz general, dar merge pentru mai mulți consumatori ai unei tabele-coadă. Cu `LIMIT`, blocarea se oprește când s-au întors destule rânduri. Cu `ORDER BY` și `READ COMMITTED`, rândurile pot ieși în altă ordine dacă un rând a fost actualizat între timp (ordinea se aplică înaintea blocării). Testat: 8 consumatori × 200 de joburi, fiecare job luat o dată; fără `SKIP LOCKED` al doilea consumator pică pe `lock_timeout`. Blocarea ține până la `COMMIT`, iar un rollback (worker căzut) eliberează jobul. Sursă: https://www.postgresql.org/docs/16/sql-select.html#SQL-FOR-UPDATE-SHARE
- ✅ **`CREATE INDEX CONCURRENTLY`**: se construiește fără blocări care opresc `INSERT`/`UPDATE`/`DELETE` (cel obișnuit blochează scrierile, nu și citirile); nu poate rula într-un bloc de tranzacție (testat: `ActiveSqlTransaction`); face două scanări ale tabelei și așteaptă tranzacțiile existente. Dacă pică (deadlock, încălcare de unicitate), rămâne un index `INVALID`, ignorat la interogări dar plătit la scrieri; îl ștergi cu `DROP INDEX` și reîncerci, sau `REINDEX INDEX CONCURRENTLY`. Indexurile parțiale și pe expresii sunt suportate. Testat: un INSERT trece cât timp build-ul așteaptă, iar cu `CREATE INDEX` obișnuit e blocat. Sursă: https://www.postgresql.org/docs/16/sql-createindex.html
- ✅ **`EXPLAIN ANALYZE`**: execută instrucțiunea și adaugă timpii și rândurile reale; pentru `INSERT`/`UPDATE`/`DELETE` fără efect pe date se învelește în `BEGIN; … ROLLBACK;`. `FORMAT JSON` dă același conținut într-o formă ușor de parsat (testele îl folosesc ca să caute nodul `Index Scan` pe `idx_orders_open`). Sursă: https://www.postgresql.org/docs/16/sql-explain.html
- ⚠️ **Forma planului depinde de date**: același index parțial dă `Index Scan` fără `Sort` doar când interogarea are destule rânduri potrivite ca `LIMIT 20` să oprească scanarea devreme. Cu 4 rânduri potrivite, planatorul alege `Bitmap Heap Scan` + `Sort`. Verificat prin rulare (testul folosește 80 de rânduri „open” pe client). Ordinea coloanelor nu se vede în plan (indexul se folosește și inversat), deci testul citește definiția din `pg_get_indexdef`.
- ⚠️ **Mediul testelor**: Postgres nu pornește ca root, deci fixture-ul (`katas/pg_fixture.py`) rulează `initdb`/`pg_ctl` ca utilizatorul `postgres` prin `runuser`; preferă binarele versiunii 16 și sare testele cu un mesaj clar dacă lipsesc. SQLAlchemy 2.1 cere Python ≥ 3.11; testele merg și pe 2.0.55.

## 16. Schelete de concurență (gil, asyncio): multiprocessing, executori, anulare, generatori async

Verificat la **2026-11-01**, din docs.python.org (pagini la versiunea curentă; mențiunile „Changed/Added in” sunt citate din ele). Referințele rulează pe 3.11, 3.12 și 3.13; **3.10 nu e instalat în mediul de lucru**, deci compatibilitatea 3.10 e verificată doar prin `ast.parse(feature_version=(3, 10))` și prin lipsa API-urilor 3.11+ în cod (vezi testul din `katas/test_skel_asyncio.py`).

- ⚠️ **`multiprocessing`, start method implicit**:
  - **Windows și macOS**: `spawn` (macOS din 3.8).
  - **Linux/POSIX**: `fork` până la 3.13; din **3.14** implicit e **`forkserver`**. Docs: `fork` „nu mai e implicit pe nicio platformă”, iar codul care îl cere trebuie să-l ceară explicit (`get_context("fork")` / `set_start_method("fork")`). `forkserver` cade pe `spawn` dacă nu există un director temporar scriptabil (3.15.1).
  - De aceea scheletul `s-gil-proc` nu depinde de implicit: garda `__main__` și o funcție `target` de nivel înalt (picklable) merg cu toate cele trei metode (testat cu `spawn`, `forkserver`, `fork`).
  - Sursă: https://docs.python.org/3/library/multiprocessing.html#contexts-and-start-methods
- ✅ **Garda `__main__`**: cu `spawn` și `forkserver` copilul reimportă modulul principal; `__main__` trebuie să fie importabil. Fără gardă, importul pornește procese din nou (RuntimeError de bootstrapping). `set_start_method()` se apelează cel mult o dată și sub garda `__main__`. Testat local: fără gardă, pe `spawn`, scriptul pică sau atârnă. Sursă: același document, secțiunile „Programming guidelines” (textul ghidului nu a fost citit integral; afirmația se bazează pe trimiterile din pagină și pe testul local) și `set_start_method`.
- ✅ **Joining processes that use queues**: un proces care a pus date într-o `Queue` nu se termină până nu sunt golite buffer-ele către pipe, deci `join()` înainte ca datele să fie consumate poate bloca definitiv. Verificat local: un copil care pune 2 MB în coadă rămâne viu după `join(1.5)` până citește părintele. Sursă: https://docs.python.org/3/library/multiprocessing.html#pipes-and-queues
- ✅ **`Process`**: `join()` întoarce `None` și la timeout (verifici `exitcode`); `exitcode` e `None` cât rulează, 0 la ieșire normală, 1 la excepție necaptată, `-N` la semnal N. `daemon` se setează înainte de `start()`. Coada de la `multiprocessing` serializează obiectele (pickle); ordinea e păstrată doar per producător. Sursă: https://docs.python.org/3/library/multiprocessing.html
- ✅ **`concurrent.futures`**:
  - `Future.result()` ridică aceeași excepție pe care a ridicat-o apelul; `exception()` întoarce `None` dacă n-a ridicat.
  - `as_completed(fs)` dă future-urile pe măsură ce se termină; dublurile apar o dată, cele deja terminate primele; `TimeoutError` dacă trece `timeout` de la apelul inițial.
  - `with executor:` e `shutdown(wait=True)`; `submit`/`map` după shutdown ridică `RuntimeError`.
  - Documentația nu spune explicit că `map` păstrează ordinea intrării; o implică exemplul cu `zip(PRIMES, executor.map(...))`. Scheletul nu se bazează pe asta, ci pe `future → item`.
  - `ProcessPoolExecutor`: `__main__` importabil de workeri (nu merge în REPL), funcții și argumente picklable (lambda nu), `BrokenProcessPool` (derivă din `BrokenExecutor`) când un worker moare necurat, apelarea metodelor executorului dintr-un callable trimis lui duce la deadlock. Din 3.14 și el folosește noul start method implicit; pentru `fork` se dă `mp_context=multiprocessing.get_context("fork")`. Docs-ul curent dă `max_workers` implicit `os.process_cpu_count()`.
  - Sursă: https://docs.python.org/3/library/concurrent.futures.html
- ✅ **`asyncio.Queue`**: `join()` se deblochează când contorul de task-uri neterminate (crește la `put`, scade la `task_done`) ajunge la zero; `task_done()` de mai multe ori decât `put` ridică `ValueError`. `maxsize <= 0` înseamnă coadă infinită; `put()` așteaptă când e plină. Exemplul din docs: workeri `while True`, apoi `await queue.join()`, `task.cancel()` pe fiecare și `gather(*tasks, return_exceptions=True)` ca să-i aștepte. Referința `s-asyncio-workers` pune oprirea într-un `finally`, ca anularea sau eroarea producătorului să nu lase workeri orfani (verificat prin test). `Queue.shutdown()` / `QueueShutDown` sunt 3.13+, deci scheletul 3.10 nu le folosește. Sursă: https://docs.python.org/3/library/asyncio-queue.html
- ✅ **Anulare**: dacă `CancelledError` e prinsă explicit, ar trebui propagată după curățenie; e subclasă directă de `BaseException`. `Task.cancel()` „nu garantează” anularea; suprimarea ei cere `uncancel()` (`cancelling()` și `uncancel()` sunt **3.11**; din 3.13 `uncancel()` retrage cererile la zero). Sursă: https://docs.python.org/3/library/asyncio-task.html#task-cancellation
  - Textul exact „must be re-raised” **nu** apare în pagină; formularea e „should generally be propagated when clean-up is complete”.
- ✅ **`asyncio.create_task`**: loop-ul ține doar referințe slabe; un task fără altă referință poate fi colectat de GC înainte să se termine. Docs recomandă `TaskGroup` pentru fire-and-forget, fiindcă ține referințe puternice. Sursă: https://docs.python.org/3/library/asyncio-task.html#creating-tasks
- ✅ **`asyncio.wait_for`**: la timeout anulează awaitable-ul, **așteaptă** să fie efectiv anulat (din 3.7) și ridică `TimeoutError`; din 3.11 e `TimeoutError` builtin; din **3.12** e implementat peste `asyncio.timeout()` și o corutină nu mai e împachetată într-un `Task`. Consecință pentru teste: pe 3.11 `wait_for(coro)` rulează `coro` într-un task separat, pe 3.12+ nu. Sursă: https://docs.python.org/3/library/asyncio-task.html#timeouts
- ✅ **`contextlib`**: `asynccontextmanager` din **3.7**; `aclosing` din **3.10** („suportă curățenie deterministă a generatorilor async la ieșire anticipată prin `break` sau excepție”). Sursă: https://docs.python.org/3/library/contextlib.html
- ✅ **Generatori async**: `yield` într-un `async def` îl face generator async (PEP 525); `yield from` într-unul e **SyntaxError**. La ieșire anticipată (`break`, anulare, excepție), curățenia lui async poate rula târziu sau într-un context neașteptat; apelantul ar trebui să-l închidă explicit cu `aclose()`. Un generator nefinalizat poate sări peste `finally` până îl închide event loop-ul. Verificat local: după `break` fără `aclosing`, `finally`-ul generatorului nu rulează încă, cu `aclosing` rulează imediat. Sursă: https://docs.python.org/3/reference/expressions.html#asynchronous-generator-iterators
- ⚠️ **Free-threading și `sys.setswitchinterval`** (comportament local, nu din docs): pe CPython 3.13, `n += 1` pe un `int` obișnuit abia mai e întrerupt între citire și scriere, deci un test care așteaptă pierderi de actualizări fără lock nu le vede mereu. Testul `s-gil-lock` face operația „lentă” cu o subclasă de `int` care dă drumul GIL-ului, ca absența lock-ului să fie prinsă sigur. Nu e un fapt pentru interviu, ci o limită a testelor.

## 17. Schelete JavaScript (frontend, tichetul 09; verificat 2 noiembrie 2026)

Surse primare: developer.mozilla.org și nodejs.org. Referințele din `katas/skel_js.mjs` rulează cu `node --test` pe **Node 22.22.0**; cele marcate „rulat” au fost confirmate și cu un experiment pe acea versiune. Pe CoderPad versiunea de Node nu e confirmată, deci punctele care depind de ea o spun.

- ✅ **`this` la apel de sine stătător**: într-o funcție apelată fără obiect, `this` e `globalThis` în cod sloppy și `undefined` în cod strict. Docs, exemplul cu clasa: o metodă extrasă (`const f = car.sayHi; f()`) dă `TypeError`, fiindcă `this` e `undefined`. „Classes are always in strict mode.” Sursă: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
- ✅ **Arrow function și `bind`**: arrow-ul își ia `this` din scope-ul în care e creat și „when invoking arrow functions using `call()`, `bind()`, or `apply()`, the `thisArg` parameter is ignored”. `bind` funcționează o singură dată: `g.bind(altceva)` pe o funcție deja legată păstrează primul `this`. Aceeași sursă.
- ✅ **Câmpuri private**: „It is a syntax error to refer to `#` names from outside of the class.”; accesul la un element privat pe un obiect care nu-l are dă `TypeError`, nu `undefined`. Elementele private nu se pot enumera cu nicio metodă `Object`. La câmpurile statice private, docs recomandă accesul prin numele clasei, nu prin `this`, ca să nu se strice la moștenire. Rulat: `Object.keys` și `JSON.stringify` nu le văd; `new Function("a", "return a.#x")` dă `SyntaxError`. Sursă: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties
- ⚠️ **Getter fără setter**: atribuirea aruncă `TypeError` doar în codul **atribuitor** strict (modul ESM, corp de clasă); într-un script sloppy (`node -e`) e ignorată în tăcere. Strictețea clasei care definește getterul nu contează. Rulat pe Node 22.22.0, în ambele moduri. Pagina MDN pentru câmpuri private nu acoperă cazul.
- ✅ **`for await...of` și `break`**: „If the `for await...of` loop exited early (e.g., a `break` statement is encountered or an error is thrown), the `return()` method of the iterator is called to perform any cleanup.” Se folosește doar unde merge `await` (corp `async` sau modul). Un generator async se parcurge cu `for await`. Rulat: cu `break` după a doua pagină, `fetchPage` nu mai e apelat pentru a treia. Sursă: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
- ✅ **Module ESM**: importurile sunt „live bindings”, actualizate de modulul care exportă și nereasignabile de importator (`myValue = 3` dă `TypeError: Assignment to constant variable.`). Exportul implicit e o cheie numită `default`, atât în `import { default as x }`, cât și pe obiectul namespace. Rulat (fișiere reale într-un director temporar): după `inc()`, `count` din `app.mjs` e 1; un al doilea `import()` al aceluiași fișier întoarce același obiect namespace (modulul se execută o singură dată). Sursă: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
- ✅ **`Object.groupBy(items, fn)`**: întoarce „a `null`-prototype object” cu câte un array pe grup; baseline „widely available” din martie 2024. ⚠️ Versiunea de Node: pagina MDN nu o dă. Node 21.0.0 vine cu V8 11.8 (notele de lansare), deci metoda există de la **Node 21** (deducție); rulat pe 22.22.0. Pe CoderPad nu e confirmat: punctul scheletului spune că pe un mediu mai vechi gruparea se face cu `reduce`, dar referința `byUser` folosește doar `Object.groupBy`. Surse: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy, https://nodejs.org/en/blog/release/v21.0.0
- ✅ **`AbortSignal.timeout(delay)`**: semnalul se anulează cu un `DOMException` numit **`TimeoutError`** (nu `AbortError`, care înseamnă anulare manuală); timpul e „active rather than elapsed”; în Node există de la **v17.3.0** (și v16.14.0). Baseline în browsere din aprilie 2024. Surse: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static, https://nodejs.org/docs/latest-v22.x/api/globals.html
- ⚠️ **Timerul din `AbortSignal.timeout` e `unref` în Node** (observat, nedocumentat): într-un test în care nimic altceva nu ține bucla vie, o promisiune care așteaptă doar semnalul rămâne „pending” și procesul se încheie (`Promise resolution is still pending but the event loop has already resolved`). Într-o aplicație reală bucla o țin socket-ul sau serverul; în testele noastre punem un `setInterval` temporar.
- ✅ **`structuredClone`**: copie profundă după algoritmul structured clone, cu `Date`, `Map`, `Set` și referințe circulare; „Thrown if any part of the input value is not serializable” (`DataCloneError`). Rulat: o funcție în obiect dă `DataCloneError`, iar clona unei instanțe de clasă nu mai e `instanceof` clasa (prototipul se pierde). Node: **v17.0.0**. Surse: https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone, https://nodejs.org/docs/latest-v22.x/api/globals.html
- ✅ **`queueMicrotask`**: Node **v11.0.0**. Ordinea (rulat, `order()` din `s-frontend-event-loop`): cod sincron, apoi microtask-urile în ordinea punerii în coadă (`.then`, `queueMicrotask`, continuarea de după `await null`), apoi cele puse de microtask-uri, apoi `setTimeout(…, 0)`. Pagina Node despre `process.nextTick` nu descrie microtask-urile; scheletul nu folosește `nextTick`.
- ✅ **Rulat pe Node 22.22.0**: `Array.prototype.sort()` fără comparator ordonează ca șiruri (`[10, 9, 1]` dă `[1, 10, 9]`); `[].reduce(f)` fără valoare inițială aruncă `TypeError: Reduce of empty array with no initial value`; `new Error(msg, { cause })` păstrează `cause`; `Map` găsește cheia `NaN` și nu are chei moștenite (`new Map().get("constructor")` e `undefined`); `new Set([{a:1}]).has({a:1})` e `false`; `Set.prototype.intersection` și `Array.prototype.toSorted` există.
- ✅ **Teste cu ceas fals**: `t.mock.timers.enable({ apis: ["setTimeout", "Date"] })` din `node:test` pornește fals atât `setTimeout`, cât și `Date`; `tick(ms)` le avansează împreună (rulat pe 22.22.0). `AbortSignal.timeout` nu e acoperit de ceasul fals, de aceea testele de retry folosesc timere reale cu durate de 5–20 ms și verifică doar limite inferioare ale pauzelor.

## 18. Schelete TypeScript și React (frontend, tichetul 10; verificat 2 noiembrie 2026)

Surse primare: typescriptlang.org și react.dev, testing-library.com. Referințele (`katas/skel_ts.ts`, `skel_react_*.tsx`, `skel_tsx_*.tsx`, testul din `skel_react_rtl.test.tsx`) compilează cu `tsc --strict` (TypeScript 7.0.2) și trec în vitest 5.0.5 + jsdom + Testing Library, cu React 19.3.1. Versiunile sunt cele din secțiunea 9.

**TypeScript**
- ✅ **`interface` vs `type`**: „Almost all features of an `interface` are available in `type`, the key distinction is that a type cannot be re-opened to add new properties vs an interface which is always extendable.” Două `interface Window` se îmbină, două `type Window` dau „Duplicate identifier”. Euristica din handbook: „use `interface` until you need to use features from `type`”. Interfețele declară doar forme de obiecte, nu redenumesc primitive; `extends` e adesea mai ieftin pentru compilator decât intersecțiile. Sursă: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
- ✅ **`satisfies`** (TypeScript 4.9): „lets us validate that the type of an expression matches some type, without changing the resulting type of that expression”; cu o adnotare `: Record<…>` se pierde tipul îngust (`palette.green.toUpperCase()` nu mai compilează), cu `satisfies` rămâne. Pagina nu are exemplu cu `as const`; combinația `as const satisfies Record<Role, readonly string[]>` e verificată prin compilare, doar pe TypeScript 7.0.2, în `skel_ts.test.ts` (versiunea minimă n-am verificat-o): literalii se păstrează (`PERMS.viewer[0]` e `"read"`), iar un rol lipsit sau o permisiune inexistentă (`can("admin", "exec")`) nu compilează. Sursă: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- ✅ **Narrowing cu `in`** (4.9): după `"name" in obj` pe un tip care nu listează proprietatea, tipul devine `obj & Record<"name", unknown>`, deci `typeof obj.name === "string"` merge. Compilat: `x.id` rămâne `unknown`, deci verificarea `typeof` e necesară. Aceeași sursă.
- ✅ **Rulat cu `tsc --strict` (7.0.2)**: `catch (e)` dă `e: unknown` (eroare TS18046 la `e.message`); `JSON.parse` întoarce `any`; `Partial<Omit<Todo, "id">>`, `Pick`, mapped type `{ [K in keyof T]: T[K] | null }` au exact formele cerute (verificat cu un test de egalitate exactă de tipuri); `// @ts-expect-error` pe `ROLES.push`, pe `patch(todo, { id: 2 })` și pe un `case` nou fără ramură dă eroare dacă directiva rămâne nefolosită.
- ✅ **`Promise.allSettled`**: nu respinge; fiecare element e `{ status: "fulfilled", value }` sau `{ status: "rejected", reason }` (`reason: any`), în ordinea intrării. Rulat: `ids.map((id) => fetchOne(id))` cu un `fetchOne` care aruncă sincron sparge `map` și respinge tot `loadAll`; `ids.map(async (id) => fetchOne(id))` îl transformă în rejecție.

**React**
- ✅ **`useState`**: „calling the `set` function does not update the `age` state variable in the already running code”, deci `setAge(age + 1)` de trei ori dă +1; `setAge(a => a + 1)` de trei ori dă +3 (updater-ele stau într-o coadă). Input controlat: `value` + `onChange` cu `e.target.value`. Rulat: două `setN((c) => c + 1)` într-un handler dau `n = 2`. Sursă: https://react.dev/reference/react/useState
- ✅ **Efecte și fetch**: „the cleanup function should either abort the fetch or ignore its result”; „by itself [abort] is not enough to protect against race conditions … using an explicit flag like `ignore` is the most reliable way”. În dezvoltare, Strict Mode rulează efectul de două ori (setup, cleanup, setup), iar în producție o dată. Pagina nu pomenește `AbortError`. Rulat: fără verificarea „anulat” în `catch`, abort-ul cererii vechi pune o eroare peste url-ul nou. Sursă: https://react.dev/learn/synchronizing-with-effects
- ✅ **Liste**: cheile trebuie să fie unice între frați și stabile; indexul ca `key` „often leads to subtle and confusing bugs”; `key={Math.random()}` recreează tot DOM-ul și pierde input-ul din elemente. Rulat: cu `key={id}`, nodul DOM al unui element supraviețuiește filtrării; cu `key={index}` nu. Sursă: https://react.dev/learn/rendering-lists
- ✅ **Stare derivată**: „When something can be calculated from the existing props or state, don’t put it in state. Instead, calculate it during rendering.” Pentru calcule lente, `useMemo`, nu `useEffect`. Rulat cu `Profiler`: filtrul derivat în render dă 1 commit pe tastă, iar varianta cu stare + `useEffect` dă 2. Sursă: https://react.dev/learn/you-might-not-need-an-effect
- ✅ **Context**: valoarea implicită din `createContext` se folosește doar când nu există niciun Provider deasupra; consumatorii se randează din nou când `value` se schimbă (comparat cu `Object.is`), iar un obiect nou la fiecare randare îi reface mereu (se stabilizează cu `useMemo`). În docs, hook-uri proprii (`useTasks()`) învelesc `useContext`. În React 19 contextul se poate randa direct (`<AuthContext value={…}>`); scheletul folosește `.Provider`, care merge și pe React 18 (rulat pe 19.3.1). Sursă: https://react.dev/reference/react/useContext
- ✅ **Testing Library**: `getByRole` e „top preference for just about everything”, apoi `getByLabelText`, `getByText`; `getBy` aruncă la zero sau mai multe potriviri, `queryBy` întoarce `null` (pentru absență), `findBy` e asincron (reîncearcă, implicit 1000 ms; `getBy` + `waitFor`). Rulat: fără `globals`, vitest nu pornește `cleanup` singur, deci `afterEach(cleanup)` e necesar. Sursă: https://testing-library.com/docs/queries/about

## Rezumat: ce era greșit sau depinde de versiune

1. `ThreadPoolExecutor` `max_workers`: formula `min(32, os.cpu_count() + 4)` e valabilă doar pentru **3.8–3.12**. Din **3.13** e `min(32, (os.process_cpu_count() or 1) + 4)`.
2. `sys.getswitchinterval()` = 0,005 s e corect, dar valoarea vine din sursa CPython și din rulare, nu din docs.
3. Dependențe cu `yield`: comportamentul curent (≥ 0.118.0) e exit **după** răspuns. 0.106–0.117 rulau exit-ul înainte de răspuns. Din 0.121.0 există `Depends(scope="function")` pentru exit înainte de răspuns.
4. `on_event`: e deprecated în FastAPI și încă merge, dar **a fost eliminat din Starlette 1.0**. FastAPI îl reimplementează.
5. TestClient „bazat pe HTTPX”: din Starlette 1.2.0 preferă **`httpx2`**, iar cu `httpx` simplu emite un deprecation warning.
6. Pydantic v1 nu mai e suportat de FastAPI din 0.126.0 (și `pydantic.v1` din 0.128.0).
7. Nuanțe noi în 3.13: `generator.close()` întoarce valoarea din `return`; `batched(strict=)`; `__eq__` din dataclass compară câmp cu câmp; `classmethod` nu mai poate împacheta `property`; `asyncio.Queue.shutdown()` și `queue.Queue.shutdown()`.
8. pytest: testele async fără plugin **eșuează** din 8.4 (nu mai sunt sărite); `strict = true` e nou în 9.0.
9. Restul afirmațiilor (TaskGroup, timeout, CancelledError ⊂ BaseException din 3.8, to_thread pe executorul implicit, gather care nu anulează celelalte task-uri, slow_callback_duration 0,1 s, asyncio.Queue care nu e thread-safe, free-threading experimental în 3.13 și suportat-opțional în 3.14, PEP 380, primul `send(None)`, `groupby` doar consecutiv, `batched` din 3.12, `__eq__` care face `__hash__ = None`, slots și kw_only din 3.10, ABC cu TypeError, Protocol și runtime_checkable, lock-ul din cached_property eliminat în 3.12, limitatorul AnyIO de 40, BackgroundTasks în proces, scope-urile pytest, re.search la `match`) sunt **corecte**.
10. `multiprocessing`: start method-ul implicit pe Linux e `fork` până la 3.13 și **`forkserver` din 3.14** (macOS și Windows: `spawn`). Nu te bazezi pe implicit: garda `__main__` și un `target` picklable merg peste tot (secțiunea 9).
11. JavaScript: atribuirea la un getter fără setter aruncă `TypeError` doar în codul strict care atribuie (nu „fiindcă clasa e strictă”); `Object.groupBy` cere Node 21+ (deducție din V8 11.8); timerul din `AbortSignal.timeout` e `unref` (secțiunea 17).
12. TypeScript / React: `satisfies` nu e în pagina despre tipuri de bază și nici nu are exemplu cu `as const` în notele de lansare 4.9 (combinația e verificată prin compilare); documentația React nu pomenește `AbortError`, dar recomandă un flag `ignore` pe lângă abort (secțiunea 18).
