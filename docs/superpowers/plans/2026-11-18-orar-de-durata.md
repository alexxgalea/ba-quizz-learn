# Orarul de durată (Val 0.3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cutiile Leitner 1–8 cu intervale de durată, plafonul zilnic de repetat și modul de plan „întreținere” (tichetele 01–03 din `.scratch/fundatie-concepte/`).

**Architecture:** regulile cutiilor stau în `Journal.apply` (`src/journal.js`, pur); scadența, plafonul și planul în `src/app.js` (`dueAt`, `dueQ/O/X`, `genPlan`, `cfg`). Setările noi trec prin evenimentul `cfg` existent.

**Tech Stack:** JavaScript fără dependențe (IIFE), `node --test` pentru unitate, Playwright (Python) pentru interfață.

**Spec:** `.scratch/fundatie-concepte/spec.md`

## Global Constraints

- Intervalele: 20 min, 4 h, 1, 3, 7, 16, 35, 75 de zile; cutia 8 revine. Zilele sunt calendaristice (miezul nopții local din ziua `t` + N).
- Plafonul implicit 25 min; minute pe zi implicit 45; estimări: grilă 0,7, deschisă 1,5, oral 3 min.
- Fereastra de interviu: `daysLeft() < 14` → interval în zile ≤ `max(1, floor(zile rămase / 2))`.
- Textul din aplicație în română; fără chei noi la rădăcina lui `S`.
- După modificări: `node validate.mjs`, `node build.mjs`, `node --check dist/bundle-check.js`, `npm run test:unit`, toată lista de teste din `CLAUDE.md`, screenshot la 360 px light/dark.

## Review Focus

- Teste înghețate la 5 zile înaintea datei implicite (fereastra de interviu activă): nu trebuie să se bazeze pe intervalele vechi → rulează toată suita.
- Un item importat (`state`) din cutia 5 → scadent la `t` + 7 zile, nu `Infinity` (test în `test_plan.py`).
- Evenimente `cfg` vechi, fără `m` / `r` → valori implicite (test în `test_plan.py`).
- Data ștearsă (`d: ""`) într-un build fără jurnal: `normalize` nu o aruncă (test în `test_plan.py`).
- Plafon consumat → greșelile de azi apar totuși (test în `test_plan.py`).

---

### Task 1: Cutiile 1–8 (tichetul 01)

**Files:** Modify `src/journal.js` (`leitner`, `stepQ`, `stepX`, export `BOX_MAX`), `src/app.js` (`MB`, `GAP` → `BOX_IV`, `dueAt`, `needW`, textele cu orarul), `README.md`; Test `tools/unit/journal.test.mjs`, `tools/test_plan.py`.

**Interfaces:** Produces `Journal.BOX_MAX = 8`; `dueAt(e)` în `__prep` (aceeași semnătură); `ivWindowDays()` intern.

- [ ] Test unitate: 9 răspunsuri corecte la rând dau cutia 8, nu 9 (grilă, deschisă, oral).
- [ ] Test `test_plan.py` (data la +30 de zile): scadența pe cutiile 1–8 (20 min, 4 h, +1, +3, +7, +16, +35, +75 zile); intrare `{ b: 5 }` → `t` + 7 zile; cu data la +6 zile, cutia 5 → +3 zile.
- [ ] Implementare, apoi suita.
- [ ] Commit.

### Task 2: Plafonul (tichetul 02)

**Files:** Modify `src/journal.js` (`rd` în `stepQ`, `stepX`, `leitner`), `src/app.js` (`dueAll`, `dueToday`, `dueQ/O/X`, cardul „De repetat acum”, `mkTask("due")`); Test `tools/unit/journal.test.mjs`, `tools/test_plan.py`.

**Interfaces:** Produces `dueToday()` → `{ q: [], o: [], x: [], left: n, used: min, cap: min }` în `__prep`; `dueQ/O/X` = listele lui.

- [ ] Test unitate: răspuns peste intrare din altă zi → `rd` = miezul nopții de azi; peste intrare de azi → `rd` neschimbat.
- [ ] Test `test_plan.py`: 200 de grile restante → porția ≤ 25 min, prima e P1 și cea mai întârziată; o grilă greșită acum 30 min apare și cu plafonul consumat; `left` > 0.
- [ ] Implementare, apoi suita.
- [ ] Commit.

### Task 3: Întreținere (tichetul 03)

**Files:** Modify `src/journal.js` (`cfg` cu `m`, `r`), `src/app.js` (`cfg`, `normalize`, `planMode`, `genPlan`, `paintHeader`, `vPlan`, `vCfg`, `cfg-save`, `cfg-clear`), `CONTEXT.md`, `README.md`; Test `tools/test_plan.py`, `tools/test_journal.py`.

**Interfaces:** Produces `planMode()` → `"interview" | "maint"`; `cfg()` → `{ d, h, m, r }`.

- [ ] Test `test_plan.py`: data trecută → o zi, cu `due` (dacă e ceva), `sheet-*` sau `smart`, `sch` sau `kata-*`; `d: ""` la fel; data viitoare → zile până la interviu; Progres salvează `m` și `r`.
- [ ] Implementare, apoi suita și screenshot-urile.
- [ ] Commit, build PWA (`npm run pages`), PR în `main`.
