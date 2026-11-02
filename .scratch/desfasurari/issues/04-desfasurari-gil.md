# 04: Desfășurări pentru gil (8 puncte)

**What to build:** Când Alex deschide fișa `gil` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Unghiul C++ și legăturile pentru `gil`: `std::thread` rulează chiar în paralel pe mai multe core-uri; `std::mutex` / `std::lock_guard` față de `threading.Lock` / `with lock`; `std::atomic` nu are echivalent direct (GIL-ul nu face `+=` atomic); procesele ca ieșire din GIL.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2 nov. 2026:** `gil` are acum harta și 8 desfășurări (`src/desf/gil.md`), în ordinea punctelor.

- `Greu: da` la toate cele 8 puncte (plafonul rămâne 180 de cuvinte): 1 și 3 au Analogie plus C++ sau două ramuri, 2 și 5–8 au mai multe idei sau capcane, 4 are trei (copia, costul, ce trece prin pickle). Punctul 7 e cel mai lung (aproape de plafon).
- C++ cu `Unde nu ține` la 1, 4 și 7: `std::thread` rulează deodată pe core-uri diferite (față de GIL; în C++ o cursă e comportament nedefinit, în Python doar un rezultat greșit), procese (standardul C++17 are doar `std::system`; serializezi tu, pe când pickle o face în Python) și `std::mutex` / `std::lock_guard` față de `Lock` / `with lock:` (`std::atomic` nu are echivalent; `Lock` poate fi eliberat de alt thread, pe când `unlock` fără proprietate la `std::mutex` e comportament nedefinit). Fără C++ la 2, 3, 5, 6 (coroutinele și `std::counting_semaphore` sunt C++20) și 8.
- Exemplele rulează pe Python 3.13 (28 de exemple în total, 0 picate); cursa de la 7 e o intercalare simulată, deterministă: pe 3.13 pierderea unui increment se vede rar în practică, deci textul spune „poți obține mai puțin”.
- Legături noi: Celery (`prefork`, serializarea JSON), Gunicorn (`--workers` / `--threads`), OpenCV (`PyAllowThreads`), FastAPI (`def` față de `async def`), Django (`F()`), `--concurrency` din Celery.
- Faptele noi (OpenCV, zlib, hashlib, NumPy, Celery, Gunicorn, Django `F()`, PEP 779, C++ `[intro.races]` / `[thread.mutex.requirements.mutex]` / `[atomics.types.int]`), verificate pe surse primare și prin rulare / compilare (`g++` 13.3, `clang++` 18.1), sunt în `research/interview-facts.md`, secțiunea 21.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la punctul 2, „extensii native” eliberează GIL-ul doar pe porțiunea fără apeluri Python (NumPy, nu și pe `dtype=object`); la punctul 6, `TaskGroup` anulează restul grupului când un task ridică o excepție.
- `tools/test_desf.py` are acum o secțiune pentru `gil` (8 desfășurări, C++ doar la 1, 4 și 7, fără overflow la 360 px, light și dark).
