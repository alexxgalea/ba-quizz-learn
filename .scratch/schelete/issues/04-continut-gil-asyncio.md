# 04: Conținut: gil și asyncio (12 schelete)

**What to build:** Alex are în segment toate scheletele de concurență: threading, procese și asyncio, fiecare cu cerință, 3–5 puncte esențiale și referință care rulează pe Python 3.10. Forma 3.11+ (`TaskGroup` + `asyncio.timeout`) e un schelet separat, marcat.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] gil (6): `Thread` + `Lock` pe counter · producer/consumer pe `queue.Queue` (sentinel, `task_done` / `join`; `deque` menționat pentru BFS / fereastră) · coada blocantă cu `Condition` (din tichetul 1, revăzută) · `multiprocessing.Process` + garda `__main__` + rezultat prin `Queue` · `ThreadPoolExecutor` / `ProcessPoolExecutor` cu `as_completed` și excepții · oprire cu `threading.Event`.
- [x] asyncio (6): `Semaphore` + `gather(return_exceptions=True)` · N workeri pe `asyncio.Queue` cu oprire curată · `TaskGroup` + `asyncio.timeout` (marcat 3.11+) · `to_thread` / `run_in_executor` · anulare corectă (`finally`, `CancelledError` re-ridicat) · `async with` + generator async.
- [x] Fiecare referință are un test care verifică proprietatea apărată de punctele esențiale (de pildă: counter-ul exact sub thread-uri, workerii opriți la final, anularea care ajunge la apelant), nu doar cazul fericit.
- [x] Referințele marcate 3.10 nu folosesc API-uri 3.11+.
- [x] Scheletele sunt minimale (2–5 minute) și nu repetă kata-urile k8 și k14.
- [x] Textele sunt în română, cu termenii tehnici în engleză; punctele numesc greșeala tipică.
- [x] Faptele noi (versiuni, comportamente) sunt verificate pe surse primare și trecute în notele de fapte verificate ale proiectului.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**1 nov. 2026 — implementat.** 11 schelete noi (cu `s-gil-bq` din tichetul 1 sunt cele 12): `s-gil-lock`, `s-gil-queue`, `s-gil-proc`, `s-gil-pool`, `s-gil-event` în `katas/skel_gil.py` și `s-asyncio-sem`, `s-asyncio-workers`, `s-asyncio-tg` (marcat `v: "3.11+"`), `s-asyncio-thread`, `s-asyncio-cancel`, `s-asyncio-agen` în `katas/skel_asyncio.py`, toate cu intrările lor în `src/data_skel.js` (adăugate la sfârșit). Testele (`test_skel_gil.py`, `test_skel_asyncio.py`, 67 în total) verifică proprietatea apărată de puncte, nu doar cazul fericit: counter exact (cu un `int` care eliberează GIL-ul între citire și scriere, fiindcă pe 3.13 un `int` simplu abia mai pierde actualizări), un sentinel per consumator, `join` așteaptă procesarea, backpressure, garda `__main__` pe `spawn`/`forkserver`/`fork`, deadlock-ul `join` înainte de `get`, `Event.wait` care oprește imediat, loop-ul care nu îngheață sub `to_thread` (cu control: apelul direct îl îngheață), anularea care ajunge la apelant fără workeri orfani, `aclosing` vs `break`. Fiecare test important a fost verificat cu mutații (peste 20 de mutații textuale pe referințe, toate prinse); testul counter-ului a fost întărit în urma uneia care supraviețuise. Rulate pe 3.11, 3.12 și 3.13; **3.10 nu e instalat aici**, deci compatibilitatea 3.10 e verificată prin `ast.parse(feature_version=(3, 10))` și printr-un test care cere ca referințele neetichetate să nu conțină `TaskGroup`, `timeout(`, `ExceptionGroup` sau `except*`. Faptele noi (start method implicit `forkserver` din 3.14, `join` înainte de `get`, `aclosing`, `wait_for` din 3.12, `uncancel` din 3.11) sunt în `research/interview-facts.md`, secțiunea 9. Alegeri cu bună știință: `s-gil-queue` presupune că `handle` nu aruncă (cerința o spune; `task_done` în `finally` acoperă totuși blocarea lui `join`); `s-asyncio-tg` importă `from asyncio import TaskGroup, timeout` ca să încapă în 42 de coloane; `s-gil-pool` primește clasa executorului ca parametru, ca aceeași referință să arate și varianta cu procese; `deque` pentru BFS/fereastră apare ca ultimul punct al lui `s-gil-queue`, nu ca schelet separat.
