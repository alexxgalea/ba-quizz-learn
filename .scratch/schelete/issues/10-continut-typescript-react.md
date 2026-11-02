# 10: Conținut: TypeScript și React (14 schelete)

**What to build:** Alex are scheletele de TypeScript (tipuri care ajută, nu încurcă) și de React (componentă testată în CoderPad).

**Blocked by:** 07 (Primul schelet JavaScript și primul TypeScript, de la cap la coadă)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] TypeScript (8): generice cu constrângeri (`pluck<T, K extends keyof T>`) · narrowing + type guard propriu, `unknown` validat din JSON · union discriminat + `never` cu `useReducer` (din tichetul 7, revăzut) · utility types + un mapped type · `as const`, union de literali, `satisfies` · `interface` vs `type` · tipuri în React (props, `children`, `ChangeEvent<HTMLInputElement>`) · hook generic `useFetch<T>` cu rezultat tipat ca union.
- [x] React (6): `useState` cu update funcțional + formular controlat · custom hook `useFetch` cu `AbortController` · listă cu `key` + filtru derivat, fără effect · Context + hook propriu · test cu Testing Library (`getByRole`, `userEvent`, `findBy`) · `Promise.allSettled` + erori în TS.
- [x] Toate referințele compilează în mod strict; cele TypeScript au și cazuri `// @ts-expect-error` pentru ce trebuie să nu compileze; cele React au teste vitest + Testing Library (inclusiv abortul la demontare).
- [x] Scheletele nu repetă kata-urile k15 și k16.
- [x] Textele sunt în română, cu termenii tehnici în engleză.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**2 nov. 2026 — implementat.** 14 schelete: 8 TypeScript (union-never revizuit cu `reducer`, generice, narrowing, utility types, `as const` + `satisfies`, `interface` vs `type`, props în React, `useFetch<T>` tipat) și 6 React (state funcțional + formular, `useFetch` cu `AbortController`, listă cu `key`, Context, test cu Testing Library, `Promise.allSettled`). Catalogul are acum 87 de schelete. Referințele sunt în `katas/skel_ts.ts` și în câte un fișier TSX pe schelet (importurile stau în referință și n-ar putea împărți un modul); testele: 23 în `skel_ts.test.ts`, restul în `skel_react_*.test.tsx` și `skel_tsx_*.test.tsx`. `npm run test:ts`: 9 fișiere, 59 de teste, `tsc --strict` curat. Faptele sunt în `research/interview-facts.md` § 18.

Lucruri de știut:
1. **Mutații**: am stricat referințele în 21 de locuri (de pildă `setN(n + 1)`, fără `preventDefault`, fără abort la cleanup, `key={index}`, fără `throw` fără Provider, `isUser` fără `typeof id`, `allSettled` fără `async`) și testele pică la fiecare. Una a scăpat la prima trecere (fără verificarea „anulat” în `catch` la `useFetch`): testul nu verifica `error` după schimbarea url-ului. Acum o verifică.
2. **Scheletul din RTL e un test**: secțiunea `s-frontend-react-rtl` stă în `skel_react_rtl.test.tsx` (build-ul citește secțiuni și din fișierele de test), iar componenta `Greeter` stă separat în `skel_react_rtl.tsx`, fără marcaj. Cerința descrie contractul componentei.
3. **Fără repetări cu k15**: k15 e o listă de alerte întreagă (union, `unknown`, `AbortController`, filtru). `useFetch` din React se oprește la ciclul de viață (abort, race, `r.ok`), iar cel din TypeScript la tipuri (union, `T` din `parse`). Singura suprapunere e corpul efectului, intenționat.
4. **Capcană în `s-frontend-tsx-usefetch`**: `parse` e în `deps`, deci trebuie să fie stabil; un test arată că una stabilă face o singură cerere. Punctul 4 o spune.
5. **`@ts-expect-error` se și execută la runtime** dacă nu e într-o funcție care nu rulează: `ROLES.push("root")` a modificat de-adevăratelea array-ul într-un test. Testele folosesc `typeOnly(() => …)` pentru liniile doar-pentru-compilator.
6. **Rândurile ≤ 42 de coloane**: am rulat Prettier 3.9.10 cu `--print-width 42` (instalat într-un director temporar, nu în manifest) pe referințe; importurile lungi se rup pe mai multe rânduri. Patru rânduri din testul RTL le-am scurtat de mână (titluri și un import).
7. Verificat: `node validate.mjs` (OK), `build.mjs` + `node --check`, `tools/test_skel.py` și `test_skel_ai.py` (toate trec), screenshot la 360 px în light și dark (fără overflow, grupele React 6 / JavaScript 12 / TypeScript 8, fără erori de consolă).

**2 nov. 2026 — review (tichetele 09 și 10, `/code-review` pe axele Standards și Spec).** Nicio cerință lipsă și niciun scope creep. Corectat după review: (1) `allsettled`: `r.reason` e `any`, nu „netipat”; (2) `tsx-usefetch`: fără tip explicit, `useState({ status: "loading" })` se lărgește la `{ status: string }`, nu se îngustează; (3) `const-satisfies`: punctul spune „TypeScript 4.9+”, iar faptele nu mai pretind „≥ 5.0” (combinația `as const satisfies` e verificată doar pe 7.0.2); (4) `event-loop`: un punct nou dă ordinea corectă, ca predicția să aibă un răspuns-țintă; (5) `retry`: cerința spune `retry(fn, opts)`, ca referința; (6) `Object.groupBy`: nota din fapte nu mai spune că `byUser` are și varianta cu `reduce` (punctul spune doar că pe Node < 21 o faci cu `reduce`); (7) scoase două puncte care repetau altele (`react-form`, `react-list`); (8) comentarii de secțiune în `data_skel.js` și prefixele `skel_react_*` / `skel_tsx_*` în README. Lăsate neschimbate, ca judecăți: punctele lungi (41–51 de cuvinte), fetch-ul fals duplicat între cele două teste `usefetch`, `afterEach(cleanup)` repetat (un `setupFiles` l-ar elimina) și `setData(null)` în efect.

