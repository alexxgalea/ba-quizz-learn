# Instrucțiuni de îmbunătățire: învățare supravegheată de AI

Document de lucru pentru `ba-quizz-learn`, scris după citirea codului la commit-ul `c3a0402` (9 noiembrie 2026) și după feedbackul lui Alex, apoi actualizat cu hotărârile din sesiunea de grilling din 11 noiembrie 2026 (secțiunea „Hotărâri”, la final). Descrie ce se schimbă, de ce și cum arată „gata”. Nu e un spec: fiecare val de mai jos devine un spec propriu. Certificarea și Pattern-urile, apărute după `c3a0402`, rămân neatinse.

**Forma de azi nu e cea finală.** Aplicația trece pe un server propriu (AWS Lambda + DynamoDB, ADR 0004), cu PWA-ul drept client și cu un jurnal de încercări în locul stării îmbinate (ADR 0003). Doar Val 2 se face pe forma actuală, fiindcă nu atinge starea. Unde un val vorbește despre `S`, despre artifact sau despre `sample`, descrie comportamentul în termenii de azi; la spec, cheile din `S` se citesc ca proiecții ale jurnalului, iar `sample` ca sursa AI de pe server.

## Cum se folosește

- Fiecare **val** devine `.scratch/<slug>/spec.md` cu tichete în `.scratch/<slug>/issues/`, după `docs/agents/issue-tracker.md`. Slug-ul propus e în titlul valului.
- Întrebările „De hotărât cu Alex” s-au închis pe 11 noiembrie 2026; răspunsurile sunt sub „Hotărât” în fiecare secțiune și, la un loc, în „Hotărâri”. Ce apare nou la un spec se întreabă, nu se hotărăște singur.
- Regulile de conținut din `CLAUDE.md` rămân: text în română, varianta corectă la indexul 0, fapte verificate, `validate` → `build` → teste. Artifactul rămâne publicat și înghețat până e verificat importul stării în jurnal; apoi regula de publicare iese din `CLAUDE.md`.
- Termenii noi (secțiunea „Vocabular nou”) intră în `CONTEXT.md` odată cu primul val care îi folosește.
- Referințele de cod (`dueAt`, `vLessonActive`, `deliver`) sunt nume de funcții din `src/app.js` și `src/jarvis.js`. Verifică-le înainte să te bazezi pe ele: codul s-ar putea să se fi schimbat între timp.

## De unde pornim

### Feedbackul lui Alex

1. Grilele au funcționat cel mai bine pentru înțelegerea conceptelor, dar nu ajung.
2. Celelalte forme (carduri orale, întrebări deschise, schelete, kata-uri, lecții) au fost folosite foarte puțin, fiindcă nu se simt complet dezvoltate.
3. Vrea supervizarea AI folosită la maximum. La cod, o supervizare ca într-un live coding.
4. La lecțiile live e greu să asculți și să urmărești cartonașul: uneori nu există, alteori nu are legătură cu ce se aude.

### Ce arată codul

| Zonă | Constatare | Unde |
|---|---|---|
| Orar | Cutiile revin la 20 min, 4 h, 1 zi, 2 zile; cutia 5 nu mai revine. E un orar de sprint, nu de memorie de durată. | `GAP`, `dueAt` |
| Plan | `genPlan` întoarce o listă goală după data interviului. `P.cfg.interview` e `2026-11-10`, deci planul e gol. | `genPlan`, `src/data_core.js` |
| Unitate | Stăpânirea se ține pe item, nu pe concept. Grilele, cardurile și scheletele nu sunt legate de punctele fișei; golurile se leagă prin cuvinte comune. | `modStats`, `relRank` |
| Scor | `readiness` numără doar grile și carduri orale. Scheletele și întrebările deschise nu intră. O grilă recunoscută cântărește cât o explicație. | `readiness`, `MB` |
| Grile | Varianta corectă e cea mai lungă în 148 din 329 de grile (45%; la întâmplare ar fi 25%) și e în medie cu 21% mai lungă decât distractorii. | `src/data_mcq*.js`, `data_fe.js` |
| Grile | Modulele P2 și P3 au doar grile de nivel 1. `design` are 8 grile, toate de nivel 1. | același loc |
| Grile | Distractorul ales nu se păstrează în stare, deci aplicația nu știe ce confunzi. | `updQ` |
| Deschise | Toate cele 329 de grile au `Verificare` + `Răspuns verificare`, dar întrebările rulează separat, în tab-ul Oral, cu notare manuală. | `OPEN`, `updX` |
| Lecție | Ecranul arată doar textul punctului. Modelul primește desfășurarea întreagă și vorbește 1–1,5 minute despre problemă, exemplu, pași și C++, care nu apar pe ecran. | `vLessonActive`, `deliver`, `dzMaterial` |
| Lecție | Textul se schimbă când modelul cere bucata, nu când începe sunetul ei. La hartă, la întrebări libere, la „mai simplu” și la recapitulare ecranul nu arată ce se spune. | `deliver` → `sync`, `buildLessonSystem` |
| Kata | Fără câmp de cod, fără rulare, fără AI. Starea e o etichetă pusă de Alex (singur / cu indicii / de reluat) și nu revine la scadență. | `vKata`, `KST` |
| Design | 6 carduri orale, o diagramă, niciun schelet, nicio formă în faze. | `src/data_oral2.js` |
| Prezicere | Desfășurările au 316 rânduri cu ieșiri verificate la build (`# → …`, `// → …`), afișate direct. | `src/desf/*.md`, `tools/desf_examples.mjs` |

README-ul spune 264 de grile și 217 întrebări deschise; în date sunt 329. Corectează-l la primul val care atinge grilele.

## Principii

1. **AI-ul supraveghează, Alex produce.** Orice ecran de învățare cere un răspuns de la Alex înainte să arate ceva. AI-ul întreabă, observă, corectează și abia la urmă explică.
2. **Un singur fir, nu multe file.** Formele folosite puțin nu se repară lustruindu-le separat. Se aduc în fluxul pe care Alex îl folosește deja: grila.
3. **Ce se aude e ce se vede.** În lecție există mereu un cartonaș, dar cartonașul e tabla, nu transcrierea: cuvinte cheie, scheme și cod, iar Jarvis povestește în jurul lor (revizuit după feedbackul lui Alex din 14 noiembrie 2026, `.scratch/lectia-tabla/`).
4. **AI-ul judecă față de material scris de noi.** Punctele, desfășurările, `Răspuns verificare` și referințele testate sunt cheia de corectare. Modelul nu e sursă de fapte.
5. **Fără AI merge tot, mai simplu.** Fiecare formă supravegheată are o cale cu notare proprie, ca acum.
6. **Conceptul e unitatea.** Progresul se citește pe punct, pe trepte, nu pe numărul de itemi văzuți.
7. **Problema se trăiește înainte să se explice.** Un concept e răspunsul la ceva care s-a stricat. Unde se poate, Alex vede defectul cu ochii lui înainte să primească soluția.
8. **Cuvintele lui Alex au prioritate.** Ce a formulat el se arată înaintea formulării scrise de noi.
9. **Pornirea costă zece secunde.** Grilele au mers fiindcă pornesc ușor. Orice formă nouă care cere pregătire rămâne nefolosită.

## Contractul de supervizare (valabil în toate valurile)

- **Sursa**: un singur punct de supervizare pe server (vezi „Platforma”), cu Gemini ca sursă principală și DeepSeek ca rezervă. Nicio formă de învățare nu presupune un model anume, deci sursa se poate schimba după ce Val 6 arată cât de des apasă Alex „Nu sunt de acord”.
- **Intrarea**: textul și codul lui Alex intră ca date între `<<<` și `>>>`, curățate de delimitatori și tăiate la o limită, ca în `ask.js` și `skelPrompt`.
- **Ieșirea**: JSON cu parser strict și test cu model fals (tiparul din `tools/test_skel_ai.py`). Un format greșit duce la calea fără AI, nu la o eroare care blochează.
- **Comportamentul supraveghetorului**:
  - Întreabă înainte să spună. Prima intervenție e o întrebare care îl face pe Alex să vadă singur problema.
  - O singură observație pe intervenție, cea mai importantă.
  - Nu dă soluția. La cod, nu scrie mai mult de două rânduri consecutive.
  - Verdictul numește punctul din fișă la care se leagă greșeala și propune pasul următor.
  - Ton de intervievator calm; fără laude de umplutură.
