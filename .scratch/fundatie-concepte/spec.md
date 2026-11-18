Status: ready-for-agent

# Fundația: orar de durată, itemi legați de puncte, trepte

Val 0 din `docs/imbunatatire.md` (secțiunile 0.1–0.4, cu hotărârile din 11 noiembrie 2026). Se scrie direct pe jurnalul de încercări (ADR 0003, `.scratch/platforma/`), care e gata. Ordinea, hotărâtă cu Alex pe 18 noiembrie 2026: întâi orarul (0.3), fiindcă e mic, nu depinde de nimic și aduce planul zilnic înapoi; apoi legăturile item–punct (0.1), care deblochează lecția care întreabă (`.scratch/lectie-sincronizata/issues/09`) și Val 1; apoi treptele (0.2). Partea 0.4 (urmele pentru măsurare) e jurnalul însuși și nu mai cere lucru.

## Problem Statement

Interviul a trecut pe 10 noiembrie, iar `genPlan` întoarce o listă goală după data interviului: din acea zi, Azi nu mai propune nimic. Orarul Leitner e unul de sprint (20 min, 4 h, o zi, două zile, apoi „niciodată”), deci ce a ajuns în cutia 5 nu mai revine. Pentru memoria de durată, scopul de acum, orarul trebuie să întindă intervalele pe luni și să nu lase nimic să iasă definitiv.

Progresul se ține pe item, nu pe concept. Grilele, cardurile orale, scheletele și kata-urile nu știu de ce punct al fișei țin, iar golurile se leagă prin cuvinte comune (`relRank`). Fără legătura asta, nici lecția nu poate pune o întrebare pe grupul de puncte tocmai explicat, nici sesiunea ghidată din Val 1 nu poate alege adâncirea potrivită, nici scorul nu poate spune ce concepte sunt stăpânite.

## Solution

1. **Orar de durată.** Cutiile urcă până la 8: 20 min, 4 h, 1 zi, 3 zile, 7 zile, 16 zile, 35 de zile, 75 de zile. Cutia de sus revine. Numerele cutiilor nu se schimbă la trecere, deci un item din cutia 5 devine scadent la 7 zile după ultimul răspuns.
2. **Plafon zilnic de repetat.** Ce era scadent dinainte de azi intră zilnic doar cât încape în plafon (implicit 25 de minute, setabil), în ordinea prioritate × cât de depășit e. Restul rămâne scadent pe zilele următoare, fără penalizare.
3. **Două moduri de plan.** „Interviu”, cu o dată, ca până acum. „Întreținere”, fără dată sau cu data trecută, cu minute pe zi: planul are doar ziua de azi (scadențele din plafon, modulul cu nevoia cea mai mare, o sarcină de cod). În modul interviu, cu mai puțin de 14 zile rămase, intervalele se plafonează la jumătate din zilele rămase.
4. **Itemii se leagă de puncte.** Câmpul `pt: [n, …]` pe grile, schelete și kata-uri și `kp` pe cardurile orale (paralel cu `k`). Etichetele le propune un utilitar și le confirmă agentul citind fiecare item. Evenimentele de răspuns poartă punctele.
5. **Treptele unui punct.** Recunosc, îmi amintesc, explic, scriu, aplic. Se calculează la randare din proiecții și din jurnal, se arată în fișă, iar `readiness` se recalculează din ele.

## User Stories

1. Ca Alex, după interviu, vreau să deschid aplicația și să găsesc ce am de repetat azi, ca să nu uit ce am învățat.
2. Ca Alex, vreau ca o grilă știută de mult să revină peste câteva săptămâni sau luni, nu niciodată, ca s-o țin minte și peste un an.
3. Ca Alex, vreau ca, după o pauză sau la trecerea pe orarul nou, scadențele să nu mă îngroape: o porție pe zi, cele mai importante și cele mai întârziate primele.
4. Ca Alex, vreau să aleg cât timp am pe zi pentru repetat și cât pentru tot planul, ca planul să încapă în seara mea.
5. Ca Alex, vreau ca la un interviu nou să pun o dată și planul să se facă pe zile până atunci, cu tot ce am învățat revenit înainte de dată.
6. Ca Alex, vreau ca o greșeală de azi să revină tot azi, chiar dacă plafonul e plin, ca să învăț pe loc ce am greșit.
7. Ca Alex, vreau să văd în fișă cât de bine știu fiecare punct (recunosc, îmi amintesc, explic, scriu, aplic), ca să știu ce lipsește.
8. Ca Alex, vreau ca lecția să mă întrebe pe grupul de puncte tocmai explicat, ca să știu dacă am prins ideea.
9. Ca agent care scrie Val 1, vreau ca fiecare grilă să știe de ce punct ține, ca adâncirea să urce exact punctul acela.

