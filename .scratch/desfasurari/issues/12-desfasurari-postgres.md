# 12: Desfășurări pentru postgres (11 puncte)

**What to build:** Când Alex deschide fișa `postgres` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** ready-for-agent

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `postgres`: fără C++ în general; Analogia și exemplele SQL (blocuri `sql`, nerulate) poartă explicația.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [ ] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `postgres` are acum harta și 11 desfășurări (`src/desf/postgres.md`), în ordinea punctelor. Ultimul criteriu (toate testele, publicarea, mesajul către Alex) rămâne deschis: le face integratorul după îmbinare.

- `Greu: da` la 1, 2, 3, 5, 6, 7, 9, 10 și 11 (9 din 11; plafonul rămâne 180 de cuvinte, cel mai lung punct are 149). 4 și 8 rămân în banda normală (90 și 88 de cuvinte).
- C++ doar la 3 (lost update: `x = x - 1` pe un `int` partajat, `std::atomic::fetch_sub`, `std::mutex` față de `FOR UPDATE`) și la 5 (deadlock: doi `std::mutex` în ordine opusă, `std::scoped_lock` / `std::lock`), singurele două puncte cu echivalent real; ambele au `Unde nu ține`. Fără C++ la restul. Faptele C++ sunt rulate cu `g++` (C++11 și C++17) și `clang++` și verificate în draftul standardului.
- Legături: PG-01…PG-11, Design (punctele 3 și 8: outbox cu `SKIP LOCKED`, RLS, `SET LOCAL`, PgBouncer), Django (`F()`, `select_for_update(skip_locked=True)`, `DISABLE_SERVER_SIDE_CURSORS`, `payload__contains`, `Window(RowNumber())`, `isolation_level` din `OPTIONS`), SQLAlchemy (`with_for_update(skip_locked=True)`, `on_conflict_do_nothing()`, Alembic), Celery (`autoretry_for`), Elasticsearch (indexuri pe zi, indexul inversat din GIN).
- Exemple: unul singur Python (3, rulează în `desf_examples`: 61 de exemple în total, 0 picate); restul sunt SQL în blocuri `text` (și un snippet psycopg la 8, tot `text`, fiindcă are nevoie de bază). Tot SQL-ul din fișier l-am rulat eu, exact ca scris, pe un Postgres 16.15 temporar (șters după); rezultatele din comentarii (`(0,1)` / `(0,2)`, 10 / 10 la `REPEATABLE READ`, `deadlock detected`, `lock timeout`) sunt cele reale.
- Faptele noi sunt în secțiunea 28 din `research/interview-facts.md` (lipită de integrator din `research/_desf_facts_postgres.md`): documentația Postgres (MVCC, izolare, lock-uri, vacuuming, partiționare, COPY, `pg_stat_statements`, `auto_explain`, `EXPLAIN`, timeout-uri, JSONB, window), PgBouncer, Django, SQLAlchemy, Elasticsearch, draftul standardului C++.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori (în desfășurări, punctele rămân neschimbate): la 1, o tranzacție veche ține versiunile moarte în viață doar după o scriere sau la `REPEATABLE READ` (am rulat: un `SELECT` urmat de „idle in transaction” la `READ COMMITTED` nu blochează VACUUM); la 2, snapshotul de la `REPEATABLE READ` e luat la primul statement, nu la `BEGIN`, iar nivelul poate da și el `40001`; la 7, cheia primară trebuie să includă cheia de partiționare; la 8, `COPY` n-are `ON CONFLICT` și nu merge pe tabele cu RLS; la 11, GIN-ul implicit nu ajută la `->>`.
- `SET LOCAL` cu PgBouncer în transaction pooling (punctul 6) e o deducție, nu o afirmație din documentația PgBouncer (tabelul de funcții nu îl listează); e marcat ⚠️ în fapte.
- `tools/test_desf.py` are un bloc pentru `postgres` (după `design`): 11 desfășurări numerotate ca punctele, harta și desfășurările pornesc închise, „Deschide tot” le deschide, C++ doar la 3 și 5 și mereu cu `Unde nu ține`, un singur bloc Python colorat și restul necolorat, fără overflow la 360 px, light și dark, starea `S` neschimbată, fără erori de consolă. Rulat: ALL PASS.
- Verificat: `node validate.mjs` (OK), `node build.mjs`, `node --check dist/bundle-check.js`, `node tools/desf_examples.mjs`, `python3 tools/test_desf.py`, screenshot la 360 px în light și dark cu „Deschide tot” (citit). Nu am rulat restul suitei de interfață și nici testele de unitate (le rulează integratorul).
