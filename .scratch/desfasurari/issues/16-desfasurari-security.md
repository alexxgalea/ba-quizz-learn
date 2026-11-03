# 16: Desfășurări pentru security (11 puncte)

**What to build:** Când Alex deschide fișa `security` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** ready-for-agent

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `security`: C++ rar (buffer overflow ca problemă pe care Python o evită, dar injecția nu); OWASP și versiunile se verifică pe web înainte de scriere.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [ ] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `security` are acum harta și 11 desfășurări (`src/desf/security.md`), în ordinea punctelor.

- `Greu: da` la 4, 5, 6, 7, 8, 9 și 10 (plafonul rămâne 180 de cuvinte); 1, 2, 3 și 11 rămân în banda normală.
- C++ la 3 (`std::system` față de `fork` + `execvp`) și 10 (`std::mt19937` față de `std::random_device`, `memcmp` fără garanție de timp constant), ambele cu `Unde nu ține`. Fără C++ la 1, 2, 4, 5, 6, 7, 8, 9 și 11 (injecție SQL, pickle, SSRF, JWT, OAuth, autorizare, secrete, supply chain: n-au echivalent real în standard; buffer overflow nu se leagă de niciun punct).
- Legăturile merg spre SEC-01…SEC-11 (câte una-două pe punct), spre punctul 11 din fișa sqlalchemy (bind parameters) la 1, spre punctul 12 din fișa frontend (PKCE în SPA) la 7, spre punctul 8 din fișa design (multi-tenant, RLS) la 8, spre Django (`.raw()`, `PASSWORD_HASHERS`), DRF (`has_object_permission` și `get_queryset()`), Celery (JSON implicit, CEL-11), Keycloak (endpoint-ul `certs`) și Docker Swarm (`/run/secrets/`).
- Exemplele Python (1–8 și 10) rulează în `desf_examples` (78 de exemple în total, 0 picate); la 9 (istoric git) și 11 (`pip-audit`) sunt blocuri `text` cu ieșirea reală, rulată la scriere. Faptele sunt în secțiunea 32 (`research/_desf_facts_security.md`, de lipit în `research/interview-facts.md`): OWASP Top 10:2025 și API Top 10:2023, RFC 7515 / 7636 / 8725 / 9700, OIDC Core, docs Python, Django, DRF, PyYAML, pip, pip-audit, AWS IMDSv2, Docker Swarm, POSIX și draftul standardului C++ (compilat cu `g++` și `clang++`).
- Erori de fapt în punctele fișei: niciuna; punctele nu au fost modificate. Precizări, nu erori: la 2, `yaml.load` e periculos cu `Loader` / `UnsafeLoader` (PyYAML 6 cere argumentul `Loader`; `FullLoader` și `safe_load` au respins payload-ul de probă); la 5, OWASP pune scrypt înaintea lui bcrypt, rezervat sistemelor vechi; la 6, „JWT e semnat, nu criptat” e valabil pentru JWS (JWE există), iar PyJWT verifică `exp` doar dacă tokenul îl are și `iss` doar cu `issuer=`; la 11, OWASP numește A03 „categorie nouă”, dar o descrie ca extindere a lui A06:2021 (desfășurarea spune „extinde”), iar GitLab Dependency Scanning cere nivelul Ultimate.
- Rândurile de cod din `security.md` au cel mult 32 de caractere, ca să nu se împacheteze la 360 px (limita validării rămâne 36).
- `tools/test_desf.py` are acum o secțiune pentru `security` (11 desfășurări, C++ la 3 și 10 cu `Unde nu ține`, Python colorat la 1–8 și 10, `text` necolorat la 9 și 11, fără overflow la 360 px, light și dark, starea `S` neschimbată, fără erori de consolă).
- Verificat înainte de commit: `validate` (OK), `build`, `node --check`, `desf_examples` (78, 0 picate), `fencew 36` (nimic în `desf/security.md`), `test_desf.py` (ALL PASS), screenshot la 360 px în light și dark cu „Deschide tot”, toată fișa (`shots/desf_security_*.png` și felii din elementul fișei). Rămân pentru publicare: suita completă de teste și publicarea la același link.