- **Întrebări generate** (transfer, răsturnări): modelul primește punctul și desfășurarea lui și întoarce întrebarea împreună cu `expected` (ce trebuie să conțină un răspuns bun). Notarea se face față de `expected`, nu față de ce crede modelul la al doilea apel.
- **Ce scrie Alex**: se păstrează în jurnalul lui, cu export și ștergere; caietul, laboratoarele și „față de data trecută” au nevoie de asta.

Hotărât (ADR 0005): în formele noi (adâncire, reamintire liberă, fazele de live coding și de design, laboratoare) verdictul AI contează implicit, cu un buton „Nu sunt de acord” care deschide bifele. Cardurile orale, scheletele și Certificarea rămân pe bife confirmate. Apăsările pe „Nu sunt de acord” intră în jurnal; din ele se hotărăște dacă regula se extinde.

## Vocabular nou (pentru `CONTEXT.md`)

- **Treaptă**: nivelul la care Alex a dovedit un punct: recunosc, îmi amintesc, explic, scriu, aplic. E doar a punctului. _Avoid_: treaptă pentru indicii (au niveluri) sau pentru laboratoare (sunt „în pagină” ori „pe laptop”).
- **Adâncire**: pasul scurt, supravegheat de AI, care urmează unei grile și urcă punctul pe treapta următoare. _Avoid_: întrebare de continuare (e a intervievatorului).
- **Sesiune ghidată**: firul zilnic care leagă scadențe, grile cu adânciri, o sarcină de cod și reamintirea liberă.
- **Secvență**: o parte a unei bucăți de lecție (problema, ideea, exemplul, pașii), spusă în 15–30 de secunde. _Avoid_: segment, pas.
- **Cartonaș**: ce arată ecranul în timpul unei secvențe; la punctele cu **Tablă** e tabla (cuvinte cheie, schemă, cod), la celelalte textul din care vorbește Jarvis. _Avoid_: card (cardul e oral).
- **Live coding supravegheat**: un kata lucrat în faze, cu intervievatorul AI care urmărește codul.
- **Scenariu în faze**: un scenariu de design parcurs pe etape, cu verdict pe fiecare.
- **Răsturnare**: o constrângere schimbată după ce Alex a dat soluția („acum citirile cresc de 100 de ori”).
- **Prezicere**: Alex scrie ce afișează un exemplu înainte să vadă ieșirea verificată.
- **Jurnal de încercări**: lista tuturor răspunsurilor lui Alex, în ordinea în care au fost date; din ea se calculează cutiile, treptele și măsurătorile.
- **Sesiune minimă**: cele cinci minute care fac ziua „făcută”.
- **Premisă**: un punct care trebuie știut înaintea altuia. _Avoid_: cerință (cerința e a scheletului), dependență.
- **Mecanism**: un Pas cu pas pe care Alex îl avansează și îl prezice: un proces în timp (event loop, render, ack), stare cu stare. Unde există mecanism, Pas cu pas-ul static se generează din urma lui, nu se scrie a doua oară. _Avoid_: animație, simulare (simularea e a designului).
- **Laborator**: un sistem mic, stricat, în care Alex reproduce defectul, îl explică, îl repară și vede măsurătoarea schimbându-se. Rulează „în pagină” sau „pe laptop”. _Avoid_: kata (kata-ul pornește de la zero), exercițiu, vânătoare de bug (e un laborator al cărui observabil e un test care pică).
- **Observabil**: ce arată defectul într-un laborator: un număr (actualizări pierdute, interogări, mesaje dublate) sau un test care pică.
- **Simulare de design**: fluxul desenat de Alex, pus sub trafic și sub defecte într-un model simplu.
- **Caiet**: formulările lui Alex, câte una pe punct, cu exemplele și întrebările lui.

---

## Platforma: ce cere învățarea de la aplicația reală (`platforma`)

Spune ce trebuie să poată forma nouă ca valurile de mai jos să nu fie tăiate la jumătate. Alegerile de arhitectură sunt sub „Hotărât”, la capătul secțiunii; spec-ul e în `.scratch/platforma/`.

1. **Jurnal de încercări, nu stare îmbinată.** Fiecare răspuns e un eveniment care doar se adaugă: `{ timp, dispozitiv, item, puncte, formă, rezultat, încredere, durată, interval }`. Cutiile, treptele și scadențele se calculează din jurnal. Trei câștiguri: orarul se poate schimba fără să se piardă istoricul; măsurătorile sunt exacte; îmbinarea între dispozitive devine reuniunea a două liste, nu o regulă pe timestamp. Cheile din `S` descrise în valuri (`u`, `m`, `w`) sunt proiecții ale jurnalului, calculate în client; nu se mai adaugă chei noi în `S`.
2. **Textul lui Alex se păstrează.** Caietul, răspunsurile, încercările de cod și verdictele rămân în contul lui, cu export complet și ștergere.
3. **AI-ul trece pe server.** Cheile ies din browser, sursa se alege după sarcină, iar răspunsul poate veni în flux. Cele trei surse de azi și limitele lor dispar din codul de învățare. Vocea rămâne conexiune directă către Gemini Live, cu un jeton de scurtă durată dat de server.
4. **Cod care rulează cu adevărat.** JavaScript-ul rămâne în pagină. Python cu thread-uri, Postgres, Redis și RabbitMQ rulează într-un program de pe laptopul lui Alex, care raportează rezultatul; găzduirea gratuită nu are mediu izolat cu servicii. Laboratoarele „pe laptop” (Val 10) pornesc de la `katas/`.
5. **Notificări.** Amintirea zilnică din Val 7 are nevoie de ele.
6. **Fără semnal merge.** În metrou, sesiunea continuă, evenimentele se strâng local și pleacă la reconectare. Jurnalul face asta firesc.
7. **Conținutul rămâne în repo, ca date validate la build.** `validate.mjs`, exemplele rulate și referințele testate sunt partea cea mai valoroasă a proiectului și trec neschimbate. Id-urile itemilor și ale punctelor rămân stabile, fiindcă jurnalul le citează.
8. **Migrare.** Exportul `S` de azi se importă ca evenimente sintetice (un eveniment pe item, cu cutia și `t`-ul lui), ca progresul să nu se piardă.

Hotărât:

- **Doar a lui Alex.** Fără conturi, fără profil și fără trasee. Rămân doar id-urile stabile și conținutul personal ținut în câmpurile lui (`Legătură`, `În C++`), nu amestecat în puncte.
- **Scopul**: memorie de durată pentru job și, pe rând, alte interviuri. „Întreținere” e modul implicit; „interviu” se pornește punând o dată. Prioritățile P1 / P2 / P3 rămân cele de azi până apare un interviu nou; atunci modul „interviu” primește și o listă de module urcate la P1 (extensie, nu se construiește acum).
- **Server**: AWS Lambda + DynamoDB, cu FastAPI, expus printr-o adresă a funcției (Function URL), fără API Gateway (ADR 0004). Răspunsul în flux din Python cere Lambda Web Adapter. Cont nou pe planul gratuit; trecerea pe planul plătit se face înainte de luna a șasea, altfel AWS închide contul. Plasele de siguranță: o amintire în calendar la 5 luni și copia locală a jurnalului, exportabilă.
- **Server simplu, calcul în client** (ADR 0003): serverul păstrează evenimentele și le dă înapoi de la un cursor. Cutiile, treptele și scadențele le calculează clientul, ca să meargă fără semnal. Pentru amintirea zilnică, clientul lasă la fiecare sincronizare un rezumat al scadențelor.
- **Recunoaștere**: un singur secret lung, introdus o dată pe fiecare dispozitiv.
- **AI**: Gemini, cu DeepSeek ca rezervă, cu cheile ca secrete pe server. Certificarea și intervievatorul scris, care azi merg doar cu `sample`, trec pe această sursă.
- **Jarvis**: conexiune directă din client, cu jeton de scurtă durată (ephemeral token, în preview la Gemini). Implicit jetonul dă 1 minut pentru pornire și 30 de minute de mesaje; dacă se poate prelungi se verifică în spec.
- **Telefonul** e Android, deci notificările web merg din PWA.
- **Rularea codului**: program local pentru ce cere servicii reale; JavaScript în pagină; proba Pyodide pentru Python în pagină.

