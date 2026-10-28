# ba-quizz-learn

Aplicație de pregătire pentru interviul tehnic de la Onapsis (Software Engineer – Python, echipa Defend). Conține grile cu explicații, carduri pentru răspunsuri orale, întrebări deschise, exerciții de live coding și un plan pe zile generat din progres. Totul se construiește într-un singur fișier HTML, fără dependențe, publicat ca artifact Claude, cu progresul sincronizat între dispozitive.

## Ce conține

- **264 de grile** în 25 de module, pe trei niveluri (bază, practic, avansat). Fiecare are context înainte de întrebare, butonul „Nu știu încă” și „Am ghicit”, care trimite grila înapoi la repetat.
- **Explicații pe două niveluri.** Imediat după răspuns: pe scurt, de ce contează, cum funcționează și de ce e greșită varianta aleasă. La cerere („Arată-mi concret”): pas cu pas, aplicare, legătura cu ce știi deja, limite, formularea pentru interviu, o întrebare de verificare și celelalte variante.
- **Glosar** de 46 de termeni, legați automat în texte: atingi termenul subliniat și se deschide definiția.
- **73 de carduri orale** (dintre care 13 snippet-uri de cod și 6 scenarii de design), **9 exerciții de live coding** cu soluții testate cu pytest și fișe pe module.
- **Întrebări deschise**: cele 217 întrebări „Verificare” din explicații (fără modulul bonus), fără variante. Răspunzi cu voce tare, dezvălui răspunsul, te notezi (știu / parțial / nu); intră în aceleași cutii Leitner.
- **Formulări pentru interviu** (Studiu › Formulări): liniile „La interviu” din toate explicațiile, pe o pagină, filtrate P1 / greșite / toate.
- **Diagnostic adaptiv** și **repetiție spațiată** cu scadențe reale: cutia 1 revine după 20 de minute, cutia 2 după 4 ore, cutia 3 a doua zi, cutia 4 peste două zile, cutia 5 niciodată. „De repetat acum” adună grilele, cardurile și întrebările deschise scadente; „Mix inteligent” ia întâi scadentele.
- **Plan pe zile generat din progres**: data interviului și orele pe seară se setează în Progres › Interviul. Fiecare seară are aceeași rețetă (scadențe → fișă + grile pe modulele cu cea mai mare nevoie → oral → kata → greșeli), ultima seară se încheie cu formulările, iar dimineața interviului are doar încălzire. Sarcinile bifate azi rămân în listă; restul se recalculează din timpul rămas.
- **Verificare AI la cardurile orale** (opțională): scrii sau dictezi răspunsul, iar Claude (în artifact) sau DeepSeek (în afara lui, cu cheie) îl compară cu punctele cheie și pre-bifează ce ai acoperit, cu feedback scurt. Vezi secțiunea „Verificare AI”.
- **Intervievator** (în artifact): la un card oral, „Răspunde intervievatorului” transformă cardul într-un dialog scris. Claude pune cel mult 2 întrebări de continuare, apoi dă verdictul pe tot dialogul. Vezi „Intervievator”.

## Structura

```text
build.mjs          construiește dist/pregatire-onapsis.html (artifact) și dist/app (PWA)
lib.mjs            încarcă datele și parsează explicațiile (Markdown)
validate.mjs       verifică datele, explicațiile și glosarul
package.json       scripturi (validate, build, teste)
src/
  shell.html       scheletul paginii
  app.js, app.css  aplicația, fără dependențe externe
  live.js          Jarvis: serverul vocal (Gemini Live), protocolul și reluarea
  audio.js         Jarvis: microfon și difuzor în browser
  call.js          Jarvis: apelul vocal (stări, întrerupere, pauză, poarta microfonului, „Nu te aud”)
  jarvis.js        Jarvis: sesiunea (funcții oferite modelului, scor, setări, modul Lecție)
  ask.js           „Întreabă despre asta”: prompt, limite și verdict „în temă”
  gemini_text.js   un apel de text către Gemini (REST), pentru PWA
  pwa/             iconița, service worker-ul
  data_*.js        module, grile, context, carduri orale, fișe, exerciții, setări (data interviului, ore pe seară)
  expl/*.md        explicațiile grilelor, pe module (p1_*, p2_*, p3_*, perplexity.md)
  expl/glosar.md   glosarul
katas/             exercițiile de live coding și testele lor: katas.py + k13_api.py (pytest; k13 cere fastapi și httpx),
                   katas_js.mjs (node:test), k15_alerts.tsx + test (React 19, verificat cu vitest în afara repo-ului)
tools/             teste de interfață (Playwright), teste de unitate în tools/unit (Node) și utilitare
docs/              spec-ul Jarvis (docs/superpowers/specs), probele de aruncat (prototype-jarvis-probe.html, probe-lectie-metrou.html) și PWA-ul publicat pe Pages (docs/app)
.scratch/          spec-urile și tichetele locale (de exemplu .scratch/lectie-live)
export/            generatorul brief-ului trimis la Perplexity
```

