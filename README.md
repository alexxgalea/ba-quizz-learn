# ba-quizz-learn

Aplicație de pregătire pentru interviul tehnic de la Onapsis (Software Engineer – Python, echipa Defend). Conține grile cu explicații, carduri pentru răspunsuri orale, întrebări deschise, exerciții de live coding și un plan pe zile generat din progres. Totul se construiește într-un singur fișier HTML, fără dependențe, publicat ca artifact Claude, cu progresul sincronizat între dispozitive.

## Ce conține

- **221 de grile** în 23 de module, pe trei niveluri (bază, practic, avansat). Fiecare are context înainte de întrebare, butonul „Nu știu încă” și „Am ghicit”, care trimite grila înapoi la repetat.
- **Explicații pe două niveluri.** Imediat după răspuns: pe scurt, de ce contează, cum funcționează și de ce e greșită varianta aleasă. La cerere („Arată-mi concret”): pas cu pas, aplicare, legătura cu ce știi deja, limite, formularea pentru interviu, o întrebare de verificare și celelalte variante.
- **Glosar** de 46 de termeni, legați automat în texte: atingi termenul subliniat și se deschide definiția.
- **42 de carduri orale**, **9 exerciții de live coding** cu soluții testate cu pytest și fișe pe module.
- **Întrebări deschise**: cele 217 întrebări „Verificare” din explicații (fără modulul bonus), fără variante. Răspunzi cu voce tare, dezvălui răspunsul, te notezi (știu / parțial / nu); intră în aceleași cutii Leitner.
- **Formulări pentru interviu** (Studiu › Formulări): liniile „La interviu” din toate explicațiile, pe o pagină, filtrate P1 / greșite / toate.
- **Diagnostic adaptiv** și **repetiție spațiată** cu scadențe reale: cutia 1 revine după 20 de minute, cutia 2 după 4 ore, cutia 3 a doua zi, cutia 4 peste două zile, cutia 5 niciodată. „De repetat acum” adună grilele, cardurile și întrebările deschise scadente; „Mix inteligent” ia întâi scadentele.
- **Plan pe zile generat din progres**: data interviului și orele pe seară se setează în Progres › Interviul. Fiecare seară are aceeași rețetă (scadențe → fișă + grile pe modulele cu cea mai mare nevoie → oral → kata → greșeli), ultima seară se încheie cu formulările, iar dimineața interviului are doar încălzire. Sarcinile bifate azi rămân în listă; restul se recalculează din timpul rămas.
- **Verificare AI la cardurile orale** (opțională): scrii sau dictezi răspunsul, iar Claude (în artifact) sau DeepSeek (în afara lui, cu cheie) îl compară cu punctele cheie și pre-bifează ce ai acoperit, cu feedback scurt. Vezi secțiunea „Verificare AI”.

## Structura

```text
build.mjs          construiește dist/pregatire-onapsis.html
lib.mjs            încarcă datele și parsează explicațiile (Markdown)
validate.mjs       verifică datele, explicațiile și glosarul
package.json       scripturi (validate, build, teste)
src/
  shell.html       scheletul paginii
  app.js, app.css  aplicația, fără dependențe externe
  data_*.js        module, grile, context, carduri orale, fișe, exerciții, setări (data interviului, ore pe seară)
  expl/*.md        explicațiile grilelor, pe module (p1_*, p2_*, p3_*, perplexity.md)
  expl/glosar.md   glosarul
katas/             exercițiile de live coding și testele lor (pytest)
tools/             teste de interfață (Playwright) și utilitare pentru explicații
export/            generatorul brief-ului trimis la Perplexity
```

## Comenzi

```bash
node validate.mjs            # verifică tot; trebuie să se termine cu „OK”
node build.mjs               # produce dist/pregatire-onapsis.html
node --check dist/bundle-check.js
python3 -m pytest -q katas   # testele exercițiilor de live coding
python3 tools/check.py       # teste de interfață (Playwright + Chromium)
python3 tools/test_teach.py
python3 tools/test_expl.py
python3 tools/test_terms.py
python3 tools/test_ai.py     # verificarea AI la carduri orale (Claude/sample și DeepSeek simulate)
python3 tools/test_plan.py   # planul generat, scadențele, întrebările deschise, formulările, setările
```

Pe scurt: `npm run build`, `npm run test:katas`, `npm run test:ui`.

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

Progresul stă în baza de date a artefactului, într-un document per utilizator (`data/users/<uid>/progress`), plus o copie locală în browser. Republicarea la același link păstrează progresul. Cheile stării: `q` grile, `o` carduri orale, `x` întrebări deschise, `k` exerciții, `p` sarcini bifate, `h` istoric, `c` setări. Dintr-o sesiune Claude: rulezi build-ul, apoi publici `dist/pregatire-onapsis.html` cu `url` setat la link-ul de mai sus.
