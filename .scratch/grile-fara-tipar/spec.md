Status: ready-for-agent

# Grile fără tipar: lungimea și cuvintele absolute

Prima parte din „grile fără tipar de răspuns”, cerută de Alex pe 20 noiembrie 2026: grilele rămân forma cea mai accesibilă de lucru (pe telefon, seara), deci trebuie să măsoare ce știe, nu cât de bine citește forma variantelor. Partea asta are prioritate: varianta corectă să nu mai fie cea mai lungă. A doua parte, modul de reformulare (Adevărat/Fals pe fiecare variantă, răspuns din memorie înainte de variante, mai multe variante greșite), are decizii deschise și trece întâi prin `/grill-with-docs`, într-un spec separat.

## Problem Statement

Ordinea variantelor e deja amestecată la afișare (`mkItem`, `src/app.js`), deci poziția nu spune nimic. Textul variantelor însă spune:

- **Lungimea.** Pe 329 de grile, varianta corectă e strict cea mai lungă în 123 (37%, față de 25% la întâmplare; lungimea vizibilă, fără backtick-uri). În 67 de grile e cu peste 15% (și peste 8 caractere) mai lungă decât cea mai lungă variantă greșită, deci se vede dintr-o privire. Problema stă în modulele P1, exact cele care contează: `react` 15/16, `ts` 15/17, `fedebug` 4/4, `oop` 14/18, `asyncio` 6/9, `frontend` 8/14, `pytest` 7/17. Cauza tipică: varianta corectă poartă și justificarea („`2`: React apelează componenta de două ori, iar randarea modifică `total` din afara funcției”), iar cele greșite sunt simple afirmații.
- **Cuvintele absolute** (mereu, niciodată, doar, orice, toate…) apar în 18% din variantele greșite și în 5% din cele corecte. „Elimină varianta cu «niciodată»” e o strategie care merge fără să știi materia (`gil`: 16 din 57 de variante greșite, 1 din 19 corecte).

Nimic din `validate.mjs` nu urmărește lucrurile astea, deci o grilă nouă le poate repeta oricând.

## Solution

1. **O regulă în validare, pe grilă și pe modul**, care prinde ambele indicii (definițiile mai jos).
2. **Un clichet (ratchet)**: grilele care încalcă acum regula pe grilă sunt într-o listă de bază. Validarea pică la orice încălcare nouă și la orice grilă din listă care nu mai încalcă regula (ca lista să scadă, nu să mintă). Un modul refăcut intră în `CUE_DONE` și de atunci are toate regulile ca erori.
3. **Refacerea, pe module, în ordinea severității**: întâi P1, apoi P2, apoi P3 și P4. La sfârșit, lista de bază e goală și se șterge.
4. **Un utilitar de lucru**, `tools/cues.mjs <modul…>`, care arată pentru fiecare grilă lungimile, raportul, rangul corectei și cuvintele absolute, plus regulile de modul. Se folosește înainte și după rescriere, lângă `tools/xcheck.mjs`.

## User Stories

1. Ca Alex, vreau ca la o grilă să nu pot ghici răspunsul după lungimea variantelor, ca un răspuns corect să însemne că știu.
2. Ca Alex, vreau ca „elimin varianta cu «niciodată»” să nu mai funcționeze, ca eliminarea să ceară cunoștințe.
3. Ca Alex, vreau ca regula să nu se transforme în tiparul invers („alege-o pe cea mai scurtă”), ca să nu existe nicio scurtătură de formă.
4. Ca Alex, vreau ca progresul meu pe grile (cutii, istoric) să rămână după rescriere, fiindcă întrebarea și răspunsul corect nu se schimbă.
5. Ca agent care scrie o grilă nouă, vreau ca `node validate.mjs` să-mi spună pe loc că varianta corectă iese în evidență, cu cifrele, ca s-o repar înainte de commit.
6. Ca agent care reface un modul, vreau un utilitar care îmi arată ce grile trebuie atinse și ce variantă e problema, ca să nu le iau la mână pe toate.

