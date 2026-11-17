# 16: Tabla pentru `fedebug`

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** câmpul `Tablă` la fiecare punct din `src/desf/fedebug.md`, după modelul din `src/desf/asyncio.md` (formatul în README › Desfășurări): 1–2 cuvinte cheie pe secvență (`problema`, `ideea`, `analogie` dacă are, `cpp` dacă are, `punct`), cel mult 4 cuvinte fiecare, cel mult 6 pe punct, și schema la `ideea` unde conceptul are mecanism: cel mult 8 rânduri de cel mult 36 de caractere, construită pe săgeți (`↓ cauză`, apoi starea), cu 2–5 trepte. Cuvintele cheie vin din textul desfășurării, nu fapte noi. Un punct fără mecanism (o definiție, o listă) poate avea doar cuvinte cheie. Modul frontend: limitele din `DESF_LIMITS_FE` nu schimbă tabla (aceleași `tabPer`, `tabWords`, `tabTotal`, `schemaLines`). Punctele nu se reordonează și nu se schimbă; o eroare de fapt găsită pe drum se corectează și se anunță în mesajul de publicare.

**Blocked by:** none (regula săgeților intră în `validate.mjs` cu tichetul 01; până atunci se respectă de mână)

**Status:** done

- [x] Toate punctele din `src/desf/fedebug.md` au `Tablă`.
- [x] `node validate.mjs` → OK; `node tools/fencew.mjs 36`; `node tools/desf_examples.mjs`.
- [x] `node build.mjs`, `node --check dist/bundle-check.js`, `npm run test:unit`, `tools/test_desf.py`, `tools/test_lesson.py`.
- [ ] Captură a lecției pe un punct cu schemă, la 360 px, light și dark.

## Comments

**17 nov. 2026:** Tablă pe toate cele 6 puncte din `fedebug` (cuvinte cheie la problema, ideea și punct; fără `cpp`, nu există `În C++`). Schemă cu trepte la punctele 3, 4 și 6 (2–3 trepte); la 1, 2 și 5, `Pas cu pas` e deja schema (regula din `checkDesf`), deci au doar cuvinte cheie. Test nou în `tools/unit/desf.test.mjs`. Nicio eroare de fapt găsită; textul punctelor n-a fost atins. Captura la 360 px nu s-a făcut în acest worktree (fără browser vizual verificat aici); schemele au rânduri de cel mult 29 de caractere.
