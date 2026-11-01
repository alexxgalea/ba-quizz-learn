# 16: Conținut: Docker, compose, logging, CI, GraphQL și Django (6 schelete)

**What to build:** Alex are scheletele de config și ultimele teme din CV. Cele de config (Dockerfile, compose, CI) nu rulează în sandbox, deci sunt verificate structural și marcate vizibil așa.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] docker (2): Dockerfile multi-stage, non-root · compose cu `healthcheck` + `depends_on`; verificate structural (etape numite, `USER` non-root, YAML valid, healthcheck prezent).
- [x] ops (2): logging structurat (JSON + `extra`), rulat și testat · `.gitlab-ci.yml` minim cu test + build, verificat structural.
- [x] graphql (1): schema Strawberry + resolver + DataLoader (testul arată un singur apel în lot).
- [x] django (1): `select_related` / `prefetch_related` lângă echivalentul SQLAlchemy (testul numără query-urile).
- [x] Marcajul „verificat structural” apare în listă și pe ecranul scheletului.
- [x] Referințele de config au limbajul lor la colorare și în prompt.
- [x] Pachetele necesare sunt în lista de dev a testelor; faptele sunt verificate pe surse primare.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**1 nov. 2026 — implementat.** Șase intrări noi la sfârșitul `src/data_skel.js` (`s-docker-multistage`, `s-docker-compose`, `s-ops-json-log`, `s-ops-gitlab-ci`, `s-graphql-dataloader`, `s-django-orm`); intrările existente nu s-au schimbat. Referințele sunt în `katas/skel_*`, fiecare cu testele ei.

- **Rulate și testate** (mutațiile pe fiecare punct esențial sunt prinse): logging (`test_skel_ops_logging.py`, 14 teste), GraphQL (`test_skel_graphql.py`: un singur apel în lot `[[2, 1]]`, ordinea cheilor, cheie lipsă, loader per cerere), Django + SQLAlchemy (`test_skel_django.py`: numără query-urile reale, 1 / 2 / N+1, cache-ul prefetch).
- **Verificate structural** (`st: true`; `docker`, compose, CI): `test_skel_docker.py` (etape numite, `COPY --from` spre etapă anterioară, `USER` non-root creat și pus înaintea `CMD`, `CMD` în forma exec, ordinea cache-ului, tag-uri fixate; compose: YAML valid, `healthcheck` complet, `depends_on` cu `service_healthy`, host după numele serviciului, volum declarat, porturi între ghilimele, plus `docker compose config -q`) și `test_skel_ops_ci.py` (stages, script ca listă, cache în proiect, `rules` pe ramura implicită, dind cu TLS, variabile predefinite). Fiecare verificator are teste pe variante stricate care trebuie respinse.
- `lib.mjs` (`loadCode`) citește acum și `*.yml`, `*.yaml`, `*.Dockerfile`. `app.js` nu s-a modificat: marcajul „verificat structural” în listă și pe ecran, limba în prompt și referința necolorată ca Python existau deja (verificat în Playwright la 360 px, light și dark, 95 de verificări, fără erori de consolă).
- Pachete: `katas/requirements-skel-ops.txt` (PyYAML, Django 6.1.2, SQLAlchemy 2.1, strawberry-graphql 0.339.1), descris în README; testele se sar când lipsesc, ca `k13`. Fapte verificate pe surse primare în `research/interview-facts.md` § 9.
- `node validate.mjs` OK (schelete: 7), `node build.mjs`, `node --check`, `tools/test_skel.py`, `tools/test_skel_ai.py`, `pytest katas` (123 trecute).
- **Nerulat:** Dockerfile-ul (`docker build`, fără daemon) și pipeline-ul GitLab; doar structură. Compose e validat de CLI, nu pornit.
