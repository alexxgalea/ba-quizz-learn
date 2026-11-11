# 06: Modurile „Cu ecran” și „Doar audio”

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** la pornirea lecției, Alex alege „Cu ecran” sau „Doar audio”; alegerea se ține în setările Jarvis. Pe „Cu ecran”, instrucțiunile îi dau voie lui Jarvis să trimită la ecran („rândul al treilea”). Pe „Doar audio”, codul e povestit în cuvinte, nicio trimitere la ecran, iar ecranul arată doar comenzile mari. Secvențele și ritmul sunt aceleași. „Mut” rămâne independent.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Alegerea apare în `vLessonHome` și e ținută minte în `onapsis-jarvis-v1`.
- [ ] Test pe instrucțiuni: în „Doar audio”, nici instrucțiunile de sistem, nici cele pe secvență nu conțin trimiteri la ecran.
- [ ] Pe „Doar audio”, ecranul activ arată Pauză, Repetă, Sari și Vorbește, fără cartonaș.
- [ ] Cele patru combinații cu „Mut” merg.

## Comments