---

## Val 0: Fundația (`fundatie-concepte`)

Mic, dar restul se sprijină pe el. Fără el, adâncirile nu au unde să scrie, iar lecția nu are de unde să ia întrebări pe punct.

### 0.1 Itemii se leagă de puncte

- Id-ul unui punct e `<modul>:<n>`, cu `n` de la 1, ca în `src/desf/<modul>.md`. Punctele nu se reordonează (regulă existentă).
- Câmp nou `pt: [n, …]` pe grile, schelete și kata-uri. La cardurile orale, `kp: [n | null, …]`, paralel cu `k`, fiindcă un card atinge mai multe puncte. Întrebările deschise moștenesc `pt` de la grila lor.
- `pt: []` scris explicit înseamnă „nu se leagă de niciun punct”. Un grup de asemenea itemi arată un punct care lipsește din fișă.
- Etichetarea: un utilitar `tools/tagpoints.mjs` propune legături cu `relRank`; agentul le confirmă citind fiecare item. Nu se acceptă propunerile orbește.
- `validate.mjs`: avertisment la item fără `pt`; eroare la modulele P1 după ce sunt etichetate. Raport nou: puncte fără nicio grilă, puncte fără nicio formă de producție.

### 0.2 Treptele unui punct

| Treaptă | Dovadă |
|---|---|
| 1. Recunosc | grilă corectă, fără context, marcată „sigur” |
| 2. Îmi amintesc | întrebare deschisă, reamintire liberă sau prezicere reușită |
| 3. Explic | punct acoperit spontan la un card oral; distractor refutat |
| 4. Scriu | schelet sau kata care atinge punctul |
| 5. Aplic | întrebare de transfer, scenariu de design, răsturnare |

- Treptele 1, 3 și 4 se calculează la randare din proiecțiile grilelor, cardurilor, scheletelor și kata-urilor. Nu se stochează.
- Treptele 2 și 5 se calculează din evenimentele jurnalului care poartă punctul (`puncte`) și forma. Nu există cheie nouă în `S`.
- Scara unui punct are doar treptele pentru care există itemi. `validate.mjs` avertizează la punctele P1 cu mai puțin de trei trepte.
- Un punct **ține** când cea mai înaltă treaptă a lui a fost trecută la un interval de cel puțin 7 zile.
- `readiness` se recalculează din puncte: 0,3 la recunosc, 0,6 la îmi amintesc, 0,8 la explic, 1 la scriu sau aplic.

### 0.3 Orar de durată

- Cutii 1–8: 20 min, 4 h, 1 zi, 3 zile, 7 zile, 16 zile, 35 de zile, 75 de zile. Cutia de sus revine la 75 de zile, nu „niciodată”. Scoate `5`-ul scris de mână din `updQ`, `leitnerStep`, `updX`, `dueAt`, `needW`, `MB` într-o constantă.
- Migrare: numerele cutiilor rămân. Un item din cutia 5 devine scadent la `t` + 7 zile, deci la prima deschidere vor fi multe scadențe.
- **Plafon zilnic** de repetat (implicit 25 de minute, setabil). Ce nu încape rămâne scadent, fără penalizare, ordonat după prioritate × cât de depășit e.
- **Două moduri de plan** în `cfg`: „interviu” (cu dată, ca acum) și „întreținere” (fără dată, cu minute pe zi). În întreținere, `genPlan` dă doar ziua de azi: scadențe, o sesiune ghidată pe modulul cu nevoia cea mai mare, o sarcină de cod.
- În modul interviu, cu mai puțin de 14 zile rămase, intervalele se plafonează la jumătate din zilele rămase, ca totul să revină înainte de dată.

### 0.4 Urme pentru măsurare

Jurnalul de încercări din „Platforma” e urma. Val 0 se scrie direct pe el, după platforma minimă; contoarele `S.m` din versiunea inițială a documentului nu se mai fac.

### Gata când

- [ ] Toate grilele, cardurile și scheletele modulelor P1 au `pt` / `kp`; `validate.mjs` trece.
- [ ] Fișa unui modul arată treapta fiecărui punct.
- [ ] Un item din cutia de sus revine; `test_plan.py` acoperă orarul nou, migrarea și plafonul.
- [ ] Cu data interviului trecută sau ștearsă, Azi arată un plan de întreținere.
- [ ] Starea veche, importată ca evenimente sintetice, dă aceleași cutii și aceleași scadențe ca înainte de import; resetul e un eveniment în jurnal.

Hotărât: intervalele și plafonul de 25 de minute rămân cele de mai sus și se reglează după prima lună de date din jurnal. La migrare, itemii din cutia 5 devin scadenți odată; plafonul îi împarte pe zile, după prioritate. Modul „interviu” rămâne, pornit de o dată.

---

## Val 1: Sesiunea ghidată (`sesiune-ghidata`)

Grila rămâne poarta de intrare. Ce se schimbă e ce urmează după ea.

### 1.1 Încredere înainte de răspuns

Alex alege varianta, apoi „Sunt sigur” sau „Nu sunt sigur”, apoi vede rezultatul. „Corect, dar nesigur” urcă cel mult în cutia 2 (regula de azi pentru „Am ghicit”, care rămâne ca rezervă). „Greșit, dar sigur” primește un marcaj pe item, greutate dublă în `wQ` și, cu AI, deschide direct o adâncire de tip „unde s-a rupt”.

### 1.2 Adâncirea

După o grilă corectă și sigură, de la cutia 2 în sus, urmează cel mult o adâncire, de 60–90 de secunde, cu „Sari” mereu la îndemână. Tipurile se rotesc, în ordinea treptei care îi lipsește punctului:

| Tip | Ce cere | Cheia de corectare | Unde scrie |
|---|---|---|---|
| Verificare | întrebarea `Verificare` a grilei, scrisă sau dictată | `Răspuns verificare` | `S.x[id]`, treapta 2 |
| Refută | „De ce e greșită varianta X?”; X e distractorul ales cândva de Alex, altfel cel mai plauzibil | `Varianta greșită X` | treapta 3 |
| Spune-o | formularea de interviu, cu voce sau în scris | `La interviu` | treapta 3 |
| Transfer | un scenariu nou pe același punct, generat | `expected` din generare | treapta 5 |
| Unde s-a rupt | după „greșit, dar sigur”: Alex explică de ce a ales varianta | explicația grilei | fără treaptă; curăță marcajul |

- O sesiune de 10 grile are în jur de 4 adânciri. Bugetul e un număr în `cfg`, nu o regulă ascunsă.
- Verdictul AI are forma `{ covered: 0 | 0.5 | 1, wrong: […], feedback }`; refolosește `parseGapGrade`.
- Fără AI: Alex vede cheia și se notează singur (știu / parțial / nu), ca la întrebările deschise de azi.
- Întrebările deschise nu mai au nevoie de un ecran propriu ca să fie folosite. Ecranul din Oral rămâne.

### 1.3 Variație la cutiile de sus