## Comenzi

```bash
node validate.mjs            # verifică tot; trebuie să se termine cu „OK”
node build.mjs               # produce dist/pregatire-onapsis.html
node --check dist/bundle-check.js
python3 -m pytest -q katas   # testele exercițiilor Python (k13 e sărit dacă lipsește fastapi)
node --test katas/katas_js.test.mjs   # exercițiile JavaScript
python3 tools/check.py       # teste de interfață (Playwright + Chromium)
python3 tools/test_teach.py
python3 tools/test_expl.py
python3 tools/test_terms.py
python3 tools/test_ai.py     # verificarea AI la carduri orale (Claude/sample și DeepSeek simulate)
python3 tools/test_gaps.py       # goluri (mc, w), teoria pe ce ai ratat, Studiu › Pentru tine
python3 tools/test_interview.py  # intervievatorul: dialog, scor 1/0,5, memorie, rescriere, erori (sample simulat)
python3 tools/test_plan.py   # planul generat, scadențele, întrebările deschise, formulările, setările
node --test "tools/unit/*.test.mjs"   # Jarvis: Live, Audio (partea pură), Call, Jarvis, peste adaptoare false
python3 tools/test_audio.py      # BrowserAudio în Chromium cu microfon fals
python3 tools/test_prepapp.py    # PrepApp: record dă aceleași urme ca oralSave, next, theory, summary, log
python3 tools/test_jarvis.py     # ecranul Jarvis la 360 px, light și dark, cu Live și Audio false
python3 tools/test_lesson.py     # Lecție: poziția și recomandarea în aplicație, butoanele, vederea lecției (360 px, light și dark)
python3 tools/test_pwa.py        # manifest, iconițe, service worker, offline
python3 tools/test_ask.py        # „Întreabă despre asta”: grilă, fișă, gol; sample, Gemini, DeepSeek
```

Pe scurt: `npm run build`, `npm run test:katas`, `npm run test:unit`, `npm run test:ui`, iar `npm run pages` copiază PWA-ul în `docs/app`.

Data implicită a interviului și orele pe seară stau în `P.cfg` (`src/data_core.js`); `P.planTpl` are sarcinile din dimineața interviului și ordinea exercițiilor în plan. Utilizatorul le poate schimba din aplicație (se salvează în progres, cheia `c`).

## Formatul explicațiilor

Fiecare grilă are o secțiune în `src/expl/*.md`, cu id-ul ei:

````markdown
### cel-04
Pe scurt: o frază cu răspunsul.
Scop: de ce contează.
Mecanism: cum funcționează.
Pas cu pas:
```text
diagramă scurtă
```
Aplicare: cum arată în cod (blocuri ```python, ```sql etc. permise).
Legătură: legătura cu ce știi deja sau cu altă grilă (de ex. CEL-07).
Limită: unde se oprește regula.
La interviu: „formularea de spus cu voce tare”
Verificare: o întrebare scurtă.
Răspuns verificare: răspunsul ei.
Varianta greșită B: de ce e greșită varianta B.
Varianta greșită C: ...
Varianta greșită D: ...
````

Reguli:

- Literele B, C și D se referă la ordinea variantelor din sursă (`o[1]`–`o[3]` din `src/data_*.js`). Varianta A (`o[0]`) e răspunsul corect; aplicația amestecă variantele la afișare.
- `Pe scurt` și `Mecanism` sunt obligatorii, iar `Verificare` cere și `Răspuns verificare`. Un câmp `Context:` opțional înlocuiește contextul din `data_ctx.js`.
- Pe telefon, rândurile lungi din blocurile de cod trec pe rândul următor, așa că diagramele text rămân sub ~36 de caractere pe rând.
- `validate.mjs` semnalează erorile (id-uri necunoscute, litere greșite, blocuri de cod neînchise) și avertizează la câmpurile prea lungi.

