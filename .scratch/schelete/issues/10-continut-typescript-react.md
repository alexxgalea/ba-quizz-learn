# 10: Conținut: TypeScript și React (14 schelete)

**What to build:** Alex are scheletele de TypeScript (tipuri care ajută, nu încurcă) și de React (componentă testată în CoderPad).

**Blocked by:** 07 (Primul schelet JavaScript și primul TypeScript, de la cap la coadă)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] TypeScript (8): generice cu constrângeri (`pluck<T, K extends keyof T>`) · narrowing + type guard propriu, `unknown` validat din JSON · union discriminat + `never` cu `useReducer` (din tichetul 7, revăzut) · utility types + un mapped type · `as const`, union de literali, `satisfies` · `interface` vs `type` · tipuri în React (props, `children`, `ChangeEvent<HTMLInputElement>`) · hook generic `useFetch<T>` cu rezultat tipat ca union.
- [ ] React (6): `useState` cu update funcțional + formular controlat · custom hook `useFetch` cu `AbortController` · listă cu `key` + filtru derivat, fără effect · Context + hook propriu · test cu Testing Library (`getByRole`, `userEvent`, `findBy`) · `Promise.allSettled` + erori în TS.
- [ ] Toate referințele compilează în mod strict; cele TypeScript au și cazuri `// @ts-expect-error` pentru ce trebuie să nu compileze; cele React au teste vitest + Testing Library (inclusiv abortul la demontare).
- [ ] Scheletele nu repetă kata-urile k15 și k16.
- [ ] Textele sunt în română, cu termenii tehnici în engleză.
- [ ] Validarea datelor trece; codul încape în 42 de coloane.
