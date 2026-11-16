# 07: Tabla pentru `oop`

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** câmpul `Tablă` la fiecare punct din `src/desf/oop.md`, după modelul din `src/desf/asyncio.md` (formatul în README › Desfășurări): 1–2 cuvinte cheie pe secvență (`problema`, `ideea`, `analogie` dacă are, `cpp` dacă are, `punct`), cel mult 4 cuvinte fiecare, cel mult 6 pe punct, și schema la `ideea` unde conceptul are mecanism: cel mult 8 rânduri de cel mult 36 de caractere, construită pe săgeți (`↓ cauză`, apoi starea), cu 2–5 trepte. Cuvintele cheie vin din textul desfășurării, nu fapte noi. Un punct fără mecanism (o definiție, o listă) poate avea doar cuvinte cheie. Punctele nu se reordonează și nu se schimbă; o eroare de fapt găsită pe drum se corectează și se anunță în mesajul de publicare.

**Blocked by:** none (regula săgeților intră în `validate.mjs` cu tichetul 01; până atunci se respectă de mână)

**Status:** done

- [x] Toate punctele din `src/desf/oop.md` au `Tablă`.
- [x] `node validate.mjs` → OK; `node tools/fencew.mjs 36`; `node tools/desf_examples.mjs`.
- [x] `node build.mjs`, `node --check dist/bundle-check.js`, `npm run test:unit`, `tools/test_desf.py`, `tools/test_lesson.py`.
- [x] Captură a lecției pe un punct cu schemă, la 360 px, light și dark.

## Comments

**16 nov. 2026:** Tablă pe toate cele 12 puncte din `oop`, toate cu schemă (3–4 trepte); `cpp` doar la punctele cu `În C++` (1–9, 11; 10 și 12 n-au), iar la punctul 12 nu există cheia `analogie`, fiindcă are și `Exemplu`. Test nou în `tools/unit/desf.test.mjs` (fișierul real, ca la `python`; scris întâi, picat, apoi verde). `tools/test_lesson.py › unfoldings` folosea `oop` drept control „modul cu desfășurări, fără tablă”; controlul e acum `graphql`, ultimul din coadă (se mută iar când primește tablă). Capturi la 360 px, light și dark, pe punctul 7 (MRO), treapta 2: fără scroll lateral. Nicio eroare de fapt găsită; textul punctelor n-a fost atins.
