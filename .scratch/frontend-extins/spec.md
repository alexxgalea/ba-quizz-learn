Status: ready-for-agent

Tichete: `.scratch/frontend-extins/issues/` (01–06; frontiera de start: 01).

# Frontend extins: fundamente de JavaScript, TypeScript, React și depanare

Vocabularul vine din `CONTEXT.md`: **Modul**, **Fișă**, **Punct**, **Desfășurare**, **Pas cu pas**, **Harta modulului**, **Termen**, **Snippet** (și „snippet stricat”), **Schelet**. Decizia de structură e în `docs/adr/0002-frontend-module-surori-nu-impartire.md`. Deciziile au ieșit dintr-o sesiune de grilling (5 noiembrie 2026); jurnalul e în Further Notes.

## Problem Statement

Proba tehnică de marți, 10 noiembrie 2026, o țin doi oameni: unul de backend și unul de frontend. Partea de frontend va cere probabil JavaScript, TypeScript, React și depanare. În aplicație, tot frontend-ul e un singur modul (`frontend`, „React & TypeScript”): 13 puncte care acoperă cinci domenii, câte două-trei pe domeniu. JavaScript are un singur punct (event loop-ul), TypeScript tot unul, React n-are bazele (props, inputuri controlate, `useRef`, `useReducer`, Context, reconcilierea), iar depanarea lipsește de tot.

Alex spune că informațiile pornesc de la ideea că știe fundamentele, ceea ce nu e adevărat. Termenii sunt greoi (batching, cleanup, reconciliere, stale), nu se punctează tot ce e important, iar explicațiile sunt prea scurte. Desfășurările de la `frontend` au fost scrise în formatul calibrat pe `oop` (60–90 de cuvinte, ~180 la punctele grele, exemplu de ≤ 8 rânduri). Formatul a mers la Python, unde Alex avea bazele. La React, mecanismul e o secvență în timp (render → click → render), pe care 8 rânduri de cod nu o arată. Glosarul are 46 de termeni, aproape toți de backend.

## Solution

`frontend` rămâne cum e, cu punctele pe loc. Se adaugă patru module surori P1, citite în ordinea `js` → `ts` → `react` → `frontend` → `fedebug`:

- `js` (8 puncte): limbajul, de la valori și referințe la prototipuri.
- `ts` (8 puncte): sistemul de tipuri, de la tiparea structurală la ce nu prinde `strict`.
- `react` (8 puncte): bazele, înaintea mecanismului de randare din `frontend`.
- `fedebug` (6 puncte + 10 snippet-uri stricate): cum depanezi și bug-urile clasice, găsite citind codul, ca în CoderPad.

Fiecare modul nou are fișă, hartă, desfășurări, grile și carduri orale. Glosarul primește ~35 de termeni de frontend, legați automat peste tot. Desfășurările modulelor frontend au limite proprii: mai multe cuvinte, exemplul cu varianta greșită și cea corectă alături și câmpul nou „Pas cu pas”, care urmărește mecanismul stare cu stare. Cele 13 desfășurări din `frontend` se rescriu în formatul ăsta. Exemplele JS rulează și cele TS trec prin `tsc` înainte de publicare.

Livrarea are bugetul de ~4 ore de citit și repetat și se publică după fiecare tichet, în ordinea: glosar → formatul și `js` → `react` → `fedebug` → rescrierea `frontend` → `ts`.

## User Stories

**Fundamente și termeni**

1. Ca Alex, vreau ca termenii grei de frontend (closure, hoisting, `this`, microtask, re-render, reconciliere, batching, cleanup, controlled input, generic, narrowing…) să fie subliniați și să aibă o definiție simplă, ca să nu mă blochez într-o frază.
2. Ca Alex, vreau ca un cuvânt greu care nu e în glosar să fie explicat chiar în fraza unde apare, ca să nu presupună textul ce nu știu.
3. Ca Alex, vreau ca modulele noi să înceapă de la fundamente (valori și referințe, scope, componentă și props), ca mecanismele de după să aibă pe ce să se sprijine.

**Conținut nou**

