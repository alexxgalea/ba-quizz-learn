# Plan de implementare: lecția sincronizată

Hotărât cu Alex, 13 noiembrie 2026 (la pornirea implementării):

- Se implementează tichetele 01, 02, 04, 05, 06, 07, 08 și 11.
- Tichetul 03 (proba lui Alex pe `asyncio`) se sare: Alex trece direct la toate modulele, fără verdictul din tichetul 03. Rămâne deschis; dacă firul se rupe la ascultare, alternativa e cea din „Further Notes” din `spec.md`.
- Tichetul 09 rămâne deschis (are nevoie de legăturile item–punct din Val 0.1, spec nescris).
- Tichetul 10 rămâne semn de carte.

Graful: 01 → {02, 04, 06, 07}; 02 → 05; {04, 05, 06, 07} → 08 → 11. Fiindcă tichetul 03 nu mai blochează, 08 așteaptă doar 04–07.

Stare: 01, 02, 04, 05, 06, 07, 08 și 11 gata; 03 sărit (hotărârea lui Alex), 09 și 10 deschise.
