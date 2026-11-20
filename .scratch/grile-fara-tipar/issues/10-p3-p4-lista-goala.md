# 10: Modulele P3 și P4, lista goală, publicarea

**Parent:** `.scratch/grile-fara-tipar/spec.md` (Cum se rescrie, Clichetul)

**What to build:** restul modulelor în `CUE_DONE`, apoi `tools/cue_baseline.json` șters (lista e goală) și clichetul scos din `checkCues`: de acum toate regulile sunt erori pe toate grilele, iar `CUE_DONE` dispare (sau devine „toate”, cum e mai simplu de citit). Apoi publicarea, ca la tichetul 08.

Azi:
- `redis` (11, `k` = 4): corecta cea mai scurtă în 6 (✗, tiparul invers); absolute 4/33 față de 0/11 (✗).
- `rabbitmq` (11): absolute 7/33 față de 1/11 (✗).
- `ops` (9): absolute 9/27 față de 0/9 (✗).
- `docker` (8), `linux` (7), `graphql` (7), `aws` (7): absolute peste prag (✗); `graphql` și `aws` au corecta cea mai lungă în 3 (✓, la limită).
- `dbmodels` (8, Bonus): absolute 8/24 față de 1/8 (✗).
- `domain`, `perf`, `django`: trec deja.

**Blocked by:** 01, 08, 09


**Progres:** Toate cele 29 de module trec toate regulile; `tools/cue_baseline.json` și `CUE_DONE` au dispărut, `checkCues(P)` nu mai are clichet, testele și documentația sunt aduse la zi. PWA construit în `docs/app` (BUILD = "44202dd"). Rămân, după îmbinarea PR-ului în `main`: verificarea `BUILD` live și mesajul pentru Alex.

**Status:** ready-for-human

- [x] Toate modulele trec toate regulile; `tools/cue_baseline.json` nu mai există; `node validate.mjs` → OK.
- [x] `tools/unit/cues.test.mjs` adus la regula fără clichet; `npm run test:unit` trece.
- [x] README și `CLAUDE.md` spun că regula e completă (fără listă de bază).
- [ ] Suita completă; PWA publicat; `BUILD` verificat live; mesajul scurt pentru Alex.
