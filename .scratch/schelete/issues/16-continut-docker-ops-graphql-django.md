# 16: Conținut: Docker, compose, logging, CI, GraphQL și Django (6 schelete)

**What to build:** Alex are scheletele de config și ultimele teme din CV. Cele de config (Dockerfile, compose, CI) nu rulează în sandbox, deci sunt verificate structural și marcate vizibil așa.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] docker (2): Dockerfile multi-stage, non-root · compose cu `healthcheck` + `depends_on`; verificate structural (etape numite, `USER` non-root, YAML valid, healthcheck prezent).
- [ ] ops (2): logging structurat (JSON + `extra`), rulat și testat · `.gitlab-ci.yml` minim cu test + build, verificat structural.
- [ ] graphql (1): schema Strawberry + resolver + DataLoader (testul arată un singur apel în lot).
- [ ] django (1): `select_related` / `prefetch_related` lângă echivalentul SQLAlchemy (testul numără query-urile).
- [ ] Marcajul „verificat structural” apare în listă și pe ecranul scheletului.
- [ ] Referințele de config au limbajul lor la colorare și în prompt.
- [ ] Pachetele necesare sunt în lista de dev a testelor; faptele sunt verificate pe surse primare.
- [ ] Validarea datelor trece; codul încape în 38 de coloane.
