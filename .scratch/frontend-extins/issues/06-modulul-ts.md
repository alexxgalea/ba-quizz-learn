# 06: Modulul `ts`

**What to build:** Alex găsește modulul `ts` („TypeScript”, P1) între `js` și `react`: fișa cu 8 puncte, harta, desfășurări în formatul de frontend, ~8 grile și ~3 carduri orale. Exemplele TS au trecut prin `tsc --strict`. Publicat la același link, cu mesaj.

**Blocked by:** 02

**Status:** done

Spec: `.scratch/frontend-extins/spec.md`. Vocabular: `CONTEXT.md`.

- [x] `ts` în `P.modules`, între `js` și `react`. Cele 8 puncte din spec, lead și formulări de evitat.
- [x] Harta și 8 desfășurări. C++ la 1 (tipare nominală) și 4 (template-uri), cu Unde nu ține (tipurile TS dispar la runtime, template-urile se instanțiază). Legăturile trimit la FE-10 și la tipurile generate din OpenAPI-ul FastAPI.
- [x] Fiecare exemplu TS compilează (sau pică exact cu eroarea marcată) sub `tsc --strict`. Faptele (inclusiv versiunea curentă de TypeScript) sunt verificate în documentația TypeScript și trecute în `research/interview-facts.md`.
- [x] ~8 grile (`TS-01`…) cu explicații și ~3 carduri orale. `xcheck` și `fencew` sunt curate.
- [x] Secțiunea `ts` din `tools/test_desf.py`. Toate verificările din `CLAUDE.md` trec. Screenshot la 360 px, light și dark. Publicat la același link și mesaj.

## Comments

**5 nov. 2026:** Modulul `ts` („TypeScript”, P1) e între `js` și `react` (`src/data_fe.js`, `src/desf/ts.md`, `src/expl/p1_ts.md`).

- **Fișa:** cele 8 puncte din spec, cu lead și 3 formulări de evitat. Harta și 8 desfășurări în formatul de frontend; C++ la 1 (nominal față de structural) și 4 (template-uri, instanțiate față de șterse la runtime), amândouă cu `Unde nu ține`; `Pas cu pas` la 3 (narrowing) și 5 (utility types); `Greu: da` la 1, 3, 4 și 6. Legăturile trimit la FE-10, la datele din rețea și la `useQuery<User[]>` din TanStack (FE-04).
- **Grile și carduri:** 9 grile `ts-01…ts-09` (3 de nivel 1, 3 de nivel 2 și 3 de nivel 3) și 3 carduri orale (`type` vs `interface`, `as User` pe răspuns, generics cu comparația C++).
- **Verificări:** fiecare fragment de cod din grile l-am compilat cu `tsc` 7.0.2 `--strict` (rezultatele coincid cu explicațiile: ts-02 și ts-06 TS2353, ts-03 TS2300, ts-05 TS2339, ts-07 TS18046, ts-08 TS2353, ts-04 compilează, dar aruncă la runtime), iar exemplele din desfășurări trec prin `desf_examples` (TS 10, picate 0). Exemplul C++ l-am compilat cu g++ `-std=c++17`. Faptele (inclusiv versiunea curentă a TypeScript, 7.0.2) sunt în `research/interview-facts.md`, secțiunea 47.
- **Greșeală prinsă la verificare:** `satisfies` pe un rând nou nu e sintaxă validă (instrucțiunea se termină înainte, TS1434), deci l-am scris la sfârșitul rândului cu valoarea; fără compilare, grila `ts-07` ar fi arătat cod care nu compilează.
- **Erori de fapt:** niciuna în punctele fișei. Observație: pagina „Everyday Types” nu acoperă excess property checks (verificate prin rulare), iar faptul că `strict` e implicit `true` din TypeScript 6.0 e din surse secundare; cu 7.0.2 e verificat direct.
- `tools/test_desf.py` are secțiunea `ts`, iar verificările de ordine de la `js` și `react` țin cont de modulul nou. TECH_SLOTS includea deja `ts`, deci nu s-a schimbat cod.
