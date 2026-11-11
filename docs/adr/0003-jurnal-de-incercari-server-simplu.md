# Progresul e un jurnal de încercări, iar serverul doar îl păstrează

Starea `S` ține rezultatul îmbinat al fiecărui item (cutia, ultimul răspuns, timestamp) și se sincronizează prin merge pe item. Trecem la un jurnal în care fiecare răspuns al lui Alex e un eveniment care doar se adaugă. Serverul păstrează evenimentele și le dă înapoi de la un cursor; cutiile, treptele și scadențele le calculează clientul, din jurnal.

Am ales așa din trei motive. Orarul se schimbă (cutiile 1–8, plafonul zilnic) și se va mai schimba după măsurători, iar din starea îmbinată istoricul nu se poate reface. Aplicația trebuie să meargă în metrou, fără semnal, deci clientul are oricum nevoie de tot calculul. Iar îmbinarea între dispozitive devine reuniunea a două liste, fără reguli pe timestamp.

## Considered Options

- **Starea îmbinată, cu chei noi** (`S.u` pentru trepte, `S.m` pentru contoare): cel mai puțin de scris, dar fiecare schimbare de orar pierde istoricul, iar reținerea la 7 și la 30 de zile nu se poate măsura exact.
- **Serverul calculează și trimite starea gata făcută**: clientul rămâne subțire, dar fără semnal nu mai merge nimic, iar logica de orar s-ar scrie a doua oară, în Python, lângă cea testată din `src/`.

## Consequences

- Id-urile itemilor și ale punctelor nu se mai pot schimba: jurnalul le citează.
- Exportul `S` de azi se importă ca evenimente sintetice, câte unul pe item, cu cutia și `t`-ul lui.
- Serverul nu știe ce e scadent. Pentru amintirea zilnică, clientul îi lasă la fiecare sincronizare un rezumat al scadențelor.
- Textul scris de Alex (răspunsuri, caiet, cod) intră în jurnal, deci exportul și ștergerea devin obligatorii.
- Jurnalul crește fără limită; clientul ține o copie locală și proiecțiile calculate, nu recitește tot la fiecare pornire.
