# 21: Desfășurări pentru behav + graphql (12 puncte)

**What to build:** Când Alex deschide fișa `behav` și `graphql` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `behav` și `graphql`: fără C++; la `behav` Exemplul e o formulare STAR, nu cod.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `behav` are acum harta și 5 desfășurări (`src/desf/behav.md`), iar `graphql` harta și 7 (`src/desf/graphql.md`), în ordinea punctelor. Ultimul criteriu (testele complete și publicarea) rămâne deschis.

- `Greu: da`: la `behav` 2 (STAR) și 4 (puntea onestă); la `graphql` 3 (N+1 și DataLoader), 5 (erori și HTTP) și 6 (securitate). Restul rămân în banda normală (60–90 de cuvinte); `validate.mjs` nu are avertismente pentru cele două fișiere.
- Fără C++, nicăieri, la niciunul dintre module (cum anunța tichetul): nicio comparație reală. La `behav` Exemplul e un răspuns-model în ```text (pitch, STAR, harta întrebare -> poveste, puntea onestă, cele trei întrebări pentru ei), cu cifrele reale lăsate în paranteze pătrate pentru Alex (`R: [durata; ce am schimbat]`); nu am adăugat biografie, cifre sau durate. La `graphql` exemplele de schemă și de query sunt în ```text (1, 2, 4, 7), iar 3, 5 și 6 sunt simulări Python fără biblioteci, rulate de `desf_examples` (94 de exemple în total, 0 picate).
- Legături: la `behav` spre `o-beh-1`, `o-beh-3`, `o-beh-4`, spre Studiu → Comportamental (poveștile, harta „Stack-ul Onapsis ↔ experiența ta”, întrebările pentru ei) și spre GQL-03; la `graphql` spre GQL-01…GQL-07, OBS-03 (RED, la erori), SEC-08 (autorizare la obiect), `selectinload` din SQLAlchemy și `prefetch_related` din Django (la N+1), Pydantic în FastAPI (la 4).
- Erori de fapt în punctele fișelor: niciuna; punctele nu au fost modificate. Precizări, nu erori, în `research/_desf_facts_graphql.md` (secțiunea 41) și `research/_desf_facts_behav.md` (secțiunea 40; de îmbinat în `interview-facts.md`): la `graphql` 5, „de obicei cu HTTP 200” e SHOULD în draftul GraphQL over HTTP (cererile invalide primesc de obicei 400, serverele vechi pot răspunde 2xx); la 6, introspecția oprită în producție e sfatul graphql.org pentru API-uri doar cu clienți proprii și nu ține loc de autorizare, iar „persisted queries” înseamnă aici allowlist („trusted documents” pe graphql.org), nu APQ-ul Apollo; la 7, ediția 2025 a specificației permite `@deprecated` și pe argumente și câmpuri de input (pagina graphql.org arată încă definiția veche). La `behav`, biografia din pitch și poveștile sunt textul lui Alex din aplicație (nu le-am putut verifica pe web); STAR (definițiile și „I, nu we”) e verificat la Universitatea din Cincinnati, iar faptele Onapsis (Defend: „Advanced Threat Monitoring for SAP”, centrele de operare, inclusiv România) pe onapsis.com.
- Fapte verificate pe surse primare: spec.graphql.org (ediția September 2025: operații, execuție serială la mutații, `@deprecated`, erori), GraphQL over HTTP (draft curent), graphql.org (schema, performanță, securitate, introspecție, servire peste HTTP), Strawberry (DataLoader, FastAPI, `QueryDepthLimiter`, 0.339.1, rulat local), Graphene și Ariadne (docs). Exemplele Strawberry (SDL generată, `@deprecated`, `null` cu `errors` și `path`, `QueryDepthLimiter`, batching în DataLoader) le-am rulat eu cu strawberry-graphql 0.339.1 și graphql-core 3.3.1.
- Precizări de stil din review-urile valurilor trecute, aplicate de la început: Legătura e doar trimitere plus cel mult o propoziție; exemplele au rânduri de cel mult ~31 de caractere (pe 360 px codul se rupe în jur de 32, deși limita validată e 36), ca răspunsurile-model și schemele să nu se frângă în screenshot.
- `tools/test_desf.py` are acum blocuri pentru `behav` (5 desfășurări, 4 grupuri, fără C++, 5 exemple ```text necolorate) și `graphql` (7 desfășurări, 6 grupuri, fără C++, Python colorat la 3, 5, 6 și ```text necolorat la 1, 2, 4, 7), light și dark, fără overflow la 360 px și cu starea `S` neschimbată.
- Verificat: `node validate.mjs` (OK), `node build.mjs`, `node --check dist/bundle-check.js`, `node tools/desf_examples.mjs`, `node tools/fencew.mjs 36` (nimic nou la fișele mele), `python3 tools/test_desf.py` (ALL PASS), screenshot la 360 px, light și dark, cu „Deschide tot”, pe ambele fișe. `xcheck` nu se aplică: nicio explicație de grilă nu s-a schimbat.

**3 nov. 2026 (închidere):** Review (`/code-review`, Standards și Spec): fără defecte blocante. Corectate după el: `graphql` 3 are acum 20 de alerte în ambele locuri; `graphql` 5 urmează draftul GraphQL over HTTP (2xx când `data` e ne-null, 4xx/5xx când lipsește; cazul `data` + `errors` nu e afirmat, pagina e ambiguă); `graphql` 6 spune „persisted queries în varianta allowlist (trusted documents)” și explică introspecția și complexitatea; exemplul de la `graphql` 4 e Python rulabil; Legăturile sunt trimiteri; antetele fișierelor trimit la secțiunile 40 și 41 din `research/interview-facts.md`. `behav` nu inventează biografie sau cifre (cifrele rămân în paranteze pătrate). Publicat la același link (versiunea 42) și în PWA.
