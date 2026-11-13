# 10: Mutarea lui Alex și retragerea artifactului

**Parent:** `.scratch/platforma/spec.md`

**What to build:** Alex își exportă starea din artifact și o importă în PWA. Importul produce evenimente sintetice, iar un ecran de verificare compară cutiile și scadențele de dinainte cu cele de după. După confirmarea lui, regula de publicare la link-ul de artifact iese din `CLAUDE.md`, iar README-ul descrie forma nouă.

**Blocked by:** 05, 07, 08, 09

**Status:** ready-for-human

- [x] Importul unui export `S` dă proiecția identică: `tools/unit/journal.test.mjs` (`proiecție(import(S)) = S`, pe stări construite) și `tools/test_journal.py`. Importul pe datele reale ale lui Alex nu se mai face (vezi comentariul).
- [x] Nu se mai aplică: Alex a hotărât pe 2026-11-13 că nu îl mai interesează progresul din artifact, deci nu se importă și nu se confirmă nimic.
- [x] `CLAUDE.md`: regula de publicare e rescrisă (artifactul e retras; PWA-ul se publică prin PR în `main`); README: build-ul de artifact e descris ca bază a testelor. Descrierea sincronizării din `CLAUDE.md` vorbește deja de PWA + server.
- [x] Artifactul rămâne publicat, cu o pagină care trimite la PWA (versiunea 53, 2026-11-13, cu acordul lui Alex; aceeași adresă). Aplicația veche nu mai e în artifact.

## Comments

### 2026-11-13, Alex
Nu mai îl interesează progresul din artifact și vrea să-l scoatem. Importul stării din artifact se sare. Rămâne de hotărât ce se întâmplă cu linkul artifactului (o pagină cu trimitere la PWA, ștergere sau lăsat neatins); până atunci nu se publică nimic în el. `dist/pregatire-onapsis.html` rămâne construit: 28 de fișiere din `tools/` (testele de interfață) rulează pe el.

Pagina de trimitere conține titlul `ba-quizz-learn`, un buton spre `https://alexxgalea.github.io/ba-quizz-learn/docs/app/` și nota că progresul din acea versiune nu se mai folosește. Capabilitățile declarate (`db`, `user`, `sample`) au rămas, dar pagina nu le folosește.
