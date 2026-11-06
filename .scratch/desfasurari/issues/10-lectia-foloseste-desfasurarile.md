# 10: Lecția folosește desfășurările

**What to build:** Când Alex ascultă o Lecție cu Jarvis pe un modul cu desfășurări, Jarvis deschide cu harta modulului și, la fiecare bucată, spune materialul verificat al desfășurării (problema, ideea, exemplul sau analogia, C++), în loc să improvizeze exemplul. Poziția lecției rămâne aceeași. La un modul fără desfășurări, Lecția merge exact ca azi.

**Blocked by:** 01 (Formatul, de la cap la coadă, pe `oop`). Ca prioritate vine după modulele P1 (03–09), ca să nu întârzie conținutul.

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Lecție, Bucată, Poziția lecției, Desfășurare, Harta modulului). ADR 0001 rămâne valabil: lecția e live, nu audio pregenerat.

- [x] TDD în Node, peste fakes (cusătura D): testul întâi, apoi codul. Cazuri: bucată cu desfășurare (materialul ajunge la model), bucată fără (ca azi), deschiderea cu harta când există și cu ideea principală altfel, numărul bucăților și poziția lecției neschimbate.
- [x] `PrepApp.sheet` expune și harta, și desfășurările; regula „fără fapte noi” din instrucțiunile lecției rămâne și acoperă desfășurarea.
- [x] Codul din desfășurare nu se citește caracter cu caracter: instrucțiunile cer ca Jarvis să-l povestească.
- [x] Testele de ecran ale Jarvis și ale lecției trec; testele de unitate trec.
- [x] `CLAUDE.md` și README actualizate (Lecție); publicat în PWA (și artifactul la același link); mesaj scurt către Alex.

## Comments

**2 nov. 2026:** gata și publicat (PWA în `docs/app`, artifactul la același link).

- `PrepApp.sheet` dă, la modulele cu desfășurări, `map` și `desf` (copii); fără ele, fișa e ca înainte.
- Bucata `n` are `desf` (`problema`, `ideea`, `exemplu`, `analogie`, `in_cpp`, `unde_nu_tine`, `legatura`) și o instrucțiune care cere exemplul din desfășurare și codul povestit, nu citit. „Fără fapte noi” acoperă și desfășurarea.
- Prima bucată se deschide cu `intro.harta` (fără `lead`) când există hartă; altfel cu ideea principală, ca azi. Recapitularea de la o poziție salvată și încheierea nu se schimbă. Mesajul de Reset trimite la „intro”.
- Numărul bucăților și poziția lecției sunt neschimbate (testat). Teste: 11 de unitate (`tools/unit/lesson.test.mjs`), 11 de interfață (`PrepApp.sheet` și `unfoldings` în `tools/test_lesson.py`).
- Nu s-a făcut: nicio diferență de lungime pentru punctele `Greu: da` (instrucțiunea rămâne 1–1,5 minute). Probă pe voce reală, cu `oop`: rămâne la Alex (în PWA, Jarvis › Ascultă pe fișa OOP).
