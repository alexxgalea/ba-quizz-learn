# 05: Sincronizarea jurnalului între dispozitive

**Parent:** `.scratch/platforma/spec.md`

**What to build:** clientul trimite evenimentele netrimise și le cere pe cele noi, la pornire, la revenirea semnalului și după fiecare răspuns. Fără semnal, sesiunea continuă și evenimentele se strâng local. Alex introduce secretul o dată pe dispozitiv, în Progres.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] Un răspuns dat pe telefon apare pe laptop după sincronizare, cu aceeași cutie.
- [ ] Răspunsuri date fără semnal pe două dispozitive se regăsesc toate după reconectare.
- [ ] Un reset făcut pe un dispozitiv se aplică pe celălalt.
- [ ] Starea sincronizării e vizibilă (la zi / N netrimise / fără semnal), fără să blocheze nimic.
- [ ] Teste cu server fals în memorie.

## Comments
