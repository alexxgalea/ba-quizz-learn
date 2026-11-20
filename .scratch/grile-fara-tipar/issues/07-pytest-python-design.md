# 07: `pytest`, `python` și `design` fără indicii de formă

**Parent:** `.scratch/grile-fara-tipar/spec.md` (Cum se rescrie)

**What to build:** rescrierea variantelor din cele trei module, apoi toate trei în `CUE_DONE` și id-urile lor scoase din listă. Cu tichetul ăsta, toate modulele P1 sunt refăcute.

Azi:
- `pytest` (17, `k` = 6): cea mai lungă în 7 (✗); regula pe grilă: `pt-11 pt-12 pt-14 pt-15 pt-17`; absolute 7/51 față de 0/17 (✗).
- `python` (18, `k` = 7): cea mai lungă în 5, cea mai scurtă în 3; nicio încălcare pe grilă; absolute 3/54 față de 1/18 (✓). Probabil doar se verifică și intră în `CUE_DONE`.
- `design` (8, `k` = 3): cea mai lungă în 3 (✓, la limită); nicio încălcare pe grilă; absolute 7/24 față de 0/8 (✗).

**Blocked by:** 01

**Status:** done

- [x] `pytest`, `python`, `design` sunt în `CUE_DONE`, fără id-uri în listă; `node validate.mjs` → OK.
- [ ] `node tools/xcheck.mjs pytest python design` citit integral; explicațiile variantelor greșite schimbate sunt noi.
- [x] Faptele noi verificate (pytest: documentația oficială, notată în `research/interview-facts.md`).
- [x] Build, `node --check`, suita din `CLAUDE.md`.
- [ ] Screenshot la 360 px, light și dark, pe câte o grilă rescrisă din `pytest` și `design`.
