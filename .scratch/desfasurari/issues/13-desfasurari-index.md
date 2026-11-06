# 13: Desfășurări pentru index (11 puncte)

**What to build:** Când Alex deschide fișa `index` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `index`: structurile de date C++ ajută: B-tree față de `std::map` (arbore ordonat), hash index față de `std::unordered_map`; exemplele SQL nu se rulează.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `index` are acum harta și 11 desfășurări (`src/desf/index.md`), în ordinea punctelor.

- `Greu: da` la 2, 4, 5, 6, 7, 8, 9, 10 și 11 (plafonul rămâne 180 de cuvinte); 1 și 3 rămân în banda normală.
- C++ la 1 (`std::map`, `find` / `lower_bound`; nu e B-tree), 4 (`std::map<std::pair<int, std::string>, V>` și `lower_bound({a, ""})` ca prefix al indexului compus), 7 (`std::unordered_map` față de Hash index, `std::map` față de B-tree) și 11 (`std::unordered_map<std::string, std::vector<int>>` ca index inversat), toate cu `Unde nu ține`. Fără C++ la 2, 3, 5, 6, 8, 9 și 10 (cost de scriere, planner, `VACUUM`, `CONCURRENTLY`, `EXPLAIN`: n-au echivalent real).
- Legăturile merg spre IDX-01…IDX-12 (câte unul-două pe punct), spre Django (`ForeignKey` creează index implicit, `Lower("email")` în `Meta.indexes`) la 3 și 6, spre Alembic (`autocommit_block()` + `postgresql_concurrently`, rulat) la 9 și spre Elasticsearch / GIN la 7 și 11.
- Exemplele Python (1, 4, 6, 11) rulează în `desf_examples` (64 de exemple în total, 0 picate); la 3, 5, 7, 8, 9 și 10 exemplele sunt SQL în blocuri `text`, rulate de mine pe un Postgres 16 local la scriere. Faptele sunt în secțiunea 29 (`research/_desf_facts_index.md`, de lipit în `research/interview-facts.md`): documentația Postgres 16 / 18, Elasticsearch, Django, Alembic, draftul standardului C++ și compilare cu `g++` și `clang++`.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la 2, `DELETE` nu scoate imediat intrările din index (le curăță `VACUUM`), iar un `UPDATE` poate evita indexurile (HOT); la 4, `b = ?` singur poate totuși folosi indexul `(a, b)`, parcurgându-l întreg (observat pe PG 16), iar PG 18 poate sări peste valorile lui `a`; la 6, `created_at::date` merge în index doar pe `timestamp`, nu pe `timestamptz` (eroare `IMMUTABLE`); la 8, câștigul depinde de harta de vizibilitate; la 10, din PG 18 `BUFFERS` e inclus automat în `EXPLAIN ANALYZE`.
- `tools/test_desf.py` are acum o secțiune pentru `index` (11 desfășurări, C++ la 1, 4, 7 și 11 cu `Unde nu ține`, Python colorat la 1, 4, 6, 11 și SQL necolorat la 3, 5, 7, 8, 9, 10, fără overflow la 360 px, light și dark, starea `S` neschimbată).
- Verificat înainte de commit: `validate` (OK), `build`, `node --check`, `desf_examples` (64, 0 picate), `fencew 36` (nimic în `desf/index.md`), `xcheck index`, `test_desf.py` (ALL PASS), screenshot la 360 px în light și dark cu „Deschide tot” (`shots/desf_index_*.png`). Rămân pentru publicare: suita completă de teste și publicarea la același link.

**3 nov. 2026 (închidere):** Review (`/code-review`, Standards și Spec): fără defecte blocante. Corecturi aplicate după el: `Greu: da` la punctele cu mai multe idei, procente care adunau 101% (index 5), `EXPLAIN ANALYZE` în loc de `ANALYZE` (index 10), Problema concretă la index 11, mesajul real `canceling statement due to lock timeout` (postgres 8), „idle in transaction” doar după o scriere (postgres 1), rezultatele `# →` lângă linia care le produce (sqlalchemy 5, 8). Publicat la același link (versiunea 39) și în PWA (`docs/app`). Verificat: `validate`, `build`, `node --check`, `desf_examples` (69 de exemple, 0 picate), `npm run test:unit` (338 trec), `test_desf.py`, `test_skel`, `test_skel_ai`, `test_ask`, `test_pwa`, `test_prepapp`, `test_jarvis`, `test_audio`, `test_ai`. Trei teste de interfață pică identic și pe commitul dinainte (`e30262f`): `test_interview`, `test_gaps`, `test_lesson`; planul lor cere seri rămase până la interviu, iar azi (3 noiembrie) e ziua interviului. Nu au legătură cu desfășurările.