Glosarul (`src/expl/glosar.md`) are câte o secțiune `### Termen`, cu câmpurile `Forme:` (formele flexionate după care termenul e găsit în texte; trebuie să fie unice), `Definiție:`, `Scop:`, `Exemplu:`, `Analogie:`, `Limită:` și `Vezi și:`.

## Intervievator

Doar unde există `sample` (în artifact); în afara lui butonul nu apare, iar fluxul „Verifică cu AI” rămâne ca înainte.

1. Scrii răspunsul, apoi „Răspunde intervievatorului”. Un apel `quick` întoarce JSON `{"act":"followup","say":…}` sau `{"act":"done"}`. Intervievatorul are ton neutru, nu dă termenul răspunsului și cunoaște profilul tău (doar ca să formuleze concret). La cardurile BEH cere ce lipsește din STAR.
2. Cel mult `IV_MAX` = 2 întrebări de continuare. „Nu știu” se trimite ca răspuns, iar „Încheie, vreau verdictul” funcționează oricând. „Done” sau un format greșit la întrebare duc direct la verdict.
3. Verdictul (`default`) judecă tot dialogul: `covered[i]` e `spontan` (1 punct), `dupa` (acoperit abia după o întrebare, 0,5) sau `nu`. Bifele vin pre-completate, cu eticheta „după întrebare”; scorul trece prin `updO` ca înainte, din bifele tale (`tickSum`).
4. Memorie pe card, în `S.o[id]`: `m` = indexurile punctelor neacoperite întreg (data viitoare intervievatorul le vizează primele) și `a` = ultima ta versiune bună. După verdict vezi „față de data trecută”. Cheile se scriu doar pe carduri făcute cu dialog (sau care le au deja), iar `mergeState` le păstrează ca pe restul itemului.
5. „Rescrie-l” e opțional, după verdict și model. Reverificarea folosește verificatorul simplu, nu schimbă scorul și, la cel puțin 80% din puncte, salvează textul ca `a` (maximum 800 de caractere).

6. **Interviu simulat** (Oral › Interviu simulat): 4 carduri din cel puțin 3 module, alese cu ponderile din „Recomandate” (`pickIvMock`). Salutul, tranzițiile și încheierea sunt text fix, fără apeluri în plus. Între carduri nu vezi modelul de răspuns și nu există rescriere; fiecare card trece prin `updO`, iar la final vezi ecranul de rezultat cu scorul pe card. Sarcina „oral” din plan recomandă intervievatorul, iar dimineața interviului are o încălzire de 2 carduri (`m-iv`, `go: { t: "ivmock", n: 2 }`). Fără `sample` modul nu apare, iar planul păstrează textul vechi.

Fiecare apel are `cache: false` și primește tot dialogul în prompt (`sample` nu ține minte nimic). Nu există timer în pagină: ai „Se gândește…” și „Oprește”. Erorile folosesc `AI_MSG`; nu există reîncercare automată, iar „Continuă” reia pasul. Funcțiile pure (`parseTurn`, `parseIvVerdict`, `ivScore`, `ivTurnPrompt`, `ivVerdictPrompt`) sunt în `window.__prep`. Test: `python3 tools/test_interview.py`.

## Proba tehnică: snippet-uri, design, interviu simulat

După interviul cu managerul, prioritățile urmează ce a semnalat: P1 = `gil` (threading), `asyncio`, `python` (generatori), `oop`, `pytest`, `asgi` (FastAPI), `design`; NoSQL (`dbmodels`) e Bonus. Sesiunea tehnică din 3 noiembrie are un inginer de backend și unul de frontend, cu live coding pe CoderPad, deci și `frontend` (React/TS) e P1, iar `graphql` a urcat la P3 (anunțul cere REST și GraphQL).

