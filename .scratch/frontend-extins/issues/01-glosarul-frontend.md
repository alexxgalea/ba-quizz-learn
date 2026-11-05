# 01: Glosarul de frontend

**What to build:** Când Alex citește fișa `frontend`, desfășurările ei sau o grilă de frontend, termenii grei (closure, hoisting, `this`, microtask, re-render, reconciliere, batching, cleanup, controlled input, generic, narrowing…) sunt subliniați și deschid o definiție simplă. Studiu › Glosar are ~35 de termeni noi. Publicat la același link, cu un mesaj scurt către Alex.

**Blocked by:** None (can start immediately)

**Status:** done

Spec: `.scratch/frontend-extins/spec.md` (Glosarul). Vocabular: `CONTEXT.md` (Termen).

- [x] ~35 de termeni noi în `src/expl/glosar.md`, în formatul existent (`Forme:` cu formele articulate, Definiție, Scop). Lista e cea din spec, fără termenii care există deja.
- [x] Fiecare definiție are o propoziție simplă, fără alți termeni nedefiniți. Faptele sunt verificate pe MDN / react.dev / documentația TypeScript.
- [x] Formele nu leagă greșit cuvinte românești obișnuite (de pildă „state”, „commit”, „props” în fraze fără sens tehnic). Verificat prin căutare în toate textele, iar formele care se ciocnesc sunt scoase.
- [x] Fișa `frontend` și desfășurările ei au acum termenii legați (screenshot la 360 px, light și dark).
- [x] `node validate.mjs` → „OK”, `node build.mjs`, `node --check dist/bundle-check.js`, `tools/test_terms.py` și restul verificărilor din `CLAUDE.md` trec. Publicat la același link (artifact și PWA). Mesaj scurt către Alex.

## Comments

**5 nov. 2026:** 39 de termeni noi în `src/expl/glosar.md` (85 în total), plus `event loop` generalizat (asyncio și JavaScript).

- Termenii: closure, stale closure, scope de bloc, hoisting, TDZ, prototip, promisiune, microtask, JSX, props, state, hook, effect, cleanup, mount / unmount, render, re-render, reconcilierea, batching, memoizare, Context (React), reducer, input controlat, DOM-ul, Strict Mode, tipare structurală, tip generic, narrowing, type guard, union discriminat, utility type, type assertion, stack trace, source map, breakpoint, error boundary, CORS, preflight, XSS. Fără `this`, `commit` și `snapshot`: primul apare doar în cod (care nu se leagă), iar celelalte două au alt sens la Postgres și Git.
- Ciocniri evitate: „DOM” singur ar lega ID-urile `DOM-xx` (de aceea doar „DOM-ul” / „arborele DOM”), „reconciliere” și „promisiune” au sens obișnuit la `dbmodels`, `design` și într-o explicație (de aceea doar formele articulate), „scope” e și scope OAuth / pytest (de aceea „scope de bloc”), „generic” e și adjectiv („SIEM generic”). `closure`, `cleanup`, `batching` și `stack trace` apar și la backend, deci au definiții generale. „coadă” nu se mai leagă la `frontend` (`TERM_SKIP`), fiindcă acolo e coada de actualizări React, nu coada de mesaje.
- Faptele noi (batching din React 18, error boundaries, preflight, inputul controlat, exemplele JS rulate) sunt în `research/interview-facts.md`, secțiunea 42.
- Fișa `frontend` cu „Deschide tot”: 20 de termeni legați, fără overflow la 360 px, light și dark, fără erori de consolă. Toate testele din `CLAUDE.md` trec (unit: 338 / 0, exemple Python: 122 / 0).
