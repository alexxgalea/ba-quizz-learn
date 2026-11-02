Status: ready-for-agent

Tichete: `.scratch/desfasurari/issues/` (01–22; frontiera de start: 01).

# Desfășurări: punctele fișelor, explicate ca pe refactoring.guru

Vocabularul vine din `CONTEXT.md`: **Fișă**, **Punct**, **Desfășurare**, **Harta modulului**, **Modul**, **Lecție**, **Bucată**, **Poziția lecției**. Deciziile au ieșit dintr-o sesiune de grilling (2 noiembrie 2026); jurnalul e în Further Notes. ADR-ul existent (0001, Lecția live) nu e atins: desfășurarea doar dă Lecției material verificat.

## Problem Statement

Alex citește fișa unui modul ca prim contact cu tema: textul din Studiu chiar spune „Deschizi fișa, o citești, apoi faci grilele”. Dar fișele sunt scrise ca rezumate de recitit, nu ca explicații. Un singur punct strânge patru-cinci fapte într-o frază (de pildă, la `asyncio`, `gather` cu ordinea rezultatelor, excepția, faptul că restul nu se anulează și `return_exceptions`), presupune jargonul cunoscut și nu spune niciodată ce problemă rezolvă ideea.

La modulele pe care nu le știe, efectul e că „nu se leagă nimic”: punctele par fapte izolate, fără un fir. Explicațiile grilelor au deja o structură bogată (Pe scurt, Mecanism, Pas cu pas, Legătură), dar ele vin după fișă și sunt legate de o singură întrebare.

Alex are experiență de OOP în C++ (C++11/17: clase, `virtual`, RAII, smart pointers, STL, thread-uri; fără coroutine). Aplicația nu o folosește nicăieri: legăturile actuale merg doar spre Django, Celery, React, Docker Swarm și restul experienței de backend.

Ținta de claritate este https://refactoring.guru/design-patterns: fiecare idee pornește de la o problemă concretă, apoi vine soluția, o analogie din lumea reală, codul și legăturile cu restul.

## Solution

Fiecare punct al unei fișe primește o **desfășurare**, deschisă cu un tap pe „Pe larg ›”, sub punct. Desfășurarea pornește de la **Problemă** (o situație concretă în care, fără ideea asta, ceva merge prost), spune **Ideea** în una-două propoziții, cu câte un fapt pe propoziție, apoi dă un **Exemplu** de cod scurt sau o **Analogie**. Unde există un echivalent real, are o comparație **În C++**, întotdeauna cu **Unde nu ține** (prietenii falși: `__del__` nu e destructor, `__init__` nu alocă obiectul). Opțional, o **Legătură** cu ce a făcut Alex sau cu alt punct ori altă grilă.

Ideea principală a fișei primește **Harta modulului**: problema mare a modulului și cum se grupează punctele lui („1–2: cum se creează obiectul; 3–5: atributele…”). Harta se citește prima, ca punctele să se lege între ele; punctele primesc numere vizibile, ca harta să le poată numi.

Punctele rămân neschimbate (sunt recapitularea), cu excepția erorilor de fapt, pe care Alex le află explicit. Desfășurările sunt scrise de agent, cu fapte verificate, statice în date; exemplele Python rulează automat înainte de fiecare publicare.

„Întreabă despre asta” pe o fișă primește desfășurările în context. Lecția cu Jarvis le primește într-un tichet separat, după modulele P1, ca Jarvis să spună materialul verificat în loc să improvizeze exemplul.

Livrarea e pe module, cu publicare după fiecare: întâi `oop`, ca lot de calibrare citit de Alex pe telefon, apoi restul modulelor P1 (python, gil, asyncio, asgi, pytest, frontend, design), apoi P2 și P3 în sesiunile următoare; Bonus la final sau deloc.

## User Stories

**Citirea unei fișe**

