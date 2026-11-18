# 01: Orarul de durată (cutiile 1–8)

**Parent:** `.scratch/fundatie-concepte/spec.md` (Orar)

**What to build:** cutiile Leitner urcă până la 8, cu intervalele 20 min, 4 h, 1, 3, 7, 16, 35 și 75 de zile; cutia de sus revine. Plafonul cutiei e o singură constantă (`Journal.BOX_MAX`), iar intervalele stau într-un tabel (`BOX_IV`). În modul interviu, cu mai puțin de 14 zile rămase, intervalele în zile se plafonează la jumătate din zilele rămase.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Niciun `5` scris de mână pentru cutia de sus în `src/journal.js` și `src/app.js` (`leitner`, `stepQ`, `stepX`, `dueAt`, `MB`, `needW`).
- [ ] Un item din cutia 5 devine scadent la `t` + 7 zile (migrarea); cutia 8 revine la 75 de zile.
- [ ] Fereastra de 14 zile: test cu data la 6 zile (intervalele în zile ≤ 3).
- [ ] `test_plan.py` și `journal.test.mjs` acoperă orarul nou; README (repetiția spațiată) și textele din aplicație spun orarul nou.
