# 04: Conținut: gil și asyncio (12 schelete)

**What to build:** Alex are în segment toate scheletele de concurență: threading, procese și asyncio, fiecare cu cerință, 3–5 puncte esențiale și referință care rulează pe Python 3.10. Forma 3.11+ (`TaskGroup` + `asyncio.timeout`) e un schelet separat, marcat.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] gil (6): `Thread` + `Lock` pe counter · producer/consumer pe `queue.Queue` (sentinel, `task_done` / `join`; `deque` menționat pentru BFS / fereastră) · coada blocantă cu `Condition` (din tichetul 1, revăzută) · `multiprocessing.Process` + garda `__main__` + rezultat prin `Queue` · `ThreadPoolExecutor` / `ProcessPoolExecutor` cu `as_completed` și excepții · oprire cu `threading.Event`.
- [ ] asyncio (6): `Semaphore` + `gather(return_exceptions=True)` · N workeri pe `asyncio.Queue` cu oprire curată · `TaskGroup` + `asyncio.timeout` (marcat 3.11+) · `to_thread` / `run_in_executor` · anulare corectă (`finally`, `CancelledError` re-ridicat) · `async with` + generator async.
- [ ] Fiecare referință are un test care verifică proprietatea apărată de punctele esențiale (de pildă: counter-ul exact sub thread-uri, workerii opriți la final, anularea care ajunge la apelant), nu doar cazul fericit.
- [ ] Referințele marcate 3.10 nu folosesc API-uri 3.11+.
- [ ] Scheletele sunt minimale (2–5 minute) și nu repetă kata-urile k8 și k14.
- [ ] Textele sunt în română, cu termenii tehnici în engleză; punctele numesc greșeala tipică.
- [ ] Faptele noi (versiuni, comportamente) sunt verificate pe surse primare și trecute în notele de fapte verificate ale proiectului.
- [ ] Validarea datelor trece; codul încape în 42 de coloane.