1. Ca Alex, vreau un „Pe larg ›” sub fiecare punct al fișei, ca să deschid explicația doar la punctele pe care nu le înțeleg.
2. Ca Alex, vreau ca desfășurările să fie închise implicit, ca fișa să rămână o recapitulare scurtă când o recitesc.
3. Ca Alex, vreau ca un al doilea tap pe „Pe larg” să închidă desfășurarea, ca să revin la lista scurtă.
4. Ca Alex, vreau un buton „Deschide tot” pe fișă, ca să citesc un modul nou de sus până jos fără zeci de tap-uri.
5. Ca Alex, vreau ca același buton să devină „Închide tot” după ce am deschis tot, ca să revin la recapitulare dintr-o mișcare.
6. Ca Alex, vreau ca desfășurările deschise să rămână deschise cât navighez în aceeași fișă (de pildă după ce întreb ceva sub ea), ca să nu pierd locul.
7. Ca Alex, vreau ca un modul fără desfășurări să arate exact ca azi, ca modulele încă nescrise să nu aibă butoane goale.
8. Ca Alex, vreau ca punctele să aibă numere vizibile când modulul are hartă, ca harta și legăturile să le poată numi.
9. Ca Alex, vreau ca desfășurarea să se citească bine la 360 px, în light și dark, ca s-o citesc seara pe telefon.
10. Ca Alex, vreau ca termenii din glosar să fie legați și în desfășurări, la fel ca în puncte, ca să deschid definiția unui termen necunoscut fără să caut.

**Desfășurarea unui punct**

11. Ca Alex, vreau ca fiecare desfășurare să înceapă cu Problema, o situație concretă în care ceva merge prost, ca să știu de ce există ideea înainte să aflu ce spune.
12. Ca Alex, vreau ca Ideea să fie în una-două propoziții, cu câte un fapt pe propoziție, ca să nu mai despachetez fraze dense.
13. Ca Alex, vreau un Exemplu de cod scurt (cel mult ~8 rânduri) sau o Analogie din viața de zi cu zi, ca ideea să aibă o formă concretă.
14. Ca Alex, vreau ca rezultatul unui exemplu să fie scris lângă linia care îl produce (`# → [1]`), ca să nu fie nevoie să rulez codul în cap.
15. Ca Alex, vreau ca o desfășurare să aibă de regulă 60–90 de cuvinte, ca s-o citesc în mai puțin de un minut.
16. Ca Alex, vreau ca punctele cu adevărat grele (MRO, anularea în asyncio, GIL-ul și `+=`) să poată avea o desfășurare mai lungă, cu înainte și după, ca acolo să nu se taie explicația.
17. Ca Alex, vreau ca desfășurarea să nu introducă fapte care contrazic punctul, ca recapitularea și explicația să spună același lucru.
18. Ca Alex, vreau ca exemplele de frontend să fie în TypeScript/TSX, fără colorare Python, ca să arate cum le-aș scrie la interviu.

**C++**

19. Ca Alex, vreau ca, unde există un echivalent real, desfășurarea să compare ideea cu C++, ca să pornesc de la ce știu deja.
20. Ca Alex, vreau ca fiecare comparație cu C++ să spună și unde nu ține, ca să nu duc la interviu un prieten fals (de pildă „`__del__` e destructorul”).
21. Ca Alex, vreau ca comparațiile cu C++ să pornească de la C++11/17 (clase, `virtual`, RAII, smart pointers, STL, thread-uri), fără coroutine, ca să fie la nivelul meu.
22. Ca Alex, vreau ca la modulele fără echivalent în C++ (GraphQL, Celery, Docker, design) să lipsească comparația, ca să nu citesc analogii forțate.
23. Ca Alex, vreau comparațiile cu cel mai mare câștig acolo unde contează: `virtual` și duck typing, MRO față de diamant, `__init__` față de constructor, refcount față de `shared_ptr`, `with` față de RAII, compilat față de bytecode, `std::thread` și `std::mutex` față de GIL și `Lock`, generatori față de iteratori STL.
24. Ca Alex, vreau ca faptele despre C++ să fie verificate la fel ca cele despre Python, ca să nu greșesc tocmai unde mă simt sigur.

