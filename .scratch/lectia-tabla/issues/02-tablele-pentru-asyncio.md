# 02: Tablele pentru toate punctele din `asyncio`

**Parent:** `.scratch/lectia-tabla/spec.md`

**What to build:** `Tablă` la fiecare punct din `src/desf/asyncio.md`, în formatul fixat la tichetul 01: cuvinte cheie scurte, iar la conceptele cu mecanism (event loop, `await`, `gather`, cancellation) o schemă. Faptele se verifică și se notează în `research/interview-facts.md`, ca la desfășurări. Punctele nu se împart, nu se unesc, nu se reordonează.

**Blocked by:** 01

**Status:** done

- [x] Toate punctele din `asyncio` au `Tablă`; `node validate.mjs` trece cu „OK”.
- [x] Schemele se citesc fără aliniere cu spații; rânduri ≤ 36 de caractere (`node tools/fencew.mjs 36`).
- [x] Cuvintele cheie nu repetă propoziții din `Problema` / `Ideea`: sunt etichete (de ex. „event loop · un singur thread”).
- [x] Faptele verificate sunt în `research/interview-facts.md`.
