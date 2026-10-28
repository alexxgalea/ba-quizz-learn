Status: ready-for-agent

# Lecție: Jarvis îți explică o fișă, în metrou

Vocabularul vine din `CONTEXT.md`: **Lecție**, **Bucată**, **Poziția lecției**, **Fereastra de ascultare**, **Pauză**, **Mut**, **Vorbește**, **Fișă**, **Modul**, **Antrenament pe o temă**. Decizia „live, nu audio pregenerat” e în `docs/adr/0001-lectie-live-nu-audio-pregenerat.md`.

## Problem Statement

Alex își petrece o parte din zi în metrou, cu telefonul în buzunar și căștile pe urechi. Acolo nu poate rezolva grile și nu poate vorbi liber cu Jarvis: e înghesuit, e zgomot și nu are mâinile libere. Fișele de teorie există, dar se citesc pe ecran. Jarvis există, dar doar ca intervievator: pune întrebări și dă verdicte, deci presupune că Alex știe deja materia și vorbește.

Rezultatul: timpul din metrou se pierde pentru învățat, tocmai când interviul tehnic de pe 3 noiembrie e aproape.

## Solution

Un mod nou al lui Jarvis, **Lecție**. Alex alege un modul, iar Jarvis îi explică fișa lui cu voce tare, **bucată** cu bucată, cu un exemplu legat de experiența lui, fără fapte noi față de fișă. Alex doar ascultă. Dacă vrea, oprește lecția sau pune o întrebare.

După fiecare bucată urmează o **fereastră de ascultare**: un sunet scurt și câteva secunde în care Alex poate spune „repetă”, „mai simplu”, „dă-mi un exemplu” sau o întrebare liberă. Dacă tace, lecția merge mai departe. Cu **Mut** pornit, microfonul nu mai ajunge la Jarvis decât cât Alex ține apăsat **Vorbește**, iar bucățile curg una după alta. Butonul **Pauză**, butoanele căștilor și comenzile vocale controlează lecția fără să scoată telefonul din buzunar.

Aplicația ține minte **poziția lecției** pe fiecare modul și recomandă lecția următoare: întâi cea începută, apoi modulul cu nevoia cea mai mare. Lecția apare ca rând în istoric, dar nu atinge scorul, cutiile Leitner, golurile și bugetul serii.

## User Stories

**Pornirea**

1. Ca Alex, vreau un buton mare „Ascultă lecția recomandată” în tab-ul Jarvis, ca să pornesc lecția cu o singură atingere pe peronul de metrou.
2. Ca Alex, vreau în același loc lista tuturor modulelor, ca să aleg altă temă când nu vreau recomandarea.
3. Ca Alex, vreau un buton „Ascultă” pe fiecare fișă din Studiu, ca să trec de la citit la ascultat fără să caut modul.
4. Ca Alex, vreau ca butonul „Ascultă” să apară doar în aplicația instalată (PWA), ca să nu văd un buton care în artifact nu poate merge.
5. Ca Alex, vreau ca lecția să folosească aceeași cheie Gemini, aceeași voce și aceeași răbdare ca restul lui Jarvis, ca să nu configurez nimic nou.
6. Ca Alex, vreau ca, fără cheie, lecția să mă trimită la câmpul cheii, ca la celelalte moduri, în loc să dea o eroare ciudată.

**Recomandarea**

7. Ca Alex, vreau ca recomandarea să-mi dea întâi lecția începută și neterminată („Continuă asyncio, 4/10”), ca să închei ce am început.
8. Ca Alex, vreau ca, fără lecție începută, recomandarea să aleagă modulul cu cea mai mare nevoie dintre cele a căror lecție nu am terminat-o în ultimele 2 zile, ca să nu aud mâine aceeași temă.
9. Ca Alex, vreau ca modulul Bonus și cel comportamental să nu fie recomandate, dar să le pot alege din listă, ca recomandarea să rămână pe ce contează.
10. Ca Alex, vreau să văd pe buton numele modulului și poziția („Continuă asyncio, 4/10”), ca să știu ce pornesc.

