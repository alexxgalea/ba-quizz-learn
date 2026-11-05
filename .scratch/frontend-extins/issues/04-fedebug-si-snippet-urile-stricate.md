# 04: Modulul `fedebug` și snippet-urile stricate

**What to build:** Alex găsește modulul `fedebug` („Depanare frontend”, P1) după `frontend`: fișa cu 6 puncte despre proces și unelte, harta și desfășurările. Are și ~10 carduri orale cu snippet-uri stricate (JS, TS, React), la care spune ce nu merge, de ce și cum repară. Intervievatorul le tratează cu regulile de snippet, iar slotul `code` din interviul simulat poate pica pe ele. Publicat la același link, cu mesaj.

**Blocked by:** 02

**Status:** ready-for-agent

Spec: `.scratch/frontend-extins/spec.md`. Vocabular: `CONTEXT.md` (Snippet, snippet stricat).

- [ ] `fedebug` în `P.modules`, după `frontend`. Cele 6 puncte din spec, lead și formulări de evitat. Harta și 6 desfășurări („Pas cu pas” la 1, procesul).
- [ ] Cele 10 snippet-uri stricate din spec, ca carduri orale cu `code` (≤ 38 de coloane, fără colorare Python, limbajul corect în prompt). Fiecare model de răspuns are: simptomul, cauza și reparația, cu codul reparat pe scurt. Punctele cardului sunt pașii pe care trebuie să-i atingă răspunsul.
- [ ] Fiecare bug e reprodus: JS în Node, TS cu `tsc`, React într-un test vitest temporar. Rezultatul e notat în comentariul de închidere.
- [ ] ~2 carduri orale de proces („cum ai depana X?”) și ~4 grile (`FD-01`…).
- [ ] Mesajele de eroare exacte (Chrome / V8, React) sunt verificate și trecute în `research/interview-facts.md`.
- [ ] Testul arată că slotul `code` din `pickTechMock` poate alege un snippet din `fedebug`. Secțiunea `fedebug` din `tools/test_desf.py`.
- [ ] Toate verificările din `CLAUDE.md` trec. Screenshot la 360 px, light și dark, pe fișă și pe un card cu snippet. Publicat la același link și mesaj.
