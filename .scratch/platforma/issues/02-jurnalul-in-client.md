# 02: Jurnalul de încercări în client, cu proiecția lui `S`

**Parent:** `.scratch/platforma/spec.md`

**What to build:** aplicația scrie fiecare răspuns ca eveniment într-un jurnal local și citește tot ce citea din `S` dintr-o proiecție a jurnalului. Comportamentul vizibil nu se schimbă: aceleași cutii, aceleași scadențe, același plan. Încă fără server; sincronizarea veche prin `window.claude` se oprește în PWA. **Jurnal de încercări** intră în `CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Forma evenimentului e cea din spec; tipuri pentru răspuns, setări, bifă de plan, poziția lecției, reset.
- [x] O funcție pură `jurnal → S`; `updQ`, `updO`, `updX`, `updS`, kata-urile, golurile și lecția adaugă evenimente.
- [x] Jurnalul stă în IndexedDB; pornirea nu recalculează din tot jurnalul.
- [x] Testele existente de plan, scadențe și goluri trec neschimbate.
- [x] Un reset ascunde tot ce e mai vechi.
- [x] `CONTEXT.md` are **Jurnal de încercări**.

## Comments

### Implementat

- `src/journal.js` (în `LIB_FILES`), testat în Node (`tools/unit/journal.test.mjs`: proiecția urmărește pas cu pas vechile reguli pe sesiuni aleatoare, `proiecție(import(S)) = S`, reset, doi dispozitive, goluri, depozit, repornire fără reluare) și în browser (`tools/test_journal.py`, pe `dist/app`: IndexedDB real, oglinda, migrarea cheii vechi, resetul; pe artifact: calea veche).
- Două variante de build: PWA (`dist/app`) scrie jurnalul în IndexedDB și nu mai pornește sincronizarea `window.claude`; artifactul (`dist/pregatire-onapsis.html`) păstrează `S` în `onapsis-prep-v1` + sincronizarea veche, cu aceleași reguli (proiecția).
- `test_interview.py`, `test_gaps.py` și `test_lesson.py` pică și pe baza de dinainte (data interviului din `P.cfg`, 10 nov, a trecut, deci `genPlan()` e gol); cu data mutată în viitor trec și înainte, și după.
