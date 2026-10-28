# 11: Butoanele căștilor

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** se aplică ce a arătat proba din tichetul 01 la întrebarea 2. Dacă butoanele căștilor ajung la pagină prin Media Session, play/pauză pune lecția pe pauză sau o reia, „următorul” sare la bucata următoare, iar „anterior” repetă bucata curentă. Adaptorul audio primește legarea la aceste butoane (varianta falsă în teste). Dacă proba arată că butoanele nu merg, tichetul se reduce la documentarea limitei, iar controlul rămâne pe butoanele de pe ecran și pe comenzile vocale.

**Blocked by:** 01, 04, 05.

**Status:** ready-for-agent

- [ ] Rezultatul probei (tichetul 01, întrebarea 2) e citit și se aplică ramura corespunzătoare.
- [ ] Ramura „merg”: testele pe adaptorul audio fals arată că play/pauză, următorul și anterior declanșează Pauză/Reia, Sari și Repetă; butoanele funcționează și pe Mut.
- [ ] Ramura „nu merg”: limita e documentată în `README.md` și în acest tichet, fără cod nou.
- [ ] Legarea se curăță la sfârșitul lecției.
- [ ] Tichetul notează în `## Comments` care ramură s-a aplicat.
