# 19: Desfășurări pentru linux + perf (16 puncte)

**What to build:** Când Alex deschide fișa `linux` și `perf` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `linux` și `perf`: C++ ajută la `perf` (profilare, cost real al apelurilor, `std::vector` față de `list`) și la `linux` (semnale, `fork`, procese); doar unde e echivalent real.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `linux` și `perf` au acum harta și câte 8 desfășurări (`src/desf/linux.md`, `src/desf/perf.md`), în ordinea punctelor (16 în total).

- `Greu: da` la `linux` 1, 2, 5, 6 și 8 (3, 4 și 7 rămân în banda normală) și la `perf` 1, 2, 3, 4 și 7 (5, 6 și 8 rămân în banda normală). Plafonul rămâne 180 de cuvinte.
- C++ la `linux` 1 (`std::signal` și `volatile std::sig_atomic_t`, cu regula standardului despre handler), 5 (RAII față de descriptori) și 7 (`chmod("f", 0640)` față de `0o640`), și la `perf` 1 (`perf record` față de `py-spy`, `callgrind` față de `cProfile`), 2 (`std::vector` / `unordered_set` / `deque` față de listă, set, `deque`) și 7 (`std::thread` față de procese), toate cu `Unde nu ține`. Fără C++ la restul (comenzi shell, rețea, loguri, containere; I/O în loturi, vectorizare, generatori, backpressure, Amdahl): n-au echivalent real în standard.
- Legăturile merg spre LX-01…LX-07 și PF-01…PF-07, spre DK-04 (`docker stop`, PID 1), PY-08 (`with`), PY-10 (`groupby`), DK-06, IDX-01 (`EXPLAIN ANALYZE`), GIL-06 (pickle între procese), schelete (`s-linux-sigterm`, `s-perf-profile`), punctul 8 din fișa sqlalchemy (N+1), punctul 4 din fișa oop (`cached_property`) și fișele postgres, redis și rabbitmq.
- Exemplele Python (`linux` 1, 2, 5, 7; `perf` 2, 5, 6, 8) rulează în `desf_examples` (99 de exemple în total, 0 picate). Celelalte sunt blocuri `text` cu ieșirea reală, rulată la scriere (în Linux real: `unshare`, `nc`, `lsof`, `awk`, `du`, `free`, `cProfile`; în `perf`, cifrele de timp măsurate aici, notate în fapte). Faptele sunt în secțiunile 37 și 38 (`research/_desf_facts_linux.md`, `research/_desf_facts_perf.md`, de lipit în `research/interview-facts.md`): man7.org, docs.kernel.org, docs.python.org, nginx, gunicorn, py-spy, SQLAlchemy, Redis și draftul N4659.
- Erori de fapt în punctele fișelor: niciuna; punctele nu au fost modificate. Precizări, nu erori: `linux` 1, „SIGTERM = oprire grațioasă” e o convenție (nginx tratează TERM ca oprire rapidă și QUIT ca grațioasă; gunicorn tratează TERM ca grațioasă); `linux` 2, 128 + N e convenția shell-ului, Python raportează `-9`; `linux` 5, „Too many open files” e EMFILE (limita procesului); `perf` 1, `py-spy` cere root sau `SYS_PTRACE` în container; `perf` 4, `re` ține în cache modelele recente, deci `re.compile` contează mai ales la modele folosite des; `perf` 7, `ProcessPoolExecutor.map` pornește cu `chunksize=1`, iar `Pool.map` își calculează singur unul.
- Neexecutate (marcate ⚠️ în fapte): `ss`, `dig`, `journalctl` (lipsesc din mediu sau nu rulează systemd), Docker (`docker inspect`, `OOMKilled`, `--init`), `perf` (Linux), `py-spy top` (cere terminal), pipelining Redis și `COPY` pe un server real, `bulk_create` / `iterator()` din Django (nementionate în desfășurări).
- Cifrele din exemplele `text` de la `perf` depind de mașină (4 core-uri, sandbox) și variază mult între rulări; în desfășurare sunt rotunjite, iar concluzia (ordinul de mărime) e cea stabilă. La `perf` 7, `chunksize=1` a durat 53–55 s în două rulări.
- `tools/test_desf.py` are acum câte o secțiune pentru `linux` și `perf` (8 desfășurări, harta cu 4 și 5 grupuri; C++ la 1, 5 și 7, respectiv 1, 2 și 7, cu `Unde nu ține`; Python colorat la 1, 2, 5, 7, respectiv 2, 5, 6, 8; `text` necolorat la restul; fără overflow la 360 px, light și dark, starea `S` neschimbată, fără erori de consolă).
- Verificat înainte de commit: `validate` (OK), `build`, `node --check`, `desf_examples` (99, 0 picate), `xcheck` și `fencew 36` (nimic în `desf/linux.md` și `desf/perf.md`), `tests/unit` pentru `desf` (39 pass), `test_desf.py` (ALL PASS), screenshot la 360 px în light și dark, cu „Deschide tot” (`shots/desf_linux_*.png`, `shots/desf_perf_*.png`; felii din cele patru). Câteva rânduri de cod au 33–36 de caractere și se frâng la 360 px; rămân în limita validării. Rămân pentru publicare: suita completă de teste și publicarea la același link.

**3 nov. 2026 (închidere):** Review (`/code-review`, Standards și Spec): corecturi aplicate. `perf` 2: „durează minute” era exagerat (acum măsurat: listă ~0,7 s, set ~0,001 s, ilustrativ), iar „N+1 e O(n²)” era greșit; cifrele de timp de la `perf` 3, 4 și 7 sunt marcate „ilustrativ, depinde de mașină”; `perf` 4 spune acum și că `re` ține în cache modelele recente; harta `perf` n-are fraza „împarți un cost fix” (contrazicea punctele 2, 6, 8); `linux` 4: și un firewall poate da „connection refused”; `linux` 7: comparația C++ (`chmod` față de `0o640`) e scoasă (era doar o diferență de sintaxă, iar `chmod` e POSIX), deci `linux` are C++ la 1 și 5; „root ignoră drepturile” nuanțat (fără bit `x` un fișier nu rulează). Publicat la același link (versiunea 41) și în PWA.
