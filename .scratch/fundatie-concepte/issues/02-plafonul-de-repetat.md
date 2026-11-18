# 02: Plafonul zilnic de repetat

**Parent:** `.scratch/fundatie-concepte/spec.md` (Orar)

**What to build:** restanța (itemii scadenți cu ultimul răspuns dinainte de azi) intră zilnic doar cât încape în plafon (implicit 25 de minute), în ordinea prioritate × cât de depășit e. Greșelile de azi revin mereu, în afara plafonului. Consumul se citește din proiecție (`rd` pe intrare).

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `dueQ` / `dueO` / `dueX` întorc porția de azi; ce nu încape rămâne scadent mâine, fără să-și schimbe cutia.
- [ ] Un răspuns peste o intrare din altă zi pune `rd` (ziua de azi); unul peste o intrare de azi nu.
- [ ] Cardul „De repetat acum” spune câte rămân pentru zilele următoare.
- [ ] Test cu 200 de grile restante: porția încape în plafon, cele P1 și cele mai întârziate primele, iar o grilă greșită azi apare peste plafon.
