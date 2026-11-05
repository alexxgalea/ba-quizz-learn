# 02: Formatul de frontend și modulul `js`, de la cap la coadă

**What to build:** Alex vede în Studiu un modul nou, `js` („JavaScript”, P1), înaintea lui `frontend`. Are fișa cu 8 puncte, harta, desfășurări în formatul de frontend (90–140 de cuvinte, ✗ / ✓ în exemplu, „Pas cu pas” unde mecanismul e o secvență), ~8 grile cu explicații și ~3 carduri orale. Modulul apare în plan, în lecție și în slotul de frontend al interviului simulat. Exemplele JS au rulat automat. Publicat la același link. Mesajul îi spune lui Alex că scorul de pregătire scade fiindcă au apărut module noi neatinse.

**Blocked by:** 01

**Status:** ready-for-agent

Spec: `.scratch/frontend-extins/spec.md`. ADR: `docs/adr/0002-frontend-module-surori-nu-impartire.md`. Vocabular: `CONTEXT.md` (Desfășurare, Pas cu pas, Termen).

Pregătire (întâi, cu TDD, test la interfață înainte de cod):
- [ ] `DESF_LIMITS` pe modul: modulele frontend (`js`, `ts`, `react`, `frontend`, `fedebug`) au banda de 90–140 de cuvinte, plafonul ~250 și exemplul de ≤ 14 rânduri. Lățimea rămâne 36. Câte un caz care pică pe regulă, iar un modul Python cu 120 de cuvinte pică în continuare.
- [ ] Câmpul opțional `Pas cu pas:` (≤ 8 rânduri, în afara numărului de cuvinte) e parsat, validat și randat după Exemplu. Intră în `askCtx("sheet:…")` și în `PrepApp.sheet`.
- [ ] `DESF_LANGS` primește `js` și `jsx`.
- [ ] `tools/desf_examples.mjs` rulează blocurile `js` în Node (`// → …`, `// ! Tip`) și trece blocurile `ts` prin `tsc --strict --noEmit`. Dovedit întâi pe un rezultat greșit, pe o excepție greșită și pe un TS care nu compilează, toate roșii.
- [ ] Predicatul „e modul frontend” înlocuiește toate verificările `m === "frontend"` din `src/app.js` (colorarea codului, limbajul din prompt, fraza intervievatorului).
- [ ] `TECH_SLOTS`: slotul de frontend devine `["frontend", "react", "js", "ts"]`, cu test pe `pickTechMock`. Modulele care nu există încă nu strică alegerea.
- [ ] `src/data_fe.js` e creat și trecut în `DATA_FILES` și în `export/make_brief.js`.

Conținut:
- [ ] Modulul `js` în `P.modules`, înainte de `frontend`. Fișa are cele 8 puncte din spec, un lead și formulări de evitat.
- [ ] Harta și 8 desfășurări: Problemă concretă, exemplu ✗ / ✓, „Pas cu pas” la punctele cu secvență (cel puțin 3 și 7), `Greu: da` la orice punct cu mai multe idei. C++ doar unde există un echivalent real (de exemplu captura lambdelor la 3), cu Unde nu ține. Legătura trimite la FE-xx și la experiența lui Alex.
- [ ] ~8 grile (`JS-01`…), cu varianta corectă la indexul 0 și explicații în `src/expl/`. ~3 carduri orale.
- [ ] Faptele noi sunt verificate pe MDN / ECMAScript și trecute într-o secțiune nouă din `research/interview-facts.md`.
- [ ] `node tools/xcheck.mjs js` și `node tools/fencew.mjs 36` sunt curate, iar toate exemplele JS rulează.

Închidere:
- [ ] `CLAUDE.md` (arhitectura: modulele frontend, formatul, check-ul JS/TS) și README › Desfășurări sunt actualizate. `tools/test_desf.py` are o secțiune `js`.
- [ ] Toate verificările din `CLAUDE.md` trec. Screenshot la 360 px, light și dark, pe fișa `js` cu „Deschide tot”. Publicat la același link (artifact și PWA). Mesaj către Alex, cu nota despre scor.
