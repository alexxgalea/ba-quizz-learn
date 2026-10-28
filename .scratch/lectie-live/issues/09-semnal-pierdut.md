# 09: Semnal pierdut: reconectare lungă

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** în lecție, reîncercările de reconectare durează până la ~60 de secunde (azi sunt trei, ~3,5 s), ca un tunel între stații să nu încheie sesiunea. După reconectare, Jarvis reia bucata întreruptă cu „Reiau de unde am rămas”. Dacă semnalul nu revine în acel interval, lecția intră pe Pauză și redă un sunet scurt de avertizare. Sesiunile Live de 15 minute se leagă între ele prin reluarea și compresia contextului existente.

**Blocked by:** 03, 05.

**Status:** ready-for-agent

- [x] Testele cu serviciul vocal fals și ceas fals arată reîncercări în intervalul de ~60 s în lecție, fără să schimbe politica celorlalte moduri.
- [x] După reconectare, bucata întreruptă se reia de la început, cu „Reiau de unde am rămas”.
- [x] La epuizarea intervalului, lecția intră pe Pauză și adaptorul audio fals înregistrează sunetul de avertizare.
- [x] Bucata întreruptă de pierderea conexiunii nu avansează poziția.
- [x] O sesiune de peste 15 minute continuă prin reluarea sesiunii fără ca Alex să observe (test pe reluare).

## Comments

Implementat. `cfg.retryMs` (~60 s) în `GeminiLive`, doar pentru lecție. `Call` cu `survive` rămâne pe pauză după o pierdere definitivă (`lost`) și redeschide sesiunea la `resume`; Jarvis redă `audio.beep("warn")` și, la revenire, cere bucata cu „Reiau de unde am rămas”. Reluarea după `GoAway` e acoperită de testele `goAway` din `live.test.mjs` și de cel din `lesson.test.mjs`.