- **Snippet-uri orale** (`src/data_oral2.js`, câmpul `code`): vezi codul sub întrebare, spui ce e greșit, ce se întâmplă sub încărcare, cum ai repara și cum ai testa. Codul intră în promptul intervievatorului și al verificării. Rânduri de cel mult 38 de caractere (verificat de `validate.mjs`), cod la 11 px pe card.
- **Scenarii de design** (modulul `design`): intervievatorul cere clarificări, trade-off-uri, puncte de eșec și scalare și pune până la 3 întrebări de continuare. Verdictul tratează punctele cheie ca criterii de raționament.
- `ivRules(card)` e singurul loc unde se decid regulile pe tip de card.
- **Interviu tehnic simulat** (Oral): 7 carduri, câte unul pe slot, în ordinea probei: threading/asyncio, OOP, testing/generatori, FastAPI, frontend (React/TS), un snippet, un scenariu de design (`pickTechMock`, cu ponderile `wO`). Persoana anunță snippet-ul și designul.
- Faptele verificate pe surse primare: `research/interview-facts.md`.

## Goluri și teorie

Ce ratezi la oral se înregistrează pe fiecare card, în `S.o[id]`: `mc` (index punct → de câte ori l-ai ratat; +1 la un punct neacoperit întreg, −1 la unul acoperit întreg, maximum 9), `m` (punctele ratate ultima dată), `w` (cel mult 3 afirmații marcate greșite de verdict). Se actualizează la fiecare „Salvează”, cu sau fără intervievator; la cardurile vechi, `m` valorează 1 per punct. `mergeState` le îmbină ca pe restul itemului.

- **Pe ecranul de verdict**: „Teorie pe ce ai ratat (N)” arată, pentru punctele neacoperite întreg (din bifele de acum), ce ai spus greșit și, pentru fiecare punct, propoziția din răspunsul model și punctele din fișa modulului cu cele mai multe cuvinte comune cu el (`relRank`, fără cuvinte de legătură și fără diacritice), plus grilele greșite din modul. Nu repetă aceeași propoziție la puncte diferite. În interviul simulat nu apare.
- **Studiu › Pentru tine**: golurile de pe toate cardurile, cele mai grele primele (ratări × prioritatea modulului, `gapList`), cu „Exersează cardul”.
- **Doar cu `sample`** (în artifact), la fiecare gol: „Explică-mi pe înțelesul meu” (`default`, fără cache; pornește din ce ai scris sau, în Studiu, din afirmațiile greșite păstrate; trei părți: Ideea, Unde s-a rupt gândirea ta, Spune-l la interviu) și „Verifică-te pe acest punct” (o întrebare nouă, într-un scenariu, `quick`; răspunsul e judecat cu `default`, `{"covered", "feedback"}`). Dacă acoperi punctul, golul e reparat: `mc` revine la 0 și punctul iese din `m`, fără să schimbe cutia cardului. În review reparația se aplică la „Salvează” (`run.fixed`); în Studiu, imediat, cu `gt` (timestamp de îmbinare pentru goluri: `itemT = max(t, gt)` în `mergeState` și `prune`), ca scadența Leitner să rămână pe `t`. Stările explicațiilor și ale întrebărilor stau în `ui.les` / `ui.chk` (nu se salvează în progres).
- **Alegerea cardurilor**: `wO` înmulțește cu `gapF` (până la ×2; fiecare ratare numără, cel mult 3 per punct), deci „Recomandate”, interviul simulat și planul favorizează cardurile cu goluri.
- **Plan**: sarcina `gap` pe seară („Pentru tine: N goluri…”, 10 min) și `m-gap` în dimineața interviului, doar când există goluri.
- Test: `python3 tools/test_gaps.py`.

## Verificare AI

La un card oral poți scrie răspunsul sau îl poți dicta cu butonul „Dictează” (Web Speech, `ro-RO`, dacă browserul îl are). „Verifică cu Claude” (sau „cu DeepSeek”) trimite întrebarea, punctele cheie, răspunsul model și răspunsul tău, iar sursa verdictului se alege automat:

1. **Claude, prin capabilitatea `sample`** (în artifact): fără cheie, pe contul tău Claude, cu cerere de permisiune la prima folosire. E singura variantă care merge în artifact, pentru că CSP-ul paginii blochează orice `fetch` către alt host.
2. **DeepSeek**, doar dacă `sample` lipsește (aplicația rulată în afara artifactului): `https://api.deepseek.com/chat/completions`, model `deepseek-flash`, mod JSON, fără thinking, cu cheia din Progres. Verdictul (`covered[]`, `missing`, `wrong`, `feedback`) pre-bifează punctele; le poți schimba, iar scorul și cutiile Leitner se calculează ca înainte din bife. „Fără AI” păstrează bifatul manual.