**Cum decurge lecția**

11. Ca Alex, vreau ca lecția să înceapă cu ideea principală a fișei și cu numărul de bucăți („Asyncio, în 10 idei. Prima: ...”), ca să știu cât durează.
12. Ca Alex, vreau ca fiecare bucată să dezvolte un punct din fișă cu un exemplu, în 1–1,5 minute, ca să înțeleg, nu doar să aud o enumerare.
13. Ca Alex, vreau ca exemplele să se lege de experiența mea (Django, Celery, Keycloak, Docker Swarm), ca să le țin minte mai ușor.
14. Ca Alex, vreau ca Jarvis să nu adauge fapte noi în bucăți, ca să nu învăț ceva ce nu e verificat în fișă.
15. Ca Alex, vreau ca lecția să se încheie cu formulările de evitat, spuse ca „capcane la interviu”, ca să știu ce să nu spun.
16. Ca Alex, vreau, la final, o recapitulare în trei propoziții și un rămas-bun, ca să rețin ideile.
17. Ca Alex, vreau ca Jarvis să rămână Jarvis, politicos și sec, cu umor discret, dar să explice, nu să mă examineze, ca lecția să nu pară un interviu.
18. Ca Alex, vreau ca termenii tehnici să rămână în engleză și ca vorbirea să fie fără liste și markdown, ca să sune ca o conversație.

**Fereastra de ascultare**

19. Ca Alex, vreau un sunet scurt și discret după fiecare bucată, ca să știu exact când mă aude Jarvis.
20. Ca Alex, vreau ca în fereastra de ascultare să pot spune „repetă”, „mai simplu”, „dă-mi un exemplu”, „sari”, „pauză” sau „gata”, ca să conduc lecția din voce.
21. Ca Alex, vreau ca, dacă tac ~3 secunde, lecția să treacă singură la bucata următoare, ca să nu fiu nevoit să spun „mai departe” de fiecare dată.
22. Ca Alex, vreau ca zgomotul din metrou să nu-l oprească pe Jarvis cât vorbește, ca să nu pierd jumătate din bucată.
23. Ca Alex, vreau să pot pune o întrebare liberă în fereastră („stai, de ce anulează `TaskGroup` tot grupul?”), ca lecția să nu fie doar o înregistrare.
24. Ca Alex, vreau ca Jarvis să răspundă scurt (sub ~30 de secunde), să spună când nu e sigur și apoi să revină la lecție, ca să nu pierd firul.
25. Ca Alex, vreau ca întrebările mele libere să nu se salveze nicăieri, ca să nu rămână date despre mine în aplicație.

**Mut și Vorbește**

26. Ca Alex, vreau un buton Mut, ca Jarvis să nu aștepte nimic de la mine și bucățile să curgă una după alta.
27. Ca Alex, vreau ca pe Mut microfonul să ajungă la Jarvis doar cât țin apăsat Vorbește, ca să pot pune o întrebare fără să las microfonul deschis în vagonul zgomotos.
28. Ca Alex, vreau ca, cât țin apăsat Vorbește, Jarvis să tacă și să mă asculte, ca să nu vorbim unul peste altul.
29. Ca Alex, vreau ca aplicația să țină minte dacă am Mut, ca să nu-l activez la fiecare pornire.
30. Ca Alex, vreau ca butoanele, căștile și Pauza să meargă la fel pe Mut, ca să am control complet chiar fără voce.
31. Ca Alex, vreau ca pe Mut Jarvis să nu spună „poți să mă oprești oricând”, ca să nu pierd timp cu explicații fără rost.

**Pauză și reluare**

