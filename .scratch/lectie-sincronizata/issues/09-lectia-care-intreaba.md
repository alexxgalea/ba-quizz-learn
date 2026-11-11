# 09: Lecția care întreabă

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** după ultima secvență a unui grup din harta modulului (fără hartă, după fiecare al treilea punct), un cartonaș `verificare` cu o întrebare `Verificare` de la o grilă legată de un punct al grupului. Alex răspunde cu vocea în fereastra de ascultare; Jarvis dă verdictul într-o propoziție, iar aplicația îl scrie la întrebările deschise. Pe „Mut”, butoanele „Știu” și „Nu știu”. Pe „Doar audio”, doar cu vocea, deci lipsește pe Mut. Fără grile legate de grup, cartonașul lipsește.

**Blocked by:** 08; legăturile item–punct din Val 0.1 (`fundatie-concepte`, spec încă nescris)

**Status:** needs-triage

- [ ] `buildLessonSystem` nu mai interzice întrebările de verificare; cere una singură, la momentul dat de aplicație.
- [ ] Verdictul scrie doar la întrebările deschise; scorul și golurile rămân neatinse.
- [ ] Pornită implicit pe „Cu ecran”; se poate opri din setările Jarvis.
- [ ] Teste pentru: răspuns cu vocea, butoanele de pe Mut, grup fără grile.

## Comments

Rămâne `needs-triage` până există Val 0.1 și se știe unde scrie verdictul (jurnal sau `S.x`).
