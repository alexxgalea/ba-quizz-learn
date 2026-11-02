# 03: Desfășurări pentru python (10 puncte)

**What to build:** Când Alex deschide fișa `python` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Unghiul C++ și legăturile pentru `python`: generatori față de iteratorii STL (`begin`/`end`, leneș vs container), `with` față de RAII (dar fără destructor determinist), decoratori față de funcții de ordin superior / lambda, `is` față de compararea adreselor, valorile implicite mutabile (evaluate o dată, spre deosebire de argumentele implicite C++, evaluate la fiecare apel).

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2 nov. 2026:** `python` are acum harta și 10 desfășurări (`src/desf/python.md`), în ordinea punctelor.

- `Greu: da` la punctele 2–10 (9 din 10; plafonul rămâne 180 de cuvinte); punctul 1 e în banda obișnuită. Punctul 10 a fost marcat după review (trei idei: chei consecutive, soluția, grupul care dispare la avansare).
- C++ cu `Unde nu ține` la 1–7 și 9: argumente implicite (evaluate la fiecare apel în C++), capturi `[i]` față de `[&i]` (referința moare cu bucla), `==` față de `&a == &b`, `std::istream_iterator` față de generator (single-pass; fără `yield` în C++17), lambda care învelește un `std::function`, destructor față de `__exit__` (destructorul nu oprește excepția), STL față de colecțiile Python (prietenii falși: `std::set` e arbore, `list` e `vector`, `std::deque` are acces aleator), `std::throw_with_nested`. Fără C++ la 8 (`dataclass`, deja la OOP 9) și 10 (`groupby`; `std::chunk_by` e C++23).
- Legături noi: Django (`fields.E010`, `QuerySet.iterator()`, `transaction.atomic`, `@login_required`), DRF (`@api_view`), Celery (`@app.task`), Elasticsearch (`helpers.scan`), SQLAlchemy (`Session` ca context manager), JavaScript (`var` / `let` în bucle), `asyncio.TaskGroup`.
- Faptele noi, verificate pe docs.python.org, draftul N4659, prin rulare (Python 3.13, Django 6.1.2, Node) și compilare (`g++` 13.3 și `clang++` 18.1, `-std=c++11` / `-std=c++17`), sunt în `research/interview-facts.md`, secțiunea 20. O corectură de fapt la sursa mea, nu la punctele fișei: cache-ul întregilor mici e documentat azi ca -5…1024 (nu 256), deci desfășurarea nu dă limita.
- Erori de fapt în punctele fișei: niciuna.
- `tools/test_desf.py` folosea `python` ca modul „fără desfășurări”; acum folosește `aws` (Bonus, ultimul în ordine) și are o secțiune pentru `python` (10 desfășurări, C++ doar unde trebuie, fără overflow la 360 px, light și dark).
- Review (`/code-review`, Standards și Spec): fără defecte blocante; corectate un typo („înveleli”), trei formulări și comentariul din `test_desf.py`, iar numerele din testul pentru `python` se citesc acum din date. Controlul „modul fără desfășurări” (`aws`) se mută pe alt modul dacă tichetul 22 (Bonus, opțional) îi adaugă desfășurări.
