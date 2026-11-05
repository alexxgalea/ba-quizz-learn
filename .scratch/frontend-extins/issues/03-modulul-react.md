# 03: Modulul `react` (bazele)

**What to build:** Alex găsește modulul `react` („React: bazele”, P1) între `ts` și `frontend`: fișa cu 8 puncte, harta, desfășurări în formatul de frontend (exemple TSX, ✗ / ✓, „Pas cu pas” unde e o secvență), ~8 grile și ~3 carduri orale. Modulul intră în slotul de frontend al interviului simulat. Publicat la același link, cu mesaj.

**Blocked by:** 02

**Status:** done

Spec: `.scratch/frontend-extins/spec.md`. Vocabular: `CONTEXT.md`.

- [x] `react` în `P.modules`, în locul din spec. Cele 8 puncte din spec, lead și formulări de evitat.
- [x] Harta și 8 desfășurări. „Pas cu pas” cel puțin la 2 (ce declanșează un re-render), 3 (imutabilitatea) și 8 (reconcilierea). Legăturile trimit la punctele din `frontend` care se sprijină pe ele (de pildă 8 → FE-08, `key`).
- [x] Exemplele TSX verificate într-un test vitest temporar (react 19, jsdom). Rezultatul e notat în comentariul de închidere.
- [x] ~8 grile (`RE-01`…) cu explicații și ~3 carduri orale. `xcheck` și `fencew` sunt curate.
- [x] Faptele sunt verificate pe react.dev și trecute în `research/interview-facts.md`.
- [x] Secțiunea `react` din `tools/test_desf.py`. Toate verificările din `CLAUDE.md` trec. Screenshot la 360 px, light și dark. Publicat la același link și mesaj.

## Comments

**5 nov. 2026 — implementat** (modulul `react`, între `js` și `frontend`).

- **Conținut** (`src/data_fe.js`, `src/desf/react.md`, `src/expl/p1_react.md`): 8 puncte, hartă, 8 desfășurări în formatul de frontend (exemple TSX cu ✗ / ✓; `Pas cu pas` la 2, 3, 4, 6 și 8; fără C++, nu există echivalent real), 8 grile `re-01`…`re-08` (3 de nivel 1, 3 de nivel 2, 2 de nivel 3), 3 carduri orale. Legăturile trimit la `fe-02`, `fe-03`, `fe-04`, `fe-06`, `fe-07` și la `js-01` / `js-06`.
- **Exemplele TSX** (verificate într-un test vitest temporar, react 19.3.1, jsdom; `tsc --strict` curat; testul a fost șters): StrictMode cu `total += n` arată `2`; variabila locală nu re-randează; părintele re-randează copiii, `ref` nu; `push` + același array nu re-randează; `value` fără `onChange` îngheață câmpul, cu mesajele exacte din consolă; reducer care întoarce aceeași referință lasă ecranul neschimbat; `useMemo` pe `value` oprește re-randarea consumatorilor; două `useCounter()` au state separat; același tip pe aceeași poziție păstrează state-ul, `key` îl resetează, o componentă definită în interior îl pierde.
- **Fapte** pe react.dev, în `research/interview-facts.md`, secțiunea 44. Nuanță găsită la rulare: la un reducer care întoarce aceeași referință React poate apela totuși componenta o dată în plus și aruncă rezultatul (react.dev: „may still need to call your component”), deci grila `re-06` spune doar „ecranul rămâne neschimbat”. react.dev nu folosește „one-way data flow” și nici „batching” pe pagina snapshot.
- **Teste**: secțiunea `react` din `tools/test_desf.py`; testul `js` așteaptă acum două locuri între `js` și `frontend` (`react` stă între ele). Slotul de frontend din interviul simulat alege deja din `react` (testul `pickTechMock` verifică toate modulele cu carduri orale).
- **Scorul de pregătire** scade cât timp `react` e neatins (P1, aceeași pondere).