32. Ca Alex, vreau un buton mare Pauză, ca să opresc lecția când cobor, schimb linia sau mă întreabă cineva ceva.
33. Ca Alex, vreau ca Pauza să meargă și din căști (play/pauză) și prin voce („pauză”), ca să n-o caut pe ecran.
34. Ca Alex, vreau ca, după o pauză scurtă, lecția să se reia exact din secunda în care s-a oprit, ca să nu reascult ce am auzit deja.
35. Ca Alex, vreau ca, după o pauză de peste ~10 minute sau după o conexiune pierdută, lecția să reia bucata de la început, ca să-mi revin în context.

**Căștile**

36. Ca Alex, vreau ca play/pauză de la căști să pună lecția pe pauză sau s-o reia, ca să am control fără telefon.
37. Ca Alex, vreau ca „următorul” de la căști să sară la bucata următoare, ca să trec peste ce știu deja.
38. Ca Alex, vreau ca „anterior” de la căști să repete bucata curentă, ca să reascult ce nu am prins.

**Semnalul și ecranul stins**

39. Ca Alex, vreau ca lecția să rămână pornită cu telefonul în buzunar și cu ecranul stins, ca să pot asculta în metrou.
40. Ca Alex, vreau ca, dacă Chrome nu ține conexiunea cu ecranul stins, lecția să mă lase să țin ecranul aprins sub un ecran negru „de buzunar”, ca să funcționeze oricum.
41. Ca Alex, vreau ca, la pierderea semnalului între stații, lecția să se reconecteze singură, cu reîncercări până la ~60 de secunde, ca un tunel să nu încheie sesiunea.
42. Ca Alex, vreau ca, după reconectare, Jarvis să reia bucata întreruptă cu „Reiau de unde am rămas”, ca să știu unde sunt.
43. Ca Alex, vreau ca, dacă semnalul nu revine, lecția să intre pe pauză și să mă anunțe cu un sunet scurt, ca să nu rămân în tăcere fără să știu de ce.
44. Ca Alex, vreau ca sesiunile Live de 15 minute să se lege între ele fără să observ, ca o lecție mai lungă să nu se oprească la jumătate.

**Poziția lecției**

45. Ca Alex, vreau ca aplicația să țină minte pe care bucată am rămas la fiecare modul, ca să continui de acolo data viitoare.
46. Ca Alex, vreau ca o bucată ascultată doar pe jumătate să nu conteze ca ascultată, ca poziția să arate ce am auzit cu adevărat.
47. Ca Alex, vreau ca la reluare Jarvis să înceapă cu o propoziție de recapitulare („Data trecută am ajuns la `asyncio.to_thread`...”), ca să-mi revină contextul după o zi.
48. Ca Alex, vreau ca, după ce termin o fișă, poziția să revină la început și să se țină minte data, ca recomandarea să știe când am terminat-o.
49. Ca Alex, vreau ca poziția să se sincronizeze între dispozitive ca restul progresului, ca să nu o pierd.

**Ecranul**

50. Ca Alex, vreau să văd textul bucății curente din fișă, ca numele de API să fie scrise corect, nu cum le-a auzit o transcriere.
51. Ca Alex, vreau să văd „4/10” și butoanele Pauză, Repetă, Sari, Gata, Mut și Vorbește, mari și ușor de atins cu o mână.
52. Ca Alex, vreau transcrierea restrânsă, cu un buton să o deschid, ca ecranul să rămână curat.

**Istoric și progres**

53. Ca Alex, vreau în istoric un rând „Jarvis · Lecție · <modul>” cu durata, ca să văd cât am ascultat.
54. Ca Alex, vreau ca lecția să nu schimbe scorul de pregătire, cutiile Leitner sau golurile, ca să nu pară că am învățat ceva verificat.
55. Ca Alex, vreau ca timpul din metrou să nu se scadă din bugetul serii, ca planul de seară să nu se micșoreze tocmai când am învățat mai mult.

## Implementation Decisions

