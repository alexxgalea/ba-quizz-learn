# 01: Regula indiciilor de formă și clichetul

**Parent:** `.scratch/grile-fara-tipar/spec.md` (Măsura, Regula pe grilă, Regulile pe modul, Clichetul)

**What to build:** `optLen`, `ABS_WORDS`, `CUE_DONE` și `checkCues(P, { done, baseline })` în `lib.mjs`, chemată din `validate.mjs` (erorile intră în `errors`, raportul se tipărește ca tabel). `tools/cues.mjs <modul…>` arată pe fiecare grilă lungimile variantelor (A* = corecta), raportul corectă / cea mai lungă greșită, rangul și cuvintele absolute marcate, apoi regulile de modul cu ✓ / ✗; `--baseline` scrie `tools/cue_baseline.json` (id-urile care încalcă azi regula pe grilă, sortate). Fără date rescrise în tichetul ăsta: `CUE_DONE` pornește gol.

TDD: întâi `tools/unit/cues.test.mjs` pe stări construite (cazurile din spec › Testing Decisions), apoi codul.

**Blocked by:** —

**Status:** done

- [x] `tools/unit/cues.test.mjs` trece și acoperă: backtick-urile nu se numără; limita 1,15× / 8 caractere de ambele părți; rangul pe modul (corecta cea mai lungă și cea mai scurtă, cu `k = ceil(0,35 × n)`); cuvintele absolute pe cuvânt întreg, cu diacritice („doar” da, „adoarme” nu, „Niciodată” da); clichetul (încălcare nouă → eroare, id din listă care nu mai încalcă → eroare, modul din `CUE_DONE` cu id în listă → eroare, regulile de modul sunt erori doar pe `CUE_DONE`).
- [x] `tools/cue_baseline.json` generat; la scriere avea 67 de id-uri (cifra poate diferi dacă datele s-au schimbat între timp; contează ce dă `tools/cues.mjs`).
- [x] `node validate.mjs` → OK pe datele reale, cu tabelul de raport tipărit.
- [x] `npm run test:unit` trece.
- [x] README: secțiune scurtă „Indicii de formă” (regulile, clichetul, `tools/cues.mjs`, cum se scoate un modul din listă); în `CLAUDE.md` › Utilitare, rândul pentru `tools/cues.mjs`, iar în „Stilul explicațiilor”, o propoziție: după ce scrii sau schimbi grile, `node tools/cues.mjs <modul>`.
- [x] `CONTEXT.md` › Conținut: termenul **Indiciu de formă** (definiția din spec; _Avoid_: tipar, pattern de răspuns).
