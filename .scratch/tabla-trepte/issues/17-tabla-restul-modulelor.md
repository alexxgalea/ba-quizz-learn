# 17: Tabla pe modulele P2 și P3

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** semn de carte, nu tichet de lucru. După modulele P1 (tichetele 06–16) și proba din tichetul 05, câte un tichet pe modul, ca 06–16: P2 `sqlalchemy`, `postgres`, `celery`, `index`, `runtime`, `security`; P3 `rabbitmq`, `redis`, `docker`, `domain`, `perf`, `ops`, `linux`, `graphql`. Fără `behav` și fără Bonus (`dbmodels`, `aws`, `django`, care n-au desfășurări).

**Blocked by:** 05, 06–16

**Status:** gata (P2 și P3 făcute)


## Comments

**17 nov. 2026:** Tablă pe modulele P2 `sqlalchemy` (12 puncte), `postgres` (11), `index` (11), `celery` (12), `runtime` (8) și `security` (11). Cuvinte cheie din textul desfășurărilor, scheme cu 2–4 trepte, `cpp` doar unde există `În C++`, `analogie` la `postgres` 6 și `index` 2. Textul punctelor n-a fost atins. `validate`, `desf_examples` (148, 0 picate), `build`, `test:unit` (643) și `test_desf.py`, `test_lesson.py` trec. Rămân P3: `rabbitmq`, `redis`, `docker`, `domain`, `perf`, `ops`, `linux`, `graphql`.

**17 nov. 2026 (P3):** Tablă pe modulele P3 `rabbitmq` (9 puncte), `redis` (10), `docker` (9), `domain` (11), `perf` (8), `ops` (7), `linux` (8) și `graphql` (7). Cuvinte cheie din textul desfășurărilor, scheme cu 2–4 trepte, `cpp` doar la `redis` 1, `perf` 1, 2, 7 și `linux` 1, 5 (unde există `În C++`), `analogie` la `redis` 10 și `domain` 1, 5. Textul punctelor n-a fost atins. `tools/test_lesson.py` (`unfoldings`) folosea `graphql` drept modul cu desfășurări și fără tablă; controlul s-a mutat pe `behav`, care n-are tablă. `validate`, `desf_examples` (148, 0 picate), `build`, `test:unit` (643), `test_desf.py` și `test_lesson.py` trec. Toate modulele P1–P3 au tablă.
