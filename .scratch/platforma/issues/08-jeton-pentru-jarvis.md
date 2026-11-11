# 08: Jarvis pornește cu un jeton de la server

**Parent:** `.scratch/platforma/spec.md`

**What to build:** serverul creează un jeton de scurtă durată pentru Gemini Live, iar clientul deschide sesiunea cu el, direct. Câmpul pentru cheia Gemini dispare din setările Jarvis. O lecție mai lungă decât viața jetonului cere unul nou la reconectare, fără ca Alex să observe.

**Blocked by:** 01, 04

**Status:** ready-for-agent

- [ ] Antrenamentul și lecția pornesc fără cheie în `localStorage`.
- [ ] O sesiune care depășește durata jetonului continuă (test de unitate peste `fakes.mjs`).
- [ ] Fără semnal la pornire: mesaj clar, nu o eroare ciudată.
- [ ] Dacă tichetul 01 arată că jetonul nu merge cu modelul folosit, tichetul se oprește aici și Alex e întrebat.

## Comments
