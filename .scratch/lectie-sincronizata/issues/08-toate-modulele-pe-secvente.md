# 08: Toate modulele pe secvențe

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** după verdictul lui Alex de la tichetul 03, limitarea la `asyncio` dispare și toate modulele cu desfășurări merg pe secvențe. Pauza, reluarea, semnalul pierdut și „Repetă” se poartă pe secvențe ca pe bucăți: reluarea după o pauză lungă sau după semnal pierdut începe de la prima secvență a bucății întrerupte.

**Blocked by:** 03, 04, 05, 06, 07

**Status:** ready-for-agent

- [ ] Verdictul de la 03 e aplicat (durata secvențelor sau alternativa din „Further Notes”).
- [ ] Teste de unitate pentru pauză, reluare (`fresh` și nu), semnal pierdut și „Repetă”, la mijlocul unei bucăți.
- [ ] Modulele frontend: o secvență `exemplu` cu ✗ / ✓ și una `pas` încap la 360 px.
- [ ] Rândul din istoric rămâne `lesson: true` și nu scade bugetul serii.

## Comments