**Harta modulului**

25. Ca Alex, vreau ca fiecare modul cu desfășurări să aibă o hartă sub ideea principală, ca să văd firul înainte de puncte.
26. Ca Alex, vreau ca harta să spună problema mare a modulului, ca să știu de ce există tot modulul.
27. Ca Alex, vreau ca harta să grupeze punctele pe numere („1–2: …; 3–5: …”), ca să știu cum se leagă între ele.
28. Ca Alex, vreau ca harta să fie închisă implicit, la fel ca desfășurările, și deschisă de „Deschide tot”, ca fișa să rămână scurtă la recitire.
29. Ca Alex, vreau ca o Legătură dintr-o desfășurare să poată numi alt punct sau o grilă (CEL-07, PG-02), ca să sar la ce se leagă.
30. Ca Alex, vreau ca Legătura să pomenească experiența mea (Django/DRF, React, Elasticsearch, Docker Swarm, Keycloak, Celery, computer vision, C++) doar când chiar ajută, ca să nu fie umplutură.

**Întreabă despre asta**

31. Ca Alex, vreau ca „Întreabă despre asta” sub o fișă să știe și desfășurările, ca răspunsul să pornească de la aceeași explicație pe care am citit-o.
32. Ca Alex, vreau ca, la un modul fără desfășurări, „Întreabă” să meargă exact ca azi, ca nimic să nu se strice între loturi.

**Lecția cu Jarvis (tichet separat, după P1)**

33. Ca Alex, vreau ca, la o Lecție, Jarvis să primească desfășurarea punctului ca material pentru bucată, ca exemplul pe care îl aud să fie cel verificat, nu unul inventat.
34. Ca Alex, vreau ca Lecția să se deschidă cu harta modulului când există, ca să aud firul înainte de puncte.
35. Ca Alex, vreau ca poziția lecției să rămână validă după ce un modul primește desfășurări, ca să nu reiau de la alt punct.
36. Ca Alex, vreau ca, la un modul fără desfășurări, Lecția să meargă exact ca azi.

**Calitatea conținutului**

37. Ca Alex, vreau ca fiecare exemplu Python să ruleze automat înainte de publicare, cu rezultatele din comentarii comparate cu ce afișează efectiv, ca să nu rețin un rezultat greșit.
38. Ca Alex, vreau ca o excepție așteptată într-un exemplu să fie marcată explicit și verificată, ca exemplele cu `TypeError` să fie la fel de sigure ca restul.
39. Ca Alex, vreau ca faptele (valori implicite, versiuni, nume de API) să fie verificate pe surse primare și notate în fișierul de fapte, ca să pot avea încredere în ce citesc.
40. Ca Alex, vreau să aflu explicit fiecare eroare de fapt găsită într-un punct și corectată, ca să știu ce am învățat greșit.
41. Ca Alex, vreau ca punctele să nu fie împărțite, unite sau reordonate, ca Lecția, golurile și brief-ul să rămână legate de aceleași puncte.
42. Ca Alex, vreau ca rândurile de cod din desfășurări să aibă cel mult 36 de caractere, ca să încapă pe telefon fără scroll orizontal.
43. Ca Alex, vreau ca o desfășurare să nu repete punctul cuvânt cu cuvânt, ca să primesc altceva decât recapitularea.

**Livrarea**

44. Ca Alex, vreau ca `oop` să vină primul, ca lot de calibrare, ca să spun dacă formatul mă ajută înainte de restul.
45. Ca Alex, vreau ca după `oop` formatul să se ajusteze după ce spun, ca restul modulelor să fie scrise deja în forma bună.
46. Ca Alex, vreau ca fiecare modul să fie publicat imediat ce e gata, la același link, ca să-l citesc în aceeași seară.
47. Ca Alex, vreau un mesaj scurt, în română, la fiecare publicare, cu modulele noi și erorile de fapt corectate.
48. Ca Alex, vreau ca progresul, scorul, Leitner-ul și golurile să nu se schimbe din cauza desfășurărilor, ca citirea să nu-mi altereze starea.
49. Ca Alex, vreau ca desfășurările să meargă și în artifact, și în PWA, ca să le citesc oriunde.

