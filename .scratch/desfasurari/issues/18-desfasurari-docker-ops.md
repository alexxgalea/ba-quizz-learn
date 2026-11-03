# 18: Desfășurări pentru docker + ops (16 puncte)

**What to build:** Când Alex deschide fișa `docker` și `ops` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** ready-for-agent

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `docker` și `ops`: fără C++ în general; Legătura cu Docker Swarm din experiența lui Alex.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [ ] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `docker` (harta și 9 desfășurări, `src/desf/docker.md`) și `ops` (harta și 7 desfășurări, `src/desf/ops.md`) sunt scrise, în ordinea punctelor. Ultimul criteriu (toate testele, publicarea, mesajul către Alex) rămâne deschis: le face integratorul după îmbinare.

- `Greu: da`: la `docker` 1, 2, 4, 5, 6, 7 și 8 (7 din 9; 3 și 9 rămân în banda normală); la `ops` 1, 2, 4, 6 și 7 (5 din 7; 3 și 5 rămân în banda normală). Plafonul de 180 de cuvinte nu a fost urcat.
- C++: nicăieri, în niciunul din cele două module. Containerele sunt procese Linux, iar observabilitatea și CI-ul nu au echivalent real în C++11/17, deci nu există `În C++` și nici `Unde nu ține`.
- Legături: `docker` spre DK-01…DK-08, OBS-06 (cache), LX-07 (exit code 137), Celery (oprire grațioasă la SIGTERM), Swarm din experiența lui Alex (`--force-new-cluster`, rețeaua overlay a lui Redis, `docker secret`); `ops` spre OBS-01…OBS-09, Celery (headerele task-ului), DK-02 (cache de layere față de cache-ul din GitLab).
- Exemple: `docker` are doar blocuri `text` (Dockerfile, shell, YAML); `ops` are patru exemple Python care rulează în `desf_examples` (95 în total, 0 picate): percentilă față de medie, vârsta celui mai vechi mesaj, error budget, `contextvars`. Comenzile Docker din exemple le-am rulat eu pe Docker 29.9.1 (`dockerd` pornit în sandbox) și Compose v5.6.0: `docker diff`, `docker history` cu `ARG`, `docker stop` cu forma shell și forma exec, `docker ps` cu `unhealthy`, `docker service`. Regula de alertă trece `promtool check rules` (3.15.1). Nerulate: Dockerfile-ul multi-stage cu `pip --prefix` (puncte 3; tipar din `katas/skel_docker.Dockerfile`), YAML-ul cu `postgres:16` (7) și pipeline-ul GitLab din ops 7 (nu există instanță GitLab; doar parsat cu PyYAML); sunt marcate ⚠️ în fapte.
- Faptele noi sunt în `research/_desf_facts_docker.md` (secțiunea 35) și `research/_desf_facts_ops.md` (secțiunea 36), de lipit de integrator în `research/interview-facts.md`.
- Erori de fapt corectate: una, în `src/data_core.js`, `P.sheets.docker.points[0]` (punctul 1): „Imagine = layere read-only (câte unul per instrucțiune); container = …” → „Imagine = layere read-only (câte unul per instrucțiune care schimbă fișiere: `RUN`, `COPY`, `ADD`; `ENV` și `CMD` adaugă doar metadate); container = …” (rulat: `ENV` și `CMD` nu adaugă layer de sistem de fișiere). Grila `dk-02` și explicația ei („Fiecare instrucțiune produce un layer”) repetă formularea din documentația Docker (https://docs.docker.com/build/cache/) și au rămas neatinse; de decis la mesajul către Alex. La `ops`: niciuna.
- Precizări, nu erori (în desfășurări, punctele rămân neschimbate): `docker` 5, exec form nu ajunge: PID 1 nu primește acțiunea implicită a SIGTERM, deci aplicația are nevoie de handler sau de `--init` (rulat: 10 s și exit 137 fără handler, 0 s și exit 0 cu handler); `docker` 6, Docker simplu doar marchează containerul `unhealthy`, nu îl repornește (rulat); `docker` 9, „alpine poate rupe wheels” e valabil doar pentru pachetele fără wheel `musllinux` (`torch`), nu pentru toate (`psycopg2-binary` are azi); `ops` 2, RED e pentru servicii cu request-uri, USE și vârsta mesajelor pentru un worker fără HTTP; `ops` 3, percentilele nu se mediază între instanțe; `ops` 6, `X-Request-ID` e o convenție, iar standardul pentru trace-uri e `traceparent` (W3C); `ops` 7, `cache` nu are garanții.
- `tools/test_desf.py` are două blocuri noi, după `celery`: `docker` (9 desfășurări, hartă cu 5 grupuri, fără C++, toate exemplele necolorate) și `ops` (7 desfășurări, hartă cu 4 grupuri, fără C++, exemplele Python 2, 3, 4, 6 colorate și 1, 5, 7 necolorate), cu aceleași verificări ca la celelalte module (numere, închis implicit, „Deschide tot”, overflow la 360 px, light și dark, starea `S`, consola). Rulat: ALL PASS.
- Verificat: `node validate.mjs` (OK, fără avertismente pentru fișierele mele), `node build.mjs`, `node --check dist/bundle-check.js`, `node tools/desf_examples.mjs`, `node tools/fencew.mjs 36` (curat pentru `docker.md` și `ops.md`), `python3 tools/test_desf.py` (ALL PASS) și screenshot la 360 px în light și dark cu „Deschide tot” (citit pe bucăți). Nu am rulat restul suitei de interfață și nici testele de unitate (le rulează integratorul).