4. Ca Alex, vreau un modul `js` cu ce întreabă un inginer de frontend despre limbaj: valori și referințe, `let` / `const` / `var` și hoisting, closures, `this`, egalitate și valori falsy, metodele de array care mută sau copiază, `async` / `await` în practică, prototipuri și `class`.
5. Ca Alex, vreau un modul `ts` cu sistemul de tipuri: tipare structurală, `type` vs `interface`, narrowing, generics, utility types, `as` / `!` / `as const` / `satisfies`, tiparea în React și ce nu prinde `strict`.
6. Ca Alex, vreau un modul `react` cu bazele: componenta ca funcție pură, ce declanșează un re-render, imutabilitatea state-ului, inputuri controlate, ridicarea state-ului, `useReducer` și Context, custom hooks, reconcilierea.
7. Ca Alex, vreau un modul `fedebug` cu procesul de depanare și uneltele (stack trace, source maps, `debugger`, Network, React DevTools, error boundaries), ca să pot povesti cum depanez.
8. Ca Alex, vreau ~10 carduri orale cu snippet-uri stricate (JS, TS, React), la care spun ce nu merge, de ce și cum repar, ca să exersez exact ce se poate întâmpla în CoderPad.
9. Ca Alex, vreau ~8 grile și ~3 carduri orale pentru fiecare dintre `js`, `ts` și `react`, ca modulele să intre în repetare și în scor, nu doar în citit.

**Explicațiile**

10. Ca Alex, vreau ca desfășurările de frontend să fie mai lungi (90–140 de cuvinte, până la ~250 la punctele grele), ca să nu se taie explicația pe un teritoriu nou pentru mine.
11. Ca Alex, vreau ca exemplul să arate varianta greșită (✗) și pe cea corectă (✓) alături, ca să văd și reparația, nu doar bug-ul.
12. Ca Alex, vreau un „Pas cu pas” la punctele unde mecanismul e o secvență („render 1: n = 0 → click → 3 × setN(1) → render 2: n = 1”), ca să văd ce se întâmplă în timp.
13. Ca Alex, vreau ca cele 13 desfășurări din `frontend` să fie rescrise în formatul ăsta, ca fișa de care m-am plâns să devină citibilă.
14. Ca Alex, vreau ca rezultatele din exemplele JS și TS să fie verificate automat, ca să nu învăț un `// → 3` greșit.

**Integrarea în aplicație**

15. Ca Alex, vreau ca modulele noi să apară în Studiu, în plan și în lecție în ordinea `js` → `ts` → `react` → `frontend` → `fedebug`, ca să citesc fundamentele înaintea mecanismelor.
16. Ca Alex, vreau ca slotul de frontend din interviul tehnic simulat să aleagă din `frontend`, `react`, `js` și `ts`, iar slotul de snippet să poată pica și pe un snippet stricat, ca simularea să acopere ce am adăugat.
17. Ca Alex, vreau ca snippet-urile din modulele frontend să apară fără colorare Python și să intre în prompt ca `tsx` / `ts` / `js`, la fel ca la `frontend`.
18. Ca Alex, vreau să aflu din mesajul de publicare că scorul de pregătire scade când apar modulele noi, ca să nu mă sperii.
19. Ca Alex, vreau ca progresul de pe `frontend` (goluri, poziția lecției, Leitner pe `FE-xx`) să rămână neatins.

## Implementation Decisions

**Structura**
- Modulele noi: `js` („JavaScript”), `ts` („TypeScript”), `react` („React: bazele”), `fedebug` („Depanare frontend”), toate cu `p: 1`. În `P.modules` stau, în ordinea asta, lângă `frontend`, care rămâne între `react` și `fedebug`. Codurile pentru ID-uri sunt `JS`, `TS`, `RE` și `FD`.
- `frontend` nu se schimbă: id, puncte, ordinea lor, grile, orale. Punctele 10 și 13 rămân ca recapitulare. Desfășurările lor rescrise trimit în Legătură la `ts` și `js`.
- Datele noi stau într-un fișier nou, `src/data_fe.js`, trecut în `DATA_FILES` (`lib.mjs`) și în `export/make_brief.js`. Explicațiile grilelor stau în `src/expl/` (câte un fișier pe modul nou), iar desfășurările în `src/desf/<modul>.md`.
- Toate locurile din `src/app.js` care întreabă `m === "frontend"` (colorarea codului, limbajul din prompt, fraza intervievatorului) trec printr-un singur predicat, „e modul frontend”, valabil pentru cele cinci module.
- `TECH_SLOTS`: slotul de frontend devine `["frontend", "react", "js", "ts"]`. Slotul `code` ia deja orice card cu `code`, deci include snippet-urile din `fedebug`. Rămân 7 sloturi.
- Scorul (`readiness`) include modulele noi, fără excepție. Scăderea e anunțată în mesajul de publicare din tichetul 02.

