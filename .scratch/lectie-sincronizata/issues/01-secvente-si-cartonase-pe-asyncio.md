# 01: Secvențe și cartonașe pentru bucățile din `asyncio`

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** firul subțire, cap-coadă, pe un singur modul. La `asyncio`, o bucată se dă modelului secvență cu secvență (problema → ideea → exemplu sau analogie → pas → cpp → punct), iar ecranul lecției arată cartonașul secvenței curente: text la `problema` și `ideea`, bloc de cod la `exemplu`, rânduri la `pas`. Fereastra de ascultare se deschide doar după ultima secvență a bucății. Celelalte module merg ca azi. Termenii **Secvență** și **Cartonaș** intră în `CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] O funcție pură întoarce secvențele unei bucăți, cu tipul, conținutul cartonașului și instrucțiunea; câmpurile lipsă se sar. Teste pe fișa reală `asyncio`.
- [x] `next_chunk` întoarce o singură secvență, cu poziția ei în bucată; modelul nu primește secvența următoare.
- [x] După `spoken`, aplicația cere secvența următoare; după ultima, deschide fereastra de ascultare (pe Mut, merge mai departe).
- [x] `lessonHeard` se scrie după ultima secvență; „Repetă” reia bucata de la prima secvență.
- [x] `#jv-chunk` arată cartonașul secvenței curente, după tip; o secvență `exemplu` arată blocul de cod întreg la 360 px, light și dark.
- [x] La alt modul decât `asyncio`, lecția e neschimbată (testele existente trec).
- [x] `CONTEXT.md` are **Secvență** și **Cartonaș**.

## Comments

### 2026-11-18 (curățarea statusurilor)

Statusul și bifele erau rămase de la creare: lucrul e făcut în commit-ul numit mai jos și `plan.md` îl dă ca gata. Verificat acum: commit-ul există în istoric, iar suita completă (`npm run test:unit`, 643, și `tools/test_lesson.py`) trece. Bifele nu au fost reverificate una câte una. Commit: `08fe580`.
