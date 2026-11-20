# 02: `react` fără indicii de formă

**Parent:** `.scratch/grile-fara-tipar/spec.md` (Cum se rescrie)

**What to build:** rescrierea variantelor din `react` (`src/data_fe.js`, explicațiile în `src/expl/p1_react.md`), după regulile din spec, apoi `react` în `CUE_DONE` și id-urile lui scoase din `tools/cue_baseline.json`.

Azi (16 grile, `k` = 6): corecta e cea mai lungă în 15 (✗), cea mai scurtă în 0; regula pe grilă e încălcată de 15: `re-01 re-02 re-03 re-04 re-05 re-06 re-08 re-09 re-10 re-11 re-12 re-13 re-14 re-15 re-16`. Absolute: 6/48 în greșite, 1/16 în corecte (✓). Tiparul dominant: corecta poartă justificarea după „`N`: …”. Atenție la tiparul invers: nu scurta toate corectele până devin cele mai scurte.

**Blocked by:** 01

**Status:** done

- [ ] `react` e în `CUE_DONE`, nicio grilă `re-*` în listă; `node validate.mjs` → OK.
- [ ] `node tools/xcheck.mjs react` citit integral: fiecare variantă greșită schimbată are explicație nouă, care spune de ce e greșită.
- [ ] Faptele noi din variantele greșite sunt verificate (`research/interview-facts.md` sau surse primare, notate acolo).
- [ ] `node build.mjs`, `node --check dist/bundle-check.js`, suita din `CLAUDE.md` trece.
- [ ] Screenshot la 360 px, light și dark, pe două grile rescrise.
