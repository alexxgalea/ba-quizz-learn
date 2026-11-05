# 01: Glosarul de frontend

**What to build:** Când Alex citește fișa `frontend`, desfășurările ei sau o grilă de frontend, termenii grei (closure, hoisting, `this`, microtask, re-render, reconciliere, batching, cleanup, controlled input, generic, narrowing…) sunt subliniați și deschid o definiție simplă. Studiu › Glosar are ~35 de termeni noi. Publicat la același link, cu un mesaj scurt către Alex.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: `.scratch/frontend-extins/spec.md` (Glosarul). Vocabular: `CONTEXT.md` (Termen).

- [ ] ~35 de termeni noi în `src/expl/glosar.md`, în formatul existent (`Forme:` cu formele articulate, Definiție, Scop). Lista e cea din spec, fără termenii care există deja.
- [ ] Fiecare definiție are o propoziție simplă, fără alți termeni nedefiniți. Faptele sunt verificate pe MDN / react.dev / documentația TypeScript.
- [ ] Formele nu leagă greșit cuvinte românești obișnuite (de pildă „state”, „commit”, „props” în fraze fără sens tehnic). Verificat prin căutare în toate textele, iar formele care se ciocnesc sunt scoase.
- [ ] Fișa `frontend` și desfășurările ei au acum termenii legați (screenshot la 360 px, light și dark).
- [ ] `node validate.mjs` → „OK”, `node build.mjs`, `node --check dist/bundle-check.js`, `tools/test_terms.py` și restul verificărilor din `CLAUDE.md` trec. Publicat la același link (artifact și PWA). Mesaj scurt către Alex.