**Forma generală**
- Lecția e un mod nou al modulului Jarvis, lângă antrenament, interviu simulat și antrenament pe o temă. Nu primește modul separat (CLAUDE.md: o cusătură nouă doar cu două adaptoare). Interfața lui Jarvis crește cu pornirea unei lecții pe un modul și cu comenzile Mut, Vorbește, Pauză/Reia, Repetă și Sari.
- Funcționează doar în PWA. Nu are variantă în artifact.
- Sesiunea folosește același serviciu vocal, aceeași cheie, aceeași voce și aceeași răbdare ca restul lui Jarvis.

**Conținutul și bucățile**
- Sursa unică e fișa modulului. O bucată = un punct din fișă. Ideea principală (`lead`) deschide lecția, iar formulările de evitat, dacă fișa le are, o încheie ca „capcane”. Fișele fără formulări de evitat se încheie direct cu recapitularea.
- Diagramele din fișe nu intră în lecție.
- Modelul primește bucățile printr-o funcție nouă, ca la antrenament: cere bucata următoare și primește textul, numărul ei și numărul total. Punctele nu intră în instrucțiunile de sistem, ca ordinea și poziția să le controleze aplicația, nu modelul.
- Instrucțiunile de sistem ale lecției spun: dezvoltă fiecare bucată în ~1–1,5 minute, cu un exemplu din experiența lui Alex (Django/DRF, Celery, Keycloak, Docker Swarm, Elasticsearch, computer vision); nu adăuga fapte noi; vorbește în română, cu termenii tehnici în engleză; fără liste și markdown; persona Jarvis (politicos, sec, umor discret), dar în rol de explicator, nu de examinator. Dacă primește comanda „mai simplu” sau „exemplu”, reexplică aceeași bucată. La o întrebare liberă poate folosi ce știe el, scurt (sub ~30 s), cu „nu sunt sigur” când nu e; apoi revine la lecție.
- Începutul: ideea principală și numărul de bucăți („Asyncio, în 10 idei. Prima: ...”). Fără cuprins citit. Sfârșitul: capcanele, apoi o recapitulare în trei propoziții și rămas-bun.

**Ritmul și controlul**
- Aplicația, nu modelul, decide momentul trecerii la bucata următoare: ține ceasul ferestrei și declanșează bucata următoare.
- **Fereastra de ascultare** se deschide după ce audio-ul bucății s-a redat complet: un sunet scurt, apoi ~3 secunde. Microfonul trimite sunet doar atunci. Dacă nu se aude nimic, lecția trece la bucata următoare. Dacă Alex vorbește, fereastra se prelungește cât ține tura lui, apoi Jarvis răspunde și revine la lecție.
- Cât vorbește Jarvis, microfonul nu ajunge la server (comportamentul „Întrerupere doar cu căști”, pornit implicit în lecție), ca zgomotul din metrou să nu-l întrerupă.
- **Mut:** microfonul nu ajunge la server, nici în fereastra de ascultare, care nu mai există. Singura excepție e **Vorbește**, ținut apăsat. La apăsare, redarea se oprește ca la o întrerupere, iar microfonul se deschide; la eliberare, serverul detectează sfârșitul turei. Mut-ul se ține minte între sesiuni, cu setările Jarvis din stocarea locală, nu în starea de progres.
- **Bucata întreruptă** (de Pauză, de o întrebare cu Vorbește, de o conexiune pierdută) nu e „ascultată” până nu se redă toată. După întrerupere, Jarvis o reia de la început. Excepția e reluarea exactă din Pauză, descrisă mai jos.
- **Pauza** se declanșează din buton, din căști sau prin voce. Pe Pauză, redarea se oprește fără să piardă audio-ul deja primit. Dacă Alex reia în ~10 minute și conexiunea a rămas deschisă, redarea continuă din aceeași secundă. Altfel, bucata se reia de la început.
- **Comenzi:** Repetă și Sari sunt butoane, taste de căști și comenzi vocale. Funcțiile oferite modelului pentru comenzi vocale sunt: bucata următoare, repetă bucata, pauză și încheiere. „Mai simplu” și „exemplu” sunt tratate de model prin reexplicare, fără funcție.

