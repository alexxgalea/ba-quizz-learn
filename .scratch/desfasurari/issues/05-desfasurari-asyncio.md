# 05: Desfășurări pentru asyncio (11 puncte)

**What to build:** Când Alex deschide fișa `asyncio` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Unghiul C++ și legăturile pentru `asyncio`: fără coroutine C++20 (Alex nu le știe): comparația utilă e un event loop scris de mână (`select`/`epoll`) sau `std::async`/`future`; `CancelledError` ca `BaseException` față de excepțiile C++ fără ierarhie impusă; `Lock`/`Queue` din asyncio nu sunt thread-safe, spre deosebire de `std::mutex`.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2 nov. 2026:** `asyncio` are acum harta și 11 desfășurări (`src/desf/asyncio.md`), în ordinea punctelor.

- `Greu: da` la 10 din 11 puncte (plafonul rămâne 180 de cuvinte); punctul 8 (`create_task` fără referință) are 87 de cuvinte și rămâne în banda normală. Cele mai lungi: 1 și 2 (Analogie sau exemplu plus C++), 6 și 9 (anularea, thread-uri străine).
- C++ cu `Unde nu ține` la 1, 2, 5, 6 și 9: event loop scris de mână (`epoll_wait` / `select`, API-uri POSIX; handlerul e callback, corutina își păstrează starea locală), `std::async` / `future` față de `to_thread` / `await` (`get()` blochează thread-ul; `wait_for` nu anulează, iar destructorul future-ului poate bloca), `catch (const std::exception&)` / `catch (...)` față de `except Exception` / `except BaseException` (`throw 42;` trece de primul; Python cere `BaseException`), `std::queue` / `std::mutex` față de `asyncio.Queue` / `Lock` (`asyncio.Lock` suspendă corutina, nu thread-ul). Fără C++ la 3, 4, 7, 8, 10 și 11 (`std::counting_semaphore` și coroutinele sunt C++20).
- Exemplele rulează pe Python 3.13 (38 de exemple în total, 0 picate). La 6, `wait_for` întoarce 1 și nu ridică `TimeoutError` când anularea e înghițită; comportamentul e verificat prin rulare pe 3.13, nu e descris în docs.
- Legături noi: Django (`SynchronousOnlyOperation`, `sync_to_async`), JavaScript (`Promise.all`, `AbortSignal.timeout`, `unhandledrejection`, un singur thread cu run-to-completion), Celery (`--concurrency`).
- Faptele noi (selectorul buclei, `to_thread`, `gather` cu `Future`, `TaskGroup`, `timeout`, `create_task`, thread-safety, FastAPI, C++ `[futures.async]` / `[futures.unique_future]` / `[except.handle]` / `[headers]` / `[container.requirements.dataraces]`), verificate pe surse primare și prin rulare / compilare (`g++` 13.3, `clang++` 18.1), sunt în `research/interview-facts.md`, secțiunea 22.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la 4, grupul anulează și corpul `async with` dacă încă rulează; la 5, `TimeoutError` apare doar în afara blocului `timeout()`; la 9, `Lock` și `Queue` sunt sigure doar pe thread-ul buclei.
- `tools/test_desf.py` are acum o secțiune pentru `asyncio` (11 desfășurări, C++ doar la 1, 2, 5, 6 și 9, fără overflow la 360 px, light și dark). `tools/test_lesson.py` folosea `asyncio` ca modul de control „fără desfășurări”; controlul e acum `aws` (Bonus), ca în `test_desf.py`.
- Review (`/code-review`, Standards și Spec): fără defecte blocante, nicio eroare de fapt în puncte. Corectate: legăturile JavaScript fără acoperire în fișierul de fapte (acum cu surse MDN; fără compararea lui `await` cu JavaScript), exemplul de la 3 arată acum că celelalte task-uri nu sunt anulate, Problema de la 4 și de la 10 (concrete, fără repetarea punctelor 3 și 1), „în log nu apare nimic” de la 8, „semaforul creează task-urile” de la 7, Ideile cu două fapte într-o propoziție (1, 4, 6), `std::launch::async` la `wait_for` (cu politica implicită, un apel amânat dă `deferred`), Legăturile care repetau exemplul (6, 7, 8, 9, 10, 11), epoll mutat din C++ în Ideea de la 1, `Greu: da` scos de la 8. Rămân judecăți asumate: `Greu: da` la 10 din 11 puncte (precedent: `gil`, 8 din 8) și rupturile de rând din exemple la 360 px (la fel ca în `oop`, `python`, `gil`).
