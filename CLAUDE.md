# ba-quizz-learn: instrucțiuni pentru Claude

Aplicația de pregătire a lui Alex pentru interviul tehnic de la Onapsis (Software Engineer – Python, echipa Defend). Interviul e luni, 19 octombrie 2026. Alex o folosește mai ales pe telefon. Detaliile despre structură și format sunt în `README.md`.

## Reguli

- Tot textul din aplicație e în română. Termenii tehnici rămân în engleză (thread, worker, broker, commit, endpoint).
- Nu schimba ordinea variantelor în `src/data_*.js`: varianta corectă e la indexul 0 (`a: 0`), iar explicațiile folosesc literele B, C și D pentru indexurile 1–3.
- După orice modificare de date sau explicații: `node validate.mjs` (trebuie să se termine cu „OK”), `node build.mjs`, `node --check dist/bundle-check.js`.
- Înainte de publicare rulezi testele de interfață din `tools/` (`check.py`, `test_teach.py`, `test_expl.py`, `test_terms.py`) și verifici vizual, la 360 px, în light și dark: `python3 tools/shot_q.py <modul> <ID> [dark]`. Singura eroare de consolă acceptată e blocarea fonturilor Google în sandbox.
- Publici mereu la același link, ca progresul și permisiunile să rămână: Artifact publish cu `file_path: dist/pregatire-onapsis.html` și `url: https://claude.ai/artifact/PNwBxGppDYNrt1CYGpM7HT`, fără `icon` și fără `capabilities`.
- După publicare îi trimiți lui Alex un mesaj scurt, în română, despre ce s-a schimbat.

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

- `src/app.js` e o singură IIFE. Starea `S` are forma `{ v, r, q, o, k, p, h }`: `q` grilele (cutia Leitner `b`, răspunsuri `n`, corecte `c`, ultimul rezultat `l`, timestamp `t`), `o` cardurile orale, `k` exercițiile, `p` planul, `h` istoricul, `r` epoca de reset.
- Starea se salvează local și se sincronizează prin `window.claude` (capabilitățile `db` și `user`) în `data/users/<uid>/progress`, cu merge pe item după timestamp; un reset (`r` mai nou) câștigă.
- Nivelurile L1–L3 deblochează treptat grilele în „mix inteligent”, iar diagnosticul e adaptiv.
- Explicațiile sunt parsate la build (`lib.mjs`) și injectate în `window.PREP.expl`, iar glosarul în `window.PREP.gloss`. Termenii din glosar sunt legați automat în texte, după `Forme:`.
- `window.__prep` expune funcții pentru teste: `mergeState`, `normalize`, `pickDiag`, `pickMock`, `pickSmart`, `updQ`, `state`.
