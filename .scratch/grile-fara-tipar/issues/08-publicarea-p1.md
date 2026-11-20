# 08: Publicarea grilelor P1 refăcute

**Parent:** `.scratch/grile-fara-tipar/spec.md`

**What to build:** publicarea PWA-ului după procedura din `CLAUDE.md` (`node build.mjs`, `npm run pages`, commit, PR din ramura de lucru în `main`), cu toată suita trecută. După îmbinare și după ce `BUILD` din `docs/app/index.html` de pe adresa live e cel nou, mesajul scurt pentru Alex, în română: ce module au variantele refăcute, că progresul a rămas, ce erori de fapt s-au corectat pe drum (dacă au fost).

**Blocked by:** 02, 03, 04, 05, 06, 07

**Progres:** Toate modulele P1 sunt în regulă; suita completă (25 de teste de interfață, `desf_examples` cu rezervele de mediu, `test:unit`) a trecut pe ramura PR-ului #21, iar `docs/app` e construit (BUILD = "44202dd"). Rămân, după îmbinarea PR-ului în `main`: verificarea `BUILD` pe adresa live și mesajul pentru Alex.

**Status:** ready-for-human

- [x] Toate modulele P1 (`python`, `oop`, `gil`, `asyncio`, `asgi`, `pytest`, `design`, `js`, `ts`, `react`, `frontend`, `fedebug`) sunt în `CUE_DONE`.
- [x] Suita completă din `CLAUDE.md`, `node tools/desf_examples.mjs`, `npm run test:unit` trec.
- [ ] PR îmbinat, `BUILD` verificat pe adresa live, mesajul trimis.
