Status: ready-for-agent

Tichete: `.scratch/schelete/issues/` (01–17; frontiera de start: 01).

# Schelete: conceptele din teorie, scrise ca cod

Vocabularul vine din `CONTEXT.md`: **Schelet**, **Punct esențial**, **Kata**, **Modul**, **Fișă**. Deciziile au ieșit dintr-o sesiune de grilling (1 noiembrie 2026); jurnalul întrebărilor e în Further Notes. Nu există ADR-uri în zona atinsă (singurul ADR, 0001, privește Lecția).

## Problem Statement

La sesiunea tehnică de pe CoderPad (marți, 3 noiembrie 2026), cu un om de backend și unul de frontend, Alex trebuie să scrie cod care rulează, cu voce tare. Aplicația îl pregătește azi pe trei straturi: grile și fișe (recunoaște conceptul), snippet-uri orale (citește cod și găsește bug-ul) și kata-uri (rezolvă o problemă în ~20 de minute).

Lipsește stratul din mijloc: forma canonică a fiecărui concept, scrisă din memorie. Alex știe ce face un `Condition`, un fixture cu `yield`, un closure sau un type guard, dar nu a exersat să le scrie fără să se blocheze la sintaxă. Pentru majoritatea conceptelor din fișele P1 nu există niciun exemplu de cod pe care să-l scrie el: thread cu lock, producer/consumer pe coadă, `Process` pornit corect, context manager, ABC, `Depends` cu `yield`, `this` în JavaScript, generice în TypeScript. Dacă un astfel de concept apare la live coding, riscă să piardă minute întregi pe forma de bază, tocmai acolo unde se vede seniorul.

## Solution

Un tip nou de exercițiu, **Schelet**: codul minim și canonic al unui concept, pe care Alex îl scrie din memorie în 2–5 minute. Fiecare schelet are o cerință scurtă, o referință care rulează și e testată, și 3–5 **puncte esențiale**.

În Studiu apare un segment nou, „Schelete”, cu toate scheletele grupate pe modul. Alex alege unul, scrie codul într-un câmp de text, apasă „Verifică cu AI” și primește punctele esențiale pre-bifate, greșelile reale și ce lipsește. El confirmă bifele, iar scheletul intră într-o cutie Leitner și revine la scadență. Referința se poate deschide oricând; dacă o deschide înainte să scrie, încercarea contează 0.

Planul de seară primește o sarcină cu scheletele scadente și câteva noi. Progresul arată câte schelete știe. Catalogul acoperă tot ce se poate scrie ca cod din module (~87), inclusiv JavaScript și TypeScript ca limbaje, nu doar React, și se livrează în patru valuri, fiecare publicat.

## User Stories

**Găsirea și alegerea**

1. Ca Alex, vreau un segment „Schelete” în Studiu, lângă „Live coding”, ca să găsesc scheletele fără să le caut printre kata-uri.
2. Ca Alex, vreau ca scheletele să fie grupate pe modul, cu modulele P1 primele, ca să încep cu ce a cerut managerul.
3. Ca Alex, vreau ca la `frontend` scheletele să fie împărțite în React, JavaScript și TypeScript, ca să exersez separat limbajul și framework-ul.
4. Ca Alex, vreau să văd pe fiecare schelet starea lui (nou, cutia, scadent), ca să știu ce am de repetat.
5. Ca Alex, vreau să văd câte schelete are fiecare modul și câte știu, ca să văd golurile dintr-o privire.
6. Ca Alex, vreau ca scheletele marcate „3.11+” să fie vizibil diferite de forma compatibilă cu 3.10, ca să știu ce pot scrie sigur pe CoderPad.
7. Ca Alex, vreau ca scheletele de config (Dockerfile, compose, CI) să fie marcate „verificat structural”, ca să știu că referința lor nu a fost rulată.
8. Ca Alex, vreau un link „Schelete (N)” din fișa unui modul, ca după teorie să trec direct la cod.
9. Ca Alex, vreau să mă întorc din schelet la listă fără să pierd locul din ea, ca să parcurg scheletele la rând.

