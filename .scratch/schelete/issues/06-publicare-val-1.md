# 06: Publicarea valului 1

**What to build:** Alex primește, la același link, aplicația cu scheletele (ecran, verificare AI, repetare, plan, Progres) și primele 24 de schelete: gil, asyncio, python, oop.

**Blocked by:** 02 (Verificarea AI a unui schelet), 03 (Repetarea în viața de zi cu zi: scadente, plan, Progres, brief), 04 (Conținut: gil și asyncio (12 schelete)), 05 (Conținut: python și oop (12 schelete))

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] Validarea datelor, build-ul și verificarea sintactică a bundle-ului trec (validarea se termină cu „OK”).
- [ ] Toate testele de interfață din `tools/`, testele de unitate și testele tuturor referințelor de schelet trec.
- [ ] `xcheck` și `fencew` nu raportează rânduri peste limită în cod.
- [ ] Screenshot la 360 px, în light și dark, pe lista de schelete și pe câte un schelet din fiecare modul nou din valul 1; nimic tăiat, fără scroll orizontal.
- [ ] Singura eroare de consolă e blocarea fonturilor Google în sandbox.
- [ ] Artifactul e publicat la același link, fără `icon` și fără `capabilities` (păstrează `db`, `user`, `sample`); PWA-ul e actualizat.
- [ ] Progresul existent al lui Alex se încarcă neschimbat după publicare.
- [ ] Alex primește un mesaj scurt, în română, cu ce s-a adăugat.
- [ ] Commit-urile și push-ul sunt pe ramura de lucru, fără trailer `Co-Authored-By`.
