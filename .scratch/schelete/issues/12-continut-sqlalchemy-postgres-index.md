# 12: Conținut: SQLAlchemy, Postgres și indexuri (7 schelete), cu Postgres pornit de teste

**What to build:** Alex are scheletele de bază de date: SQLAlchemy 2.0 și SQL de Postgres. Referințele rulează pe un Postgres 16 real, pornit și oprit de teste.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] Un fixture de test pornește un Postgres 16 temporar, îl oprește la final și sare testele cu un mesaj clar dacă binarele lipsesc.
- [x] Pachetele necesare (SQLAlchemy, Alembic, driverul Postgres) sunt instalabile dintr-o listă de dev a testelor.
- [x] sqlalchemy (3): model 2.0 (`Mapped`, `mapped_column`) + sesiune + `select` · `selectinload` contra N+1 (testul numără query-urile) · tranzacție (`session.begin()`) + migrare Alembic.
- [x] postgres (3): upsert `ON CONFLICT` · window function (`ROW_NUMBER` / `LAG`) · `SELECT … FOR UPDATE SKIP LOCKED` ca coadă de joburi (testul arată că doi consumatori nu iau același job).
- [x] index (1): `CREATE INDEX CONCURRENTLY` compus / parțial + `EXPLAIN ANALYZE` (testul verifică folosirea indexului în plan).
- [x] Referințele SQL au limbajul lor la colorare și în prompt.
- [x] Faptele (versiunea SQLAlchemy, comportamente Postgres) sunt verificate pe surse primare și trecute în notele de fapte verificate.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**1 nov. 2026 — implementat** (a5f3d06). 7 schelete: `s-sqlalchemy-model`, `-selectin`, `-tx`, `s-postgres-upsert`, `-window`, `-queue`, `s-index-concurrent`. Referințele sunt în `katas/skel_sqlalchemy_*.py`, `skel_pg.sql` și `skel_idx.sql`, testate în `katas/test_skel_{sqlalchemy,pg,idx}.py` (31 de teste) pe un Postgres 16.15 pornit de `katas/pg_fixture.py` (cluster temporar pe socket unix, oprit și șters la final; ca root rulează prin `runuser` ca `postgres`; fără binare sau fără psycopg, testele sunt sărite cu mesaj). Dependențele de dev: `katas/requirements-sql.txt`. Faptele sunt în `research/interview-facts.md`, secțiunea 9.

Testele prind bug-urile apărate de punctele esențiale (verificat cu mutanți): fără `SKIP LOCKED` pică testul cu doi consumatori, fără `with_for_update` pică cel de transferuri paralele, fără ordinea fixă a blocărilor pică cel de deadlock, fără predicatul parțial sau cu coloanele inversate pică cele de index. Controalele negative (lazy loading dă 1 + N, fără index planul e Seq Scan, `CREATE INDEX` obișnuit blochează scrierile) arată că verificările nu sunt tautologii.

Note și abateri: (1) Limbajul `sql` este în date și în prompt (`Limbaj: sql`), iar referința se afișează fără colorare Python; aplicația nu are colorare SQL și `src/app.js` nu a fost atins. (2) Planul `Index Scan` fără `Sort` depinde de date (80 de rânduri „open” pe client); cu puține rânduri planatorul alege bitmap + sort. (3) Ordinea coloanelor indexului se verifică din `pg_get_indexdef`, fiindcă planul nu o arată. (4) Migrarea Alembic stă în același fișier cu tranzacția, ca să încapă într-un singur schelet; testul o copiază ca revizia 0002 într-un mediu Alembic real. (5) Testele SQLAlchemy trec și pe 2.0.55 și pe 2.1.6. (6) Nu am putut verifica pe un alt Postgres decât 16.15.
