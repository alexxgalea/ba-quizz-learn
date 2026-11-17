# 13: Tabla pentru `ts`

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** câmpul `Tablă` la fiecare punct din `src/desf/ts.md`, după modelul din `src/desf/asyncio.md` (formatul în README › Desfășurări): 1–2 cuvinte cheie pe secvență (`problema`, `ideea`, `analogie` dacă are, `cpp` dacă are, `punct`), cel mult 4 cuvinte fiecare, cel mult 6 pe punct, și schema la `ideea` unde conceptul are mecanism: cel mult 8 rânduri de cel mult 36 de caractere, construită pe săgeți (`↓ cauză`, apoi starea), cu 2–5 trepte. Cuvintele cheie vin din textul desfășurării, nu fapte noi. Un punct fără mecanism (o definiție, o listă) poate avea doar cuvinte cheie. Modul frontend: limitele din `DESF_LIMITS_FE` nu schimbă tabla (aceleași `tabPer`, `tabWords`, `tabTotal`, `schemaLines`). Punctele nu se reordonează și nu se schimbă; o eroare de fapt găsită pe drum se corectează și se anunță în mesajul de publicare.

**Blocked by:** none (regula săgeților intră în `validate.mjs` cu tichetul 01; până atunci se respectă de mână)

**Status:** done

- [x] Toate punctele din `src/desf/ts.md` au `Tablă`.
- [x] `node validate.mjs` → OK; `node tools/fencew.mjs 36`; `node tools/desf_examples.mjs`.
- [x] `node build.mjs`, `node --check dist/bundle-check.js`, `npm run test:unit`, `tools/test_desf.py`, `tools/test_lesson.py`.
- [x] Captură a lecției pe un punct cu schemă, la 360 px, light și dark (vezi nota din 17 nov., verificare vizuală).

**17 nov. 2026, verificare vizuală (după review):** `python3 tools/test_lesson.py` a salvat `shots/lesson_seq_ideea_{light,dark}.png` la 360 px (privite). Punctul arătat e unul cu schemă din `asyncio` (6/9, treapta 4 din 4): cuvintele cheie ale ideii stau estompate sus, schema se vede întreagă, treapta curentă are fundal și bordură în accent, cele trecute sunt normale, săgețile sunt în accent, laserul stă la dreapta treptei; nu apare scroll, nici lateral, nici în cartonaș, iar contrastul e bun în ambele teme. Ecranul e același pentru toate modulele (`jvBoard`); schemele acestui modul n-au fost redate individual, dar lățimea lor (≤ 36 de caractere) o verifică `checkDesf`. În tichetele 10 și 16 nota „captura nu s-a făcut” e depășită de aceasta.
