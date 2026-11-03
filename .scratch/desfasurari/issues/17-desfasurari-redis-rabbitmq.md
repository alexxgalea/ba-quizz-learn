# 17: Desfășurări pentru redis + rabbitmq (19 puncte)

**What to build:** Când Alex deschide fișa `redis` și `rabbitmq` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** ready-for-agent

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `redis` și `rabbitmq`: fără C++ în general; Legătura cu Celery (broker) și cu `design`.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [ ] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2026-11-03 (agent, desfășurări redis + rabbitmq)**

Livrat: `src/desf/redis.md` (harta cu 6 grupuri și 10 desfășurări), `src/desf/rabbitmq.md` (harta cu 6 grupuri și 9 desfășurări), `research/_desf_facts_redis.md` (secțiunea 33) și `research/_desf_facts_rabbitmq.md` (secțiunea 34), de lipit în `research/interview-facts.md`, plus blocurile `redis` și `rabbitmq` din `tools/test_desf.py`. Nu am schimbat `Status:`, `README.md`, `research/interview-facts.md` și nu am publicat.

- **`Greu: da`**: la `redis` punctele 1–9 (9 din 10; doar 10, Valkey, e în banda 60–90); la `rabbitmq` punctele 1–6, 8 și 9 (8 din 9; doar 7, dead letter exchange, e în bandă). Fișele sunt dense (4–6 fapte pe punct), deci aproape toate au nevoie de plafonul mare.
- **C++**: la `redis` doar punctul 1 (`std::atomic::fetch_add` ca `INCR`, `load` + `store` ca `GET` + `SET`; compilat cu `g++ -std=c++11`: 400000 față de 1) și la `rabbitmq` doar punctul 1 (`std::queue` + `std::mutex` + `std::condition_variable`), amândouă cu `Unde nu ține`. Restul punctelor sunt infrastructură (TTL, AOF, ack, quorum), fără echivalent real.
- **Legături**: grilele RD-01…RD-11 (1: RD-08, RD-10; 2: RD-10; 3: RD-07, RD-11; 4: RD-09; 5: RD-01, RMQ-02; 6: RD-03, RD-04; 7: RD-02, PG-05; 8: RD-06 și scheletul `s-redis-ratelimit`; 9: RD-05; 10: RD-10) și RMQ-01…RMQ-11 (1: RMQ-10, CEL-14; 2: RMQ-01, RMQ-08; 3: RMQ-02, RMQ-11, CEL-03, DES-02; 4: RMQ-03, DES-04; 5: RMQ-04, DES-01; 6: RMQ-09, RMQ-04; 7: RMQ-05, DES-07; 8: RMQ-06, DES-04; 9: RMQ-07). Experiența lui Alex: Celery la redis 3, 7 și rabbitmq 1, 3; Elasticsearch (`search_after`) la redis 9; Postgres (`pg_dump`, WAL, `SKIP LOCKED`) la redis 4 și 7.
- **Erori de fapt corectate în puncte**: niciuna (nu am modificat fișierele de date). Precizări, în desfășurări: la redis 3, `noeviction` contează doar cu `maxmemory` setat (implicit 0); la redis 4, implicit RDB e pornit și AOF oprit; la redis 7, `DELEX ... IFEQ` există din 8.4; la redis 10, Redis e din nou open source din 8.0 (AGPLv3); la rabbitmq 4, prefetch se aplică fiecărui consumator; la rabbitmq 5, nici durabilitatea, persistența și confirmările nu promit zero pierderi; la rabbitmq 7, `delivery-limit` implicit e 20 din 4.0; la rabbitmq 9, RabbitMQ are și Streams.
- **Exemple**: 5 blocuri Python la `redis` (1, 5, 6, 7, 8) și 7 la `rabbitmq` (1, 3, 4, 6, 7, 8, 9) rulează în `node tools/desf_examples.mjs` (103 în total, picate 0); sunt simulări în Python pur, anunțate ca atare în Legătură. Comenzile Redis din blocurile `text` (2, 3, 4, 9) au fost rulate de mână pe Redis 7.0.15 (`redis-cli` / `redis-py`). **RabbitMQ nu e instalabil în mediu**: nimic din `rabbitmq` n-a rulat pe un broker; tabelul topic (2) și codul `pika` (5) sunt în blocuri `text`, cu faptele din documentația RabbitMQ (4.3.x), marcate ca neexecutate în `_desf_facts_rabbitmq.md`.
- **Verificări rulate**: `node validate.mjs` (OK, fără avertismente pentru cele două fișiere), `node build.mjs`, `node --check dist/bundle-check.js`, `node tools/desf_examples.mjs`, `node tools/fencew.mjs 36` (nimic din desfășurări), `node tools/xcheck.mjs redis rabbitmq`, `python3 tools/test_desf.py` (ALL PASS, light și dark, inclusiv blocurile noi și nicio eroare de consolă), screenshot-uri la 360 px, citite pe fișe cu „Deschide tot” (rândurile de cod scurtate la ≤ 32 de caractere unde s-a putut).
- **Nesiguranțe**: pagina Streams (277 000 de caractere) a fost citită doar în primele 100 000, deci `XREADGROUP` / `XPENDING` / `XAUTOCLAIM` sunt din rulare, nu citate; „fork al Redis 7.2.4, martie 2024” e din surse secundare, deci desfășurarea spune doar „fork” și „compatibil cu 7.2”; compromisul prefetch mare (rabbitmq 4) și remediile de ordine (rabbitmq 8) sunt raționamente; calculul 18 s față de 9 s (rabbitmq 4) e un model aritmetic. Ultimul criteriu (testele complete, publicarea) rămâne pentru integrator.
