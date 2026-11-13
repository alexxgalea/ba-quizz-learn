Status: ready-for-agent

# Lecția sincronizată: ce se aude e ce se vede

Val 2 din `docs/imbunatatire.md`. Vocabularul vine din `CONTEXT.md` (**Lecție**, **Bucată**, **Fereastra de ascultare**, **Mut**, **Desfășurare**, **Pas cu pas**, **Harta modulului**) plus doi termeni noi, care intră în `CONTEXT.md` cu tichetul 01: **Secvență** (o parte a unei bucăți: problema, ideea, exemplul, pașii, spusă în 15–30 de secunde; _Avoid_: segment, pas) și **Cartonaș** (ce arată ecranul în timpul unei secvențe; sursa din care vorbește Jarvis; _Avoid_: card). Lecția rămâne sesiune Gemini Live (ADR 0001). Se construiește pe PWA-ul de azi: nu atinge starea, deci nu așteaptă platforma.

## Problem Statement

La lecțiile live, Alex nu poate asculta și urmări ecranul în același timp. Ecranul arată doar punctul din fișă, una-două propoziții, iar Jarvis vorbește 1–1,5 minute din desfășurarea întreagă: problema, exemplul de cod, pașii, comparația cu C++. Alex aude un exemplu pe care nu-l vede.

Când ecranul arată ceva, de multe ori nu e ce se aude. Textul se schimbă când modelul cere bucata, înainte să înceapă sunetul ei. La hartă, la o întrebare liberă, la „mai simplu”, la „exemplu” și la recapitulare, ecranul rămâne pe ce era. La modulele fără desfășurări, Jarvis improvizează un exemplu care nu are cum să fie pe ecran.

## Solution

Bucata se împarte în **secvențe**, câte una pe câmp al desfășurării, iar fiecare secvență are un **cartonaș**: exact textul sau codul din care vorbește Jarvis. Aplicația dă secvențele pe rând, iar cartonașul se schimbă în clipa în care începe sunetul lui. Sub cartonaș curge o subtitrare vie, din transcrierea modelului.

Orice spune Jarvis are un cartonaș: harta, fiecare secvență, răspunsul la o întrebare, capcanele, recapitularea. Alex alege la pornire între „Cu ecran” și „Doar audio”; în al doilea, Jarvis povestește codul în cuvinte și nu trimite niciodată la ecran.

Secvențele scurte s-ar putea să rupă firul. De aceea se construiesc întâi pentru `asyncio`, Alex ascultă proba, și abia apoi trec restul modulelor.

## User Stories

1. Ca Alex, vreau să văd pe ecran exact bucata de text sau de cod despre care vorbește Jarvis, ca să pot urmări cu ochii ce aud.
2. Ca Alex, vreau ca exemplul de cod să fie pe ecran, întreg, cât timp Jarvis îl povestește, ca să nu-l reconstruiesc din auz.
3. Ca Alex, vreau ca ecranul să se schimbe când începe sunetul, nu înainte, ca să nu citesc ceva ce încă nu s-a spus.
4. Ca Alex, vreau ca la începutul lecției să văd harta modulului cât timp Jarvis o spune, ca să prind firul.
5. Ca Alex, vreau ca la o întrebare a mea să văd ce am întrebat și răspunsul, ca subtitrare, ca să nu rămână pe ecran un cartonaș fără legătură.
6. Ca Alex, vreau ca la „mai simplu” și la „exemplu” ecranul să arate că Jarvis reia bucata, ca să știu unde sunt.
7. Ca Alex, vreau să văd recapitularea de la final pe ecran, nu doar capcanele, ca să rețin ideile.
8. Ca Alex, vreau două rânduri de subtitrare sub cartonaș, ca să prind un cuvânt pe care nu l-am auzit bine.
9. Ca Alex, vreau un mod „Doar audio” pentru metrou, în care Jarvis nu spune niciodată „uită-te la rândul trei”, ca să pot ține telefonul în buzunar.
10. Ca Alex, vreau ca alegerea modului să fie ținută minte, ca să nu o fac la fiecare lecție.
11. Ca Alex, vreau ca la modulele fără desfășurări Jarvis să nu inventeze exemple, ca să nu aud ceva ce nu e verificat și nu e pe ecran.
12. Ca Alex, vreau ca „Repetă”, pauza, reluarea și semnalul pierdut să meargă la fel ca până acum, ca să nu reînvăț comenzile.
13. Ca Alex, vreau ca o bucată întreruptă să se reia de la prima ei secvență, ca să nu intru în mijlocul unui exemplu.
14. Ca Alex, vreau să ascult întâi `asyncio` pe secvențe și să spun dacă firul se rupe, înainte ca toate modulele să fie schimbate.
15. Ca Alex, vreau ca după fiecare grup de puncte Jarvis să-mi pună o întrebare, ca să produc ceva, nu doar să ascult (după ce există legăturile dintre grile și puncte).

## Implementation Decisions

