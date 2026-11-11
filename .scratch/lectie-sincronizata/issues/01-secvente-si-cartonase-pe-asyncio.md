# 01: Secvențe și cartonașe pentru bucățile din `asyncio`

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** firul subțire, cap-coadă, pe un singur modul. La `asyncio`, o bucată se dă modelului secvență cu secvență (problema → ideea → exemplu sau analogie → pas → cpp → punct), iar ecranul lecției arată cartonașul secvenței curente: text la `problema` și `ideea`, bloc de cod la `exemplu`, rânduri la `pas`. Fereastra de ascultare se deschide doar după ultima secvență a bucății. Celelalte module merg ca azi. Termenii **Secvență** și **Cartonaș** intră în `CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] O funcție pură întoarce secvențele unei bucăți, cu tipul, conținutul cartonașului și instrucțiunea; câmpurile lipsă se sar. Teste pe fișa reală `asyncio`.
- [ ] `next_chunk` întoarce o singură secvență, cu poziția ei în bucată; modelul nu primește secvența următoare.
- [ ] După `spoken`, aplicația cere secvența următoare; după ultima, deschide fereastra de ascultare (pe Mut, merge mai departe).
- [ ] `lessonHeard` se scrie după ultima secvență; „Repetă” reia bucata de la prima secvență.
- [ ] `#jv-chunk` arată cartonașul secvenței curente, după tip; o secvență `exemplu` arată blocul de cod întreg la 360 px, light și dark.
- [ ] La alt modul decât `asyncio`, lecția e neschimbată (testele existente trec).
- [ ] `CONTEXT.md` are **Secvență** și **Cartonaș**.

## Comments