De la cutia 4 în sus, o grilă scadentă nu mai apare cu același text. În ordine: o altă grilă nefăcută de pe același punct; altfel o adâncire de tip Transfer; altfel (fără AI) aceeași grilă. Rezultatul scrie tot în `S.q[id]` al grilei scadente.

### 1.4 Reamintire liberă

La finalul sesiunii, pentru modulul atins cel mai mult: „Scrie sau spune tot ce ții minte despre <modul>, în două minute.” AI-ul compară cu punctele fișei și întoarce `covered: [n, …]` și `wrong: […]`. Ecranul arată punctele atinse, apoi pe cele uitate, fiecare cu „Pe larg ›”. Punctele atinse primesc treapta 2. Fără AI, Alex bifează singur punctele.

### 1.5 Prezicere

În „Pe larg ›”, un exemplu cu ieșire verificată apare cu ieșirea ascunsă. Alex scrie ce crede că se afișează; compararea e exactă, după normalizarea spațiilor, fără AI. La excepții (`# ! Tip`), răspunsul e numele tipului. Reușita dă treapta 2 punctului. „Arată direct” rămâne, fără treaptă. `lib.mjs` trebuie să scoată ieșirile într-un câmp separat la build, ca să poată fi ascunse.

### 1.6 Un singur buton

Azi are un buton mare, „Sesiunea de azi”, care leagă: scadențe (în plafon) → grile cu adânciri pe modulul cu nevoia cea mai mare, amestecat cu modulul lui pereche → o sarcină de cod (schelet scadent sau live coding supravegheat) → reamintire liberă. Sesiunea se poate întrerupe și relua. Celelalte intrări rămân unde sunt.

Perechile de module (se confundă între ele, deci se amestecă): `gil` + `asyncio`, `redis` + `rabbitmq`, `postgres` + `index`, `sqlalchemy` + `postgres`, `js` + `ts`, `react` + `frontend`, `celery` + `rabbitmq`. Lista stă în date.

### Gata când

- [ ] O grilă corectă și sigură, la cutia ≥ 2, e urmată de o adâncire în limita bugetului; „Sari” nu penalizează.
- [ ] Fiecare tip de adâncire scrie unde spune tabelul; teste cu model fals pentru fiecare.
- [ ] O grilă din cutia ≥ 4 revine ca altă grilă sau ca transfer când există sursă AI.
- [ ] Reamintirea liberă marchează punctele și arată ce lipsește.
- [ ] Prezicerea merge în toate modulele cu exemple rulate; `desf_examples.mjs` trece neschimbat.
- [ ] Totul la 360 px, light și dark, fără scroll orizontal.

Hotărât: 4 adânciri la 10 grile, ca număr în setări. Încrederea se cere la fiecare grilă: „Sunt sigur” și „Nu sunt sigur” sunt butoanele de trimitere. Răspunsul la adâncire e un câmp de scris, cu butonul de microfon alături; aplicația ține minte ultima alegere.

---

## Val 2: Lecția sincronizată (`lectie-sincronizata`)

Nu depinde de Val 1 și poate merge în paralel. Rămâne sesiune Gemini Live (ADR 0001 nu se schimbă).

### Problema, precis

Ecranul lecției arată `sheet.points[n - 1]`: una-două propoziții. Modelul primește însă desfășurarea întreagă și instrucțiunea de a o povesti în 1–1,5 minute: problema, ideea, exemplul, pașii, comparația cu C++. Alex aude un exemplu de cod pe care nu-l vede. Apoi:

- La prima bucată, Jarvis spune harta modulului, iar ecranul arată punctul 1 sau „Jarvis începe lecția…”.
- Textul se schimbă la apelul `next_chunk`, adică înainte să înceapă sunetul bucății.
- La o întrebare liberă, la „mai simplu” și la „exemplu”, cartonașul rămâne cel vechi.
- La final, capcanele apar, recapitularea nu.
- La modulele fără desfășurări (`dbmodels`, `aws`, `django`), modelul improvizează un exemplu „din experiența lui Alex”, care nu are cum să fie pe ecran.

### Regulile noi

1. **Mereu există un cartonaș.** Orice spune Jarvis are un tip de cartonaș:

   | Tip | Conținut pe ecran |
   |---|---|
   | `harta` | problema modulului și grupurile de puncte |
   | `problema` | câmpul Problema |
   | `ideea` | câmpul Ideea |
   | `exemplu` | blocul de cod, cu ieșirile |
   | `pas` | Pas cu pas, rând cu rând |
   | `analogie` | câmpul Analogie |
   | `cpp` | În C++ și Unde nu ține |
   | `punct` | punctul din fișă, ca încheiere a bucății |
   | `verificare` | întrebarea pusă lui Alex |
   | `intrebare` | ce a întrebat Alex și răspunsul, ca subtitrare |
   | `capcane` | formulările de evitat |
   | `recap` | cele trei propoziții de recapitulare, pe puncte |

2. **Bucata se împarte în secvențe.** O secvență e un câmp al desfășurării. Aplicația le dă pe rând, modelul nu vede secvența următoare. Fiecare durează 15–30 de secunde. Ordinea: problema → ideea → exemplu sau analogie → pas → cpp → punct. Câmpurile care lipsesc se sar.
3. **Jarvis vorbește în jurul cartonașului.** Instrucțiunea pe secvență: la punctele fără tablă, spune doar ce e pe cartonaș, în ordinea lui; la cele cu tablă, povestește în jurul cuvintelor cheie și al schemei, fără să le citească (`.scratch/lectia-tabla/`). Pe modul „Cu ecran” are voie să trimită la ecran („rândul al treilea”).
4. **Cartonașul se schimbă când începe sunetul lui.** Aplicația ține cartonașul următor în așteptare la `deliver` și îl afișează la trecerea lui `Call` în `speaking` pentru acel tur. Cel vechi rămâne până atunci.
5. **Subtitrare vie.** Sub cartonaș, ultimele două rânduri din transcrierea modelului (`outputAudioTranscription` e deja pornită în `live.js`). Era deschisă implicit; după feedbackul lui Alex din 14 noiembrie 2026 e oprită implicit (tichetul 03 din `.scratch/lectia-tabla/`). Blocul „Transcriere” rămâne ca istoric.
6. **Două moduri declarate**, alese la pornire și ținute minte în `onapsis-jarvis-v1`:
   - **Cu ecran**: regulile de mai sus.
   - **Doar audio** (metrou, telefonul în buzunar): Jarvis povestește codul în cuvinte, nu trimite niciodată la ecran, iar ecranul arată doar comenzile mari. Secvențele rămân, ca ritmul să fie același.
   - „Mut” rămâne ce e azi (poarta microfonului) și nu depinde de mod.
7. **Fără improvizație.** La modulele fără desfășurări, bucata are două secvențe: punctul și, dacă există, o grilă de pe punct spusă ca exemplu. Instrucțiunea „un exemplu din experiența lui Alex” dispare.
8. **Poziția lecției** rămâne pe punct (`S.l[modul].n`). O bucată întreruptă se reia de la prima ei secvență.

### Lecția care întreabă

După ultima secvență a unui grup din hartă (la modulele fără hartă, după fiecare al treilea punct), un cartonaș `verificare`: o întrebare `Verificare` de la o grilă legată de un punct al grupului (Val 0.1). Alex răspunde cu vocea în fereastra de ascultare; Jarvis dă verdictul într-o propoziție și aplicația scrie în întrebările deschise (`S.x`), nu în scor și nu în goluri. Pe „Cu ecran” e pornită implicit; pe „Mut” apar două butoane, „Știu” și „Nu știu”. Pe „Doar audio” întrebarea se pune doar dacă Alex nu e pe Mut, fără butoane. Fără grile legate de grup, cartonașul lipsește.

Asta schimbă definiția din `CONTEXT.md` (rescrisă pe 11 noiembrie 2026) și instrucțiunea din `buildLessonSystem` („nu pui întrebări de verificare”). Verificarea vine după ce există legăturile item–punct din Val 0.1; lecția sincronizată nu o așteaptă.

