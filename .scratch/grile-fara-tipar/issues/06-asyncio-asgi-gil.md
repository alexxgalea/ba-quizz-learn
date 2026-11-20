# 06: `asyncio`, `asgi` și `gil` fără indicii de formă

**Parent:** `.scratch/grile-fara-tipar/spec.md` (Cum se rescrie)

**What to build:** rescrierea variantelor din cele trei module, apoi toate trei în `CUE_DONE` și id-urile lor scoase din listă.

Azi:
- `asyncio` (9, `k` = 4): cea mai lungă în 6 (✗); regula pe grilă: `aio-02 aio-03 aio-05 aio-08`; absolute 5/27 față de 1/9 (✓).
- `asgi` (20, `k` = 7): cea mai lungă în 6; regula pe grilă: `asgi-12 asgi-13 asgi-14 asgi-16 asgi-19`; absolute 8/60 față de 1/20 (✓).
- `gil` (19, `k` = 7): cea mai lungă în 6; regula pe grilă: `gil-16 gil-18 gil-19`; absolute 16/57 față de 1/19 (✗): aici munca e mai ales pe cuvintele absolute.

**Blocked by:** 01

**Status:** done

- [x] `asyncio`, `asgi`, `gil` sunt în `CUE_DONE`, fără id-uri în listă; `node validate.mjs` → OK.
- [x] `node tools/xcheck.mjs asyncio asgi gil` citit integral; explicațiile variantelor greșite schimbate sunt noi.
- [x] Faptele noi verificate pe `research/interview-facts.md` (asyncio, threading, GIL, free-threading sunt deja acolo) sau pe surse primare.
- [x] Build, `node --check`, suita din `CLAUDE.md`.
- [x] Screenshot la 360 px, light și dark, pe câte o grilă rescrisă din fiecare modul.