## Implementation Decisions

### Orar (tichetele 01–03)

- **O singură constantă pentru cutii**: `Journal.BOX_MAX = 8` în `src/journal.js` (regulile Leitner, `leitner`, `stepQ`, `stepX`), iar în `src/app.js` tabelul intervalelor (`BOX_IV`) și stăpânirea pe cutie (`MB`, `needW`) sunt indexate până la el. Niciun `5` scris de mână nu mai rămâne.
- **Intervalele**: cutia 1 → 20 min, 2 → 4 h, de la 3 în sus zile calendaristice: 1, 3, 7, 16, 35, 75. Itemul devine scadent la miezul nopții (ora locală) din ziua `t` + N, ca acum la cutiile 3 și 4: Alex învață seara, deci „peste o zi” înseamnă seara următoare, nu la ora exactă.
- **Jurnalul se reproiectează.** Fiindcă regulile stau în `Journal.apply`, toate dispozitivele care rulează clientul nou calculează cutiile cu plafonul 8 din aceleași evenimente. Un răspuns corect dat înainte, cu itemul deja în cutia 5, a fost atunci „fără efect” și acum urcă itemul în cutia 6: e câștigul promis de ADR 0003 (orarul se schimbă fără să se piardă istoricul).
- **Stăpânirea pe cutie (`MB`)** rămâne 1 de la cutia 5 în sus, ca scorul de azi să nu se schimbe la trecere. Scorul pe puncte (tichetul 07) îl înlocuiește.
- **Fereastra de interviu**: în modul interviu, cu `daysLeft() < 14`, un interval în zile devine `min(interval, max(1, floor(zile rămase / 2)))`, socotit de la ziua ultimului răspuns. Un item revăzut demult devine scadent pe loc, iar plafonul îl împarte pe zile.
- **Plafonul** se aplică scadențelor de grile, carduri orale și întrebări deschise, împreună (`dueQ`, `dueO`, `dueX` întorc porția de azi). Scheletele au sarcina lor (`sch`) și nu intră în plafon.
  - Intră în plafon doar **restanța**: itemii scadenți al căror ultim răspuns e dinainte de azi. Itemii la care ai răspuns azi și care revin azi (cutiile 1 și 2, după o greșeală) vin mereu, în afara plafonului.
  - Durata estimată: grilă 0,7 min, întrebare deschisă 1,5 min, card oral 3 min (aceleași ordine de mărime ca estimările din `mkTask` și din Grile).
  - Consumul de azi: proiecția notează pe intrare ziua în care itemul a fost repetat din restanță (`rd`, miezul nopții local, în ms), când un răspuns vine peste o intrare cu `t` dintr-o zi anterioară. Plafonul rămas = plafon − suma duratelor intrărilor cu `rd` = azi. Câmpul stă pe intrare, deci nu e cheie nouă în `S`, iar proiecția rămâne aceeași pe orice dispozitiv.
  - Ordinea restanței: `PW[prioritate] × (1 + întârziere / interval)`. Porția se taie la primul item care nu mai încape, dar cel puțin un item intră cât timp plafonul nu e consumat.
- **Setările** (`cfg`): evenimentul `cfg` primește, pe lângă `d` (data) și `h` (ore pe seară), `m` (minute pe zi în întreținere, implicit 45) și `r` (plafonul de repetat, implicit 25). `d: ""` înseamnă fără dată. Evenimentele vechi, fără `m` și `r`, iau valorile implicite. `P.cfg.interview` rămâne în date (data trecută dă tot întreținere), fiindcă `tools/fixed_day.py` îngheață testele la 5 zile înaintea ei.
- **Modul**: `planMode()` = „interviu” când data e validă și `daysLeft() ≥ 0`, altfel „întreținere”.
- **Planul de întreținere**: o singură zi, azi, în bugetul `m`: scadențele (`due`), fișa și grilele modulului cu nevoia cea mai mare (`sheet-<modul>`, sau `smart` când toate modulele sunt acoperite), o sarcină de cod (`sch` dacă are ce propune, altfel un kata), golurile (`gap`) când există. Cheile sarcinilor rămân `g<dată>-<cheie>`, deci bifele merg ca până acum. Antetul și cardul de sus spun „Întreținere”, nu „Interviul a trecut”.
- **Progres › Planul**: data (cu „Fără dată” pentru întreținere), ore pe seară (interviu), minute pe zi (întreținere), plafonul de repetat.