**Scrierea**

10. Ca Alex, vreau să văd conceptul și cerința („Scrie un consumer pe `queue.Queue` care se oprește la sentinel”) înainte de câmpul de cod, ca să știu exact ce scriu.
11. Ca Alex, vreau un câmp de cod cu font monospace, fără autocorectare, fără majusculă automată și fără sugestii de tastatură, ca telefonul să nu-mi strice codul.
12. Ca Alex, vreau ca Tab-ul și indentarea să nu mă scoată din câmp, ca să pot scrie Python indentat.
13. Ca Alex, vreau ca ce am scris să rămână dacă pagina se reîncarcă sau ies din ecran, ca să nu pierd o încercare pe telefon.
14. Ca Alex, vreau ca ciorna să rămână doar pe dispozitivul meu și să nu intre în sincronizare, export sau brief, ca starea mea să rămână mică.
15. Ca Alex, vreau ca ciorna să se golească după ce am notat încercarea, ca următoarea repetare să înceapă de la zero.
16. Ca Alex, vreau ca câmpul să încapă la 360 px fără scroll orizontal pe pagină, ca să scriu comod pe telefon.

**Verificarea AI**

17. Ca Alex, vreau un buton „Verifică cu AI” care trimite cerința, punctele esențiale și codul meu, ca verificarea să judece exact ce trebuia să scriu.
18. Ca Alex, vreau ca verificarea să-mi pre-bifeze punctele esențiale acoperite, ca să nu le caut singur în cod.
19. Ca Alex, vreau să văd greșelile reale (cod care nu rulează, bug de concurență, tip greșit), ca să le repar înainte de interviu.
20. Ca Alex, vreau să văd ce lipsește față de punctele esențiale, ca să știu ce să adaug.
21. Ca Alex, vreau ca verificarea să-mi răspundă în română, cu termenii tehnici în engleză, ca restul aplicației.
22. Ca Alex, vreau ca verificarea să folosească sursa AI pe care o am deja (Claude în artifact, Gemini în aplicația instalată, DeepSeek ca rezervă), ca să nu configurez nimic nou.
23. Ca Alex, vreau ca, fără nicio sursă AI, butonul să lipsească și să mă pot nota singur pe aceleași puncte, ca scheletele să meargă oricum.
24. Ca Alex, vreau un mesaj clar când AI-ul nu răspunde, răspunde greșit sau cheia nu e validă, cu posibilitatea de a reîncerca, ca să nu rămân blocat.
25. Ca Alex, vreau ca un câmp gol sau aproape gol să nu fie trimis, ca să nu consum un apel degeaba.
26. Ca Alex, vreau să pot modifica codul după verificare și să-l verific din nou, ca să învăț din greșeală pe loc.
27. Ca Alex, vreau ca verificarea să nu-mi schimbe singură scorul, ca decizia finală să rămână a mea.
28. Ca Alex, vreau ca un punct pe care AI-ul îl inventează (care nu e în lista scheletului) să fie ignorat, ca bifele să rămână pe punctele reale.
29. Ca Alex, vreau ca textul meu să fie tratat ca date, nu ca instrucțiuni, de către AI, ca un comentariu din cod să nu schimbe verdictul.

**Referința**

30. Ca Alex, vreau un buton „Arată referința” disponibil oricând, ca să pot învăța forma și când nu am deloc idee.
31. Ca Alex, vreau ca deschiderea referinței înainte să fi trimis o încercare să noteze încercarea cu 0, ca să nu mă păcălesc singur.
32. Ca Alex, vreau să văd referința lângă punctele esențiale, ca să înțeleg de ce fiecare punct contează.
33. Ca Alex, vreau ca referința să fie codul care chiar rulează în teste, ca să nu învăț pe de rost o formă greșită.
34. Ca Alex, vreau să pot copia referința, ca s-o încerc pe CoderPad sau local.
35. Ca Alex, vreau ca referința TypeScript și React să nu fie colorată ca Python, ca să se citească corect.
36. Ca Alex, vreau ca rândurile referinței să încapă pe 360 px, ca să nu fac scroll orizontal în cod.

