# 07: Primul schelet JavaScript și primul TypeScript, de la cap la coadă

**What to build:** Alex vede la `frontend` trei grupe, React, JavaScript și TypeScript, și deschide un prim schelet din fiecare limbaj (closure + factory în JavaScript; union discriminat + `switch` exhaustiv cu `never` în TypeScript). Referințele se citesc corect (fără colorare de Python), iar verificarea AI primește limbajul corect. Referințele sunt testate: JavaScript cu testele Node, TypeScript cu compilatorul în mod strict și cu vitest. Cu ocazia asta pornește și testul kata-ului k15, pe care azi nu-l rulează nimeni.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] Un manifest de dev separat de aplicație aduce compilatorul TypeScript, vitest, jsdom și Testing Library; aplicația rămâne fără dependențe.
- [ ] O comandă rulează `tsc --strict --noEmit` peste referințele TS / TSX și vitest peste testele lor; o eroare de tip așteptată se verifică cu `// @ts-expect-error`.
- [ ] Testul kata-ului k15 rulează și trece cu aceeași comandă.
- [ ] Build-ul acceptă referințe de schelet JavaScript, TS și TSX.
- [ ] Lista arată la `frontend` grupele React / JavaScript / TypeScript; validarea cere o grupă validă la `frontend` și niciuna la alte module.
- [ ] Referințele non-Python nu primesc colorare de Python; limbajul intră în promptul de verificare.
- [ ] Cele două schelete au teste care verifică proprietatea punctelor (starea privată nu e accesibilă din afară; un caz nou în union nu compilează fără ramura lui).
- [ ] Testul Playwright pentru schelete acoperă grupele, colorarea și limbajul din prompt; testele existente trec.
