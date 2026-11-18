# 02: Plafonul zilnic de repetat

**Parent:** `.scratch/fundatie-concepte/spec.md` (Orar)

**What to build:** restanța (itemii scadenți cu ultimul răspuns dinainte de azi) intră zilnic doar cât încape în plafon (implicit 25 de minute), în ordinea prioritate × cât de depășit e. Greșelile de azi revin mereu, în afara plafonului. Consumul se citește din proiecție (`rd` pe intrare).

**Blocked by:** 01

**Status:** done

- [x] `dueQ` / `dueO` / `dueX` întorc porția de azi; ce nu încape rămâne scadent mâine, fără să-și schimbe cutia.
- [x] Un răspuns peste o intrare din altă zi pune `rd` (ziua de azi); unul peste o intrare de azi nu.
- [x] Cardul „De repetat acum” spune câte rămân pentru zilele următoare.
- [x] Test cu 200 de grile restante: porția încape în plafon, cele P1 și cele mai întârziate primele, iar o grilă greșită azi apare peste plafon.

## Comments

### 2026-11-18

Livrat: `rd` în `Journal.apply` (`markRd`), `dueToday()` (în `__prep`) și `dueQ` / `dueO` / `dueX` din el; cardul „De repetat acum” și sarcina „Scadențe” spun câte așteaptă. Teste: `journal.test.mjs` (`rd` doar peste o intrare din altă zi; oracolul sesiunilor aleatoare îl calculează la fel) și `test_plan.py` (200 de restante → 35 de grile în 25 min, 165 așteaptă, P1 și cele mai întârziate primele, greșeala de azi revine cu plafonul consumat). Suita completă din `CLAUDE.md` trece (`npm run test:unit` 647, cele 24 de teste de interfață, `desf_examples`).
