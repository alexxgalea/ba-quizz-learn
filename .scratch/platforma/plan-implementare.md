# Platforma: planul de implementare (graful tichetelor)

Lucrul se face pe ramura `platforma`, cu un PR draft către ramura de lucru. Fiecare tichet se implementează pe ramura lui, într-un worktree, apoi se îmbină aici.

```
01 cercetare ──┬──> 03 (Alex: cont AWS) ──┐
               ├──> 04 server (cod+teste) ─┼─> 05 sincronizare ──> 09 export ─┐
               └──> 08 jeton Jarvis        │                                  ├─> 10 (Alex: mutarea)
02 jurnal client ──> 05                    └─> 06 AI prin server ──> 07 ──────┘
```

## Ce poate face un agent și ce nu

- **Frontiera de start**: 01 și 02 (fără blocaje).
- **04** are două părți: codul, testele și infrastructura descrisă în cod (agent) și lansarea pe AWS (cere contul din tichetul 03, deci Alex). Agentul face prima parte; bifa „Lansat” rămâne deschisă.
- **03** și **10** sunt `ready-for-human`. Nu se implementează aici.
- **Artifactul nu se publică** în acest PR (înghețat, vezi spec). `dist/` și `docs/app` se reconstruiesc o singură dată, la final.

## Ce rămâne deschis la sfârșit

- 03: contul AWS, alarma de buget, amintirea la 5 luni, regiunea.
- 04: lansarea și adresa funcției.
- 10: importul făcut de Alex pe datele lui reale și confirmarea.
- Orice verificare care cere serverul real (de ex. durata unui apel în tichetul 07) rămâne notată în tichetul respectiv.
