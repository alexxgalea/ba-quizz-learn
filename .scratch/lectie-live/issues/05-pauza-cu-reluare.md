# 05: Pauză cu reluare

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** butonul Pauză și comanda vocală „pauză” opresc lecția fără să piardă audio-ul deja primit. Dacă Alex reia în ~10 minute și conexiunea a rămas deschisă, redarea continuă exact din aceeași secundă. Altfel, bucata se reia de la început. O bucată întreruptă de Pauză nu e „ascultată” până nu se redă toată. Adaptorul audio primește pauză și reluare cu păstrarea cozii (varianta falsă în teste).

**Blocked by:** 03.

**Status:** ready-for-agent

- [x] Testele cu ceas fals arată reluarea exactă sub ~10 minute, cu conexiune deschisă.
- [x] După ~10 minute, sau după o conexiune pierdută, bucata se reia de la început.
- [x] Cât timp e pe Pauză, microfonul nu trimite nimic și fereastra de ascultare nu pornește.
- [x] O bucată întreruptă de Pauză nu avansează numărul bucăților ascultate.
- [x] Butonul Pauză devine Reia pe ecran și invers.
- [x] Adaptorul audio (real și fals) păstrează coada la pauză și o reia la „reia”, cu teste în suita audio.

## Comments

Implementat. `audio.pause()` / `audio.resume()` (`Pcm.player` îngheață contextul; verificat și în Chromium real, `tools/test_audio.py`). `Call.pause({ keep: true })` păstrează coada și primește în continuare audio; `resume({ fresh })` o aruncă după ~10 minute sau după o pierdere. O pauză luată în fereastră revine cu fereastră nouă (sub 10 minute) sau trece la bucata următoare (peste 10 minute), fiindcă bucata se auzise deja.
