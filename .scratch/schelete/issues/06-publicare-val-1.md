# 06: Publicarea valului 1

**What to build:** Alex primește, la același link, aplicația cu scheletele (ecran, verificare AI, repetare, plan, Progres) și primele 24 de schelete: gil, asyncio, python, oop.

**Blocked by:** 02 (Verificarea AI a unui schelet), 03 (Repetarea în viața de zi cu zi: scadente, plan, Progres, brief), 04 (Conținut: gil și asyncio (12 schelete)), 05 (Conținut: python și oop (12 schelete))

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] Validarea datelor, build-ul și verificarea sintactică a bundle-ului trec (validarea se termină cu „OK”).
- [x] Toate testele de interfață din `tools/`, testele de unitate și testele tuturor referințelor de schelet trec.
- [x] `xcheck` și `fencew` nu raportează rânduri peste limită în cod.
- [x] Screenshot la 360 px, în light și dark, pe lista de schelete și pe câte un schelet din fiecare modul nou din valul 1; nimic tăiat, fără scroll orizontal.
- [x] Singura eroare de consolă e blocarea fonturilor Google în sandbox.
- [x] Artifactul e publicat la același link, fără `icon` și fără `capabilities` (păstrează `db`, `user`, `sample`); PWA-ul e actualizat.
- [x] Progresul existent al lui Alex se încarcă neschimbat după publicare.
- [x] Alex primește un mesaj scurt, în română, cu ce s-a adăugat.
- [x] Commit-urile și push-ul sunt pe ramura de lucru, fără trailer `Co-Authored-By`.

## Comments

**2 nov. 2026 — publicat.** Valul 1 (aplicația + 24: gil, asyncio, python, oop), împreună cu celelalte valuri, într-o singură publicare la `https://claude.ai/artifact/PNwBxGppDYNrt1CYGpM7HT` (versiunea 28; fără `icon`, fără `capabilities`, deci `sample`, `db` și `user` au rămas). Cele patru valuri s-au publicat deodată, fiindcă tichetele de conținut (04, 05, 08, 09, 10, 12, 13, 15, 16) erau toate închise. Înainte: `validate`, `build`, `node --check`, 48 de teste Node, 59 `tsc` + vitest, 288 de unitate și toate cele 16 scripturi de interfață. Versiunea live era o stare mai veche a repo-ului, fără schelete, deci nu s-a pierdut nimic publicat.
