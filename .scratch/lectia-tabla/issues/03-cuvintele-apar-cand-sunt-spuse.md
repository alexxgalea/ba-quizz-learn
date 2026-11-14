# 03: Cuvintele cheie apar când sunt spuse; subtitrarea e oprită

**Parent:** `.scratch/lectia-tabla/spec.md`

**What to build:** pe cartonașul de tablă, cuvintele cheie apar pe rând, când apar în transcrierea modelului (litere mici, fără diacritice, rădăcina cuvântului); la `spoken` apar toate cele rămase. Schema apare întreagă cu secvența ei. Subtitrarea vie e oprită implicit, cu comutatorul „Subtitrare” în setările Jarvis (`onapsis-jarvis-v1`). La întrebarea liberă, cartonașul `intrebare` arată doar întrebarea; răspunsul apare doar cu subtitrarea pornită.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Teste peste `Call` real cu transcriere falsă: un cuvânt apare când e spus; cele nespuse apar la `spoken`; la schimbarea secvenței nu rămâne nimic din cea veche.
- [ ] Subtitrarea e ascunsă implicit; comutatorul o arată; alegerea se ține în `onapsis-jarvis-v1`.
- [ ] `intrebare` fără subtitrare arată doar întrebarea lui Alex.
- [ ] `tools/test_lesson.py`: un cartonaș de tablă are cel mult ~25 de cuvinte; 360 px, light și dark.
- [ ] „Doar audio” neschimbat (fără tablă pe ecran).
