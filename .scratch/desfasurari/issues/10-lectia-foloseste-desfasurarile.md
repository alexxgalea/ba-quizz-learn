# 10: Lecția folosește desfășurările

**What to build:** Când Alex ascultă o Lecție cu Jarvis pe un modul cu desfășurări, Jarvis deschide cu harta modulului și, la fiecare bucată, spune materialul verificat al desfășurării (problema, ideea, exemplul sau analogia, C++), în loc să improvizeze exemplul. Poziția lecției rămâne aceeași. La un modul fără desfășurări, Lecția merge exact ca azi.

**Blocked by:** 01 (Formatul, de la cap la coadă, pe `oop`). Ca prioritate vine după modulele P1 (03–09), ca să nu întârzie conținutul.

**Status:** ready-for-agent

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Lecție, Bucată, Poziția lecției, Desfășurare, Harta modulului). ADR 0001 rămâne valabil: lecția e live, nu audio pregenerat.

- [ ] TDD în Node, peste fakes (cusătura D): testul întâi, apoi codul. Cazuri: bucată cu desfășurare (materialul ajunge la model), bucată fără (ca azi), deschiderea cu harta când există și cu ideea principală altfel, numărul bucăților și poziția lecției neschimbate.
- [ ] `PrepApp.sheet` expune și harta, și desfășurările; regula „fără fapte noi” din instrucțiunile lecției rămâne și acoperă desfășurarea.
- [ ] Codul din desfășurare nu se citește caracter cu caracter: instrucțiunile cer ca Jarvis să-l povestească.
- [ ] Testele de ecran ale Jarvis și ale lecției trec; testele de unitate trec.
- [ ] `CLAUDE.md` și README actualizate (Lecție); publicat în PWA (și artifactul la același link); mesaj scurt către Alex.
