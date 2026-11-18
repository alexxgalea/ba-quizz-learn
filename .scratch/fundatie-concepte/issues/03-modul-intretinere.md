# 03: Modul întreținere

**Parent:** `.scratch/fundatie-concepte/spec.md` (Orar)

**What to build:** fără dată de interviu sau cu data trecută, Azi arată planul de întreținere: o singură zi, în minutele pe zi alese, cu scadențele din plafon, modulul cu nevoia cea mai mare și o sarcină de cod. Progres › Planul are data (cu „Fără dată”), orele pe seară, minutele pe zi și plafonul de repetat.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Cu data trecută sau ștearsă, `genPlan` dă o zi (azi), cu `due`, o fișă (sau `smart`) și o sarcină de cod; bifele rămân după regenerare.
- [ ] Antetul și cardul de sus spun „Întreținere”, nu „Interviul a trecut”.
- [ ] Setările noi (`m`, `r`, `d: ""`) trec prin evenimentul `cfg`, prin `normalize` și prin sincronizare; evenimentele vechi iau valorile implicite.
- [ ] Punerea unei date viitoare readuce planul pe zile.
- [ ] Screenshot la 360 px, light și dark, pentru Azi în întreținere și pentru Progres › Planul.
- [ ] `CONTEXT.md`: Întreținere, Plafon.