## Implementation Decisions

### Măsura

- **Lungimea unei variante** = numărul de caractere vizibile: textul fără backtick-uri (codul se numără, delimitatorii nu). Aceeași funcție peste tot (`optLen` în `lib.mjs`).
- **Cuvânt absolut** = unul din lista `ABS_WORDS` (`lib.mjs`): mereu, niciodată, întotdeauna, doar, numai, orice, oricând, toate, toți, niciun, nicio, imposibil, garantat, exclusiv; potrivire pe cuvânt întreg, fără să conteze literele mari. Lista e un singur loc; se poate extinde.

### Regula pe grilă (eroare, sub clichet)

- Grila încalcă regula dacă **lungimea corectei > 1,15 × cea mai lungă variantă greșită și diferența > 8 caractere**. Pragul de 8 caractere lasă în pace variantele scurte (`[1]` față de `AttributeError`), unde 15% înseamnă două litere.

### Regulile pe modul (eroare doar pe modulele din `CUE_DONE`, altfel raport)

Cu `n` grile în modul și `k = ceil(0,35 × n)`:

- **Rangul.** Corecta e strict cea mai lungă în cel mult `k` grile și strict cea mai scurtă în cel mult `k` grile. Regula pe grilă singură s-ar putea respecta scurtând toate corectele, iar atunci „alege-o pe cea mai scurtă” devine noul tipar; regula de rang îl închide. (Azi: `redis` are corecta cea mai scurtă în 6 din 11.)
- **Cuvintele absolute.** Proporția variantelor greșite cu cuvânt absolut ≤ proporția variantelor corecte cu cuvânt absolut + 10 puncte procentuale. Se repară în două feluri, amândouă bune: variantele greșite pierd absolutul (greșeala trebuie să stea în mecanism, nu în „mereu”) sau corectele care sunt cu adevărat absolute îl spun („`await` cedează controlul doar la un punct de suspendare”).

### Clichetul

- `tools/cue_baseline.json`: lista id-urilor care încalcă azi regula pe grilă (67 la scriere), generată o dată de `node tools/cues.mjs --baseline` în tichetul 01 și apoi doar micșorată de mână, odată cu rescrierea.
- `CUE_DONE` în `lib.mjs` (ca `PT_DONE`): modulele refăcute. Pe ele, toate regulile sunt erori și nicio grilă de-a lor nu poate sta în listă.
- `checkCues(P, { done, baseline })` în `lib.mjs`, chemată din `validate.mjs`, întoarce `{ errors, report }`. Raportul (pe module: `n`, câte corecte sunt cele mai lungi / cele mai scurte, câte absolute în corecte / greșite, câte grile încalcă regula) se tipărește ca tabel, ca acum `lvlTable`.

### Cum se rescrie (pentru tichetele 02–10)

- **Întrebarea, ordinea și indexul corect nu se schimbă** (`a: 0`, B/C/D în explicații). Id-ul rămâne, deci cutiile Leitner, istoricul și jurnalul rămân valabile; nu e nevoie de migrare.
- **Întâi se mută justificarea.** Dacă varianta corectă e lungă fiindcă explică de ce, explicația ei merge în „Pe scurt” / „Mecanism”, iar varianta rămâne afirmația. Regula de formă: ori toate variantele poartă un „fiindcă / iar”, ori niciuna.
- **Apoi se lungesc variantele greșite cu un detaliu concret, plauzibil și fals** (o valoare implicită confundată, un API vecin, o ordine inversată), nu cu umplutură. Cea mai lungă variantă trebuie să varieze de la o grilă la alta.
- **Structură paralelă**: aceeași formă gramaticală și același început (ex. `` `2`: … `` la toate cele patru, ca la `re-01`).
- **Nu se adaugă cuvinte absolute** ca să lungești o variantă greșită.
- **Fiecare variantă greșită schimbată își primește explicația nouă** („Varianta greșită B: …”, care spune de ce e greșită, nu repetă răspunsul). Citatele exacte („Varianta greșită: „…” — …”) se aduc la zi; `resolveWrong` le verifică deja.
- **Faptele noi din variantele greșite se verifică**: o variantă greșită trebuie să fie greșită fără dubiu. Ce e deja verificat stă în `research/interview-facts.md`; ce lipsește se caută pe surse primare și se notează acolo.
- **Rândurile de cod** din variante respectă limitele existente (`node tools/fencew.mjs 36` pentru blocuri).

