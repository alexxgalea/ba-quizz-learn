# 12: Conținut: SQLAlchemy, Postgres și indexuri (7 schelete), cu Postgres pornit de teste

**What to build:** Alex are scheletele de bază de date: SQLAlchemy 2.0 și SQL de Postgres. Referințele rulează pe un Postgres 16 real, pornit și oprit de teste.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] Un fixture de test pornește un Postgres 16 temporar, îl oprește la final și sare testele cu un mesaj clar dacă binarele lipsesc.
- [ ] Pachetele necesare (SQLAlchemy, Alembic, driverul Postgres) sunt instalabile dintr-o listă de dev a testelor.
- [ ] sqlalchemy (3): model 2.0 (`Mapped`, `mapped_column`) + sesiune + `select` · `selectinload` contra N+1 (testul numără query-urile) · tranzacție (`session.begin()`) + migrare Alembic.
- [ ] postgres (3): upsert `ON CONFLICT` · window function (`ROW_NUMBER` / `LAG`) · `SELECT … FOR UPDATE SKIP LOCKED` ca coadă de joburi (testul arată că doi consumatori nu iau același job).
- [ ] index (1): `CREATE INDEX CONCURRENTLY` compus / parțial + `EXPLAIN ANALYZE` (testul verifică folosirea indexului în plan).
- [ ] Referințele SQL au limbajul lor la colorare și în prompt.
- [ ] Faptele (versiunea SQLAlchemy, comportamente Postgres) sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [ ] Validarea datelor trece; codul încape în 38 de coloane.
