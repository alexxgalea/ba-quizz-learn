# 04: Modulul `fedebug` și snippet-urile stricate

**What to build:** Alex găsește modulul `fedebug` („Depanare frontend”, P1) după `frontend`: fișa cu 6 puncte despre proces și unelte, harta și desfășurările. Are și ~10 carduri orale cu snippet-uri stricate (JS, TS, React), la care spune ce nu merge, de ce și cum repară. Intervievatorul le tratează cu regulile de snippet, iar slotul `code` din interviul simulat poate pica pe ele. Publicat la același link, cu mesaj.

**Blocked by:** 02

**Status:** done

Spec: `.scratch/frontend-extins/spec.md`. Vocabular: `CONTEXT.md` (Snippet, snippet stricat).

- [x] `fedebug` în `P.modules`, după `frontend`. Cele 6 puncte din spec, lead și formulări de evitat. Harta și 6 desfășurări („Pas cu pas” la 1, procesul).
- [x] Cele 10 snippet-uri stricate din spec, ca carduri orale cu `code` (≤ 38 de coloane, fără colorare Python, limbajul corect în prompt). Fiecare model de răspuns are: simptomul, cauza și reparația, cu codul reparat pe scurt. Punctele cardului sunt pașii pe care trebuie să-i atingă răspunsul.
- [x] Fiecare bug e reprodus: JS în Node, TS cu `tsc`, React într-un test vitest temporar. Rezultatul e notat în comentariul de închidere.
- [x] ~2 carduri orale de proces („cum ai depana X?”) și ~4 grile (`FD-01`…).
- [x] Mesajele de eroare exacte (Chrome / V8, React) sunt verificate și trecute în `research/interview-facts.md`.
- [x] Testul arată că slotul `code` din `pickTechMock` poate alege un snippet din `fedebug`. Secțiunea `fedebug` din `tools/test_desf.py`.
- [x] Toate verificările din `CLAUDE.md` trec. Screenshot la 360 px, light și dark, pe fișă și pe un card cu snippet. Publicat la același link și mesaj.

## Comments

**5 nov. 2026 — implementat** (modulul `fedebug`, după `frontend`).

- **Conținut** (`src/data_fe.js`, `src/desf/fedebug.md`, `src/expl/p1_fedebug.md`): 6 puncte, hartă, 6 desfășurări (`Pas cu pas` la 1, 2 și 5; fără C++), 4 grile `fd-01`…`fd-04` (3 de nivel 1, 1 de nivel 2), 12 carduri orale: cele 10 snippet-uri stricate din spec (`o-fd-1`…`o-fd-10`, cu `code` ≤ 38 de coloane, fiecare cu simptom, cauză, reparație și cum verifici) și 2 de proces (`o-fd-11`, `o-fd-12`).
- **Bug-urile, reproduse** (test vitest temporar, react 19.3.1, jsdom; Node 22.22.0; `tsc --strict` pe fișiere temporare; testele au fost șterse): fiecare snippet produce simptomul din model. Detalii și mesajele exacte în `research/interview-facts.md`, secțiunea 45. Descoperiri: `if (isAdmin(id))` fără `await` e prins de `tsc` (TS2801), iar `onClick={f()}` de TS2322; un effect fără dependențe care face `setState` doar avertizează cu `Maximum update depth exceeded` (bucla nu se oprește singură); `data as User` compilează curat și aruncă la runtime.
- **Corecturi față de spec** (de anunțat): „în CoderPad doar consola” nu e confirmat de documentație: pagina React spune că pad-ul e servit de Vite și că erorile apar în ieșirea aplicației, fără să pomenească DevTools. Fișa spune doar că documentația nu pomenește DevTools. La React DevTools, react.dev nu descrie „de ce s-a re-randat”, deci fișa nu o afirmă (⚠️ în facts). Punctul 3 al fișei menționează `console.table`, logpoints și breakpoint-uri condiționale, toate din documentația Chrome / MDN.
- **Teste**: secțiunea `fedebug` din `tools/test_desf.py`; `tools/test_interview.py` arată că slotul `code` din `pickTechMock` poate alege un snippet din `fedebug` (și doar carduri cu cod). Slotul de frontend rămâne `frontend` / `react` / `js` / `ts`, deci cardurile de proces din `fedebug` nu intră în el.
- **Verificări**: `validate` OK; `bundle-check`; 135 de exemple din desfășurări (Python 122, JS 10, TS 3), 0 picate; 366 de teste de unitate; toate cele 17 teste de interfață; `tsc --strict` în `katas/`; screenshot la 360 px (fișa cu „Deschide tot” în light și dark, cardul `o-fd-8` în light, `o-fd-5` în dark), fără overflow, cod fără colorare Python, fără erori de consolă.
- **Scorul de pregătire** scade cât timp `fedebug` e neatins (P1, aceeași pondere).

