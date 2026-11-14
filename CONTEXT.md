# Pregătirea pentru Onapsis

Aplicația cu care Alex se pregătește pentru interviul tehnic Onapsis: grile, carduri orale, fișe de teorie și Jarvis, intervievatorul vocal.

## Conținut

**Modul**:
O temă a interviului (asyncio, OOP, pytest, frontend...), cu prioritatea ei, fișa, grilele și cardurile orale.
_Avoid_: temă (în cod), capitol

**Fișă**:
Rezumatul de învățat al unui modul: o idee principală, punctele de reținut și formulările de evitat.
_Avoid_: cheat sheet, foaie

**Punct**:
Una dintre ideile de reținut ale unei fișe, într-o frază sau două. E unitatea pe care o recitești, din care Jarvis face o bucată și de care se leagă golurile.
_Avoid_: card (cardul e oral), bullet, idee

**Desfășurare**:
Explicația pe larg a unui punct, în stilul refactoring.guru: problema concretă pe care o rezolvă, ideea, un exemplu sau o analogie și, unde există un echivalent real, comparația cu C++ și locul unde ea nu mai ține. Punctul rămâne recapitularea; desfășurarea e prima întâlnire cu ideea.
_Avoid_: explicație (e a grilelor), lecție, detaliu

**Pas cu pas**:
Partea unei desfășurări care urmărește mecanismul în timp, stare cu stare (render 1 → click → render 2), acolo unde ideea e un proces în timp, nu o regulă. Completează exemplul, nu îl înlocuiește.
_Avoid_: trace, diagramă, timeline

**Termen**:
Un cuvânt tehnic cu definiția lui scurtă, în glosar, care apare subliniat oriunde e folosit (fișe, desfășurări, grile). Un text poate folosi un termen fără să-l explice; un cuvânt greu care nu e termen se explică în fraza în care apare.
_Avoid_: cuvânt cheie, jargon, definiție

**Snippet**:
Codul de pe un card oral, pe care Alex îl analizează cu voce tare. Un snippet stricat ascunde un bug: Alex spune ce nu merge, de ce și cum repară.
_Avoid_: schelet (scheletul îl scrie Alex), exemplu (exemplul e al desfășurării)

**Harta modulului**:
Desfășurarea ideii principale a unei fișe: problema mare pe care o rezolvă modulul și cum se grupează punctele lui. Se citește prima, ca punctele să se lege între ele.
_Avoid_: rezumat, introducere, cuprins

**Kata**:
O problemă de live coding (brute force, LRU cache, token bucket) pe care Alex o rezolvă în ~20 de minute, cu voce tare. Exersează gândirea, nu forma.
_Avoid_: exercițiu (prea vag), problemă

**Schelet**:
Codul minim, canonic, al unui concept (un `Process` pornit corect, un consumer pe coadă cu sentinel, un fixture cu `yield`), pe care Alex îl scrie din memorie în câteva minute. Nu rezolvă o problemă: arată că știe forma.
_Avoid_: rețetă, șablon, snippet (snippet-ul e codul de analizat dintr-un card oral)

**Punct esențial**:
Unul din cele 3–5 lucruri fără de care un schelet e greșit sau incomplet (de pildă `while`, nu `if`, în jurul lui `wait()`). Încercarea lui Alex se notează pe ele.
_Avoid_: criteriu, checklist

## Jarvis

**Antrenament pe o temă**:
Sesiune Jarvis în care Alex răspunde la cardurile orale ale unui singur modul și primește verdict pe fiecare.
_Avoid_: lecție, mod „topic” (în vorbire)

**Lecție**:
Sesiune Jarvis în care Jarvis explică fișa unui modul, bucată cu bucată, iar Alex ascultă și îl poate opri cu comenzi vocale. După fiecare grup de puncte din harta modulului, Jarvis pune o întrebare, iar răspunsul lui Alex se notează doar la întrebările deschise: lecția nu schimbă scorul și nici golurile.
_Avoid_: podcast, curs, explicație

**Bucată**:
Unitatea unei lecții: un punct din fișă, dezvoltat de Jarvis cu un exemplu, fără fapte noi. Ideea principală deschide lecția, iar formulările de evitat o încheie, drept capcane.
_Avoid_: segment, chunk, pas

**Secvență**:
O parte a unei bucăți: problema, ideea, exemplul, pașii sau comparația cu C++, spusă în 15–30 de secunde. Aplicația o dă modelului singură, cu `next_chunk`, și cere următoarea după ce s-a auzit; fereastra de ascultare vine doar după ultima.
_Avoid_: segment, pas

**Cartonaș**:
Ce arată ecranul în timpul unei secvențe (tip și conținut). La punctele cu **Tablă** e tabla; la celelalte, textul sau codul din care vorbește Jarvis. Același conținut ajunge la model.
_Avoid_: card

**Tablă**:
Câmpul scris de noi la un punct al fișei, din care se face cartonașul: 1–2 cuvinte cheie pe secvență, o schemă opțională și codul. Fără paragrafe; Jarvis povestește în jurul ei, nu o citește. Cuvintele cheie apar când sunt spuse.
_Avoid_: rezumat, subtitrare

**Poziția lecției**:
Prima bucată a unui modul pe care Alex n-a ascultat-o până la capăt; de acolo continuă lecția următoare, după o propoziție de recapitulare. Revine la început când fișa e ascultată toată.
_Avoid_: progresul lecției, bookmark

**Fereastra de ascultare**:
Cele câteva secunde de după o bucată, anunțate de un sunet scurt, în care Jarvis ascultă o comandă sau o întrebare; dacă Alex tace, lecția merge mai departe.
_Avoid_: pauza dintre bucăți (se confundă cu Pauza)

**Pauză**:
Oprirea lecției la cererea lui Alex, din buton, din căști sau prin voce, până când o reia.
_Avoid_: stop, oprire

**Mut**:
Lecție în care microfonul ajunge la Jarvis doar cât Alex ține apăsat „Vorbește”: fără fereastra de ascultare, bucățile curg una după alta, iar restul se controlează din butoane și din căști.
_Avoid_: silențios, doar ascultare

**Vorbește**:
Butonul ținut apăsat (push-to-talk) prin care Alex dă o comandă sau pune o întrebare pe Mut; cât e apăsat, Jarvis tace și ascultă.
_Avoid_: push-to-talk (în interfață), microfon

## Progres

**Jurnal de încercări**:
Lista tuturor răspunsurilor lui Alex, în ordinea în care au fost date; din ea se calculează cutiile, treptele și măsurătorile. Un eveniment nu se mai schimbă și are un id unic; setările, bifele din plan, poziția lecției și resetul sunt tot evenimente. Aplicația citește proiecția jurnalului (`S`), ținută în memorie și actualizată la fiecare eveniment, nu recalculată din tot jurnalul.
_Avoid_: istoric (`S.h` e istoricul sesiunilor, un rând pe sesiune), log, stare îmbinată
