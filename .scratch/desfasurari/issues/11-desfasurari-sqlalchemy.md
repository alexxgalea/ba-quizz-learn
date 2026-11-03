# 11: Desfășurări pentru sqlalchemy (12 puncte)

**What to build:** Când Alex deschide fișa `sqlalchemy` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `sqlalchemy`: C++ rar (RAII față de `Session` ca context manager); Legătura cu Django ORM e principala punte.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `sqlalchemy` are harta și 12 desfășurări (`src/desf/sqlalchemy.md`), în ordinea punctelor. Faptele sunt în `research/_desf_facts_sqlalchemy.md` (secțiunea 27, de lipit în `research/interview-facts.md`).

- `Greu: da` la 3, 4, 6, 7, 8, 9, 10 și 12 (plafonul rămâne 180 de cuvinte); 1, 2, 5 și 11 rămân în banda normală.
- C++ doar la punctul 6: `with Session(...)` față de un obiect RAII pe stivă, ca `std::lock_guard`, cu `Unde nu ține` (în C++ destructorul rulează la orice ieșire din scope; în Python, fără `with`, nimeni nu cheamă `close()`, iar conexiunea rămâne luată până o găsește garbage collectorul, verificat prin rulare). Nicăieri altundeva: Core, ORM, pool, Alembic nu au echivalent real (cum anunța tichetul). Compilat cu `g++` `-std=c++17` și `clang++` `-std=c++11`.
- Legăturile: Django ORM e puntea principală (`select_related` / `prefetch_related` la 8, `CONN_MAX_AGE` și pool-ul din 5.1 la 3, `refresh_from_db` la 7, `bulk_create(ignore_conflicts=True)` la 10, `raw()` la 11, `makemigrations` la 12, unde Django întreabă „Was u.name renamed to u.full_name?” și Alembic generează drop + add), plus grilele SQA-01…SQA-14, DJ-01 și design (punctele 2 și 6).
- Exemplele Python (1, 3, 6, 11) rulează în `desf_examples` (64 de exemple în total, 0 picate); la 2, 4, 5, 7, 8, 9, 10 și 12 sunt blocuri `text`, fiindcă au nevoie de modele și sesiune. Le-am rulat eu ca programe complete (SQLite, `aiosqlite`, PostgreSQL 16 local, SQLAlchemy 2.1.6 și 2.0.55). Mediul de lucru are SQLAlchemy instalat; check-ul exemplelor are nevoie de el.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la 2, `Session.query()` e legacy, nu eliminat; la 3, pool-ul implicit e `QueuePool` cu 5 + 10 conexiuni și `pool_timeout` 30 s; la 5, identity map-ul ține slab obiectele nemodificate; la 8, `joinedload` pe colecție cere `.unique()`; la 9, `awaitable_attrs` cere mixin-ul `AsyncAttrs`, iar docs recomandă `expire_on_commit=False` în async; la 10, `on_conflict_do_update` cere țintă; la 12, autogenerate nu vede constrângeri fără nume, iar „`upgrade head` înainte de codul nou” e practică de deploy, nu afirmație din docs Alembic.
- `tools/test_desf.py` are acum o secțiune pentru `sqlalchemy` (12 desfășurări, bloc C++ doar la 6, Python colorat la 1, 3, 6 și 11 și `text` necolorat la restul, fără overflow la 360 px, light și dark, starea `S` neschimbată).
- Verificat: `validate` (OK), `build`, `node --check`, `desf_examples`, `fencew` (fără rânduri lungi în desfășurările noi; cele listate sunt din explicațiile grilelor), `tools/test_desf.py` (ALL PASS), screenshot la 360 px în light și dark. Restul testelor, publicarea și `Status:` rămân pentru îmbinare.

**3 nov. 2026 (închidere):** Review (`/code-review`, Standards și Spec): fără defecte blocante. Corecturi aplicate după el: `Greu: da` la punctele cu mai multe idei, procente care adunau 101% (index 5), `EXPLAIN ANALYZE` în loc de `ANALYZE` (index 10), Problema concretă la index 11, mesajul real `canceling statement due to lock timeout` (postgres 8), „idle in transaction” doar după o scriere (postgres 1), rezultatele `# →` lângă linia care le produce (sqlalchemy 5, 8). Publicat la același link (versiunea 39) și în PWA (`docs/app`). Verificat: `validate`, `build`, `node --check`, `desf_examples` (69 de exemple, 0 picate), `npm run test:unit` (338 trec), `test_desf.py`, `test_skel`, `test_skel_ai`, `test_ask`, `test_pwa`, `test_prepapp`, `test_jarvis`, `test_audio`, `test_ai`. Trei teste de interfață pică identic și pe commitul dinainte (`e30262f`): `test_interview`, `test_gaps`, `test_lesson`; planul lor cere seri rămase până la interviu, iar azi (3 noiembrie) e ziua interviului. Nu au legătură cu desfășurările.