- Cheia DeepSeek (doar în afara artifactului) se introduce în Progres › Verificare AI și stă doar în `localStorage` (`onapsis-deepseek-v1`), separat de progres: nu se sincronizează, nu intră în export sau în brief. Pe fiecare dispozitiv o introduci separat.
- Apelul DeepSeek pleacă direct din browser; DeepSeek răspunde la preflight CORS pentru orice origin. În artifact `fetch` e blocat de CSP, de aceea acolo se folosește `sample`. Cardurile rămân oricum utilizabile manual.
- Răspunsul tău nu se salvează în progres; stă doar în sesiunea curentă.
- Test: `python3 tools/test_ai.py` (DeepSeek, `sample` și microfonul simulate, nimic nu iese din mașină).

## Publicare

Aplicația e publicată ca artifact Claude privat: https://claude.ai/artifact/PNwBxGppDYNrt1CYGpM7HT

Progresul stă în baza de date a artefactului, într-un document per utilizator (`data/users/<uid>/progress`), plus o copie locală în browser. Republicarea la același link păstrează progresul. Cheile stării: `q` grile, `o` carduri orale, `x` întrebări deschise, `k` exerciții, `p` sarcini bifate, `l` poziția lecției pe modul, `h` istoric, `c` setări. Dintr-o sesiune Claude: rulezi build-ul, apoi publici `dist/pregatire-onapsis.html` cu `url` setat la link-ul de mai sus.

## Jarvis (interviu vorbit)

