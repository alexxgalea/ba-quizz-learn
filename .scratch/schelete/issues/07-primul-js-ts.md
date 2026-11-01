# 07: Primul schelet JavaScript și primul TypeScript, de la cap la coadă

**What to build:** Alex vede la `frontend` trei grupe, React, JavaScript și TypeScript, și deschide un prim schelet din fiecare limbaj (closure + factory în JavaScript; union discriminat + `switch` exhaustiv cu `never` în TypeScript). Referințele se citesc corect (fără colorare de Python), iar verificarea AI primește limbajul corect. Referințele sunt testate: JavaScript cu testele Node, TypeScript cu compilatorul în mod strict și cu vitest. Cu ocazia asta pornește și testul kata-ului k15, pe care azi nu-l rulează nimeni.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] Un manifest de dev separat de aplicație aduce compilatorul TypeScript, vitest, jsdom și Testing Library; aplicația rămâne fără dependențe.
- [x] O comandă rulează `tsc --strict --noEmit` peste referințele TS / TSX și vitest peste testele lor; o eroare de tip așteptată se verifică cu `// @ts-expect-error`.
- [x] Testul kata-ului k15 rulează și trece cu aceeași comandă.
- [x] Build-ul acceptă referințe de schelet JavaScript, TS și TSX.
- [x] Lista arată la `frontend` grupele React / JavaScript / TypeScript; validarea cere o grupă validă la `frontend` și niciuna la alte module.
- [x] Referințele non-Python nu primesc colorare de Python; limbajul intră în promptul de verificare.
- [x] Cele două schelete au teste care verifică proprietatea punctelor (starea privată nu e accesibilă din afară; un caz nou în union nu compilează fără ramura lui).
- [x] Testul Playwright pentru schelete acoperă grupele, colorarea și limbajul din prompt; testele existente trec.

## Comments

**1 nov. 2026 — implementat** (d6a584b). Manifestul de dev stă în `katas/package.json` (cu `tsconfig.json` și `vitest.config.ts`); `npm run test:ts` face `npm install` acolo, apoi `tsc --strict --noEmit` și vitest. Rădăcina și aplicația rămân fără dependențe, iar `katas/node_modules` e ignorat. Testul k15 rulează acum și trece (2 teste), alături de cele 4 ale scheletelor. Versiunile sunt fixate exact și verificate pe registry (în `research/interview-facts.md` § 9). Abateri și lucruri de știut: (1) lista arată doar grupele care au schelete, deci React apare abia când vine primul schelet React (tichetul 10), iar acum se văd JavaScript și TypeScript; (2) colorarea non-Python și `Limbaj: …` din prompt existau deja din tichetele 01 și 02, aici au primit doar teste; singura modificare în `src/app.js` e `vSkelList` (cu `SKEL_GROUPS` și `skelRow`) plus `.skel-grp` în `app.css`; (3) `jsdom` 30 cere Node ≥ 22.22.2, iar mediul are 22.22.0: `npm install` dă doar avertismente `EBADENGINE` și testele rulează; (4) TSX n-are încă niciun schelet, dar `loadCode` l-a extras corect dintr-un fișier de probă, șters apoi; (5) titlurile scheletelor nu pot avea backtick-uri, fiindcă lista le afișează cu `esc`, nu cu `fmt`; (6) referința se verifică la mutație: cu `assertNever(x: unknown)`, tsc pică pe directiva `@ts-expect-error` rămasă fără eroare. Review-ul a fost doar propriu, fără subagenți.
