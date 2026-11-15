# 02: Ecranul treptelor și cuvântul curent

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** `jvBoard` arată schema în trepte: treapta curentă evidențiată (fundal `--accent-soft`, bordură stângă `--accent`), cele trecute normale, cele care urmează estompate (~40%). Săgeata are culoarea de accent, cauza e `--muted`. Cuvântul cheie spus acum e evidențiat, cele de dinainte estompate (~50%); la `spoken` niciunul nu e curent. Modelul vizual: varianta B din `docs/prototip-tabla.html` (ramura `prototype/tabla-pasi`), rescrisă curat în `src/app.js` și `src/app.css`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `tools/test_lesson.py`: clasele treptelor (curentă / trecute / viitoare) urmează `k`; cuvântul curent are clasa lui; fără trepte, schema arată ca azi.
- [ ] Fără scroll orizontal la 360 px; captură light și dark cu o schemă de 4 trepte.
- [ ] Toate testele de interfață și de unitate din `CLAUDE.md` trec.