## Implementation Decisions

**Concept și date**

- Desfășurarea e conținut static, scris de agent, nu generat la cerere. Sursa e text Markdown, câte un fișier pe modul, alături de explicațiile grilelor, dar într-un loc separat de ele, cu un format de titluri propriu, ca id-urile să nu se ciocnească cu cele ale grilelor (`oop-01` e o grilă).
- Parsarea se face la build, în același strat care parsează explicațiile grilelor și glosarul: un parser de câmpuri cu blocuri de cod. Rezultatul e injectat în `window.PREP`, pe modul: harta și lista desfășurărilor, indexată exact ca punctele fișei.
- Câmpurile unei desfășurări: Problema, Ideea, Exemplu, Analogie, În C++, Unde nu ține, Legătură, plus un marcaj opțional de punct greu care permite limita mare de lungime.
- Câmpurile hărții: Problema (modulului) și Grupuri (fiecare grup numește un interval de puncte și ce au în comun).
- Un modul are fie toate desfășurările plus hartă, fie nimic; nu există module pe jumătate. Legătura dintre desfășurare și punct e indexul; punctele nu se reordonează (vezi mai jos), deci indexul e stabil.
- Punctele fișelor nu se împart, nu se unesc și nu se reordonează. Se corectează doar erorile de fapt, și fiecare corectură se anunță în mesajul de publicare.

**Ecranul (Studiu › Fișe)**

- Sub ideea principală: „Harta modulului ›”, închisă implicit. Sub fiecare punct: „Pe larg ›”, închis implicit. Sus în fișă: „Deschide tot” / „Închide tot”, care acționează pe hartă și pe toate desfășurările.
- Punctele primesc numere vizibile doar la modulele cu desfășurări.
- Textul trece prin același randator ca explicațiile grilelor (cod colorat, termeni din glosar legați după aceleași reguli și aceeași evidență a termenilor deja legați în fișă). Codul C++ și cel TS/TSX nu primesc colorare Python.
- Starea deschis/închis stă doar în starea de interfață (`ui`), nu în `S`: nu se salvează, nu se sincronizează, nu intră în export sau în brief. Nu se marchează ce a fost citit.
- Fișele fără desfășurări se randează identic cu azi.

**Întreabă despre asta**

- Contextul pentru o fișă (`sheet:<modul>`) primește, când există, harta și desfășurările, după punctele de azi. Contextul pentru o grilă și pentru un gol rămâne neschimbat. Limitele de lungime și de schimburi ale lui „Întreabă” rămân aceleași.

**Lecția (tichet separat, după P1)**

- `PrepApp.sheet` expune și harta și desfășurările. Bucata unui punct primește desfășurarea ca material; regula „fără fapte noi” rămâne. Deschiderea lecției folosește harta când există, altfel ideea principală, ca azi. Numărul bucăților și poziția lecției nu se schimbă, fiindcă desfășurările sunt indexate ca punctele.

**Ce nu se schimbă**

- Teoria de la goluri rămâne pe puncte (potrivirea pe cuvinte comune s-ar strica pe text lung). Brief-ul pentru Perplexity rămâne pe puncte. Scorul de pregătire, Leitner-ul, golurile, planul și sincronizarea nu știu de desfășurări.

**Reguli de conținut (în validare)**

- Problema și Ideea obligatorii; cel puțin unul dintre Exemplu și Analogie; „În C++” cere „Unde nu ține”.
- Lungimea textului (fără blocurile de cod): ~60–90 de cuvinte de regulă, cel mult ~180 la punctele marcate grele. Exemplul: cel mult ~8 rânduri. Rândurile de cod: cel mult 36 de caractere.
- Harta e obligatorie la un modul cu desfășurări, iar grupurile ei acoperă toate punctele, fără suprapuneri.
- Numărul desfășurărilor e egal cu numărul punctelor fișei.

