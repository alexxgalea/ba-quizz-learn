# 07: Desfășurări pentru pytest (13 puncte)

**What to build:** Când Alex deschide fișa `pytest` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Unghiul C++ și legăturile pentru `pytest`: comparația cu GoogleTest / Catch2 doar unde ajută (fixture față de `SetUp`/`TearDown`, `parametrize` față de testele parametrizate, `monkeypatch`/`patch` față de injectarea dependențelor sau mock-urile prin interfețe virtuale); altfel câmpul lipsește.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2 nov. 2026:** `pytest` are acum harta și 13 desfășurări (`src/desf/pytest.md`), în ordinea punctelor.

- `Greu: da` la 2, 4, 5, 6, 7, 9, 10, 12 și 13 (plafonul rămâne 180 de cuvinte); 1, 3, 8 și 11 rămân în banda normală.
- C++ la 2 (GoogleTest: `SetUp()` / `TearDown()` cu `TEST_F`, față de fixture-ul cu `yield`), 4 (`TEST_P` și `INSTANTIATE_TEST_SUITE_P`, față de `parametrize`), 6 (mock prin interfață `virtual`, gMock, față de `patch`) și 9 (ceas injectat ca parametru de șablon, față de freezegun / time-machine), toate cu `Unde nu ține`. Fără C++ la rest. La 1 comparația `assert` din `<cassert>` (fără valori în mesaj) față de pytest rămâne doar în fapte.
- Exemplele rulează pe Python 3.13 (54 de exemple în total, 0 picate): `pytest.raises` și `MonkeyPatch.context()` la 5, `create_autospec` cu `side_effect` la 6, rollback cu `sqlite3` la 7, un task Celery chemat direct și în mod eager la 8, un ceas injectat la 9, un nume de bază per `worker_id` la 11. La 1, 3, 10, 12 și 13 exemplele sunt ` ```text ` (ieșiri pytest reale, comenzi, `conftest.py`, cod Playwright): le-am verificat rulând pytest, xdist, Playwright (Chromium) și Celery pe proiecte de probă.
- Verificat și prin rulare: `-x`, `-k`, `--lf`, `-m`, `--junitxml`, `pytest_addoption`, suprascrierea fixture-ului între două `conftest.py`, id-urile `parametrize`, fixture-ul `session` o dată pe worker în xdist (`gw0`, `gw1`), freezegun, time-machine, `expect()` care așteaptă 5,0 s față de `is_visible()` instant, `assert` și un ceas fals în C++ (g++, clang++). Faptele noi sunt în `research/interview-facts.md`, secțiunea 24. **GoogleTest / gMock nu au fost compilate**: mediul nu are `libgtest-dev`, iar compilarea sursei clonate a fost refuzată de politica sesiunii; afirmațiile despre ele sunt din documentația oficială (marcate ⚠️ în fapte).
- Erori de fapt în punctele fișei: niciuna. **Eroare de fapt în grila PT-08 și în explicația ei** (nu în punct): spuneau că `task_always_eager` ocolește serializarea și că un obiect ORM „trece” testul eager. În sursa Celery 5.6.3, `Task.apply_async` face `dumps` și `loads` și în modul eager (rulat: `EncodeError` la `add.delay({1}, {2})`). Corectat minim: opțiunea A, explicația, întrebarea de verificare și Legătura. Precizări, nu erori: la 7, `testcontainers.postgres` e importul vechi (deprecat în 4.15), deci desfășurarea dă doar numele bibliotecii; la 11, `worker_id` există doar cu pytest-xdist instalat.
- `tools/test_desf.py` are acum o secțiune pentru `pytest` (13 desfășurări, C++ doar la 2, 4, 6 și 9, exemplele ` ```text ` fără colorare Python, fără overflow la 360 px, light și dark).
- Review (`/code-review`, Standards și Spec): fără defecte blocante. Corectate: Legături la grile care nu acopereau afirmația (1, 3, 10, 11, 12), typo „cheamă”, C++ la 6 prea absolut, SAVEPOINT la 7, `Greu: da` la 7 și 10, GoogleTest marcat ⚠️. Rămân judecăți asumate: exemple ` ```text ` la 12 (cod real, `URLS` nedefinit) și rupturile de rând din exemple la 360 px.
