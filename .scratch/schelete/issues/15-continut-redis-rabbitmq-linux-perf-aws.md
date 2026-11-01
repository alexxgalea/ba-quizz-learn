# 15: Conținut: Redis, RabbitMQ, SIGTERM, profilare și AWS (7 schelete)

**What to build:** Alex are scheletele P3 care se pot rula: Redis pe un `redis-server` real, RabbitMQ peste un channel fals, AWS cu moto.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] Un fixture de test pornește un `redis-server` temporar și îl oprește la final; testele sar cu un mesaj clar dacă binarul lipsește.
- [ ] redis (3): cache-aside cu TTL · lock cu `SET NX PX` + eliberare sigură (doar cine deține lock-ul îl eliberează) · rate limit pe fereastră.
- [ ] rabbitmq (1): consumer pika cu `basic_qos` + ack manual + DLQ; testul pe channel fals verifică ordinea `basic_qos` → `basic_consume` → `basic_ack` și `nack` fără requeue la eroare.
- [ ] linux (1): handler `SIGTERM` pentru graceful shutdown (testul trimite semnalul unui proces copil și verifică oprirea curată).
- [ ] perf (1): `cProfile` / `timeit` + citirea rezultatului.
- [ ] aws (1): boto3, URL presemnat S3, testat cu moto.
- [ ] Pachetele necesare sunt în lista de dev a testelor; faptele sunt verificate pe surse primare.
- [ ] Validarea datelor trece; codul încape în 38 de coloane.
