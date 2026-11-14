# 01: Formatul tablei și un punct de `asyncio`

**Parent:** `.scratch/lectia-tabla/spec.md`

**What to build:** firul subțire, cap-coadă, pe un singur punct. Câmpul `Tablă` din `src/desf/<modul>.md` (cuvinte cheie pe secvență, schemă opțională), parsat în `P.desf[modul].items[i].tab` și validat la build. Se scrie tabla pentru punctul 1 din `asyncio`, iar `lessonSequences` produce pentru el secvențe de tip tablă, randate de `jvBoard` (cuvinte cheie ca rânduri scurte, schema în bloc monospace, codul ca azi). Punctele fără `Tablă` merg ca azi. Termenul **Tablă** intră în `CONTEXT.md`, iar **Cartonaș** și principiul 3 din `docs/imbunatatire.md` se corectează.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Formatul fixat, cu un exemplu în README › Desfășurări; `parseDesf` / `checkDesf` / `buildDesf` îl cunosc; `validate.mjs` cere 1–2 cuvinte cheie pe secvență, ≤ 4 cuvinte fiecare, ≤ 6 pe punct, schemă ≤ 8 rânduri × 36 de caractere.
- [x] Teste în `tools/unit/desf.test.mjs` pentru parser și limite; la `asyncio`, un test pe fișierul real.
- [x] `lessonSequences` întoarce secvențe cu `continut = { cuvinte, schema?, cod? }` la punctul cu tablă și textul de azi la restul; test pe fișe reale.
- [x] Prompt: modelul primește cuvintele cheie și schema, nu paragraful; instrucțiunea cere să povestească în jurul lor.
- [x] `jvBoard` randează tabla; nicio linie de text lung; 360 px, light și dark, fără scroll orizontal.
- [x] `CONTEXT.md` (Tablă, Cartonaș) și `docs/imbunatatire.md` (principiul 3) corectate.
