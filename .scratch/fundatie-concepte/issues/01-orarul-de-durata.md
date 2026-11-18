# 01: Orarul de durată (cutiile 1–8)

**Parent:** `.scratch/fundatie-concepte/spec.md` (Orar)

**What to build:** cutiile Leitner urcă până la 8, cu intervalele 20 min, 4 h, 1, 3, 7, 16, 35 și 75 de zile; cutia de sus revine. Plafonul cutiei e o singură constantă (`Journal.BOX_MAX`), iar intervalele stau într-un tabel (`BOX_IV`). În modul interviu, cu mai puțin de 14 zile rămase, intervalele în zile se plafonează la jumătate din zilele rămase.

**Blocked by:** —

**Status:** done

- [x] Niciun `5` scris de mână pentru cutia de sus în `src/journal.js` și `src/app.js` (`leitner`, `stepQ`, `stepX`, `dueAt`, `MB`, `needW`).
- [x] Un item din cutia 5 devine scadent la `t` + 7 zile (migrarea); cutia 8 revine la 75 de zile.
- [x] Fereastra de 14 zile: test cu data la 6 zile (intervalele în zile ≤ 3).
- [x] `test_plan.py` și `journal.test.mjs` acoperă orarul nou; README (repetiția spațiată) și textele din aplicație spun orarul nou.

## Comments

### 2026-11-18

Livrat: `Journal.BOX_MAX = 8` (regulile, `src/journal.js`), `BOX_IV`, `dueAt` și `ivWindowDays` în `src/app.js`; `MB` rămâne 1 de la cutia 5 în sus. Teste: `journal.test.mjs` (cutia 8 pe toate formele; un item importat din cutia 5 urcă în 6), `test_plan.py` (scadența pe cutiile 1–8, cutia 5 veche → +7 zile, fereastra de 6 zile → ≤ 3), `test_skel.py` (cutia de sus 8). README și textele din Grile / Oral / Azi spun orarul nou. Suita completă din `CLAUDE.md` trece (`npm run test:unit` 647, cele 24 de teste de interfață, `desf_examples`).