**Conținutul**
- `js`: (1) valori și referințe, spread-ul e shallow, `===` pe obiecte compară identitatea; (2) `let` / `const` / `var`, scope de bloc, hoisting, TDZ, `const` nu face obiectul imutabil; (3) closures, `var` + `setTimeout` în buclă, stale closure (→ FE-01); (4) `this` după modul de apel, arrow functions, metoda pasată drept callback, `bind`; (5) `==` vs `===`, cele opt valori falsy (plus `document.all`; corectat la implementare, MDN), `??` vs `||`, `?.`; (6) `map` / `filter` / `reduce` / `find`, ce mută și ce copiază (`sort` vs `toSorted`), legătura cu state-ul React; (7) promises și `async` / `await`: `await` uitat, try/catch, `await` în buclă vs `Promise.all`, unhandled rejection (event loop-ul rămâne la FE-13); (8) prototipuri și `class` ca zahăr sintactic, comparația cu Python.
- `ts`: (1) tipare structurală și excess property check (C++: nominal); (2) `type` vs `interface`; (3) narrowing și type guard `x is T`; (4) generics și constrângeri `extends` (C++: template-uri); (5) utility types, `keyof`, `T["k"]`; (6) `as`, `!`, `as const`, `satisfies`; (7) tiparea în React (props, `children: ReactNode`, `ChangeEvent<HTMLInputElement>`, `useState<User | null>(null)`); (8) `strict`, `strictNullChecks`, `noUncheckedIndexedAccess` (validarea la graniță rămâne la FE-10).
- `react`: (1) componenta e o funcție pură de props și state, props read-only, `children`; (2) ce declanșează un re-render (state, părinte, Context) și ce nu (variabile locale, `useRef`; `useRef` și pentru DOM); (3) state-ul se actualizează doar cu o copie (`Object.is`); (4) inputuri controlate vs necontrolate, formulare; (5) ridicarea state-ului, flux de date unidirecțional, callback-uri prin props; (6) `useReducer` și Context, Context re-randează consumatorii, nu e state manager; (7) custom hooks partajează logică, nu state; (8) reconcilierea: același tip pe aceeași poziție păstrează state-ul, alt tip îl remontează, `key` pentru reset.
- `fedebug`: (1) procesul: reproduc → izolez → ipoteză → verific → test de regresie; (2) eroarea și stack trace-ul, source maps, mesajele clasice (`Cannot read properties of undefined (reading 'x')`, `x is not a function`); (3) `debugger`, breakpoints condiționale și oprirea la excepții, `console.log` / `console.table`, în CoderPad doar consola; (4) tab-ul Network, status, payload, eroarea CORS și preflight-ul; (5) React DevTools, Profiler, „de ce s-a re-randat?”, bucla infinită de render; (6) error boundaries și ce nu prind (handlere, cod async), `unhandledrejection`.
- Snippet-urile stricate din `fedebug` (carduri orale cu `code`): (1) `setInterval` cu stale closure; (2) `setState` în render; (3) effect fără dependențe care face `setState`; (4) `push` + același array în `setItems`; (5) `key={index}` la o listă reordonată, cu inputuri; (6) `{count && <Badge/>}` randează „0”; (7) `if (fetchUser())` fără `await`; (8) `this` pierdut în callback; (9) `var` în buclă cu `setTimeout`; (10) `res.json() as User`, iar `user.name.first` aruncă la runtime. Modelul de răspuns spune ce nu merge, de ce și cum se repară, iar punctele de pe card sunt pașii pe care trebuie să-i atingă răspunsul.
- Volumul: ~8 grile și ~3 carduri orale la `js`, `ts` și `react`; la `fedebug`, cele 10 snippet-uri, ~2 carduri orale de proces și ~4 grile. Fără schelete noi (frontend-ul are 26).

**Glosarul**
- ~35 de termeni noi în `src/expl/glosar.md`, în formatul existent (`Forme:`, Definiție, Scop): closure, scope, hoisting, TDZ, `this`, prototype, promise, microtask, event loop (dacă lipsește), render, re-render, commit, reconciliere, batching, snapshot, cleanup, mount / unmount, props, state, hook, effect, controlled input, Context, reducer, memoizare, stale closure, generic, narrowing, type guard, union discriminat, utility type, assertion, source map, breakpoint, stack trace, error boundary. Definiția are o propoziție simplă, fără alți termeni nedefiniți.
- Regula de scriere pentru frontend: un cuvânt greu care nu e termen se explică în fraza în care apare.

