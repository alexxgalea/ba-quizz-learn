# ba-quizz-learn: instrucțiuni pentru Claude

Aplicația de pregătire a lui Alex pentru interviul tehnic de la Onapsis (Software Engineer – Python, echipa Defend). Interviul e miercuri, 21 octombrie 2026 (data implicită e în `P.cfg`, `src/data_core.js`; Alex o poate schimba din Progres › Interviul). Alex o folosește mai ales pe telefon, ~2–3 h pe seară. Detaliile despre structură și format sunt în `README.md`.

## Reguli

- Tot textul din aplicație e în română. Termenii tehnici rămân în engleză (thread, worker, broker, commit, endpoint).
- Nu schimba ordinea variantelor în `src/data_*.js`: varianta corectă e la indexul 0 (`a: 0`), iar explicațiile folosesc literele B, C și D pentru indexurile 1–3.
- După orice modificare de date sau explicații: `node validate.mjs` (trebuie să se termine cu „OK”), `node build.mjs`, `node --check dist/bundle-check.js`.
- Înainte de publicare rulezi testele de interfață din `tools/` (`check.py`, `test_teach.py`, `test_expl.py`, `test_terms.py`, `test_ai.py`, `test_interview.py`, `test_gaps.py`, `test_plan.py`) și verifici vizual, la 360 px, în light și dark: `python3 tools/shot_q.py <modul> <ID> [dark]`. Singura eroare de consolă acceptată e blocarea fonturilor Google în sandbox.
- Publici mereu la același link, ca progresul și permisiunile să rămână: Artifact publish cu `file_path: dist/pregatire-onapsis.html` și `url: https://claude.ai/artifact/PNwBxGppDYNrt1CYGpM7HT`, fără `icon` și fără `capabilities`. Artifactul are deja declarate `db` și `user` (sincronizarea) și `sample` (verificarea AI), iar fără câmpul `capabilities` le păstrează. Dacă vreodată le declari, le treci pe toate trei, fiindcă o declarație nouă înlocuiește tot setul.
- După publicare îi trimiți lui Alex un mesaj scurt, în română, despre ce s-a schimbat.
- Fără trailer `Co-Authored-By` în mesajele de commit și în descrierile de PR.

## Stilul explicațiilor

- Propoziții scurte și active. Fiecare câmp are un singur rol; nu repeta „Pe scurt” în „Mecanism”.
- „Legătură” leagă conceptul de experiența lui Alex (Django/DRF, React, Elasticsearch, Docker Swarm, Keycloak, Celery, computer vision) sau de alte grile, scrise ca CEL-07, PG-02 etc.
- „Varianta greșită” explică de ce e greșită varianta respectivă, nu repetă răspunsul corect.
- Verifici faptele (valori implicite, versiuni, nume de API). Ce ține de starea actuală a lumii (Onapsis, OWASP, versiuni de produse) cauți pe web înainte să scrii.
- Diagramele din „Pas cu pas” au rânduri de cel mult ~36 de caractere și nu se bazează pe aliniere cu spații.
- După ce scrii un modul: `node tools/xcheck.mjs <modul>` (fiecare variantă greșită lângă explicația ei) și `node tools/fencew.mjs 36` (rânduri lungi în cod).

## Utilitare

- `node tools/dumpmod.mjs <modul...>`: grilele fără explicație nouă, cu variantele A*–D, contextul și explicația veche.
- `node tools/xcheck.mjs <modul|id...>`: fiecare variantă greșită lângă explicația ei.
- `node tools/fencew.mjs [coloane]`: rândurile din blocurile de cod mai lungi decât limita.
- `python3 tools/shot_q.py <modul> <ID> [dark]`: screenshot cu explicația desfășurată, la 360 px.
- `node export/make_brief.js <progress.json> <out.md>`: brief-ul pentru Perplexity, din date și progres.

## Arhitectura, pe scurt

