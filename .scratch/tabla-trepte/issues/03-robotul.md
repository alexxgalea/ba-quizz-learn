# 03: Robotul și laserul (varianta B)

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** în lecție, modul cu ecran, un robot rotund (SVG inline) ia locul bulei `jv-orb` din `vLessonActive`. Fața urmează stările bulei: `--ok` și gura care se mișcă când vorbește, antena verde când ascultă, `--warn` și ochii în sus când se gândește, `--line-strong` și ochii închiși la pauză sau conectare; `--lv` (nivelul vocii) se păstrează. Pe schema cu trepte, un punct ca de laser la marginea dreaptă stă la mijlocul treptei curente, se mută cu tranziție și se estompează la pauză și când ascultă. „Doar audio” și ecranul Jarvis din afara lecției păstrează bula. `prefers-reduced-motion`: fără animații.

Prototipul (sursa primară, de citit înainte): ramura `prototype/tabla-pasi`, fișierul `docs/prototip-tabla.html`, varianta `?variant=B`. Verdict: Alex a ales B (15 noiembrie 2026), fără alte observații.

**Blocked by:** 02

**Status:** done

- [x] `tools/test_lesson.py`: robotul apare în locul bulei doar cu ecran; clasa de stare urmează faza; laserul e la înălțimea treptei curente (±4 px) și lipsește fără trepte.
- [x] Capturi la 360 px, light și dark, în cele patru stări.
- [x] Toate testele din `CLAUDE.md` trec.