**Semnalul și ecranul stins**
- Pentru lecție, reîncercările de reconectare se prelungesc până la ~60 de secunde (azi sunt trei, ~3,5 s). După reconectare, bucata întreruptă se reia de la început cu „Reiau de unde am rămas”.
- Dacă reconectarea nu reușește în acel interval, lecția intră pe Pauză și redă un sunet scurt de avertizare.
- Sesiunile de 15 minute se leagă prin reluarea și compresia contextului care există deja.
- Ecranul stins: ținta e ca lecția să meargă. **Depinde de proba din §Further Notes.** Dacă proba arată că Chrome taie conexiunea, se adaugă un ecran negru „de buzunar” care ține ecranul aprins și ignoră atingerile până la un gest de deblocare. Până atunci, comportamentul actual (ecranul stins = pauză) rămâne.

**Căștile**
- Butoanele căștilor (play/pauză, următorul, anterior) se leagă la Pauză/Reia, Sari și Repetă. **Depinde de aceeași probă.** Dacă nu merg, rămân butoanele de pe ecran și comenzile vocale.

**Poziția lecției și recomandarea**
- Poziția se ține per modul în starea de progres (bucata la care a ajuns, data ultimei terminări). Se sincronizează cu restul progresului, cu îmbinare pe item după timestamp. Un reset de progres o șterge, ca pe celelalte.
- Poziția avansează doar când o bucată s-a redat complet. Terminarea fișei o aduce la zero și notează data.
- La reluare dintr-o poziție > 0, Jarvis începe cu o propoziție de recapitulare a ultimei bucăți ascultate, apoi continuă.
- Recomandarea, în ordine: lecția începută; altfel modulul cu cea mai mare nevoie dintre cele terminate acum mai mult de 2 zile sau niciodată; fără Bonus și fără comportamental. Nevoia e cea existentă pentru modulele din plan; lecția ascultată nu o schimbă, de aceea 2 zile de excludere.

**Istoric și plan**
- La final de lecție, indiferent cum se termină, dacă s-a ascultat cel puțin o bucată, apare un rând în istoric „Jarvis · Lecție · <modul>” cu durata, marcat ca lecție.
- Rândul marcat ca lecție nu se numără în minutele serii (nu scade din bugetul planului de azi). Nu se adaugă sarcină în plan.
- Lecția nu scrie în scor, cutiile Leitner, golurile și întrebările deschise.

**Ecranul**
- Vedere nouă pentru lecție: textul bucății curente din fișă, „4/10”, butoanele Pauză, Repetă, Sari, Gata, Mut și Vorbește, transcrierea restrânsă. Butoanele sunt mari, pentru o singură mână, la 360 px, în light și dark.
- În tab-ul Jarvis apare ca al patrulea mod, cu butonul pentru lecția recomandată și lista modulelor. Pe fiecare fișă din Studiu apare butonul „Ascultă”, doar în PWA.

**Seams (toate existente, fără altele noi)**
- **Jarvis (`create` cu mediul lui):** seam-ul de sus. Testele pornesc o lecție cu serviciul vocal fals, audio fals, ceas fals, stocare în memorie și aplicația stub.
- **PrepApp:** primește metode noi pentru conținutul fișei, poziția lecției, recomandare și rândul din istoric. Stub-ul din teste se extinde la fel.
- **Audio:** primește, ca metode noi, sunetul scurt al ferestrei de ascultare (și cel de avertizare), pauza și reluarea redării cu păstrarea cozii și legarea la butoanele căștilor. Audio fals se extinde la fel. Poarta microfonului pentru Mut și Vorbește stă în `Call`, lângă logica existentă pentru „Întrerupere doar cu căști”.

## Testing Decisions