- `src/app.js` e o singură IIFE. Starea `S` are forma `{ v, r, q, o, x, k, p, h, c }`: `q` grilele (cutia Leitner `b`, răspunsuri `n`, corecte `c`, ultimul rezultat `l`, timestamp `t`), `o` cardurile orale, `x` întrebările deschise (aceeași formă; `l` = 0 nu / 1 parțial / 2 știu), `k` exercițiile, `p` sarcinile bifate din plan, `h` istoricul, `c` setările (`d` data interviului, `h` ore pe seară, `t`), `r` epoca de reset.
- Starea se salvează local și se sincronizează prin `window.claude` (capabilitățile `db` și `user`) în `data/users/<uid>/progress`, cu merge pe item după timestamp; un reset (`r` mai nou) câștigă.
- Scadențe (`dueAt`, `isDue`): cutia 1 → +20 min, 2 → +4 h, 3 → a doua zi, 4 → peste două zile, 5 → niciodată. `dueQ`/`dueO`/`dueX` dau itemii scadenți; modul „due” la grile, „De repetat” la orale și „Deschise scadente” îi iau în ordinea cutiei. Ponderile din `wQ`/`wO`/`wX` înmulțesc cu `dueF` (0,15 pentru ce nu e încă scadent), deci „Mix inteligent” și „Recomandate” respectă spațierea.
- Nivelurile L1–L3 deblochează treptat grilele în „mix inteligent”, iar diagnosticul e adaptiv.
- Planul (`genPlan`) se generează la fiecare render din `cfg()` (data, ore pe seară) și progres: pentru fiecare seară rămasă, sarcini cu chei stabile (`g<dată>-<cheie>`: `diag`, `due`, `sheet-<modul>`, `oral`, `open`, `smart`, `mock`, `kata-<id>`, `mist`, `intv`, `log`). Modulele intră după `modNeed` (prioritate × cât mai e de învățat) și durează `modMinutes`; sarcinile bifate azi rămân, iar bugetul de azi scade cu minutele din istoric (`spentMin`). Dimineața interviului vine din `P.planTpl.morning`.
- Întrebările deschise (`OPEN`, `startOpen`, `vOpenRun`, `updX`): grilele cu `Verificare` + `Răspuns verificare` în explicație; rulează în tab-ul Oral, cu notare manuală. Nu intră în scorul de pregătire.
- Studiu › Formulări (`vIntv`): liniile `La interviu` din explicații, filtrate P1 / greșite (cutia ≤ 1) / toate.
- Explicațiile sunt parsate la build (`lib.mjs`) și injectate în `window.PREP.expl`, iar glosarul în `window.PREP.gloss`. Termenii din glosar sunt legați automat în texte, după `Forme:`.
- Verificarea AI la cardurile orale (`AI`, `aiGrade`, `sampleGrade`, `dsGrade`, `parseVerdict`, `Mic` în `src/app.js`): sursa e Claude prin capabilitatea `sample` (în artifact, unde CSP blochează `fetch`), iar DeepSeek e doar rezervă în afara artifactului. Cheia DeepSeek stă în `localStorage` (`onapsis-deepseek-v1`), niciodată în `S`, în export sau în brief. Verdictul doar pre-bifează `run.ticks`; scorul rămâne `updO`. Modelul și parametrii: verifică docs DeepSeek înainte să-i schimbi (numele modelelor se schimbă).
- Intervievatorul (`IV`, `ivRun`, `IV.step`, `vIvDialog`, `vRewrite` în `src/app.js`): doar cu `sample`. Faza `iv` între `ask` și `review`; cel mult `IV_MAX` (2) întrebări (`quick`), apoi verdictul (`default`) cu `covered` = `spontan` / `dupa` / `nu` (1 / 0,5 / 0). Scorul rămâne `updO` din bife (`tickSum`, `run.half` pentru 0,5). Memoria cardului: `S.o[id].m` (puncte ratate) și `.a` (ultima versiune bună, ≤ 800 de caractere), scrise doar după un dialog. Fără timer pe apeluri (`sample` poate dura); `iv.final` face ca o reîncercare să sară direct la verdict. Interviul simulat: `startIvMock` / `pickIvMock`, `run.mock` ascunde modelul, rescrierea și butoanele vechi; dimineața interviului are `m-iv` (`go.t: "ivmock"`). Detalii în README › Intervievator.
- Goluri (`gapCounts`, `gapList`, `relRank`, `gapTheory`, `vGapTheory`, `vGaps`): pe `S.o[id]`, `mc` = index punct → ratări (+1 ratat, −1 acoperit întreg, max 9), `m` = ratate ultima dată, `w` = ≤ 3 afirmații greșite din verdict; se scriu în `oralSave` pentru orice card. Teoria se asamblează la randare (nu se stochează): propoziția din `c.model` și punctele din `P.sheets[m]` cu cele mai multe cuvinte comune. Studiu › „Pentru tine” (`ui.study.seg = "gaps"`). Detalii în README › Goluri și teorie.
- `window.__prep` expune funcții pentru teste: `mergeState`, `normalize`, `pickDiag`, `pickMock`, `pickSmart`, `pickDue`, `pickOpen`, `updQ`, `updO`, `updX`, `dueAt`, `isDue`, `genPlan`, `cfg`, `parseVerdict`, `dsBody`, `parseTurn`, `parseIvVerdict`, `ivScore`, `ivTurnPrompt`, `ivVerdictPrompt`, `IV_MAX`, `pickIvMock`, `gapCounts`, `gapList`, `relRank`, `state`, `setState`.
