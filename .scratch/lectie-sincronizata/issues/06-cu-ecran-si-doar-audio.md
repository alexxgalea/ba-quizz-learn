# 06: Modurile „Cu ecran” și „Doar audio”

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** la pornirea lecției, Alex alege „Cu ecran” sau „Doar audio”; alegerea se ține în setările Jarvis. Pe „Cu ecran”, instrucțiunile îi dau voie lui Jarvis să trimită la ecran („rândul al treilea”). Pe „Doar audio”, codul e povestit în cuvinte, nicio trimitere la ecran, iar ecranul arată doar comenzile mari. Secvențele și ritmul sunt aceleași. „Mut” rămâne independent.

**Blocked by:** 01

**Status:** done

- [x] Alegerea apare în `vLessonHome` și e ținută minte în `onapsis-jarvis-v1`.
- [x] Test pe instrucțiuni: în „Doar audio”, nici instrucțiunile de sistem, nici cele pe secvență nu conțin trimiteri la ecran.
- [x] Pe „Doar audio”, ecranul activ arată Pauză, Repetă, Sari și Vorbește, fără cartonaș.
- [x] Cele patru combinații cu „Mut” merg.

## Comments

### 2026-11-18 (curățarea statusurilor)

Statusul și bifele erau rămase de la creare: lucrul e făcut în commit-ul numit mai jos și `plan.md` îl dă ca gata. Verificat acum: commit-ul există în istoric, iar suita completă (`npm run test:unit`, 643, și `tools/test_lesson.py`) trece. Bifele nu au fost reverificate una câte una. Commit: `7161d56`.
