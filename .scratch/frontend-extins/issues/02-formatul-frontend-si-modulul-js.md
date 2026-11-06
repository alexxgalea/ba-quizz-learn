# 02: Formatul de frontend și modulul `js`, de la cap la coadă

**What to build:** Alex vede în Studiu un modul nou, `js` („JavaScript”, P1), înaintea lui `frontend`. Are fișa cu 8 puncte, harta, desfășurări în formatul de frontend (90–140 de cuvinte, ✗ / ✓ în exemplu, „Pas cu pas” unde mecanismul e o secvență), ~8 grile cu explicații și ~3 carduri orale. Modulul apare în plan, în lecție și în slotul de frontend al interviului simulat. Exemplele JS au rulat automat. Publicat la același link. Mesajul îi spune lui Alex că scorul de pregătire scade fiindcă au apărut module noi neatinse.

**Blocked by:** 01

**Status:** done

Spec: `.scratch/frontend-extins/spec.md`. ADR: `docs/adr/0002-frontend-module-surori-nu-impartire.md`. Vocabular: `CONTEXT.md` (Desfășurare, Pas cu pas, Termen).

Pregătire (întâi, cu TDD, test la interfață înainte de cod):
- [x] `DESF_LIMITS` pe modul: modulele frontend (`js`, `ts`, `react`, `frontend`, `fedebug`) au banda de 90–140 de cuvinte, plafonul ~250 și exemplul de ≤ 14 rânduri. Lățimea rămâne 36. Câte un caz care pică pe regulă, iar un modul Python cu 120 de cuvinte pică în continuare.
- [x] Câmpul opțional `Pas cu pas:` (≤ 8 rânduri, în afara numărului de cuvinte) e parsat, validat și randat după Exemplu. Intră în `askCtx("sheet:…")` și în `PrepApp.sheet`.
- [x] `DESF_LANGS` primește `js` și `jsx`.
- [x] `tools/desf_examples.mjs` rulează blocurile `js` în Node (`// → …`, `// ! Tip`) și trece blocurile `ts` prin `tsc --strict --noEmit`. Dovedit întâi pe un rezultat greșit, pe o excepție greșită și pe un TS care nu compilează, toate roșii.
- [x] Predicatul „e modul frontend” înlocuiește toate verificările `m === "frontend"` din `src/app.js` (colorarea codului, limbajul din prompt, fraza intervievatorului).
- [x] `TECH_SLOTS`: slotul de frontend devine `["frontend", "react", "js", "ts"]`, cu test pe `pickTechMock`. Modulele care nu există încă nu strică alegerea.
- [x] `src/data_fe.js` e creat și trecut în `DATA_FILES` și în `export/make_brief.js`.

Conținut:
- [x] Modulul `js` în `P.modules`, înainte de `frontend`. Fișa are cele 8 puncte din spec, un lead și formulări de evitat.
- [x] Harta și 8 desfășurări: Problemă concretă, exemplu ✗ / ✓, „Pas cu pas” la punctele cu secvență (cel puțin 3 și 7), `Greu: da` la orice punct cu mai multe idei. C++ doar unde există un echivalent real (de exemplu captura lambdelor la 3), cu Unde nu ține. Legătura trimite la FE-xx și la experiența lui Alex.
- [x] ~8 grile (`JS-01`…), cu varianta corectă la indexul 0 și explicații în `src/expl/`. ~3 carduri orale.
- [x] Faptele noi sunt verificate pe MDN / ECMAScript și trecute într-o secțiune nouă din `research/interview-facts.md`.
- [x] `node tools/xcheck.mjs js` și `node tools/fencew.mjs 36` sunt curate, iar toate exemplele JS rulează.

Închidere:
- [x] `CLAUDE.md` (arhitectura: modulele frontend, formatul, check-ul JS/TS) și README › Desfășurări sunt actualizate. `tools/test_desf.py` are o secțiune `js`.
- [x] Toate verificările din `CLAUDE.md` trec. Screenshot la 360 px, light și dark, pe fișa `js` cu „Deschide tot”. Publicat la același link (artifact și PWA). Mesaj către Alex, cu nota despre scor.

## Comments

**5 nov. 2026 — implementat** (commit-urile `87aaee1` și `d0ece8b`; artifactul publicat la același link, versiunea 45; PWA în `docs/app`).