### Lecția inversă

Mod nou de sesiune Jarvis: Alex explică fișa, iar Jarvis joacă un coleg junior care întreabă „de ce?” și „ce se întâmplă dacă?”. Punctele ajung la Jarvis ca listă de bifat, nu de recitat. La final: ce puncte a atins Alex, ce a spus greșit, ce a sărit. Punctele atinse primesc treapta 3. Vine după ce lecția sincronizată e stabilă.

### Gata când

- [ ] În fiecare fază a lecției (hartă, fiecare secvență, întrebare liberă, „mai simplu”, verificare, capcane, recapitulare), `#jv-chunk` are conținutul fazei. Test în `tools/test_lesson.py`.
- [ ] Cartonașul nu se schimbă înainte de sunetul lui. Test în `tools/unit/lesson.test.mjs`, peste `Call` real.
- [ ] O secvență `exemplu` arată blocul de cod întreg, la 360 px.
- [ ] Modul „Doar audio” nu produce nicio trimitere la ecran (verificat pe instrucțiuni; proba reală o face Alex).
- [ ] Pauza, reluarea, semnalul pierdut și „Repetă” merg pe secvențe ca pe bucăți.
- [ ] Verificarea scrie în `S.x`; istoricul lecției tot nu scade bugetul serii.

Hotărât: verificarea după fiecare grup, pornită implicit pe „Cu ecran”. Secvențele de 15–30 de secunde se probează întâi pe `asyncio`; restul modulelor trec pe secvențe doar după ce Alex ascultă proba și spune dacă firul se rupe prea des. Spec și tichete: `.scratch/lectie-sincronizata/`.

---

## Val 3: Live coding supravegheat (`live-coding`)

### Ce construim

Kata-ul devine o sesiune în faze, cu intervievatorul AI care are în față cerința, referința, cazurile de test și codul lui Alex.

| Faza | Ce face Alex | Ce face intervievatorul |
|---|---|---|
| 1. Clarificare | pune întrebări despre input, limite, cazuri | răspunde din fișa de fapte a kata-ului; nu oferă ce nu e întrebat |
| 2. Abordare | spune soluția și complexitatea, în 3–4 propoziții | o provoacă o dată; dacă abordarea e greșită, întreabă, nu corectează |
| 3. Cod | scrie în câmpul de cod; poate cere „Uită-te” | observă la cerere, la fiecare rulare de teste și la trecerea dintre faze, niciodată singur în timp ce Alex scrie; o observație pe intervenție |
| 4. Rulare | rulează cazurile vizibile | vede rezultatele; la un test picat cere întâi ipoteza lui Alex |
| 5. Follow-up | răspunde la una-două întrebări din `follow` | le alege după ce a văzut în cod |
| 6. Bilanț | citește verdictul | notează pe criterii, leagă greșelile de puncte |

- **Indicii pe niveluri**, cerute de Alex: întrebare care ghidează → direcția → numele structurii sau al API-ului. Fiecare nivel scade nota la „abordare”. Soluția nu se dă; referința se deschide doar la bilanț.
- **Intrarea supraveghetorului** la fiecare apel: cerința, fișa de fapte, referința (marcată „nu o dezvălui”), dialogul de până acum, codul curent, diferența față de ultima privire, rezultatele testelor.
- **Ieșirea**: `{ kind: "question" | "nudge" | "bug" | "ok", say, line? }`. `line` evidențiază un rând din câmpul de cod.
- **Bilanțul**, 0–2 pe criteriu: clarificare, abordare și complexitate, corectitudine, calitatea codului, cazuri limită, comunicare, follow-up. Corectitudinea vine din teste, nu din părerea modelului, acolo unde codul rulează.
- **Stare**: `S.k[id]` primește cutie Leitner și scorul pe criterii, ca să revină la scadență. Etichetele de azi (`solo` / `hint` / `redo`) se convertesc la migrare.
- **La revenire nu e aceeași problemă**: de la a doua trecere, sarcina e un `follow` al kata-ului (LRU cu TTL, token bucket pe mai multe chei).

### Rularea codului

- **Cazurile de test devin date**: `katas/cases/<id>.json`, `[{ call, args, expect }]`, o parte vizibile și o parte ascunse. Aceleași date alimentează pytest / `node:test` și pagina. Referința trebuie să treacă toate cazurile la build.
- **JavaScript și TypeScript fără JSX**: rulează în pagină, într-un Worker, cu timeout. TypeScript are nevoie de ștergerea tipurilor; de hotărât cum.
- **Python**: rularea reală e programul local din „Platforma”. Pyodide rămâne util pentru ce merge în pagină și fără semnal (cod pur, asyncio), dar nu pentru thread-uri; fă o **probă** (tichet de tip prototype) înainte să te bazezi pe el. Unde codul nu rulează, AI-ul urmărește cazurile vizibile de mână, iar rezultatul poartă eticheta „nerulat”.
- **React / TSX** (`k15`): nu rulează; doar revizuire AI pe punctele esențiale, ca la schelete.

### Scheletele, cu aceeași supraveghere

După verdictul de azi, o singură întrebare pe un punct esențial ratat sau atins la limită („de ce `while` și nu `if` în jurul lui `wait()`?”). Răspunsul bun dă treapta 3 punctului legat. Asta leagă forma de motivul ei.

### Tipuri noi de sarcini

Mai aproape de munca reală decât o problemă de la zero (vânătoarea de bug s-a mutat la laboratoare, Val 10):

- **Extinde codul**: o bază mică, existentă, la care se adaugă o cerință (un câmp nou într-un endpoint, cu test).
- **Scrie testele**: generalizarea lui `k11`.

Ținta: cel puțin 6 sarcini de frontend (azi sunt 2 din 16) și câte una pe fiecare modul P1 de backend.

### Cu voce (după ce varianta scrisă e stabilă)

Mod Jarvis `livecode`, doar în PWA: Alex gândește cu voce tare, iar codul ajunge în sesiunea Live ca text, la schimbare, cu întârziere de câteva secunde. Jarvis intervine la cerere și la granițele dintre faze. Cere o probă separată: latența, costul în limita zilnică și dacă modelul tace când trebuie.

### Gata când

- [ ] Un kata se poate parcurge cap-coadă în faze, cu model fals în teste și cu model real de mână.
- [ ] Un kata JS rulează în pagină pe cazurile lui; un test picat apare cu intrarea, așteptatul și primitul.
- [ ] Proba Pyodide are un răspuns scris: ce rulează în pagină și ce nu.
- [ ] Supraveghetorul nu scrie soluția: test care pică dacă `say` conține mai mult de două rânduri de cod.
- [ ] Bilanțul leagă cel puțin o greșeală de un punct din fișă.
- [ ] Fără AI, kata-ul merge ca azi, plus câmpul de cod și rularea.

Hotărât: intervievatorul intervine la cerere, la rulare și între faze. Faza de cod e gândită pentru laptop; pe telefon merg clarificarea, abordarea, follow-up-ul și bilanțul, plus scheletele ca acum. Cronometrul de 20 de minute rămâne vizibil, dar nu oprește sesiunea. Valul urcă imediat după Val 1, în varianta scrisă: JavaScript rulat în pagină, iar la Python AI-ul urmărește cazurile de mână, cu eticheta „nerulat”, până la proba Pyodide.

---

## Val 4: System design în faze (`design-in-faze`)

Grila e forma cea mai slabă pentru design. Aici se leagă și modulele între ele.

### Scenariul în faze

| Faza | Alex | AI |
|---|---|---|
| Cerințe | pune întrebări | răspunde din fișa de fapte; notează ce nu a fost întrebat |
| Estimări | dă cifre (cereri pe secundă, volum, creștere) | verifică ordinul de mărime față de cifrele scenariului |
| API și date | endpoint-uri, tabele, chei | caută ce lipsește: idempotență, paginare, indexuri |
| Componente | scrie fluxul ca rânduri `client → API → coadă → worker → DB` | cere motivul pentru fiecare componentă adăugată |
| Puncte de eșec | răspunde la „moare X, ce se întâmplă?” | alege X din ce a desenat Alex |
| Răsturnare | adaptează soluția | schimbă o constrângere din lista scenariului |

