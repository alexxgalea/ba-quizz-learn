# 08: Tabla pentru `gil`

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** câmpul `Tablă` la fiecare punct din `src/desf/gil.md`, după modelul din `src/desf/asyncio.md` (formatul în README › Desfășurări): 1–2 cuvinte cheie pe secvență (`problema`, `ideea`, `analogie` dacă are, `cpp` dacă are, `punct`), cel mult 4 cuvinte fiecare, cel mult 6 pe punct, și schema la `ideea` unde conceptul are mecanism: cel mult 8 rânduri de cel mult 36 de caractere, construită pe săgeți (`↓ cauză`, apoi starea), cu 2–5 trepte. Cuvintele cheie vin din textul desfășurării, nu fapte noi. Un punct fără mecanism (o definiție, o listă) poate avea doar cuvinte cheie. Punctele nu se reordonează și nu se schimbă; o eroare de fapt găsită pe drum se corectează și se anunță în mesajul de publicare.

**Blocked by:** none (regula săgeților intră în `validate.mjs` cu tichetul 01; până atunci se respectă de mână)

**Status:** done

- [x] Toate punctele din `src/desf/gil.md` au `Tablă` (7 cu schemă, 21 de trepte; punctul 8, o definiție, are doar cuvinte cheie).
- [x] `node validate.mjs` → OK; `node tools/fencew.mjs 36`; `node tools/desf_examples.mjs` (148 de exemple, 0 picate).
- [x] `node build.mjs`, `node --check dist/bundle-check.js`, `npm run test:unit` (634 trecute), `tools/test_desf.py`, `tools/test_lesson.py`.
- [x] Captură a lecției pe punctul 7 (schemă cu trepte), la 360 px, light și dark: tabla încape, fără scroll.

Notă: `tools/test_lesson.py` presupunea că ultima secvență a unui punct de la `gil` arată textul punctului. Cu `Tablă` arată cuvintele cheie `punct`, deci `point_on_screen` verifică `continut.cuvinte` când punctul are tablă și textul când nu.
