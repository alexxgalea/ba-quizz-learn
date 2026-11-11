# 07: Fără improvizație la modulele fără desfășurări

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** la modulele fără desfășurări (`dbmodels`, `aws`, `django`), bucata are o singură secvență, `punct`, spusă din cartonaș. Instrucțiunea „un exemplu din experiența lui Alex” dispare din `buildLessonSystem` și din `deliver`. Când vor exista legăturile dintre grile și puncte (Val 0.1), se adaugă o a doua secvență, `exemplu`, dintr-o grilă legată de punct; până atunci nu.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Nicio instrucțiune nu mai cere un exemplu din afara materialului primit.
- [ ] Test pe fișa `django`: o secvență pe bucată, de tip `punct`.
- [ ] Pe ecran, cartonașul e punctul, pe toată durata bucății.

## Comments
