# 03: Modul întreținere

**Parent:** `.scratch/fundatie-concepte/spec.md` (Orar)

**What to build:** fără dată de interviu sau cu data trecută, Azi arată planul de întreținere: o singură zi, în minutele pe zi alese, cu scadențele din plafon, modulul cu nevoia cea mai mare și o sarcină de cod. Progres › Planul are data (cu „Fără dată”), orele pe seară, minutele pe zi și plafonul de repetat.

**Blocked by:** 02

**Status:** done

- [x] Cu data trecută sau ștearsă, `genPlan` dă o zi (azi), cu `due`, o fișă (sau `smart`) și o sarcină de cod; bifele rămân după regenerare.
- [x] Antetul și cardul de sus spun „Întreținere”, nu „Interviul a trecut”.
- [x] Setările noi (`m`, `r`, `d: ""`) trec prin evenimentul `cfg`, prin `normalize` și prin sincronizare; evenimentele vechi iau valorile implicite.
- [x] Punerea unei date viitoare readuce planul pe zile.
- [x] Screenshot la 360 px, light și dark, pentru Azi în întreținere și pentru Progres › Planul.
- [x] `CONTEXT.md`: Întreținere, Plafon.

## Comments

### 2026-11-18

Livrat: `planMode`, `genMaint`, `cfg()` = `{ d, h, m, r }` (implicit 45 și 25), evenimentul `cfg` cu `m` / `r` și `d: ""`, `normalize`, antetul și cardul „Întreținere”, Progres › Planul (Minute/zi, Plafon de repetat, „Fără dată (întreținere)”). Jarvis nu mai spune „Mai sunt -8 zile” (`summary().daysLeft` = null în întreținere; test în `jarvis.test.mjs`). Capturi: `shots/12-plan-maint-{light,dark}.png`, `shots/13-progress-maint-light.png`. `CONTEXT.md`: Întreținere, Restanță, Plafon. Suita completă din `CLAUDE.md` trece (`npm run test:unit` 647, cele 24 de teste de interfață, `desf_examples`).