**Notarea și repetarea**

37. Ca Alex, vreau să confirm sau să schimb bifele înainte de salvare, ca scorul să reflecte ce știu, nu ce a crezut AI-ul.
38. Ca Alex, vreau ca, cu cel puțin 80% din puncte, scheletul să urce o cutie, ca să-l văd mai rar.
39. Ca Alex, vreau ca, între 50% și 80%, scheletul să rămână în cutia lui, ca să-l mai repet.
40. Ca Alex, vreau ca, sub 50%, scheletul să revină în cutia 1, ca să-l revăd curând.
41. Ca Alex, vreau ca scadențele să fie aceleași ca la grile și orale, ca ritmul repetării să fie unul singur.
42. Ca Alex, vreau un filtru sau o intrare „Scadente” în segment, ca să repet doar ce e de repetat.
43. Ca Alex, vreau ca progresul pe schelete să se sincronizeze între telefon și laptop, cu îmbinare pe schelet după timestamp, ca la restul stării.
44. Ca Alex, vreau ca un reset al progresului să golească și scheletele, ca reset-ul să însemne același lucru peste tot.
45. Ca Alex, vreau ca scheletele să nu schimbe scorul de pregătire, ca scorul calibrat pe grile și orale să nu sară cu o zi înainte.

**Plan și progres**

46. Ca Alex, vreau în planul de seară o sarcină „Schelete: N scadente + 3 noi”, ca să exersez fără să-mi amintesc singur.
47. Ca Alex, vreau ca scheletele noi din sarcină să vină din modulele cu nevoia cea mai mare, ca timpul să meargă unde contează.
48. Ca Alex, vreau ca sarcina să ia ~15–20 de minute din bugetul „mix inteligent”, nu din kata, ca seara să rămână echilibrată.
49. Ca Alex, vreau ca sarcina să mă ducă direct în segmentul „Schelete”, la primul schelet de făcut, ca să încep cu o atingere.
50. Ca Alex, vreau ca sarcina să aibă o cheie stabilă, ca bifa ei să rămână după o reîmprospătare a planului.
51. Ca Alex, vreau ca minutele petrecute pe schelete să intre în istoric și să scadă din bugetul serii, ca planul de azi să știe ce am făcut.
52. Ca Alex, vreau în Progres o linie „Schelete: X știute · Y de repetat · Z neîncepute”, ca la Live coding.
53. Ca Alex, vreau ca brief-ul pentru Perplexity să includă numărătoarea pe modul și scheletele ratate, ca să pot cere explicații țintite.

**Conținutul: Python, backend**

54. Ca Alex, vreau schelete pentru threading (thread cu lock, producer/consumer pe `queue.Queue`, coadă blocantă scrisă cu `Condition`, oprire cu `Event`), ca să le scriu fără ezitare la întrebarea despre concurență.
55. Ca Alex, vreau schelete pentru procese (`Process` cu garda `__main__`, executori cu `as_completed`), ca să arăt că știu diferența CPU-bound / I/O-bound în cod.
56. Ca Alex, vreau schelete asyncio (semafor + gather, workeri pe coadă, anulare corectă, `to_thread`, `async with` și generatori async), ca să scriu asyncio corect sub presiune.
57. Ca Alex, vreau forma 3.11+ (`TaskGroup`, `asyncio.timeout`) ca schelet separat, ca s-o pot menționa ca alternativă după ce scriu varianta sigură.
58. Ca Alex, vreau schelete pentru generatori, decoratori, context manageri, iteratori și `collections`, ca să scriu Python idiomatic din reflex.
59. Ca Alex, vreau schelete OOP (value object, property cu validare, constructor alternativ, ABC vs `Protocol`, compoziție cu fake, `super()` cooperativ, container), ca să arăt design de clase la live coding.
60. Ca Alex, vreau schelete pytest (fixture cu `yield`, `parametrize`, `raises`, `monkeypatch`, `patch` acolo unde e folosit, `tmp_path` și `caplog`), ca să scriu testele odată cu codul.
61. Ca Alex, vreau schelete FastAPI (endpoint cu model Pydantic, `Depends` cu `yield`, test cu override de dependențe, `lifespan`, cod blocant pus corect), ca să construiesc un endpoint testat pe loc.
62. Ca Alex, vreau schelete P2 (SQLAlchemy 2.0, SQL Postgres, indexuri, Celery, securitate), ca să nu mă blochez dacă discuția coboară în baza de date sau în task-uri.
63. Ca Alex, vreau schelete P3 (Redis, RabbitMQ, Docker, logging, CI, SIGTERM, profilare, AWS, GraphQL, Django), ca să am măcar forma de bază pentru fiecare temă din CV.