### Legături item–punct (tichetele 04–06)

- Id-ul unui punct: `<modul>:<n>`, cu `n` de la 1, ordinea din `P.sheets[modul].points` (aceeași cu `src/desf/<modul>.md`). Punctele nu se reordonează (regulă existentă).
- Câmpul `pt: [n, …]` pe grile (în `src/data_mcq*.js`, `src/data_fe.js`), schelete (`src/data_skel.js`) și kata-uri (`src/data_katas.js`; un kata poate atinge puncte din mai multe module, deci acolo `pt: ["modul:n", …]`). Pe cardurile orale `kp: [n | null, …]`, paralel cu `k`. Întrebările deschise moștenesc `pt` de la grila lor. `pt: []` scris explicit = nu se leagă de niciun punct.
- `tools/tagpoints.mjs <modul>` propune legăturile cu `relRank` (aceleași cuvinte comune ca golurile); agentul le citește și le confirmă item cu item. Nu se acceptă propunerile orbește.
- `validate.mjs`: avertisment la item fără `pt` / `kp`; eroare la indexuri inexistente și, pe un modul P1 etichetat complet, la orice item fără câmp. Raport: punctele fără nicio grilă și punctele fără nicio formă de producție (oral, schelet, kata).
- Evenimentele `answer` poartă `points` (`["modul:n", …]`) din câmpul itemului. La cardul oral, punctele acoperite și cele ratate se pot citi din `kp` + `missed`.

### Trepte (tichetul 07)

- Tabelul din `docs/imbunatatire.md` 0.2. Treptele 1, 3 și 4 se calculează la randare din proiecțiile grilelor, cardurilor, scheletelor și kata-urilor; 2 și 5 din evenimentele care poartă punctul (întrebările deschise de azi dau treapta 2; treapta 5 nu are încă o formă care s-o producă).
- Scara unui punct are doar treptele pentru care există itemi; un punct **ține** când cea mai înaltă treaptă a fost trecută la un interval de cel puțin 7 zile.
- `readiness` din puncte: 0,3 recunosc, 0,6 îmi amintesc, 0,8 explic, 1 scriu sau aplic.
- Fișa arată treapta fiecărui punct.

## Testing Decisions

- Orarul și plafonul: `tools/unit/journal.test.mjs` (cutia urcă până la 8, nu peste; `rd` se pune doar peste o intrare din altă zi; `proiecție(import(S)) = S` rămâne adevărat) și `tools/test_plan.py` (scadența pe fiecare cutie, cutia 5 revine la 7 zile, fereastra de 14 zile, plafonul taie restanța și lasă greșelile de azi, modul întreținere cu data trecută și cu data ștearsă, setările noi).
- Toată suita din `CLAUDE.md` după fiecare tichet: testele care îngheață „azi” la 5 zile înaintea datei implicite rulează acum în fereastra de interviu (intervalele în zile plafonate la 2), deci se urmărește că nu se bazează pe intervalele vechi.
- Legăturile: `validate.mjs` (indexuri, avertismente, raport) și un test pe `tools/tagpoints.mjs`.
- Treptele: test cu stări construite, câte una pe treaptă, și screenshot al fișei la 360 px, light și dark.

## Out of Scope

- Sesiunea ghidată, adâncirile și încrederea (Val 1).
- Ecranul de măsurare (Val 6) și amintirea zilnică (Val 7).
- Premisele dintre puncte (Val 8).
- Reglarea intervalelor și a plafonului: rămân cele de mai sus până după prima lună de date din jurnal (hotărâre din 11 noiembrie).

## Further Notes

- `README.md` spune 264 de grile și 217 întrebări deschise; în date sunt 329. Se corectează la tichetul 04, primul care atinge grilele.
- Termenii noi (Treaptă, Întreținere, Plafon) intră în `CONTEXT.md` odată cu tichetul care îi folosește.
