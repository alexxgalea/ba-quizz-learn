# 10: Lecția cu ecranul stins

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** se aplică ce a arătat proba din tichetul 01. Dacă Chrome ține conexiunea și sunetul cu ecranul stins în PWA, ecranul stins încetează să mai pună lecția pe pauză. Dacă nu, lecția adaugă un ecran negru „de buzunar”, care ține ecranul aprins și ignoră atingerile până la un gest de deblocare. Până la rezultatul probei, comportamentul actual (ecranul stins = pauză) rămâne.

**Blocked by:** 01, 02.

**Status:** needs-info

- [ ] Rezultatul probei (tichetul 01, întrebarea 1) e citit și se aplică ramura corespunzătoare.
- [ ] Ramura „merge cu ecranul stins”: ecranul stins nu mai pune lecția pe pauză; testele de apel și de Jarvis arată că sesiunea continuă.
- [ ] Ramura „nu merge”: ecranul „de buzunar” ține ecranul aprins, ignoră atingerile până la un gest de deblocare clar și are contrast bun în light și dark.
- [ ] Celelalte moduri Jarvis păstrează comportamentul actual la ecran stins.
- [ ] Tichetul notează în `## Comments` care ramură s-a aplicat și de ce.

## Comments

Blocat de tichetul 01: nu se știe încă dacă Chrome ține conexiunea și sunetul cu ecranul stins în PWA. Până la rezultat rămâne comportamentul actual (ecranul stins = pauză). Nu s-a scris cod.
