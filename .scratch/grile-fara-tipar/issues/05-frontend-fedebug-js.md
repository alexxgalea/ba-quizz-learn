# 05: `frontend`, `fedebug` și `js` fără indicii de formă

**Parent:** `.scratch/grile-fara-tipar/spec.md` (Cum se rescrie)

**What to build:** rescrierea variantelor din cele trei module (`fe-*` în `src/data_mcq6.js` cu explicațiile în `src/expl/p3_frontend.md`; `fd-*` și `js-*` în `src/data_fe.js`, cu `src/expl/p1_fedebug.md` și `src/expl/p1_js.md`), apoi toate trei în `CUE_DONE` și id-urile lor scoase din listă.

Azi:
- `frontend` (14, `k` = 5): cea mai lungă în 8 (✗), cea mai scurtă în 1; regula pe grilă: `fe-07 fe-08 fe-10 fe-12 fe-13`; absolute 7/42 în greșite față de 0/14 în corecte (✗).
- `fedebug` (4, `k` = 2): cea mai lungă în 4 (✗); regula pe grilă: `fd-01 fd-02 fd-03`; absolute 2/12 față de 0/4 (✗).
- `js` (8, `k` = 3): cea mai lungă în 3 (✓, la limită); regula pe grilă: `js-04`; absolute 1/24 față de 0/8 (✓).

**Blocked by:** 01

**Status:** done

- [x] `frontend`, `fedebug`, `js` sunt în `CUE_DONE`, fără id-uri în listă; `node validate.mjs` → OK.
- [x] `node tools/xcheck.mjs frontend fedebug js` citit integral; explicațiile variantelor greșite schimbate sunt noi.
- [x] Faptele noi verificate (comportamentul JS rulat în Node unde se poate).
- [x] Build, `node --check`, suita din `CLAUDE.md`.
- [x] Screenshot la 360 px, light și dark, pe câte o grilă rescrisă din fiecare modul.
