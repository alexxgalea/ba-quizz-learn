# 04: `oop` fără indicii de formă

**Parent:** `.scratch/grile-fara-tipar/spec.md` (Cum se rescrie)

**What to build:** rescrierea variantelor din `oop` (`src/data_mcq6.js`, explicațiile în `src/expl/p1_oop.md`), apoi `oop` în `CUE_DONE` și id-urile lui scoase din listă.

Azi (18 grile, `k` = 7): corecta e cea mai lungă în 14 (✗), cea mai scurtă în 0; regula pe grilă e încălcată de 13: `oop-02 oop-03 oop-04 oop-07 oop-09 oop-10 oop-11 oop-12 oop-14 oop-15 oop-16 oop-17 oop-18`. Absolute: 4/54 în greșite, 1/18 în corecte (✓). Grilele cu ieșiri scurte (`oop-01`: `[1]`, `[]`, `AttributeError`, `None`) nu trebuie lungite artificial.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] `oop` e în `CUE_DONE`, nicio grilă `oop-*` în listă; `node validate.mjs` → OK.
- [x] `node tools/xcheck.mjs oop` citit integral; explicațiile variantelor greșite schimbate sunt noi.
- [x] Faptele noi verificate; un rezultat de cod pus într-o variantă greșită e rulat în Python ca să fie sigur greșit.
- [x] Build, `node --check`, suita din `CLAUDE.md`.
- [x] Screenshot la 360 px, light și dark, pe două grile rescrise.
