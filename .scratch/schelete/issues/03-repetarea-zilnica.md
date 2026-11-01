# 03: Repetarea în viața de zi cu zi: scadente, plan, Progres, brief

**What to build:** Scheletele intră în ritmul serii. În segment, Alex are o intrare „Scadente” care îi dă scheletele de repetat, în ordinea cutiei. Planul de seară are o sarcină „Schelete: N scadente + 3 noi”, care îl duce direct la primul schelet de făcut, iar timpul petrecut intră în istoric. Progres arată câte schelete știe, câte are de repetat și câte n-a început; brief-ul pentru Perplexity primește numărătoarea pe modul și scheletele ratate. Din fișa unui modul ajunge la scheletele lui printr-un link.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] Intrarea „Scadente” arată numărul și deschide scheletele scadente în ordinea cutiei, cu aceleași scadențe ca la grile și orale.
- [ ] Planul generează pe fiecare seară o sarcină cu cheie stabilă `sch`, așezată după oral; textul are numărul de scadente și cele 3 noi; durează ~15–20 de minute, luate din bugetul „mix inteligent”, nu din kata.
- [ ] Scheletele noi din sarcină vin din modulele cu nevoia cea mai mare; sarcina deschide segmentul la primul schelet scadent sau nou.
- [ ] Bifa sarcinii rămâne după regenerarea planului; minutele petrecute pe schelete intră în istoric și scad din bugetul de azi.
- [ ] Progres are linia „Schelete: X știute · Y de repetat · Z neîncepute” (știute = cutia ≥ 3).
- [ ] Exportul brief-ului include numărătoarea pe modul și scheletele cu ultimul scor sub 50%.
- [ ] Fișa unui modul cu schelete are linkul „Schelete (N)”, care deschide lista la acel modul.
- [ ] Testele de plan și testul Playwright pentru schelete acoperă sarcina, istoricul, Progresul și linkul; testele existente trec.
