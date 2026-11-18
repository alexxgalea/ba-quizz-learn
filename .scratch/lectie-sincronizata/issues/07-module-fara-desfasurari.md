# 07: Fără improvizație la modulele fără desfășurări

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** la modulele fără desfășurări (`dbmodels`, `aws`, `django`), bucata are o singură secvență, `punct`, spusă din cartonaș. Instrucțiunea „un exemplu din experiența lui Alex” dispare din `buildLessonSystem` și din `deliver`. Când vor exista legăturile dintre grile și puncte (Val 0.1), se adaugă o a doua secvență, `exemplu`, dintr-o grilă legată de punct; până atunci nu.

**Blocked by:** 01

**Status:** done

- [x] Nicio instrucțiune nu mai cere un exemplu din afara materialului primit.
- [x] Test pe fișa `django`: o secvență pe bucată, de tip `punct`.
- [x] Pe ecran, cartonașul e punctul, pe toată durata bucății.

## Comments

### 2026-11-18 (curățarea statusurilor)

Statusul și bifele erau rămase de la creare: lucrul e făcut în commit-ul numit mai jos și `plan.md` îl dă ca gata. Verificat acum: commit-ul există în istoric, iar suita completă (`npm run test:unit`, 643, și `tools/test_lesson.py`) trece. Bifele nu au fost reverificate una câte una. Commit: `90720ef`.