- Fluxul scris de Alex se afișează ca diagramă simplă din rânduri, în stilul `data_diagrams.js`. Fără bibliotecă de desen.
- **Date pe scenariu**: `facts` (răspunsurile la clarificări), `nums`, `must` (criterii pe fază, fiecare cu `pt: ["redis:4", "index:2"]`), `fail` (defecte de injectat), `flips` (răsturnări).
- **Verdict pe fază**, cu criteriile ca la cardurile de design de azi. Un criteriu ratat devine gol pe punctul lui din modulul de origine și îi crește nevoia. Așa un scenariu de design scoate la iveală goluri în Redis sau în indexuri.
- Cele 6 carduri de design existente rămân; devin semințe.
- Fluxul scris aici e și intrarea pentru simularea de design din Val 10.

### Conținut

- 8–10 scenarii: backend (rate limiter distribuit, ingestie de alerte, programator de joburi, căutare în audit log, notificări în evantai, API idempotent), frontend (tablou cu alerte în timp real, listă mare cu filtre și paginare, formular în pași cu ciorne) și cel puțin două cap-coadă.
- Exerciții scurte între scenarii:
  - **Trade-off în 60 de secunde**: două opțiuni și un context; Alex alege și motivează; apoi contextul se răstoarnă.
  - **Estimare**: o cifră de ordin de mărime, cu calculul spus.
- Grile de nivel 2 și 3 pentru `design` (cel puțin 10) și schelete acolo unde există cod canonic: outbox, cheie de idempotență, retry cu backoff și jitter.

### Gata când

- [ ] Un scenariu se parcurge în faze, cu verdict pe fiecare și cu o răsturnare la final.
- [ ] Un criteriu ratat apare ca gol în „Pentru tine”, pe modulul lui de origine.
- [ ] Fiecare scenariu are cel puțin 3 defecte și 2 răsturnări; `validate.mjs` verifică.
- [ ] Faptele și cifrele scenariilor au sursă în `research/interview-facts.md`.

Hotărât: scenarii generale (ingestia de alerte e deja aproape de domeniul Onapsis și ajunge), de 15–20 de minute, cu posibilitatea de a face o singură fază.

---

## Val 5: Grile mai bune (`grile-calitate`)

Grilele sunt ce merge. Valul ăsta le scoate slăbiciunile fără să le schimbe forma.

- **Indiciul de lungime.** `validate.mjs` avertizează când varianta corectă e cea mai lungă și depășește media distractorilor cu peste 20%. Un utilitar `tools/optlen.mjs` listează grilele. Repari lungind distractorii cu detalii plauzibile, nu scurtând răspunsul corect până își pierde precizia. Fiecare distractor rescris cere actualizarea `Varianta greșită` (`tools/xcheck.mjs`). Ținta: corecta e cea mai lungă în cel mult 30% din grile.
- **Niveluri.** Fiecare modul P2 și P3: cel puțin 30% grile de nivel 2 și 10% de nivel 3. Nivelul 2 înseamnă scenariu („ce se întâmplă dacă”), nivelul 3 înseamnă citire de cod sau două concepte care se întâlnesc.
- **Distractorul ales se păstrează.** `S.q[id].w` = indexul ultimei variante greșite alese, `wc` = de câte ori. Folosit de adâncirea Refută și de o listă nouă, „Confuzii”, în Studiu › Pentru tine.
- **Carduri de comparație** pentru perechile care se confundă: un tabel de completat (thread, proces, task pe 3–4 criterii), notat de AI față de un tabel de referință. Surse: câmpul `Legătură` și lista de confuzii.
- **Amestecare.** `pickSmart` nu mai sortează sesiunea doar după nivel; în sesiunile pe modul intră și modulul pereche (lista din Val 1).

Gata când: raportul de lungime e sub țintă; fiecare modul P2 și P3 își atinge procentele; o variantă greșită aleasă apare în „Confuzii” și e vizată de următoarea adâncire Refută.

---

## Val 6: Măsurare (`masurare`)

Un ecran nou în Progres, din jurnalul de încercări:

- **Reținere** la 7 și la 30 de zile, pe formă: câte itemi au fost știuți la prima revedere după acel interval.
- **Puncte pe trepte**, pe modul: câte puncte sunt pe fiecare treaptă și câte „țin”.
- **Calibrare**: cât de des „sunt sigur” a fost greșit.
- **Timp pe formă**, pe săptămână, din istoric.

Reținerea pe formă e și criteriul de judecată pentru valurile de mai sus: dacă adâncirile și live coding-ul nu ridică reținerea la 30 de zile, se schimbă, nu se lustruiesc.

---

## Val 7: Obișnuința zilnică (`obisnuinta`)

Aplicația de azi e construită în jurul unei date. Orarul de durată din Val 0 nu lucrează dacă Alex nu deschide aplicația în ziua în care ceva e scadent. Valul ăsta îi dă un motiv să revină care nu e un termen.

- **Sesiunea minimă**: cinci minute. Scadențele cele mai depășite, în ordine, plus o adâncire. Terminarea ei face ziua „făcută”. „Încă zece minute” e o ofertă, nu o datorie.
- **Deschiderea duce direct la prima întrebare**, nu la un tablou. Tabloul vine după.
- **Un capăt clar**: „Gata pe azi” și ce vine mâine. Fără flux nesfârșit.
- **Amintirea zilnică**, la ora aleasă de Alex, cu text din starea lui („3 puncte din asyncio sunt pe cale să se piardă”), nu generic. Fără amintire în zilele în care nimic nu e scadent.
- **Numărul din față e „puncte care țin”.** Nu există șir de zile: ar cere reguli de iertare de întreținut și nu măsoară învățarea.
- **Bilanțul săptămânii**, un singur ecran: ce s-a așezat, ce alunecă, pe ce se pune accentul săptămâna viitoare.

### Gata când

- [ ] De la deschidere la prima întrebare e o singură atingere.
- [ ] O sesiune minimă se încheie în cel mult șase minute pe datele reale ale lui Alex.
- [ ] Amintirea citează ce e scadent și nu vine când nu e nimic.
- [ ] O zi sărită nu schimbă nimic pe ecran în afară de scadențe; niciun mesaj de reproș.

Hotărât: doar „puncte care țin”, fără șir de zile. Amintirea vine la 20:00, schimbabilă din setări, ca notificare web pe Android.

---

## Val 8: Graful de concepte (`graf-concepte`)

Modulele sunt plate. Anularea în asyncio nu „știe” că se sprijină pe event loop, iar indexul compus nu știe de B-tree. Aplicația nu poate deci nici să ordoneze învățarea, nici să caute rădăcina unei greșeli.

### Date

- Fiecare punct poate avea **premise**: `cere: ["asyncio:1", "gil:5"]`, în datele fișei. Pot trece între module.
- În medie una-două premise pe punct. Se scrie doar premisa directă, nu tot lanțul.
- `validate.mjs`: id-uri existente, fără cicluri, avertisment la punctele P1 fără nicio legătură.
- Agentul propune muchiile modul cu modul, pornind de la câmpul `Legătură` și de la hartă; fiecare se confirmă citind cele două puncte. Începe cu modulele P1.

### La ce folosește