- **Secvențele le face aplicația, nu modelul.** O funcție pură primește fișa și numărul bucății și întoarce lista de secvențe, fiecare cu tipul ei, conținutul cartonașului și instrucțiunea pentru model. Ordinea: `problema` → `ideea` → `exemplu` sau `analogie` → `pas` → `cpp` (cu „Unde nu ține”) → `punct`. Câmpurile care lipsesc se sar. `Legătură` nu are secvență.
- **Modelul nu vede secvența următoare.** `next_chunk` întoarce o singură secvență, cu poziția ei în bucată (`k` din `of`), iar instrucțiunea cere: spune doar ce e pe cartonaș, în ordinea de pe cartonaș, în 15–30 de secunde. Aplicația cere secvența următoare după evenimentul `spoken`; fereastra de ascultare se deschide doar după ultima secvență a bucății.
- **Tipurile de cartonaș**: `harta`, `problema`, `ideea`, `exemplu`, `pas`, `analogie`, `cpp`, `punct`, `verificare`, `intrebare`, `capcane`, `recap`. Starea lecției expune cartonașul curent ca `{ tip, continut }`, iar ecranul îl randează după tip (cod colorat la `exemplu`, rânduri la `pas`, grupuri la `harta`).
- **Cartonașul în așteptare.** La `deliver`, cartonașul nou se ține deoparte și devine cel afișat la trecerea lui `Call` în `speaking` pentru acel tur. Până atunci rămâne cel vechi.
- **Recapitularea are text scris de noi.** Cartonașul `recap` arată grupurile din harta modulului (la modulele fără hartă, ideea principală), iar Jarvis recapitulează din ele. Modelul nu mai alcătuiește singur cele trei propoziții.
- **Întrebarea liberă, „mai simplu”, „exemplu”.** La o întrebare, cartonașul `intrebare` arată răspunsul ca subtitrare; întrebarea lui Alex apare doar dacă transcrierea intrării e disponibilă (de verificat în `live.js`). La „mai simplu” și „exemplu”, cartonașul bucății rămâne, cu o etichetă („Mai simplu”, „Alt exemplu”).
- **Subtitrarea vie**: ultimele două rânduri din transcrierea modelului, sub cartonaș, deschisă implicit. Blocul „Transcriere” rămâne ca istoric.
- **Două moduri**, alese la pornire și ținute în setările Jarvis (`onapsis-jarvis-v1`): „Cu ecran” (Jarvis poate trimite la ecran) și „Doar audio” (codul e povestit în cuvinte, nicio trimitere la ecran, ecranul arată doar comenzile mari). Secvențele sunt aceleași în ambele. „Mut” rămâne ce e azi și nu depinde de mod.
- **Fără improvizație.** La modulele fără desfășurări, bucata are secvența `punct` și, dacă există o grilă legată de punct, una `exemplu` din ea. Până la legăturile din Val 0.1, doar `punct`. Instrucțiunea „un exemplu din experiența lui Alex” dispare.
- **Poziția lecției** rămâne pe punct. `lessonHeard` se scrie după ultima secvență a bucății; o bucată întreruptă se reia de la prima secvență.
- **Proba pe `asyncio`.** Până la verdictul lui Alex (tichetul 03), secvențele sunt pornite doar pentru `asyncio`; celelalte module merg ca azi.
- **Verificarea** (tichetul 09): după ultima secvență a unui grup din hartă (fără hartă, după fiecare al treilea punct), o întrebare `Verificare` de la o grilă legată de un punct al grupului. Scrie doar în întrebările deschise. Pe „Mut”, butoanele „Știu” și „Nu știu”; pe „Doar audio”, doar cu vocea. Schimbă instrucțiunea „nu pui întrebări de verificare” din `buildLessonSystem`.

## Testing Decisions

- Logica se scrie cu TDD, la interfața lui `Jarvis.create`, în `tools/unit/lesson.test.mjs`, peste `Call` real și falsurile din `tools/unit/fakes.mjs`.
- Funcția care împarte bucata în secvențe e pură și se testează pe fișe reale: `asyncio` (cu desfășurări) și `django` (fără).
- Momentul schimbării cartonașului se testează peste `Call` real: după `deliver`, cartonașul afișat e cel vechi până la `speaking`.
- `tools/test_lesson.py` verifică pe ecran că `#jv-chunk` are conținutul fazei în fiecare fază: hartă, fiecare secvență, întrebare liberă, „mai simplu”, capcane, recapitulare.
- „Doar audio” se verifică pe instrucțiuni: nicio formulare care trimite la ecran. Proba reală o face Alex.
- O secvență `exemplu` se verifică vizual la 360 px, light și dark, fără scroll orizontal.

## Out of Scope

- Lecția inversă (tichetul 10 e doar un semn de carte; are nevoie de spec propriu).
- Mecanismele ca tip de cartonaș (Val 9).
- Formularea lui Alex pe cartonașul `punct` (Val 11).
- Audio generat dinainte (ADR 0001).
- Mutarea lecției pe serverul nou; jetonul Gemini e în `.scratch/platforma/`.

## Further Notes

- Fiecare secvență e un tur separat al modelului, cu un apel de funcție între ele. Dacă pauza dintre secvențe se aude, proba de la tichetul 03 o va arăta; atunci alternativa e o singură cerere pe bucată, cu cartonașele schimbate după transcriere.
- Bugetul zilnic Gemini: mai multe tururi pe bucată înseamnă mai multe cereri. De măsurat la probă.

## Stare la integrare (13 noiembrie 2026)

Gata: 01, 02, 04, 05, 06, 07, 08, 11. Tichetul 03 (proba lui Alex pe `asyncio`) s-a sărit din hotărârea lui Alex: toate modulele merg pe secvențe, iar alternativa din „Further Notes” rămâne dacă firul se rupe la ascultare. Tichetele 09 (lecția care întreabă) și 10 (lecția inversă) rămân deschise.