**Formatul desfășurărilor de frontend**
- `DESF_LIMITS` primește limite pe modul. Modulele frontend (`js`, `ts`, `react`, `frontend`, `fedebug`) au banda de 90–140 de cuvinte, ~250 la `Greu: da`, exemplul de ≤ ~14 rânduri. Lățimea rămâne ≤ 36 de coloane. Restul modulelor rămân cum sunt.
- Exemplul de frontend arată varianta greșită (marcată `// ✗`) și pe cea corectă (`// ✓`) alături, când punctul e despre o greșeală.
- Câmpul nou, opțional, `Pas cu pas:`, cu ≤ 8 rânduri scurte, nu intră în numărul de cuvinte. Se randează după Exemplu, cu eticheta „Pas cu pas”. Intră în `askCtx("sheet:…")` și în materialul lecției (`PrepApp.sheet`), ca restul câmpurilor.
- `DESF_LANGS` primește `js` și `jsx`.

**Verificarea exemplelor**
- `tools/desf_examples.mjs` rulează și blocurile `js` în Node (proces izolat, timeout) și compară ce afișează cu comentariile `// → …`. Excepția voită se scrie `// ! Tip`. Blocurile `ts` trec prin `tsc --strict --noEmit` cu configul din `katas/`. Un bloc TS care trebuie să pice la compilare se marchează explicit, cu eroarea așteptată. TSX-ul se verifică de mână, ca până acum, într-un test vitest temporar, iar rezultatul se notează în comentariul de închidere.

**Fapte**
- Faptele noi (versiuni, comportamente, mesaje de eroare exacte, valori implicite) se verifică pe surse primare (MDN, specificația ECMAScript, react.dev, documentația TypeScript, Chrome DevTools) și se trec într-o secțiune nouă din `research/interview-facts.md`.

## Testing Decisions

- Un test bun verifică ce vede Alex sau ce produce build-ul, nu cum e scris codul.
- Validarea (`checkDesf`): câte un caz care pică pentru fiecare regulă nouă (banda frontend, plafonul de 250, exemplul de 14 rânduri, „Pas cu pas” de peste 8 rânduri, `Pas cu pas` fără conținut), în `tools/unit/desf.test.mjs`, lângă cazurile existente. Un modul non-frontend cu 120 de cuvinte trebuie să pice în continuare.
- Check-ul de exemple: dovedit întâi pe un bloc JS cu rezultat greșit, pe o excepție greșită și pe un bloc TS care nu compilează, toate cu rezultat roșu, ca la tichetul 01 din `.scratch/desfasurari/`.
- Ecranul: `tools/test_desf.py` primește secțiuni pentru modulele noi (numărul desfășurărilor, „Pas cu pas” afișat, cod fără colorare Python, fără overflow la 360 px, light și dark). Testele care numără modulele sau sloturile se actualizează doar unde lista lor s-a schimbat.
- Interviul simulat: un test pe `pickTechMock` (prin `window.__prep`) arată că slotul de frontend poate alege din toate cele patru module și că slotul de snippet poate pica pe `fedebug`.
- Toate verificările din `CLAUDE.md` trec înainte de fiecare publicare.

## Out of Scope

- Mutarea sau împărțirea punctelor din `frontend` (ADR 0002).
- Schelete noi de frontend.
- Schimbarea formatului desfășurărilor Python.
- Rularea automată a exemplelor TSX.
- Module ES, generatorii JS, `WeakMap`, Redux, Next.js și server components.

## Further Notes

Jurnalul grilling-ului (5 noiembrie 2026), cu toate răspunsurile pe recomandare:

- Q1, bugetul: ~4 h din ~12 rămase până pe 10 noiembrie.
- Q2, structura: module surori, nu împărțire sau extindere (ADR 0002).
- Q3, depanarea: snippet-uri stricate (greutatea principală) + fișa de proces.
- Q4, ce n-a mers: textul presupune fundamente, termenii sunt greoi, nu acoperă tot, e prea scurt.
- Q5, fundamente: glosar + puncte de fundament + regula de scriere.
- Q6, React: modul nou `react` pentru baze.
- Q7, formatul: plafon mai mare, ✗ / ✓, „Pas cu pas”, doar la frontend.
- Q8: rescrierea celor 13 desfășurări din `frontend`.
- Q9, volumul: ~8 puncte pe modul (6 la `fedebug`).
- Q10–Q13: listele de puncte și snippet-uri de mai sus.
- Q14: toate P1, ordinea `js` → `ts` → `react` → `frontend` → `fedebug`, interviul simulat cu 7 sloturi.
- Q15: exemplele JS și TS verificate automat.
- Q16: livrarea în ordinea glosar → `js` → `react` → `fedebug` → `frontend` → `ts`.
- Q17: ADR 0002.
- Q18: scorul scade, iar mesajul de publicare o spune.
