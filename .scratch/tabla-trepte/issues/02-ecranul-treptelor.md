# 02: Ecranul treptelor și cuvântul curent

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** `jvBoard` arată schema în trepte: treapta curentă evidențiată (fundal `--accent-soft`, bordură stângă `--accent`), cele trecute normale, cele care urmează estompate (~40%). Săgeata are culoarea de accent, cauza e `--muted`. Cuvântul cheie spus acum e evidențiat, cele de dinainte estompate (~50%); la `spoken` niciunul nu e curent. Modelul vizual: varianta B din `docs/prototip-tabla.html` (ramura `prototype/tabla-pasi`), rescrisă curat în `src/app.js` și `src/app.css`.

**Blocked by:** 01

**De la tichetul 01 (hotărât cu Alex, 15 noiembrie 2026):** cartonașul de treaptă are `treapta` (indexul de la 0) și schema întreagă, dar `cuvinte: []` după prima treaptă (spec: doar prima treaptă poartă cuvintele ideii). Cuvintele cheie ale ideii rămân vizibile pe toate treptele: la schimbarea cartonașului de la o treaptă la alta se păstrează cuvintele deja arătate (de ex. `seen` și cuvintele se mută pe treapta nouă, în `showPending`), fără să se deschidă un cartonaș nou gol. Schema cu singura săgeată pe primul rând (o singură treaptă) rămâne acceptată de validare.

**Status:** done

- [x] `tools/test_lesson.py`: clasele treptelor (curentă / trecute / viitoare) urmează `k`; cuvântul curent are clasa lui; fără trepte, schema arată ca azi.
- [x] Fără scroll orizontal la 360 px; captură light și dark cu o schemă de 4 trepte.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec.