### Ordinea tichetelor

01 regula și clichetul → 02 `react` → 03 `ts` → 04 `oop` → 05 `frontend` + `fedebug` + `js` → 06 `asyncio` + `asgi` + `gil` → 07 `pytest` + `python` + `design` → 08 publicarea pe P1 → 09 P2 → 10 P3 și P4, lista goală, publicarea. Tichetele de modul 02–07 depind doar de 01 și se pot lua în orice ordine; ordinea de mai sus e cea a severității.

## Testing Decisions

- `tools/unit/cues.test.mjs`: `optLen` (backtick-urile nu se numără), regula pe grilă la limită (1,15× și 8 caractere, de ambele părți), rangul pe modul (inclusiv tiparul invers, toate corectele cele mai scurte), cuvintele absolute (cuvânt întreg: „doar” da, „adoarme” nu; diacriticele), clichetul (o grilă nouă care încalcă → eroare; o grilă din listă care nu mai încalcă → eroare; un modul din `CUE_DONE` cu o grilă în listă → eroare). Pe stări construite, nu pe datele reale.
- `node validate.mjs` trebuie să treacă pe datele reale după tichetul 01 (cu lista de bază) și după fiecare tichet de modul (cu modulul în `CUE_DONE`).
- Pe fiecare tichet de modul: `node tools/xcheck.mjs <modul>` citit integral (fiecare variantă greșită nouă lângă explicația ei), `node build.mjs`, `node --check dist/bundle-check.js`, toată suita din `CLAUDE.md` și screenshot-uri la 360 px, light și dark, pe două grile rescrise (`python3 tools/shot_q.py <modul> <ID> [dark]`): variantele mai lungi nu trebuie să rupă ecranul.

## Out of Scope

- Modul de reformulare (A/F pe variantă, răspuns din memorie, variante greșite trase dintr-un bazin, formulări multiple ale întrebării, reformulare AI). Spec separat, după `/grill-with-docs`.
- Alte indicii de formă (cuvinte din întrebare repetate în varianta corectă, nuanțări de tip „de obicei” / „în general” doar în corecte, acordul gramatical cu întrebarea). Se pot adăuga la raportul din `tools/cues.mjs` ca informație, dar nu devin reguli aici.
- Cardurile orale, întrebările deschise (`Verificare`) și scheletele: nu au variante.
- Ordinea punctelor, legăturile `pt` și nivelurile (`lvl`): nu se ating.

## Further Notes

- Pragurile (1,15×, 8 caractere, 35%, 10 pp) le-am ales eu, pe distribuția de azi, nu au fost discutate cu Alex. Stau într-un singur loc în `lib.mjs` și se pot ajusta fără să se schimbe restul.
- Cifrele de azi pe module (grile cu corecta cea mai lungă / încălcări ale regulii pe grilă / absolute în greșite față de corecte) sunt în tichetele de modul; tichetul 01 le regenerează cu `tools/cues.mjs`, care e sursa de adevăr.
- Termenul nou „Indiciu de formă” (ceva din forma variantelor care trădează răspunsul fără cunoștințe: lungimea, cuvintele absolute) intră în `CONTEXT.md` în tichetul 01.
