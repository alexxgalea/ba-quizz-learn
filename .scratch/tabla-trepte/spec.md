Status: ready-for-agent

# Tabla cu trepte și robotul care arată

Continuă `.scratch/lectia-tabla/` (verdictul lui Alex pe `asyncio`, tichetul 05 de acolo). Vocabularul vine din `CONTEXT.md` (**Lecție**, **Bucată**, **Secvență**, **Cartonaș**, **Tablă**, **Treaptă**). Interviul de design a avut loc pe 15 noiembrie 2026. Prototipul e pe ramura `prototype/tabla-pasi`; Alex a ales varianta B.

## Problem Statement

Alex a ascultat lecția `asyncio` pe tablă: ecranul se citește mai bine, schemele sunt bune. Trei lucruri lipsesc:

1. **Ritmul e încă alert.** Pauza dintre secvențe a crescut deja la 4 s (PR #12). Dar o schemă de 4 trepte e tot spusă dintr-o suflare.
2. **Nu se vede ce explică Jarvis acum.** Schema apare întreagă, iar ochiul nu știe pe ce rând să stea. Cuvintele cheie apar pe rând, dar după ce au apărut toate, nu mai vezi care e cel spus acum.
3. **Ecranul nu are pe cineva care explică.** Alex a cerut „o machetă de om care explică, cu un băț care arată ideea”.

Doar `asyncio` are tablă. Restul modulelor merg ca înainte.

## Solution

- **Schema se spune în trepte.** O treaptă e o săgeată `↓ cauză` plus starea la care duce; prima treaptă e ce stă înainte de prima săgeată. Aplicația îi dă lui Jarvis câte o treaptă, cu cele de dinainte drept context, niciodată pe următoarea. Pe ecran, schema e vizibilă întreagă: treapta curentă e evidențiată, cele trecute rămân normale, cele care urmează sunt estompate. Între trepte e o pauză scurtă (`STEP_GAP_MS`, 2 s).
- **Cuvântul cheie spus acum e evidențiat**, iar cele de dinainte se estompează.
- **Robotul rotund (varianta B din prototip)** ia locul bulei din lecție, în modul cu ecran. Fața lui arată cele patru stări: vorbește, ascultă, se gândește, pauză. Un punct ca de laser, pe marginea dreaptă a schemei, arată treapta curentă.
- **Tablele se scriu și pe restul modulelor**, modul cu modul. Întâi cele P1 (`python`, `oop`, `gil`, `asgi`, `pytest`, `design`, `js`, `ts`, `react`, `frontend`, `fedebug`), apoi P2 și P3. Fără Bonus și fără `behav`.

## User Stories

1. Ca Alex, vreau ca Jarvis să explice schema treaptă cu treaptă, ca să am timp să mă uit la fiecare.
2. Ca Alex, vreau să văd evidențiată treapta despre care vorbește Jarvis, ca să știu unde să mă uit.
3. Ca Alex, vreau să văd toată schema de la început, cu ce urmează estompat, ca să știu încotro merge explicația.
4. Ca Alex, vreau ca Jarvis să nu povestească o treaptă înainte să apară evidențiată.
5. Ca Alex, vreau să văd care cuvânt cheie e spus acum.
6. Ca Alex, vreau un personaj care explică (robotul) în locul bulei, care să arate ce face Jarvis: vorbește, ascultă, se gândește sau stă.
7. Ca Alex, vreau un indicator pe treapta explicată, ca un băț de profesor.
8. Ca Alex, în „Doar audio”, vreau tot ritmul mai lent, treaptă cu treaptă, fără nimic pe ecran.
9. Ca Alex, vreau tablă și trepte la toate modulele P1, apoi la celelalte.
10. Ca Alex, vreau să ascult întâi treptele și robotul pe `asyncio` și să spun dacă merg.

## Implementation Decisions

- **Tăierea în trepte** e o funcție pură în `src/jarvis.js` (de exemplu `trepte(schema)`): prima treaptă e ce stă înainte de prima săgeată; fiecare rând care începe cu `↓` deschide o treaptă și ia rândurile fără săgeată de după el. Cazurile din `asyncio`: săgeată goală (`↓` singur), două săgeți la rând (`Semaphore`), săgeată la final (`↓ except*`). Toate intră în regula de mai sus.
- **Trepte doar pentru schema de tablă** (secvența `ideea` a unui punct cu `Tablă`). „Pas cu pas” nu are săgeți `↓` în niciun modul (30 de câmpuri, 0 cu săgeți) și se arată întreg, ca azi. O schemă de tablă fără săgeți se arată întreagă, fără trepte.
- **Secvența `ideea` cu trepte** devine o secvență pe treaptă, cu `k / of` ca la celelalte secvențe. Prima treaptă poartă și cuvintele cheie ale ideii; Jarvis le spune odată cu starea de pornire.
- **Ce vede modelul și ce vede ecranul se despart, doar aici.** Cartonașul are schema întreagă și indexul treptei curente. Materialul pentru model are treptele de până acum și treapta curentă, marcată. `CONTEXT.md` › **Cartonaș** spune azi „același conținut ajunge la model”; se corectează.
- **Ritm**: între trepte, `STEP_GAP_MS` = 2000 (constantă separată, lângă `SEQ_GAP_MS` = 4000). Între secvențe rămâne `SEQ_GAP_MS`. Instrucțiunea treptei cere aceleași reguli ca la tablă: o idee, rar, propoziții scurte, 10–15 s, fără să anunțe ce urmează. Cine anulează pauza: aceleași comenzi ca la `SEQ_GAP_MS` (Repetă, Pauză, Sari, Vorbește, o întrebare).
- **Întreruperi**: o bucată întreruptă (Repetă, pauză lungă, semnal pierdut, `fresh`) se reia de la prima secvență, ca azi. Treptele nu schimbă regula.
- **„Doar audio”**: treptele vin la fel, pe rând; instrucțiunea e cea „din material”, fără trimiteri la ecran.
- **Cuvântul curent**: `revealWords` știe deja ce cuvânt a apărut ultimul; cartonașul îl marchează ca curent, iar pe cele de dinainte ca vechi. La `spoken`, toate apar fără să fie vreunul curent.
- **Robotul** (varianta B, `prototype/tabla-pasi`, `docs/prototip-tabla.html` până la tichetul 04): SVG inline în `vLessonActive`, în locul bulei (`jv-orb`), doar în modul cu ecran. Culoarea feței urmează stările bulei (`--ok` vorbește, `--warn` se gândește, `--line-strong` pauză și conectare, `--accent` altfel). Gura se mișcă când vorbește, antena e verde când ascultă, ochii privesc în sus când se gândește și se închid la pauză. Nivelul vocii (`--lv`) se păstrează ca la bulă. Ecranul Jarvis din afara lecției (interviul vocal) păstrează bula.
- **Laserul**: un punct la marginea dreaptă a schemei, la mijlocul treptei curente. Se mută cu tranziție și e estompat la pauză și când ascultă. Fără schemă cu trepte, laserul nu apare.
- **`prefers-reduced-motion`**: fără animații, ca regula globală de acum.
- **Validarea** (`checkTab` în `lib.mjs`, `node validate.mjs`): schema de tablă are cel puțin o săgeată `↓` și cel mult 5 trepte. `asyncio` trece deja (cel mult 4 trepte).
- **Fișierele**: `src/jarvis.js` (`trepte`, `boardSequences`, ritm, `lessonView`), `src/app.js` (`jvBoard`, `vLessonActive`), `src/app.css`, `lib.mjs` + `validate.mjs`, `src/desf/<modul>.md` pentru table, `CONTEXT.md`, README, `CLAUDE.md`.

## Testing Decisions

- Logica cu TDD, la interfața lui `Jarvis.create`, în `tools/unit/lesson.test.mjs`, peste `Call` real și falsurile din `tools/unit/fakes.mjs`: tăierea în trepte (cazurile din `asyncio`), `next_chunk` cu o treaptă pe rând fără treapta următoare în material, `STEP_GAP_MS` cu ceas fals, anularea pauzei, modul audio.
- Validarea: `tools/unit/desf.test.mjs` (fără săgeată → eroare; 6 trepte → eroare) și fișierul real `asyncio`.
- Ecranul: `tools/test_lesson.py` (treapta curentă are clasa de evidențiere, următoarele sunt estompate; robotul înlocuiește bula doar în modul cu ecran; laserul stă la înălțimea treptei curente; fără scroll orizontal la 360 px, light și dark).
- Tablele noi: `node validate.mjs`, `node tools/fencew.mjs 36`, `node tools/desf_examples.mjs`.
- Ritmul, treptele și robotul se judecă pe ureche și pe ochi: proba lui Alex (tichetul 05).

## Out of Scope

- Evidențierea rândului de cod (secvența `exemplu`): potrivirea din transcriere e prea fragilă pe nume de cod.
- Variantele A (om din linii) și C (mână cu băț) din prototip.
- Treptele pentru „Pas cu pas”: nu are săgeți; dacă primește vreodată, regula de tăiere se aplică la fel.
- Durata secvenței (rămâne 10–15 s; se lungește doar dacă proba arată că tot e prea repede).
- Tablele pentru Bonus (`dbmodels`, `aws`, `django`; n-au desfășurări) și `behav`.

## Further Notes

- Decizii din interviu (15 noiembrie 2026): pauza de 4 s între secvențe (PR #12, publicat); trepte date de aplicație, nu ghicite din transcriere; schema vizibilă întreagă cu viitorul estompat; 2 s între trepte; cel puțin o săgeată și cel mult 5 trepte; trepte și în modul audio; robotul preia stările bulei; tablele modulelor în paralel cu treptele, începând cu `python`.
- Costul de conținut: 25 de module, cam 265 de puncte. Un modul pe tichet, cu `/clear` între ele.