- Un test bun verifică comportamentul vizibil din exterior: ce spune modelul, ce funcții apelează, ce ajunge la server (sunetul din microfon), ce salvează aplicația, ce vede ecranul. Nu verifică structura internă. Testele pornesc de la interfața lui Jarvis și de la cea a lui `Call`, peste adaptoare false, fără rețea și fără sunet real.
- Se testează prin Jarvis (peste `Call` real):
  - lecția începe cu ideea principală și numărul de bucăți, trece prin bucăți în ordine și se încheie cu capcanele și recapitularea;
  - fereastra de ascultare: se deschide după redarea completă, ține ~3 s, trece mai departe la tăcere, se prelungește când Alex vorbește;
  - Mut: nu trimite microfon, nu deschide fereastră, se ține minte; Vorbește deschide microfonul doar cât e apăsat și oprește redarea;
  - Pauză: din buton, din căști și prin voce; reluare exactă sub ~10 minute, de la început după ele sau după conexiune pierdută;
  - bucata întreruptă nu avansează poziția;
  - reconectare: reîncercări până la ~60 s, reluare cu „Reiau de unde am rămas”, pauză cu sunet de avertizare;
  - istoric: un rând marcat ca lecție, doar dacă s-a ascultat cel puțin o bucată.
- Se testează prin app (aceleași teste de unitate Node): poziția lecției (avans, reset, terminare, îmbinare între dispozitive), recomandarea (cele trei reguli), excluderea rândurilor de lecție din minutele serii și faptul că lecția nu atinge scorul, Leitner-ul și golurile.
- Se testează prin `Call`: poarta microfonului pentru Mut și Vorbește, lângă testele pentru `halfDuplex`.
- Se testează prin Audio: pauză și reluare cu păstrarea cozii, sunetul scurt, legarea butoanelor căștilor.
- Testele de ecran din `tools/` (cele cu `window.__jarvisFakes`) acoperă vederea lecției, butonul din Studiu și butonul pentru lecția recomandată, la 360 px în light și dark.
- Prior art: `tools/unit/jarvis.test.mjs`, `tools/unit/call.test.mjs`, `tools/unit/audio.test.mjs` și fake-urile din `tools/unit/fakes.mjs`. Modificările de logică se fac cu TDD, test la interfață, apoi cod.

## Out of Scope

- Audio generat dinainte și redat offline (vezi ADR 0001; revine dacă proba din metrou arată că semnalul e prea slab).
- Explicațiile grilelor, cardurile orale și golurile ca sursă a lecției; diagramele din fișe.
- Întrebări de verificare în timpul lecției și orice scor, Leitner sau gol pentru lecție.
- Sarcină „Ascultă” în plan (se poate adăuga mai târziu).
- Salvarea întrebărilor libere sau a transcrierilor.
- Lecție în artifact; iOS; cuvânt de trezire „Jarvis”.
- Coadă automată de lecții: o temă este o lecție.

## Further Notes

- **Proba înainte de cod.** Patru lucruri nu se pot afla decât pe telefonul lui Alex, în metrou, și decid ce se construiește: (1) merg conexiunea și sunetul cu ecranul stins, în PWA; (2) merg butoanele căștilor Bluetooth prin Media Session; (3) ce se întâmplă cu reconectarea și reluarea într-un tunel adevărat; (4) zgomotul din fereastra de ascultare și butonul Vorbește pe Mut. Se face o pagină de probă de aruncat, în stilul probei Jarvis din 22 octombrie, iar logica independentă de rezultate se construiește în paralel, test-first.
- Rămân de verificat în folosire: limita zilnică a nivelului gratuit Live (nepublicată) și o lecție lungă de ~18 minute (de exemplu `frontend`, 12 puncte) peste reluarea sesiunii.
- Interviul e pe 3 noiembrie 2026. Livrarea e în felii: întâi lecția cu ecranul aprins, apoi ecranul stins și căștile, după ce proba răspunde.
- După implementare se actualizează secțiunea Arhitectura din `CLAUDE.md` și `README.md`.
