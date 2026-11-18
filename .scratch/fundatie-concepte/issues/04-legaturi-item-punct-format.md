# 04: Legăturile item–punct: formatul, utilitarul și validarea, pe asyncio

**Parent:** `.scratch/fundatie-concepte/spec.md` (Legături item–punct)

**What to build:** câmpurile `pt` (grile, schelete, kata-uri) și `kp` (carduri orale), `tools/tagpoints.mjs <modul>` (propuneri cu `relRank`), regulile din `validate.mjs` și raportul de acoperire. Primul modul etichetat cap-coadă: `asyncio`. Evenimentele `answer` poartă `points`.

**Blocked by:** —

**Status:** done

- [x] `asyncio`: toate grilele, cardurile și scheletele au `pt` / `kp`, confirmate citind fiecare item.
- [x] `validate.mjs`: eroare la index inexistent; avertisment la item fără câmp; raport pe modul (puncte fără grilă, puncte fără formă de producție).
- [x] `updQ` / `updO` / `updX` / `updS` scriu `points` în eveniment.
- [x] README: numărul corect de grile și de întrebări deschise; formatul nou documentat.

## Comments

### 2026-11-18

Livrat: `pt` / `kp` pe cele 9 grile, 5 carduri orale și 6 schelete `asyncio`, scrise citind fiecare item (propunerile din `tools/tagpoints.mjs` greșeau la 7 itemi, de exemplu `s-asyncio-sem` → `gather` în loc de semafor). `checkPoints`, `pointRank`, `proposeTags` și `PT_DONE` în `lib.mjs`, chemate de `validate.mjs`; `ptsOf` în `add` (`src/app.js`) pune `points` pe fiecare eveniment `answer`. Teste: `tools/unit/points.test.mjs` (7) și `tools/test_journal.py` (punctele din evenimente). README: „Legăturile cu punctele” și numerele corecte (329 de grile, 310 întrebări deschise, 106 carduri orale, 16 kata-uri, 85 de termeni, 30 de module). Suita completă trece (`npm run test:unit` 654, testele de interfață, `desf_examples`).

Raportul `asyncio` (candidați pentru Val 5 și pentru fișă):
- fără grilă: punctele 7 (limitarea concurenței), 10 (asyncio, thread-uri sau procese), 11 (FastAPI `async def` / `def`);
- fără formă de producție: punctul 11;
- `s-asyncio-agen` (generatori și context manager async) nu se leagă de niciun punct: fișa `asyncio` nu are punct despre `async with` / `async for` (`pt: []`, scris explicit).
- Kata-urile rămân pentru 05 (ating mai multe module).
