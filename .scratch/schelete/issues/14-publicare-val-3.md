# 14: Publicarea valului 3

**What to build:** Alex primește, la același link, cele 13 schelete P2: SQLAlchemy, Postgres, indexuri, Celery, securitate, runtime.

**Blocked by:** 11 (Publicarea valului 2), 12 (Conținut: SQLAlchemy, Postgres și indexuri (7 schelete), cu Postgres pornit de teste), 13 (Conținut: Celery, securitate și runtime (6 schelete))

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] Validarea datelor, build-ul și verificarea sintactică a bundle-ului trec (validarea se termină cu „OK”).
- [ ] Toate testele de interfață din `tools/`, testele de unitate și testele tuturor referințelor de schelet trec.
- [ ] `xcheck` și `fencew` nu raportează rânduri peste limită în cod.
- [ ] Screenshot la 360 px, în light și dark, pe lista de schelete și pe câte un schelet din fiecare modul nou din valul 3; nimic tăiat, fără scroll orizontal.
- [ ] Singura eroare de consolă e blocarea fonturilor Google în sandbox.
- [ ] Artifactul e publicat la același link, fără `icon` și fără `capabilities` (păstrează `db`, `user`, `sample`); PWA-ul e actualizat.
- [ ] Progresul existent al lui Alex se încarcă neschimbat după publicare.
- [ ] Alex primește un mesaj scurt, în română, cu ce s-a adăugat.
- [ ] Commit-urile și push-ul sunt pe ramura de lucru, fără trailer `Co-Authored-By`.