Tab-ul „Jarvis” e un dialog vocal cu un intervievator AI (Gemini Live, nivelul gratuit). Merge doar în aplicația PWA (https://alexxgalea.github.io/ba-quizz-learn/app/): în artifact nu există microfon, iar CSP-ul blochează conexiunile, deci tab-ul trimite la PWA. Cheia Gemini stă în `localStorage` (`onapsis-gemini-v1`), niciodată în starea aplicației, în export sau în brief.

Designul, deciziile și rezultatele probei de pe telefon: `docs/superpowers/specs/2026-10-22-jarvis-voice-interviewer-design.md`. Pe scurt:

- **Trei cusături**: `Live` (GeminiLive | FakeLive), `Audio` (BrowserAudio | FakeAudio), `PrepApp` (app.js | stub). `Call` și `Jarvis` stau peste ele. Fiecare fișier merge în pagină (declarații globale) și în Node (`module.exports`), fără importuri între ele.
- **PrepApp** (`window.PrepApp`, în `app.js`): `next`, `record` (aceeași logică ca `oralSave`, prin `recordOral`), `theory`, `summary`, `log`, iar pentru Lecție `sheet`, `lessonHeard`, `lessonDone`, `lessonRec`. Rândurile din istoric au `kind: "jarvis"`; cele de lecție au și `lesson: true`.
- **Teste**: `tools/unit` (Node, câte un fișier pe modul), `tools/test_audio.py`, `tools/test_prepapp.py`, `tools/test_jarvis.py` (înlocuitorii din `tools/jarvis_fakes.js` se injectează prin `window.__jarvisFakes`).
- **Publicare PWA**: `npm run build && npm run pages`, apoi commit și push. GitHub Pages servește `docs/app` din ramură (Settings › Pages › Deploy from a branch › `/docs`).

## Lecție (Jarvis explică o fișă)

În tab-ul Jarvis, „Ascultă lecția recomandată” (și lista tuturor modulelor) pornește o lecție: Jarvis explică fișa modulului cu voce tare, **bucată** cu bucată, iar Alex doar ascultă. Pe fiecare fișă din Studiu apare butonul „Ascultă”. Ambele există doar în PWA. Vocabularul (Lecție, Bucată, Poziția lecției, Fereastra de ascultare, Pauză, Mut, Vorbește) e în `CONTEXT.md`, decizia „live, nu audio pregenerat” în `docs/adr/0001-lectie-live-nu-audio-pregenerat.md`, iar spec-ul și tichetele în `.scratch/lectie-live/`.

- **Bucăți**: sursa e fișa (`PrepApp.sheet`). O bucată e un punct. Ideea principală deschide lecția („Asyncio, în 10 idei. Prima: …”), formulările de evitat o încheie ca „capcane la interviu”, apoi recapitulare și rămas-bun. Modelul primește bucățile prin `next_chunk` și `repeat_chunk`; punctele nu intră în instrucțiunile de sistem, deci ordinea și poziția rămân ale aplicației. Funcțiile lecției: `next_chunk`, `repeat_chunk`, `pause_session`, `end_session` („mai simplu” și „exemplu” sunt reexplicări, fără funcție).
- **Fereastra de ascultare**: după ce o bucată s-a redat toată (`spoken` din `Call`), aplicația redă un sunet scurt (`audio.beep("window")`) și deschide microfonul 3 s (`clock.after`). Tăcere → `Bucata următoare`; voce → trecerea automată se anulează până răspunde Jarvis, apoi se deschide o fereastră nouă. Ceasul îl ține aplicația, nu modelul. Cât vorbește Jarvis, microfonul nu ajunge la server (`halfDuplex` forțat în lecție).
- **Mut și Vorbește**: pe Mut nu există fereastră, bucățile curg una după alta, iar microfonul ajunge la server doar cât e ținut apăsat „Vorbește” (apăsarea oprește redarea; eliberarea trimite `audioStreamEnd`). Mut-ul se ține minte în `onapsis-jarvis-v1` (setările Jarvis), nu în starea de progres. Poarta microfonului stă în `Call` (`mic`, `talk`).
- **Pauză**: `audio.pause()` îngheață contextul, deci coada rămâne; sub ~10 minute redarea continuă din aceeași secundă, altfel (sau după o conexiune pierdută) bucata se reia de la început. Pauza vine din buton sau prin voce.
- **Semnal pierdut**: în lecție reîncercările durează ~60 s (`retryMs`); după reconectare Jarvis spune „Reiau de unde am rămas” și reia bucata. Dacă nu revine, `Call` (cu `survive`) rămâne pe pauză, `audio.beep("warn")` avertizează, iar „Reia” redeschide sesiunea.
- **Poziția lecției**: `S.l[modul] = { n, d, t }` (bucata ascultată cel mai departe, data ultimei terminări, timestamp), îmbinată pe modul după `t`; un reset o șterge. Avansează doar când o bucată s-a redat toată (nu la Sari, nu la o bucată întreruptă). Recomandarea (`PrepApp.lessonRec`): lecția începută, altfel modulul cu cea mai mare nevoie dintre cele neterminate în ultimele 2 zile, fără Bonus și fără „Comportamental”.
- **Ce nu face**: nu scrie în scor, cutiile Leitner, goluri sau întrebările deschise; rândul din istoric (`lesson: true`) nu scade din bugetul serii; întrebările libere nu se salvează nicăieri.
- **Neterminat, în așteptarea probei din metrou** (`docs/probe-lectie-metrou.html`, tichetul 01): ecranul stins (tichetul 10) și butoanele căștilor prin Media Session (tichetul 11). Până atunci ecranul stins rămâne pauză, iar controlul se face din butoanele de pe ecran și din voce.
- **Teste**: `tools/unit/lesson.test.mjs` (Jarvis peste `Call` real), `call.test.mjs`, `audio.test.mjs`, `live.test.mjs`, `tools/test_lesson.py` (aplicația și ecranele), `tools/test_audio.py` (pauza și sunetele într-un Chromium real).

## Întreabă despre asta

Sub explicația unei grile, într-o fișă din Studiu și la fiecare gol din „Pentru tine” (inclusiv în review-ul unui card oral) apare butonul „Întreabă despre asta”: o conversație scurtă cu modelul, limitată la tema zonei de teorie.

- **Limitare**: `src/ask.js` pune materialul zonei în instrucțiuni și cere răspuns JSON `{on_topic, answer}`. Dacă `on_topic` e fals, ecranul arată o frază fixă („Aici răspund doar despre …”), niciodată textul modelului. Întrebarea intră ca date între `<<<` și `>>>`, fără acești markeri, cu cel mult 400 de caractere; cel mult 6 schimburi pe context, iar „Întrebare nouă” resetează.
- **Context** (`askCtx` în `app.js`): `mcq:<id>` (grila, variantele, explicația, ce ai ales), `sheet:<modul>` (fișa) și `gap:<card>:<punct>` (cardul, punctul ratat, răspunsul model, afirmațiile marcate greșite).
- **Sursă**: `sample` în artifact (Claude), altfel Gemini cu cheia de la Jarvis (`gemini-3.8-flash`, REST), altfel DeepSeek. Fără nicio cheie, blocul spune ce să adaugi.
- **Nu se salvează**: conversația stă în `ui.ask`, nu în progres, export sau sincronizare.
