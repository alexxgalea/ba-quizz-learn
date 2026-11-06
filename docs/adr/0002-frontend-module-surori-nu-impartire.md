# Frontend-ul crește prin module surori, nu prin împărțirea lui `frontend`

Fișa `frontend` acoperea React, TypeScript, testele, securitatea și JavaScript în 13 puncte, câte două-trei pe domeniu, și presupunea fundamente pe care Alex nu le avea. Am adăugat module surori P1 (`js`, `ts`, `react`, `fedebug`), iar `frontend` rămâne cum e, cu punctele lui pe loc. Golurile, poziția lecției și desfășurările se leagă de modul și de indexul punctului, deci o mutare de puncte ar fi șters progresul strâns până acum.

## Considered Options

- **Împărțirea lui `frontend`** în `js`, `ts`, `react`, cu punctele mutate: structura cea mai curată, dar cere migrarea golurilor, a poziției lecției și a Leitner-ului de pe `FE-xx`, cu câteva zile înainte de interviu.
- **Extinderea lui `frontend`** cu puncte noi la final: progresul rămâne, dar fișa ajunge la ~40 de puncte, iar harta, lecția și durata din plan nu mai sunt folosibile.

## Consequences

- Punctele 10 (TypeScript) și 13 (event loop) din `frontend` se suprapun cu `ts` și `js`. Rămân acolo ca recapitulare scurtă, iar desfășurările lor trimit la modulele noi.
- Modulele frontend au limite proprii pentru desfășurări (mai multe cuvinte, exemplu cu ✗ / ✓, câmpul „Pas cu pas”), fiindcă sunt teritoriu nou pentru Alex. Python păstrează calibrarea de la `oop`.
