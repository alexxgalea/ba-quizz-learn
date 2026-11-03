# 14: Desfășurări pentru celery (12 puncte)

**What to build:** Când Alex deschide fișa `celery` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `celery`: fără C++ în general; Legătura cu experiența lui Alex cu Celery e principala punte.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2026-11-03 (agent, desfășurări celery)**

Livrat: `src/desf/celery.md` (harta cu 7 grupuri și 12 desfășurări), `research/_desf_facts_celery.md` (secțiunea 30, de lipit în `research/interview-facts.md`) și blocul `celery` din `tools/test_desf.py`. Nu am schimbat `Status:`, `README.md`, `research/interview-facts.md` și nu am publicat.

- **`Greu: da`**: punctele 2, 3, 6, 8, 10 și 11 (6 din 12). Restul sunt în banda 60–90 de cuvinte.
- **C++**: nicăieri. Niciun punct nu are un echivalent real în C++11/17 (broker, ack și Beat sunt infrastructură, nu limbaj); la 8 (pool-uri) comparația cu thread-urile e deja în `gil`, iar aici ar fi fost forțată.
- **Legături**: grile CEL la punctele 1 (CEL-01, 15), 2 (04), 3 (02, 03), 5 (08), 6 (09), 7 (05), 8 (12), 9 (13), 10 (10), 11 (06, 07) și 12 (05, 02); RMQ-02 la 3 și RMQ-03 la 4; GIL-02 la 8, `design` punctele 2 și 4 la 2 și 3; experiența lui Alex (Django + Celery la 1 și 11, Docker Swarm la 5, `asyncio.gather` la 6, Gunicorn `--timeout` la 9). La 12 (cazul lui Alex) desfășurarea e un șablon de răspuns cu `<N>`, `<loc>`, `<M>`: nu inventează valori.
- **Erori de fapt corectate în puncte**: niciuna. Precizări (în desfășurări, nu în punct): la 3, dacă moare doar procesul copil mesajul se confirmă oricum, iar pe Redis re-livrarea după cădere vine după `visibility_timeout`; la 4, `worker_prefetch_multiplier=1` împiedică rezervarea în plus doar cu `acks_late` (cu confirmare timpurie workerul mai ține un mesaj, observat pe Redis); la 8, `soft_time_limit` nu merge la gevent și eventlet; la 11, `delay_on_commit` există din Celery 5.4, doar cu integrare Django.
- **Exemple**: 5 blocuri Python rulează în `node tools/desf_examples.mjs` (Celery 5.6.3 e instalat în mediul de build; broker `memory://` și `.apply()`, fără worker): 1 (`PENDING`), 2 (4 apeluri = 1 + 3 reîncercări), 5 (rutare), 6 (chain, group), 11 (`# ! EncodeError`). Ce cere un worker real (3, 4, 7, 9, 10) e în blocuri `text`, dar fiecare a fost rulat de mână pe un worker Celery 5.6.3 cu Redis 7.0.15: confirmare timpurie față de `acks_late` cu `kill -9`, prefetch cu două workere, două procese Beat (12 față de 6 mesaje), limite de timp, `visibility_timeout` cu `countdown` (task rulat de 3 ori). Verificat că check-ul pică pe un rezultat greșit și pe o excepție greșită în acest modul.
- **Verificări rulate**: `node validate.mjs` (OK, fără avertismente pentru celery), `node build.mjs`, `node --check dist/bundle-check.js`, `node tools/desf_examples.mjs` (74, picate 0), `node tools/fencew.mjs 36` (nimic din desfășurări), `node tools/xcheck.mjs celery`, `python3 tools/test_desf.py` (ALL PASS, inclusiv blocul `celery` și nicio eroare de consolă), screenshot-uri la 360 px, light și dark, cu „Deschide tot”, citite pe toată fișa (rândurile de cod au fost scurtate la ≤ 32 de caractere, ca să nu se împacheteze pe telefon).
- **Nesiguranțe**: `app.amqp.router` (exemplul 5) e API intern, folosit doar ca să arate ce coadă alege Celery fără broker; re-livrarea cu `visibility_timeout` implicit (1 h) n-a fost așteptată, doar cu 3 s; `consumer_timeout` RabbitMQ (30 min) și `urllib3.Retry` vin din explicațiile existente, nereverificate aici. Ultimul criteriu (testele complete, publicarea) rămâne pentru integrator.

**3 nov. 2026 (închidere):** Review (`/code-review`, Standards și Spec): fără defecte blocante. Corectate după el: harta numără acum cele șapte întrebări ale grupurilor; `urllib3.Retry` scos din Legătura de la 2 (jitter-ul lui e 0 implicit, deci „același tipar” era prea tare); Problema și Ideea de la 3 nu mai repetă același lucru; deadlock-ul de la 6 spune „poate” și că Celery refuză implicit `.get()` într-un task; la 9, limitele cer pool-ul prefork și `soft_time_limit` nu merge la gevent / eventlet; la 10, „Peste 1 oră rulează din nou” (contrazicea exemplul) e acum „poate rula de mai multe ori”, Redis nu mai e opus RabbitMQ, iar ridicarea `visibility_timeout` e notată ca nerecomandată; `Greu: da` la 4, 9 și 12. Judecăți asumate: unele Legături poartă un fapt scurt lângă trimitere; `app.amqp.router` (5) e API intern, anunțat în text.
