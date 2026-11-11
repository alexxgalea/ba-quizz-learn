# 02: Cartonașul se schimbă când începe sunetul lui

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** cartonașul nou se ține în așteptare la `deliver` și devine cel afișat abia când `Call` trece în `speaking` pentru acel tur. Până atunci rămâne pe ecran cel vechi. Sub cartonaș apare subtitrarea vie: ultimele două rânduri din transcrierea modelului.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Test în `tools/unit/lesson.test.mjs`, peste `Call` real: după `deliver`, cartonașul afișat e cel vechi; la `speaking`, cel nou.
- [ ] Un `deliver` urmat de o întrerupere (pauză, „Vorbește”) nu lasă pe ecran un cartonaș care nu s-a auzit.
- [ ] Subtitrarea arată ultimele două rânduri ale transcrierii modelului și se golește la schimbarea cartonașului.
- [ ] Blocul „Transcriere” rămâne ca istoric.

## Comments
