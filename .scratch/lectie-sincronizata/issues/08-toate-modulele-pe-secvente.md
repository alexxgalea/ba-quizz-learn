# 08: Toate modulele pe secvențe

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** după verdictul lui Alex de la tichetul 03, limitarea la `asyncio` dispare și toate modulele cu desfășurări merg pe secvențe. Pauza, reluarea, semnalul pierdut și „Repetă” se poartă pe secvențe ca pe bucăți: reluarea după o pauză lungă sau după semnal pierdut începe de la prima secvență a bucății întrerupte.

**Blocked by:** 03, 04, 05, 06, 07

**Status:** done

- [x] Verdictul de la 03 e aplicat (durata secvențelor sau alternativa din „Further Notes”).
- [x] Teste de unitate pentru pauză, reluare (`fresh` și nu), semnal pierdut și „Repetă”, la mijlocul unei bucăți.
- [x] Modulele frontend: o secvență `exemplu` cu ✗ / ✓ și una `pas` încap la 360 px.
- [x] Rândul din istoric rămâne `lesson: true` și nu scade bugetul serii.

## Comments

### 2026-11-18 (curățarea statusurilor)

Statusul și bifele erau rămase de la creare: lucrul e făcut în commit-ul numit mai jos și `plan.md` îl dă ca gata. Verificat acum: commit-ul există în istoric, iar suita completă (`npm run test:unit`, 643, și `tools/test_lesson.py`) trece. Bifele nu au fost reverificate una câte una. Commit: `4e4aaa9`. Prima bifă („verdictul de la 03 e aplicat”): tichetul 03 s-a sărit la alegerea lui Alex (13 nov., `plan.md`), deci nu există verdict de aplicat; durata secvențelor a fost apoi reglată prin `.scratch/tabla-trepte/` (pauze de 4 s și 2 s).