- **Pregătire, cu TDD** (test roșu întâi, apoi cod): `DESF_LIMITS_FE` și `desfLimits(modul)` (limite alese după numele fișierului, chiar și cu cale), `Pas cu pas` (parsat, validat, randat după Exemplu/Analogie, în Ask și în lecție prin `pas_cu_pas`), limbajele `js` / `jsx`, `tools/desf_examples.mjs` cu blocuri JS (`desf_run.mjs`, modul ESM; marcajul `// ! Tip` pe un rând prin care trece excepția) și TS (`tsc --strict`; `// ! TS2322`). Dovedit roșu pe: rezultat greșit, excepție greșită, TS care nu compilează. Atenție: o primă încercare de a aplica testele a eșuat la parsarea scriptului, iar rezultatele „verzi” de atunci erau ale testelor vechi; le-am refăcut și am confirmat roșul abia apoi.
- **Predicat unic**: câmpul `fe: true` pe modul (data), citit de `isFE` în `src/app.js` (colorare, limbaj în prompt, fraza intervievatorului, `TERM_SKIP`). `DESF_FE_MODULES` din `lib.mjs` trebuie să coincidă; `validate.mjs` verifică (dovedit: scos `fe` → eroare). `TECH_SLOTS`: slotul de frontend alege din `frontend`, `react`, `js`, `ts`. Am ratat la prima căutare `tools/test_prepapp.py`, care fixa `frontend` și pica intermitent; corectat.
- **Modulul `js`** (`src/data_fe.js`, `src/desf/js.md`, `src/expl/p1_js.md`): 8 puncte, hartă, 8 desfășurări (113–187 de cuvinte; C++ la 3 și 4, compilat cu g++ 13 și clang++ 18; `Pas cu pas` la 1, 2, 3, 4, 7, 8), 8 grile explicate (3 de nivel 1, 3 de nivel 2, 2 de nivel 3), 3 carduri orale. Faptele, pe MDN și rulate în Node 22: `research/interview-facts.md`, secțiunea 43.
- **Corecturi de fapt față de spec**: valorile falsy sunt opt (plus `document.all`), nu șase (spec corectat); `this` într-un callback de `setTimeout` în Node e un obiect `Timeout`, deci `js-04` spune doar că nu e instanța; MDN nu folosește „syntactic sugar” pentru `class`, deci nici fișa.
- **Abateri asumate**: (1) banda 90–140 e doar avertisment, iar pragul de eroare rămâne 50, ca să nu pice `frontend.md` (scris în formatul vechi): dă 4 avertismente (punctele 4, 5, 9, 11), care dispar la tichetul 05; după el se poate strânge pragul. (2) În `frontend.md`, blocul de la punctul 7 (TanStack Query) a trecut de la ```ts la ```tsx, fiindcă `tsc` nu poate verifica un pachet neinstalat; conținutul e neschimbat. (3) `TERM_SKIP` pentru „coadă” acoperă toate modulele frontend.
- **Observație pentru decizie (nu am schimbat nimic)**: la 360 px încap ~31 de caractere pe un rând de cod, nu 36; rândurile de 32–36 se rup. Am scurtat rândurile mele (în special la „Pas cu pas”), dar limita `cols: 36` din reguli permite rupturi. Dacă vrei, o coborâm la ~32 pentru modulele frontend (și o aplicăm și la scheme).
- **Review** (`/code-review`, Standards și Spec): fără încălcări ferme. Aplicate: `fe: true` în loc de lista duplicată, `desfLimits` pe baza numelui, `note` → `recordFailure`, textul interviului simulat, excepția frontend spusă explicit în `CLAUDE.md`. Neaplicate: o funcție `langOf` (un singur loc, ternarul rămâne); diagrama „Pas cu pas” și Legătura din `js.md` punctul 1 repetă pe cele din `p1_js.md` js-01 (desfășurarea și explicația grilei sunt două texte care apar în locuri diferite); Legăturile la `FE-xx` sunt doar la 3 puncte (restul trimit la PY / AIO sau la modulul `react`, care încă nu există).
- **Verificări**: `validate` OK; `node --check dist/bundle-check.js`; `tools/desf_examples.mjs`: 132 de exemple (Python 122, JS 8, TS 2), 0 picate; teste de unitate 366 / 0; toate cele 17 teste de interfață trec; screenshot la 360 px, light și dark (fișă cu „Deschide tot”, grilă `js-03` și `js-07`), fără overflow și fără erori de consolă.
- **Scorul de pregătire scade** cât timp `js` e neatins (P1, același greutate ca restul), lucru anunțat în mesajul către Alex.
