# 15: Conținut: Redis, RabbitMQ, SIGTERM, profilare și AWS (7 schelete)

**What to build:** Alex are scheletele P3 care se pot rula: Redis pe un `redis-server` real, RabbitMQ peste un channel fals, AWS cu moto.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] Un fixture de test pornește un `redis-server` temporar și îl oprește la final; testele sar cu un mesaj clar dacă binarul lipsește.
- [x] redis (3): cache-aside cu TTL · lock cu `SET NX PX` + eliberare sigură (doar cine deține lock-ul îl eliberează) · rate limit pe fereastră.
- [x] rabbitmq (1): consumer pika cu `basic_qos` + ack manual + DLQ; testul pe channel fals verifică ordinea `basic_qos` → `basic_consume` → `basic_ack` și `nack` fără requeue la eroare.
- [x] linux (1): handler `SIGTERM` pentru graceful shutdown (testul trimite semnalul unui proces copil și verifică oprirea curată).
- [x] perf (1): `cProfile` / `timeit` + citirea rezultatului.
- [x] aws (1): boto3, URL presemnat S3, testat cu moto.
- [x] Pachetele necesare sunt în lista de dev a testelor; faptele sunt verificate pe surse primare.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**1 nov. 2026 — implementat.** 7 schelete noi (`s-redis-cache`, `s-redis-lock`, `s-redis-ratelimit`, `s-rabbitmq-consumer`, `s-linux-sigterm`, `s-perf-profile`, `s-aws-presign`), adăugate la sfârșitul lui `src/data_skel.js`. Referințele sunt în `katas/skel_{redis,rabbitmq,linux,perf,aws}.py`, testele în `katas/test_skel_*.py` (44 de teste noi; suita `katas` are 96 trecute, testele de unitate 288). Pachetele de dev: `katas/requirements-dev.txt`. Faptele sunt în `research/interview-facts.md`, secțiunea 9.

- Redis: fixture la nivel de modul care pornește `redis-server` pe un port liber, cu `--save ""`, și îl oprește la final; fără binar sau fără `redis-py` testele sar cu mesaj. Rate limit-ul e fereastră fixă (cu defectul de graniță notat în comentariu); ceasul se înlocuiește în test.
- RabbitMQ: channel-ul fals leagă fiecare apel de semnătura reală din pika (`inspect.signature`), deci un nume de argument greșit pică. Verifică ordinea `basic_qos` → `basic_consume` → `basic_ack`, `nack` cu `requeue=False` la eroare și topologia DLQ (exchange implicit `""` + cheia = numele DLQ-ului).
- SIGTERM: testul pornește un proces copil, îi trimite SIGTERM și SIGINT și verifică codul 0, unitatea terminată, un singur `cleanup`, fără traceback; `cleanup` rulează și când `step` ridică o excepție.
- Perf: `profile` (cProfile ca context manager + pstats în `StringIO`) și `best_of` (`timeit.repeat`, minimul, împărțit la `n`).
- AWS: moto (S3 simulat); URL-ul se folosește cu `requests` (GET/PUT reale pe moto) și, cu timpul înghețat, se compară identic cu apelul direct boto3, ca să fie prinse metoda sau cheia fixate în cod.
- Fiecare referință a fost mutată (7–12 mutații per fișier: requeue, auto_ack, `DEL` simplu, lipsa TTL, `<` în loc de `<=`, media în loc de `min`, SigV2 în loc de SigV4 etc.): toate sunt prinse de teste. Două teste au fost întărite după ce o mutație scăpase (împărțirea la `n` și metoda fixă la presign).
- Rânduri ≤ 42 de coloane (validate.mjs); capturile la 360 px, light și dark, fără depășire orizontală și fără erori de consolă.

Abateri și limite, cu bună știință: (1) tichetul cere „un fixture” Redis; e unul singur, în `test_skel_redis.py`, nu într-un `conftest.py`, fiindcă îl folosește doar acel fișier. (2) Nu există un RabbitMQ real în mediu: topologia DLQ e verificată doar pe documentație și pe channel-ul fals. (3) Comportamentul „us-east-1 dă SigV2 fără `s3v4`” e observat pe boto3 1.43.123, nu citit în docs; punctul esențial spune asta. (4) Serverul Redis din mediu e 7.0.15; `DELEX` (8.4) nu e folosit, referința folosește scriptul Lua, valabil pe toate versiunile. (5) Pagina de documentație pstats nu definește coloanele; definițiile vin din pagina `profile`.
