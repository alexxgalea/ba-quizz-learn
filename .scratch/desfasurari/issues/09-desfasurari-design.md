# 09: Desfășurări pentru design (9 puncte)

**What to build:** Când Alex deschide fișa `design` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Unghiul C++ și legăturile pentru `design`: aproape fără C++; Analogia și Problema concretă poartă explicația. Legătura cu Celery, RabbitMQ, Docker Swarm și cu grilele de la `celery` / `rabbitmq` / `redis`.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2 nov. 2026:** `design` are acum harta și 9 desfășurări (`src/desf/design.md`), în ordinea punctelor.

- `Greu: da` la 2, 3, 4, 6 și 8 (plafonul rămâne 180 de cuvinte); 1, 5, 7 și 9 rămân în banda normală.
- Fără C++, nicăieri: modulul nu are echivalent real (cum anunța tichetul). Problema concretă și Analogia (telefon față de scrisoare la 1) poartă explicația. Legăturile merg spre CEL-01, CEL-02, CEL-04, CEL-07, RMQ-02, RMQ-03, RMQ-05, RMQ-06, PG-05, PG-06, RD-06, SEC-09, DES-01…DES-08 și spre experiența lui Alex (Docker Swarm la 6, Elasticsearch la 8).
- Exemplele Python (2, 4, 5, 6, 7, 9) rulează în `desf_examples`; la 3 și 8 exemplele sunt SQL în blocuri `text` (nerulate de check). SQL-ul de la 8 l-am rulat eu pe un Postgres 16 local, la fel ca verificările RLS din text. Faptele noi sunt în `research/interview-facts.md`, secțiunea 26 (microservices.io, Fowler, RabbitMQ, Debezium, Stripe, docs Python și Postgres, Google SRE, SQS).
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la 2, „exactly-once” e „foarte greu” end-to-end; la 5, `Idempotency-Key` e încă draft IETF; la 6, ordinea per cheie se păstrează doar cu un consumator pe partiție; la 8, RLS nu se aplică proprietarului tabelei (fără `FORCE`), superuserilor și rolurilor cu `BYPASSRLS`.
- `tools/test_desf.py` are acum o secțiune pentru `design` (9 desfășurări, fără bloc C++, exemple Python colorate și SQL necolorat, fără overflow la 360 px, light și dark).
- Review (`/code-review`, Standards și Spec): fără defecte blocante. Corectate: „nu pe CPU” la 9, Elasticsearch la 8 (fără „clustere separate”, notat în fapte ca alegere de design, nu fapt de API), „de obicei” în harta, „cel puțin 100” la 6, `Greu: da` la 5 și 7, secțiunea 15 în antetul fișierului și aserții mai stricte în `test_desf.py` (harta începe închisă, ambele blocuri SQL necolorate). Rămân judecăți asumate: blocul din `test_desf.py` copiază structura celui de la `frontend` (același tipar pe fiecare fișă), iar exemplul de la 4 arată doar jitter-ul (backoff-ul și breaker-ul sunt în Idee).
- Publicat la același link (versiunea 38) și în PWA (`docs/app`). Verificat înainte: `validate`, `build`, `node --check`, `desf_examples` (60 de exemple, 0 picate), toate testele de interfață din `CLAUDE.md`, `npm run test:unit` (338 trec), `xcheck design`, screenshot la 360 px în light și dark.
