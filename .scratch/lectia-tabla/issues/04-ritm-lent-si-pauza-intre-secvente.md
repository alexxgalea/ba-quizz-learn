# 04: Ritm lent și pauză între secvențe

**Parent:** `.scratch/lectia-tabla/spec.md`

**What to build:** instrucțiunile secvențelor cer 10–15 secunde, o idee, vorbit rar, propoziții scurte și să nu enumere tot ce e pe tablă (în `seqKit`, ambele moduri, ecran și audio). După `spoken`, aplicația așteaptă `SEQ_GAP_MS` (2 s la pornire, prin `env.clock.after`) înainte să ceară secvența următoare. Repetă, Pauză, Sari, „Vorbește” și o întrebare anulează așteptarea.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Test cu ceas fals: următoarea secvență se cere după `SEQ_GAP_MS`, nu imediat; fereastra de ascultare de la finalul bucății rămâne ca azi.
- [ ] Repetă, Pauză, Sari, Vorbește și o întrebare în timpul așteptării o anulează, fără secvență cerută de două ori.
- [ ] Instrucțiunile cer ritm lent și o singură idee; testul „Doar audio” (fără cuvinte care trimit la ecran) rămâne verde.
- [ ] `SEQ_GAP_MS` e o constantă într-un singur loc, ușor de schimbat după probă.