**Conținutul: JavaScript, TypeScript, React**

64. Ca Alex, vreau schelete JavaScript pentru closure, `this`, ordinea pe event loop, promisiuni, retry cu timeout, debounce și throttle, ca să răspund la întrebările de limbaj ale omului de frontend.
65. Ca Alex, vreau schelete pentru update imutabil, transformări pe array-uri, `Map` / `Set`, generatori async, clase ES și module ESM, ca să scriu JavaScript modern din reflex.
66. Ca Alex, vreau schelete TypeScript pentru generice, narrowing și type guards, union discriminat cu `never`, utility types, `as const` și `satisfies`, `interface` vs `type`, ca să arăt că tipurile mă ajută, nu mă încurcă.
67. Ca Alex, vreau schelete TypeScript pentru React (props, `children`, evenimente, hook generic cu rezultat tipat), ca să scriu componente tipate corect.
68. Ca Alex, vreau schelete React pentru state funcțional, formular controlat, fetch cu `AbortController`, listă cu `key` și stare derivată, Context și test cu Testing Library, ca să construiesc o componentă testată în CoderPad.
69. Ca Alex, vreau ca scheletul de event loop să-mi ceară să prezic output-ul, ca să exersez exact întrebarea tipică.

**Calitatea conținutului**

70. Ca Alex, vreau ca fiecare schelet să aibă între 3 și 5 puncte esențiale, ca notarea să fie rapidă și să conteze doar ce e esențial.
71. Ca Alex, vreau ca punctele esențiale să numească greșeala tipică (de pildă `while`, nu `if`, în jurul lui `wait()`), ca să știu ce verifică intervievatorul.
72. Ca Alex, vreau ca scheletele să fie minimale și să nu repete kata-urile, ca să rămână de 2–5 minute.
73. Ca Alex, vreau ca toate textele să fie în română, cu termenii tehnici în engleză, ca restul aplicației.
74. Ca Alex, vreau ca faptele (versiuni, nume de API, valori implicite) să fie verificate pe surse primare, ca să nu învăț ceva învechit.

**Livrarea**

75. Ca Alex, vreau scheletele publicate în valuri, primul cu aplicația și modulele de concurență, OOP și Python, ca să am ce exersa cât mai devreme.
76. Ca Alex, vreau ca fiecare val să fie publicat la același link, ca progresul și permisiunile să rămână.
77. Ca Alex, vreau un mesaj scurt după fiecare publicare, cu ce s-a adăugat, ca să știu ce e nou.

## Implementation Decisions

**Concept și date**

