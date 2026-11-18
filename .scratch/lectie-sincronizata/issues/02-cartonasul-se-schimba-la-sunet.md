# 02: Cartonașul se schimbă când începe sunetul lui

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** cartonașul nou se ține în așteptare la `deliver` și devine cel afișat abia când `Call` trece în `speaking` pentru acel tur. Până atunci rămâne pe ecran cel vechi. Sub cartonaș apare subtitrarea vie: ultimele două rânduri din transcrierea modelului.

**Blocked by:** 01

**Status:** done

- [x] Test în `tools/unit/lesson.test.mjs`, peste `Call` real: după `deliver`, cartonașul afișat e cel vechi; la `speaking`, cel nou.
- [x] Un `deliver` urmat de o întrerupere (pauză, „Vorbește”) nu lasă pe ecran un cartonaș care nu s-a auzit.
- [x] Subtitrarea arată ultimele două rânduri ale transcrierii modelului și se golește la schimbarea cartonașului.
- [x] Blocul „Transcriere” rămâne ca istoric.

## Comments

### 2026-11-18 (curățarea statusurilor)

Statusul și bifele erau rămase de la creare: lucrul e făcut în commit-ul numit mai jos și `plan.md` îl dă ca gata. Verificat acum: commit-ul există în istoric, iar suita completă (`npm run test:unit`, 643, și `tools/test_lesson.py`) trece. Bifele nu au fost reverificate una câte una. Commit: `bc3e1fd`.