1. **Ordine.** Un punct nou cu premise sub treapta 2 vine mai târziu în ordine, dar vine: ordinea recomandă, nu blochează. Muchiile sunt propuse de agent și vor avea greșeli la început; o muchie greșită care blochează ar ascunde conținut fără ca Alex să vadă.
2. **Reparare la rădăcină.** După două ratări la rând pe un punct, sesiunea nu mai repetă aceeași întrebare: coboară la premisă și o verifică pe ea. Dacă premisa cade, de acolo se reia.
3. **Repetare implicită.** O reușită pe un punct împinge scadența premiselor lui cu o parte din intervalul lor (propunere: 30%). Așa exersarea lucrurilor avansate ține în viață bazele, iar numărul de repetări scade. O ratare nu penalizează premisele; doar declanșează verificarea de la 2.
4. **Credit mare pentru formele compuse.** Un scenariu de design, un laborator sau un kata ating multe puncte; reușita lor împinge toate premisele.
5. **Harta modulului arată graful**: punctele, săgețile dintre ele și treapta fiecăruia.

### Gata când

- [ ] Modulele P1 au premise; `validate.mjs` respinge un ciclu și un id inexistent.
- [ ] Un punct cu premisa pe treapta 1 apare după punctele cu premisele îndeplinite, nu înaintea lor.
- [ ] Două ratări la rând duc la o întrebare pe premisă; test pe un lanț de trei puncte.
- [ ] O reușită mută scadența premiselor; `test_plan.py` verifică valoarea.

Hotărât: ordinea recomandă; repararea la rădăcină (după două ratări, coboară la premisă) e fermă; repetarea implicită pornește la 30% și se reglează din jurnal.

---

## Val 9: Mecanisme pe care le miști (`mecanisme`)

„Pas cu pas” e text static. Multe concepte sunt procese în timp, iar modelul mental se formează când prezici starea următoare și vezi dacă ai avut dreptate.

### Ce e un mecanism

- O succesiune de **stări**, fiecare cu ce e vizibil în ea: cozi, task-uri, thread-ul care ține lock-ul, componentele care se randează, rândurile dintr-o tranzacție.
- Alex avansează cu un buton. La pașii marcați, înainte să vadă starea următoare, **prezice**: ce task rulează acum, ce e în coadă, ce componentă se randează din nou, ce vede a doua tranzacție. Răspunsul e o atingere pe un element din ecran, nu text.
- **„Ce se schimbă dacă”**: un comutator pe un singur parametru (un `await` în plus, lock-ul scos, lista de dependențe schimbată, ack înainte sau după muncă). Alex prezice ce se schimbă, apoi vede urma nouă lângă cea veche.

### Sursa urmelor

Ca la exemplele din desfășurări, adevărul vine din rulare, nu din ce scrie cineva de mână. Unde se poate, urma se generează la build din cod real (tracing în Python, instrumentare în JavaScript) și se salvează ca date. Unde nu se poate (Postgres, broker), urma se scrie de mână și se verifică cu un test care rulează scenariul real în `katas/`.

Formatul, pe scurt: `{ stari: [{ titlu, vizibil, intreaba? }], variante: [{ parametru, stari }] }`, legat de puncte prin `pt`.

### Primele mecanisme

| Zonă | Mecanism |
|---|---|
| Python | event loop asyncio: task-uri, `await`, un apel blocant |
| Python | două thread-uri pe `counter += 1`, cu și fără lock |
| Python | FastAPI: `def` în threadpool față de `async def` pe event loop, sub cereri simultane |
| Python | generator: `next`, `send`, epuizare |
| JS | event loop: stivă, microtask-uri, macrotask-uri |
| React | render → commit → effect, cu un closure învechit |
| React | reconciliere cu și fără `key` |
| Baze de date | căutare în B-tree față de parcurgere secvențială |
| Baze de date | două tranzacții intercalate: update pierdut, read committed față de repeatable read |
| Baze de date | sesiunea SQLAlchemy și N+1 față de `selectinload` |
| Mesagerie | RabbitMQ: ack, redelivery, consumator care moare |
| Design | outbox cu relay; cache-aside cu năvală la expirare |

### Unde apar

În „Pe larg ›” al punctului, în explicația unei grile („Vezi-l mișcându-se”) și, mai târziu, ca tip de cartonaș în lecția „Cu ecran”. O prezicere reușită dă treapta 2; una pe o variantă dă treapta 5.

### Gata când

- [ ] Un mecanism se parcurge cap-coadă pe telefon, cu o singură mână, la 360 px.
- [ ] Urmele generate se regenerează la build și pică build-ul dacă s-au schimbat fără voie.
- [ ] Fiecare mecanism are cel puțin doi pași de prezicere și o variantă.
- [ ] Primele patru mecanisme sunt probate de Alex înainte să se scrie restul.

Hotărât, primele patru: event loop-ul asyncio cu un apel blocant; două thread-uri pe `counter += 1`, cu și fără lock; event loop-ul JavaScript cu microtask-uri și macrotask-uri; React, render → commit → effect, cu un closure învechit.

---

## Val 10: Laboratoare (`laboratoare`)

Ce lipsește cel mai mult. În aplicație problema e mereu povestită, chiar și în desfășurări. Un update pierdut, un N+1 sau un mesaj livrat de două ori se așază când le-ai văzut tu și le-ai reparat.

### Forma unui laborator

Cinci până la zece minute, în cinci pași:

1. **Reproduce.** Alex rulează sistemul stricat și vede observabilul: 1000 de incrementări, 847 în contor; 101 interogări pentru o listă; 3 mesaje procesate de două ori.
2. **Ipoteză.** Scrie, într-o propoziție, de ce. AI-ul compară cu cauza reală și pune cel mult o întrebare. Nu confirmă și nu infirmă încă.
3. **Repară.** Alex modifică codul. Reușita o hotărăște observabilul sub aceeași încărcare, nu părerea modelului.
4. **Explică.** O propoziție, cu vorbele lui, despre ce a fost și de ce reparația ține. Intră în caiet (Val 11), pe punctul legat.
5. **Răsturnare** (opțional): „și cu două procese în loc de două thread-uri?”.

Reparația dă treapta 4 punctelor legate; răsturnarea, treapta 5. Laboratorul revine la scadență cu altă variantă din aceeași familie de defecte, nu cu același cod.

### Unde rulează

| Unde | Laboratoare |
|---|---|
| în pagină | closure învechit în React; două `fetch`-uri care se întrec; `key` lipsă; randări inutile; promisiune respinsă neprinsă; apel blocant într-o corutină; `await` uitat; anulare înghițită; `gather` fără limită |
| pe laptop (program local, vezi „Platforma”) | update pierdut între thread-uri; deadlock; `if` în loc de `while` la `Condition`; N+1; index lipsă, cu `EXPLAIN`; update pierdut între tranzacții; verificare-apoi-scriere neatomică în Redis; ack înainte de muncă; mesaj redelivrat fără idempotență; cod blocant în `async def` sub încărcare; cheie de idempotență lipsă |

Se începe cu laboratoarele în pagină. `katas/` are deja pytest și un fixture de Postgres; cele de pe laptop pornesc de acolo. Vânătoarea de bug (cod stricat plus un test care pică; snippet-urile din `fedebug` și cele cu `code` din `data_oral2.js`, cu teste adevărate) e un laborator al cărui observabil e testul.

**Regula de fricțiune**: un laborator pornește în zece secunde de la atingere, fără instalare. Ce cere pregătire stă într-o listă separată, „pe laptop”, și nu intră în sesiunea zilnică.

### Simularea de design

Echivalentul laboratorului pentru system design. Fluxul scris de Alex într-un scenariu în faze (Val 4) primește, pe fiecare componentă, o capacitate, o latență și un mod de a ceda. Un model simplu, în pași de timp, îl pune sub o curbă de trafic și îi injectează defecte. Alex vede unde se rupe: coada care crește fără limită, baza de date saturată, reîncercările care înmulțesc traficul. Apoi schimbă designul și rulează din nou.

E un model, nu un sistem, și ecranul o spune. E și cea mai scumpă bucată din document: se face întâi o probă pe un singur scenariu (ingestia de alerte).

### Gata când