- Scheletul e un tip de conținut nou, distinct de kata, cu propria listă de date (încărcată ca restul fișierelor de date și listată în `DATA_FILES` și în exportul brief-ului). Câmpuri: identificator stabil, modul, grupă (doar la `frontend`: React / JavaScript / TypeScript), titlul conceptului, cerința, punctele esențiale (3–5), limbajul referinței (pentru colorare și pentru prompt), marcajul de versiune („3.11+”, unde e cazul) și marcajul „verificat structural” la config.
- Referința nu stă în date. Stă în fișierele de cod testate, cu marcaje de secțiune pe identificatorul scheletului, la fel ca soluțiile kata, iar build-ul o injectează în pagină, lângă codul kata. Extensia mecanismului: identificatorii de schelet au propriul prefix, iar build-ul acceptă și extensii noi (TS, SQL, config).
- Validarea datelor cere: cerință nevidă, 3–5 puncte, referință găsită pentru fiecare schelet, rânduri de cod de cel mult 42 de caractere (referința se afișează fără împachetare, la 11 px; atât încape la 360 px, măsurat), modul existent, grupă validă la `frontend`.

**Starea**

- O cheie nouă în `S` pentru schelete, cu aceeași formă ca un item Leitner existent: cutie, număr de încercări, scorul ultimei încercări în procente, timestamp. Normalizarea, îmbinarea pe item după timestamp (`mergeState`), curățarea (`prune`) și reset-ul (epoca `r`) o tratează ca pe `o` / `x`.
- Actualizarea după notare are pragurile din `updO`: ≥ 0,8 → cutia următoare (maximum 5, minimum 1 după prima încercare), 0,5–0,8 → rămâne (minimum 1), < 0,5 → cutia 1. Scadența folosește `dueAt` / `isDue` neschimbate; scadentele vin în ordinea cutiei.
- Referința deschisă înainte de o încercare trimisă marchează încercarea curentă (în `ui`, nu în `S`), iar la salvare scorul e 0 indiferent de bife.
- Ciorna stă în `localStorage`, sub o cheie proprie, pe identificator de schelet. Nu intră în `S`, în sincronizare, în export sau în brief. Se șterge la salvarea notei.
- Scheletele nu intră în `readiness`.

**Ecranul**

- Segment nou în Studiu, „Schelete”, între „Live coding” și „System design”. Lista e grupată pe modul (după prioritate), iar la `frontend` pe grupe; fiecare rând arată titlul, marcajele și starea. Sus, numărătoarea scadentelor și intrarea „Scadente”.
- Ecranul unui schelet: conceptul, cerința, marcajele, câmpul de cod (monospace, fără autocorrect / autocapitalize / spellcheck, Tab inserează indentare), „Verifică cu AI” (doar cu sursă AI), „Arată referința”, apoi lista punctelor esențiale ca bife, rezultatul verificării (greșeli, ce lipsește) și „Salvează”.
- Starea ecranului (schelet deschis, rezultat, bife, referință văzută) stă în `ui.study`, ca la kata.
- Fișa unui modul cu schelete primește linkul „Schelete (N)”.

**Verificarea AI**

