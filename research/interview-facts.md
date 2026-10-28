# Fapte verificate pentru interviu (Python, asyncio, FastAPI, pytest)

Verificat la: **2026-10-22** (versiunile și secțiunea 7: **2026-10-28**), doar din surse primare (docs.python.org și sursele lor din `python/cpython`, fastapi.tiangolo.com și `fastapi/fastapi`, Starlette docs și sursă, AnyIO docs, docs.pytest.org și `pytest-dev/*`, docs.pydantic.dev, pypi.org).

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