**Exemplele Python**

- Un check separat de conținut rulează fiecare bloc Python din desfășurări într-un proces izolat, cu timeout. Rezultatul așteptat se scrie în comentariu pe linia care afișează (`# → …`); check-ul compară, în ordine, ce afișează blocul cu aceste comentarii. O excepție așteptată se marchează explicit, iar blocul trebuie să se oprească exact cu acel tip. Un bloc Python care nu rulează nu e permis: pseudo-codul se scrie ca text.
- Exemplele TS/TSX și C++ nu se rulează; le verifică agentul la scriere.
- Check-ul face parte din pașii dinainte de publicare, lângă validare și testele de interfață.

**Stil și documentație**

- Stilul desfășurărilor urmează stilul explicațiilor: propoziții scurte și active, fiecare câmp cu un singur rol, Problema concretă (nu „când vrei să…”), fără repetarea punctului.
- `CLAUDE.md` primește C++ în lista experiențelor lui Alex pentru „Legătură” și regulile desfășurării în „Stilul explicațiilor”; README primește o secțiune „Desfășurări”. Faptele C++ verificate (cppreference) intră într-o secțiune nouă a fișierului de fapte.

## Testing Decisions

**Ce e un test bun aici**: verifică ce vede și ce primește Alex (ecranul, cererea trimisă modelului), nu cum e scris codul. Un test nu se uită la funcții interne, cu excepția celor expuse deja în `window.__prep`, și nu se rupe la o refactorizare care păstrează comportamentul.

**Cusătura A: pagina construită, condusă din Playwright (singura cusătură pentru comportament)**

- Un test de interfață nou, în stilul testelor pentru „Întreabă” și pentru Schelete: pagina la 360 px, modelul AI înlocuit cu o coadă de răspunsuri false, cererile citite din jurnalul de apeluri.
- Acoperă: „Pe larg” deschide și închide desfășurarea punctului potrivit; „Deschide tot” / „Închide tot” acționează pe hartă și pe toate desfășurările; harta e sub ideea principală și închisă implicit; punctele au numere doar la modulele cu desfășurări; un modul fără desfășurări arată ca azi (fără butoane, fără numere); câmpurile opționale (Exemplu, Analogie, C++, Legătură) apar doar când există, iar „Unde nu ține” apare lângă C++; codul C++ și TSX nu primește colorare Python; termenii din glosar sunt legați în desfășurări; desfășurările deschise rămân deschise după o întrebare în „Întreabă”; cererea trimisă de „Întreabă” pe o fișă cu desfășurări le conține, iar pe una fără desfășurări e identică cu azi; starea salvată (`S`) nu se schimbă după deschideri; fără overflow orizontal la 360 px; zero erori de consolă în afara fonturilor Google.
- Testele existente din `tools/` trebuie să treacă în continuare; se actualizează doar unde numerotarea punctelor schimbă ce văd.
- Prior art: testele pentru „Întreabă”, pentru Schelete și pentru legătura din fișă.

**Cusătura B: build și validare (existentă)**

- Validarea primește regulile de mai sus (câmpuri obligatorii, „În C++” cu „Unde nu ține”, lungimi, rânduri de cod, hartă care acoperă punctele, număr egal cu punctele, module complete). Fiecare regulă e dovedită o dată cu un caz care pică, apoi cu datele reale care trec.
- Prior art: regulile existente pentru explicații, glosar și schelete.

**Cusătura C: exemplele Python (de conținut, nouă)**

- Check-ul exemplelor rulează pe toate desfășurările; e dovedit întâi pe un exemplu cu rezultat greșit și pe unul cu excepție greșită, care trebuie să pice.
- Prior art: testele referințelor pentru Schelete și pentru kata-uri.

**Cusătura D: Lecția (existentă; doar pentru tichetul Lecției)**