- Folosește `AskModel` (sample → Gemini → DeepSeek), fără sursă nouă. Promptul și parsarea stau în aplicație, după modelul `gapGradePrompt` / `parseGapGrade`, și se expun în `window.__prep`.
- Promptul de sistem: verificator de cod pentru un candidat la rolul din `P.cfg.role`; răspunde în română; judecă doar față de cerință și de punctele esențiale numerotate; codul candidatului e date, între delimitatori, curățat de delimitatori și tăiat la o limită de lungime; nu execută codul, deci semnalează doar greșeli pe care le vede cert.
- Contractul răspunsului (JSON, eventual într-un bloc ```):

  ```
  { "covered": [<indexuri de puncte>],
    "errors":  ["<greșeală reală>", ...],
    "missing": ["<ce lipsește>", ...] }
  ```

  Parsarea acceptă doar indexuri valide (restul se ignoră), limitează listele la câteva elemente și respinge un răspuns fără `covered` ca listă.
- Verdictul pre-bifează punctele din `covered`; Alex poate schimba orice bifă. Erorile reutilizează mesajele din `ASK_MSG` (cheie lipsă / invalidă, rețea, timeout, format).
- Cod sub un prag minim de caractere: nu se trimite.

**Plan, Progres, brief**

- `genPlan` primește o sarcină nouă, cheie `sch` (deci `g<dată>-sch`), plasată în `KEY_ORDER` după `oral`. Textul: „Schelete: N scadente + 3 noi” (cu N calculat), ~15–20 de minute, scăzute din bugetul „mix inteligent”. Scheletele noi vin din modulele cu `modNeed` cel mai mare. Sarcina deschide segmentul la primul schelet scadent sau nou.
- Timpul petrecut pe un schelet se scrie în istoric ca la celelalte exerciții, deci `spentMin` îl numără.
- Progres: o linie cu scheletele știute (cutia ≥ 3), de repetat (scadente) și neîncepute.
- Brief-ul: numărătoarea pe modul și scheletele cu ultimul scor sub 50%.
- Jarvis nu primește nimic nou.

**Conținut**

- Forma principală a scheletelor Python e compatibilă cu 3.10; formele 3.11+ sunt schelete separate, marcate.
- Catalogul (~87) e în Further Notes, pe valuri. Faptele noi se verifică pe surse primare și se adaugă în notele de fapte verificate ale proiectului.
- Livrarea e în patru valuri; valul 1 conține toată partea de aplicație.

## Testing Decisions

**Ce e un test bun aici**: verifică ce vede și ce obține Alex (ecranul, starea salvată, planul), nu cum e scris codul. Un test nu se uită la funcții interne, cu excepția celor expuse deja ca interfață de test în `window.__prep`, și nu se rupe la o refactorizare care păstrează comportamentul.

**Cusătura A: pagina construită, condusă din Playwright (singura cusătură pentru comportament)**

- Un test de interfață nou, în același stil ca testele pentru goluri și pentru „Întreabă”: pagina la 360 px, starea setată prin `__prep.setState`, modelul AI înlocuit cu o coadă de răspunsuri false, iar cererile citite din jurnalul de apeluri.
- Acoperă: segmentul și gruparea (inclusiv grupele de la `frontend`); ciorna după reload și ștergerea ei după salvare; „Verifică” fără sursă AI (butonul lipsește); cererea trimisă conține cerința, punctele și codul; un verdict valid pre-bifează exact punctele lui; un verdict cu indexuri invalide, în bloc ``` sau malformat; mesajele de eroare și reîncercarea; codul prea scurt nu se trimite; pragurile Leitner (100%, 60%, 20%) pe cutia salvată; referința văzută înainte → 0; scadentele și ordinea lor; sarcina `sch` în plan (text, minute, cheie stabilă, deschide scheletul corect); linia din Progres; îmbinarea a două stări cu timestamp-uri diferite; reset-ul; scorul de pregătire neschimbat; fără overflow orizontal; zero erori de consolă în afara fonturilor Google.
- Promptul și parsarea se testează prin `__prep`, pe cazuri limită, în același test.
- Testele existente din `tools/` (plan, PWA, check etc.) trebuie să treacă în continuare, actualizate doar unde segmentul nou schimbă ce văd (de pildă lista de segmente).
- Prior art: testele pentru goluri (model fals cu coadă de răspunsuri, jurnal de apeluri, stare prin `__prep`), pentru „Întreabă” și pentru plan.

**Cusătura B: referințele scheletelor (cusătura de conținut)**

- Fiecare referință rulează și e verificată, cu mecanismul kata:
  - Python cu pytest; Postgres 16 și `redis-server` pornite de teste; Celery eager; pika peste un channel fals (ordinea `basic_qos` → `basic_consume` → `basic_ack`); boto3 cu moto;
  - JavaScript cu `node --test`;
  - TypeScript și TSX cu `tsc --strict --noEmit` și vitest + jsdom + Testing Library, cu dependențele într-un manifest separat de dev, ca aplicația să rămână fără dependențe; tot acolo pornește testul existent al kata-ului k15, care azi nu rulează;
  - Dockerfile, compose și CI: verificare structurală (parsare + reguli: etape numite, `USER` non-root, healthcheck), marcată ca atare în date.
- Testele de concurență verifică proprietatea pe care o apără punctul esențial (de pildă coada blocantă rămâne corectă sub mai mulți produceri și consumatori), nu doar un caz fericit.
- Validarea datelor (cusătura existentă de build) primește regulile pentru schelete.
- Prior art: testele kata (pytest și `node --test`) și validarea datelor existentă.

**Înainte de fiecare publicare**: validare, build, `node --check` pe bundle, toate testele de interfață, testele de unitate, testele scheletelor, `xcheck` / `fencew` unde e cazul și screenshot la 360 px, în light și dark.

## Out of Scope

- Scheletele în Jarvis (lecție, antrenament pe o temă, interviu simulat).
- Rularea codului lui Alex în aplicație: AI-ul citește codul, nu îl execută.
- Intrarea scheletelor în scorul de pregătire.
- Salvarea încercărilor vechi sau a ciornelor în `S`.
- Prototipurile JavaScript (`prototype`, `__proto__`).
- Scheletele pentru `dbmodels` (Bonus), `domain` și `behav` (fără cod).
- Un modul separat pentru verificarea AI, cu cusătură proprie (verificarea folosește `AskModel`, care ascunde deja cele trei surse).

## Further Notes

**Catalogul, pe valuri (~87)**

Valul 1 (aplicația + 24):
- **gil (6)**: `Thread` + `Lock` pe counter · producer/consumer pe `queue.Queue` (sentinel, `task_done` / `join`; `deque` menționat pentru BFS / fereastră) · coadă blocantă mărginită cu `threading.Condition` · `multiprocessing.Process` + garda `__main__` + rezultat prin `Queue` · `ThreadPoolExecutor` / `ProcessPoolExecutor` cu `as_completed` și excepții · oprire cu `threading.Event`
- **asyncio (6)**: `Semaphore` + `gather(return_exceptions=True)` · N workeri pe `asyncio.Queue` cu oprire curată · `TaskGroup` + `asyncio.timeout` (3.11+) · `to_thread` / `run_in_executor` · anulare corectă (`finally`, `CancelledError` re-ridicat) · `async with` + generator async
- **python (6)**: pipeline de generatori pe un fișier · generator cu `send` și `yield from` · decorator cu parametri + `wraps` · context manager ca clasă și cu `@contextmanager` · iterator propriu · `Counter` / `defaultdict` / `deque` / `heapq.nlargest`
- **oop (6)**: value object (`__eq__` + `__hash__`, sau `dataclass(frozen=True)`) · `@property` cu validare + `@classmethod from_dict` · ABC vs `Protocol` · compoziție cu dependență injectată + fake · `super()` cooperativ în moștenire multiplă · container (`__len__`, `__iter__`, `__getitem__`, `__contains__`)

Valul 2 (37):
- **pytest (6)**: fixture cu `yield` + scope + `conftest.py` · `parametrize` cu `ids` · `raises(match=)` · `monkeypatch` · `patch` acolo unde e folosit + `autospec` + `side_effect` · `tmp_path` + `caplog`
- **asgi (5)**: endpoint cu model Pydantic, `response_model`, coduri, `HTTPException` · `Depends` cu `yield` · `TestClient` + `dependency_overrides` · `lifespan` · `async def` vs `def`
- **frontend / React (6)**: `useState` funcțional + formular controlat · `useFetch` cu `AbortController` · listă cu `key` + stare derivată · Context + hook propriu · test RTL · `Promise.allSettled` + erori în TS
- **frontend / JavaScript (12)**: closure + factory · `this` · ordinea pe event loop (cu predicție de output) · promisify + `async` / `await` · retry cu backoff + timeout · `debounce` și `throttle` · update imutabil imbricat · `map` / `filter` / `reduce` + grupare · `Map` / `Set` · generator async + `for await` · clasă ES cu `#private` / `static` / getter · module ESM
- **frontend / TypeScript (8)**: generice cu constrângeri · narrowing + type guard, `unknown` din JSON · union discriminat + `never` (cu `useReducer`) · utility types + mapped type · `as const` / literali / `satisfies` · `interface` vs `type` · tipuri în React · `useFetch<T>` cu rezultat tipat ca union

Valul 3, P2 (13): sqlalchemy (3: model 2.0 + `select`; `selectinload`; tranzacție + Alembic) · postgres (3: `ON CONFLICT`; window function; `FOR UPDATE SKIP LOCKED`) · index (1: `CREATE INDEX CONCURRENTLY` + `EXPLAIN ANALYZE`) · celery (2: `autoretry_for` + backoff + idempotență; `chain` / `group` + test eager) · security (3: query parametrizat; hash de parolă + `compare_digest`; verificare JWT) · runtime (1: `__slots__` / memorie)

Valul 4, P3 (13): redis (3: cache-aside; lock `SET NX PX`; rate limit) · rabbitmq (1: consumer cu `basic_qos` + ack + DLQ) · docker (2: Dockerfile multi-stage non-root; compose cu healthcheck) · ops (2: logging JSON; CI minim) · linux (1: `SIGTERM`) · perf (1: `cProfile` / `timeit`) · aws (1: URL presemnat S3) · graphql (1: Strawberry + DataLoader) · django (1: `select_related` / `prefetch_related` vs SQLAlchemy)

Dacă trebuie tăiat: runtime, perf, graphql, django.

**Fapte de context**

- Pagina CoderPad pentru Python 3 spune „Running CPython 3.10” (https://coderpad.io/?p=1372); posibil veche, neconfirmată pentru 2026. De aici, forma 3.10 ca principală.
- La 1 noiembrie 2026: SQLAlchemy 2.1.6 e ultima versiune pe PyPI. Mediul de lucru are binarele Postgres 16 și `redis-server`; Docker fără daemon; RabbitMQ lipsește; `pip` merge.

**Jurnalul deciziilor (grilling, 1 nov. 2026)**

| # | Întrebare | Decizie |
|---|---|---|
| Q1 | Nume și graniță față de kata | „Schelet”, termen separat |
| Q2 | Câte module | Tot ce se poate scrie ca cod |
| Q3 | Ce e „coada” | `queue.Queue` corect + coadă blocantă cu `Condition` |
| Q4 | Exersare pe telefon | Câmp de cod + verificare AI |
| Q5 | Referința testată | Da, ca la kata |
| Q6 | Termen | Cât de bine se poate |
| Q7 | Unde în aplicație | Segment nou în Studiu |
| Q8 | Ce verifică AI-ul | 3–5 puncte esențiale; pre-bifează, Alex confirmă |
| Q9 | Repetare / scor | Leitner, fără scor de pregătire |
| Q10 | Plan | Sarcină `sch` pe seară |
| Q11 | Limbaje | Toate; config câte unul |
| Q12 | Infrastructură în teste | Servicii reale / fake / moto / structural |
| Q13 | Livrare | În valuri, fiecare publicat |
| Q14 | Versiune Python | 3.10; 3.11+ separat, marcat |
| Q15 | Notare | Pragurile `updO`; referința înainte → 0 |
| Q16 | Ciorna | `localStorage`, pe schelet |
| Q17 | Catalog | Acceptat; JS și TS neapărat |
| Q18 | Catalog JS / TS | 12 JS + 8 TS + 6 React |
| Q19 | Testare JS / TS | `node --test`; `tsc --strict` + vitest |
| Q20 | Ordinea valurilor | gil/asyncio/python/oop → pytest/asgi/frontend → P2 → P3 |
| – | Cusături (to-spec) | A: pagina din Playwright; B: referințele; fără modul separat |
| – | Presupuse în rezumat, neconfirmate explicit | Jarvis fără schelete; linie în Progres; brief cu numărătoare; fișier de date separat + referințe lângă kata |