- [ ] Un laborator în pagină se parcurge în cei cinci pași; observabilul se schimbă doar când reparația e reală (test cu o reparație falsă care nu trece).
- [ ] Ipoteza lui Alex e judecată față de cauza scrisă în date, cu model fals în teste.
- [ ] Fiecare modul P1 are cel puțin trei laboratoare; primele douăsprezece rulează în pagină.
- [ ] Explicația de la pasul 4 apare în caiet.
- [ ] Proba simulării are un verdict scris: merită sau nu.

Hotărât: program local pentru laboratoarele de pe laptop. Simularea de design rămâne deschisă, voit, până la verdictul probei.

---

## Val 11: Caietul (`caiet`)

Tot conținutul e scris de noi; Alex doar îl consumă. Ce formulează singur ține mai bine.

- **O formulare pe punct**, a lui Alex, de cel mult 400 de caractere, cu un exemplu propriu opțional.
- **Se scrie în momentele în care tocmai a produs ceva**, nu la cerere pe gol: după explicația dintr-un laborator, după o adâncire „Spune-o”, după un gol reparat. Poate scrie oricând și din fișă.
- **AI-ul verifică doar faptele**: `{ ok, wrong: […] }`. Nu rescrie stilul și nu „îmbunătățește”. O formulare cu o greșeală de fapt se salvează doar după ce Alex vede avertismentul.
- **La repetare, formularea lui apare prima.** Punctul din fișă stă dedesubt, ca „Formularea din fișă”. În lecție, cartonașul `punct` o arată pe a lui, dacă există.
- **„Greșeala mea, întrebarea mea”**: după o greșeală, Alex poate scrie propria întrebare. Intră în orar ca întrebare deschisă, legată de punct.
- **Formulările vechi se păstrează**, ca să se vadă cum s-a schimbat înțelegerea.
- **Export în Markdown**, pe module: caietul e al lui și trebuie să poată pleca din aplicație.

Cere ca textul lui Alex să se păstreze (vezi „Platforma”).

### Gata când

- [ ] După pasul 4 al unui laborator și după o adâncire „Spune-o”, formularea se poate salva dintr-o atingere.
- [ ] O formulare cu o greșeală de fapt primește avertisment; una corectă, dar stângace, nu e atinsă.
- [ ] La repetare apare întâi formularea lui Alex.
- [ ] O întrebare scrisă de Alex revine la scadență.
- [ ] Exportul dă un fișier Markdown pe modul.

---

## Ordine și dependențe

| Val | Depinde de | Poate merge în paralel cu |
|---|---|---|
| Platforma | nimic (hotărârile sunt luate) | 2 (pe forma actuală) |
| 0 Fundația | Platforma minimă (jurnalul) | 2 |
| 1 Sesiunea ghidată | 0 | 2, 5 |
| 2 Lecția sincronizată | nimic (verificarea din lecție cere 0.1) | 0, 1 |
| 3 Live coding | 0, 1; rularea Python cere proba Pyodide sau programul local | 7 |
| 4 Design în faze | 0 | 3 |
| 5 Grile mai bune | 0.1 pentru confuzii; restul liber | orice |
| 6 Măsurare | jurnalul din Platforma | orice |
| 7 Obișnuința | 0.3, 1.6; notificările cer Platforma | 8 |
| 8 Graful de concepte | 0.1 | 7, 9 |
| 9 Mecanisme | 0.1 | 8, 10 |
| 10 Laboratoare | 0.1; cele de pe laptop cer programul local, iar simularea cere Val 4 | 9 |
| 11 Caietul | 0.1; păstrarea textului cere Platforma | orice |

Ordinea hotărâtă:

1. Val 2 (pe PWA-ul de azi, fiindcă nu atinge starea) și, în paralel, platforma minimă: jurnal, sincronizare, AI prin server, importul lui `S`.
2. Val 0, direct pe jurnal.
3. Val 1.
4. Val 3, varianta scrisă. Alex a cerut explicit supervizare „ca într-un live coding”.
5. Val 7.
6. Val 11, fiindcă e ieftin și e folosit de 10.
7. Val 9 și laboratoarele în pagină din Val 10.
8. Val 8.
9. Val 4.
10. Laboratoarele de pe laptop și simularea de design din Val 10.

Valul 5 se face în bucăți, printre ele. Valul 6 pornește odată cu jurnalul.

## Ce nu facem

- Nu schimbăm ordinea variantelor în date și nu mutăm răspunsul corect de la indexul 0.
- Nu scoatem calea fără AI din nicio formă.
- Nu lăsăm modelul să introducă fapte: orice fapt nou intră întâi în `research/interview-facts.md`, cu sursă.
- Nu rescriem conținutul la trecerea pe forma nouă. Datele, explicațiile, desfășurările și verificările lor se mută ca atare.
- Nu trecem lecția pe audio generat dinainte fără un ADR nou care îl înlocuiește pe 0001.
- Nu construim mecanici de reținere care nu servesc învățarea: fără puncte, clasamente sau pedepse pentru zile lipsă.
- Nu lăsăm AI-ul să rescrie formulările lui Alex din caiet.
- Nu punem în sesiunea zilnică nimic care cere instalare sau laptop.

## Hotărâri (sesiunea de grilling din 11 noiembrie 2026)

| Temă | Hotărât |
|---|---|
| Scop | Memorie de durată și alte interviuri. „Întreținere” e modul implicit; „interviu” se pornește cu o dată. Prioritățile rămân până la un interviu nou. |
| Utilizatori | Doar Alex, fără profil și fără trasee. |
| Platformă | AWS Lambda + DynamoDB cu FastAPI (ADR 0004). Serverul păstrează jurnalul, ascunde cheile AI și trimite amintirea; cutiile, treptele și scadențele le calculează clientul (ADR 0003). Un singur secret pe dispozitiv. |
| Contul AWS | Plan gratuit acum, plan plătit înainte de luna a șasea; amintire în calendar la 5 luni și copie locală a jurnalului. |
| AI | Gemini, cu DeepSeek ca rezervă, prin server. Jarvis rămâne conexiune directă, cu jeton scurt. |
| Artifact | Înghețat până e verificat importul stării, apoi retras. |
| Verdict AI | Contează implicit în formele noi, cu „Nu sunt de acord” (ADR 0005). Cardurile orale, scheletele și Certificarea rămân pe bife. |
| Lecție | Întreabă după fiecare grup din hartă și scrie doar în întrebările deschise. Proba secvențelor se face pe `asyncio`. |
| Orar | Cutiile 1–8 din Val 0, plafon de 25 de minute; se reglează după o lună de date. |
| Rularea codului | JavaScript în pagină, proba Pyodide pentru Python; laboratoarele cu servicii reale rulează pe laptop, în afara sesiunii zilnice. |
| Sesiunea ghidată | 4 adânciri la 10 grile; încrederea la fiecare grilă; scris, cu microfon alături. |
| Live coding | Urcă după Val 1. Intervievatorul intervine la cerere, la rulare și între faze. Faza de cod e pentru laptop. Cronometrul e vizibil, dar nu oprește. |
| Design | Scenarii generale, 15–20 de minute, se poate face o singură fază. |
| Graf | Ordinea recomandă, nu blochează; repararea la rădăcină e fermă; repetarea implicită pornește la 30%. |
| Mecanisme | Primele patru: event loop asyncio, două thread-uri pe contor, event loop JavaScript, render → commit → effect. |
| Obișnuință | Doar „puncte care țin”, fără șir de zile. Amintire la 20:00, pe Android. |
| Vocabular | Treaptă e doar a punctului. Mecanismul e un Pas cu pas pe care îl avansezi. Vânătoarea de bug e un laborator. |

Rămân deschise, voit:

- Simularea de design: merită sau nu costul, după proba pe ingestia de alerte.
- Dacă jetonul Gemini Live se poate prelungi peste 30 de minute (spec-ul platformei).
- Lista de module urcate la P1 pentru un interviu nou (când apare unul).