- Testele de unitate ale lui Jarvis, peste fakes: ce material primește o bucată când desfășurarea există și când lipsește, deschiderea cu harta, poziția lecției neschimbată. Prior art: testele de lecție din `tools/unit`.

**Înainte de fiecare publicare**: validare, build, `node --check` pe bundle, check-ul exemplelor, toate testele de interfață și de unitate din `CLAUDE.md`, `xcheck` / `fencew` unde e cazul și screenshot la 360 px, în light și dark, pe fișa modulului nou, cu „Deschide tot”.

## Out of Scope

- Generarea desfășurărilor la cerere de un model (variantele generate există deja: „Întreabă despre asta” și Lecția).
- Rescrierea, împărțirea sau reordonarea punctelor; schimbarea ideii principale sau a formulărilor de evitat (în afara erorilor de fapt).
- Desfășurări pentru formulările de evitat.
- Marcarea punctelor citite, statistici de citire, sarcini noi în plan pentru desfășurări sau efect asupra scorului.
- Desfășurări pentru explicațiile grilelor, cardurile orale, kata-uri sau schelete.
- Compilarea sau rularea exemplelor C++ și TS/TSX.
- Desfășurările în teoria de la goluri și în brief-ul pentru Perplexity.
- Modulele Bonus (`dbmodels`, `aws`, `django`), decât dacă rămâne timp la final.

## Further Notes

**Ordinea modulelor și volumul**

- P1 (86 de puncte): `oop` (12, lot de calibrare) → `python` (10) → `gil` (8) → `asyncio` (11) → `asgi` (10) → `pytest` (13) → `frontend` (13) → `design` (9). Un modul pe care Alex îl semnalează ca „nu se leagă deloc” urcă în ordine.
- P2 (65): sqlalchemy, postgres, celery, index, runtime, security. P3 (74): rabbitmq, redis, docker, domain, perf, ops, linux, behav, graphql. Bonus (20): dbmodels, aws, django.
- `behav` și `design` vor avea puține sau deloc comparații C++; e normal.

**Fapte de context**

- Mediul de lucru are Python 3.13 (exemplele rulează pe el; un exemplu care cere 3.11+ spune asta în Ideea, cum fac deja fișele), `g++` și `clang++` (disponibile dacă se decide vreodată compilarea fragmentelor C++, acum în afara scopului).
- Pentru context, interviul tehnic din config e pe 3 noiembrie 2026; Alex a cerut explicit să nu se țină cont de termen și ca lucrul să înceapă azi.

**Jurnalul deciziilor (grilling, 2 nov. 2026)**

- „Cardurile din fișe” = punctele fișei (termenul **Punct** în glosar; „card” rămâne pentru cardurile orale).
- Cauza: densitatea și lipsa problemei („de ce”), confirmate de Alex; plus nevoia de comparații cu C++.
- Forma: o desfășurare per punct, la tap (varianta C), nu rescrierea punctelor, nu un eseu pe modul, nu concepte grupate.
- Autor: agentul, static, cu fapte verificate (nu generat la cerere).
- Câmpuri: Problema și Ideea obligatorii; Exemplu sau Analogie; În C++ opțional, cu „Unde nu ține” obligatoriu; Legătură opțional.
- C++: nivel C++11/17 (OOP, RAII, smart pointers, STL, thread-uri), fără coroutine; doar unde există un echivalent real.
- Lungime: 60–90 de cuvinte; până la ~180 la punctele grele.
- Punctele rămân neschimbate, în afara erorilor de fapt, care se anunță.
- Harta modulului: da, ca desfășurare a ideii principale.
- Exemplele Python rulează automat; TS/C++ verificate la citire.
- Consumatori: „Întreabă” imediat; Lecția într-un tichet separat după P1; golurile și brief-ul rămân pe puncte.
- Ecran: închise implicit, „Deschide tot”, fără marcarea citirii, starea doar în `ui`.
- Livrare: `oop` întâi, cu oprire pentru părerea lui Alex; apoi restul P1, publicat pe module.
