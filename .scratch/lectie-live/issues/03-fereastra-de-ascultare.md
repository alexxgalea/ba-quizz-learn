# 03: Fereastra de ascultare

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** după ce audio-ul unei bucăți s-a redat complet, aplicația redă un sunet scurt și discret și deschide microfonul pentru ~3 secunde. Dacă Alex tace, lecția trece singură la bucata următoare. Dacă vorbește, fereastra ține cât vorbește, apoi Jarvis răspunde și revine la lecție. Ceasul ferestrei îl ține aplicația, nu modelul. Sunetul vine dintr-o metodă nouă a adaptorului audio (cu varianta falsă în teste).

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] Testele cu ceas fals arată: fereastra se deschide doar după redarea completă a bucății, are ~3 secunde, iar la tăcere se cere bucata următoare.
- [ ] Sunetul scurt se redă la deschiderea ferestrei (adaptorul audio fals îl înregistrează).
- [ ] În fereastră, microfonul ajunge la server; în afara ei, nu.
- [ ] Dacă Alex începe să vorbească în fereastră, trecerea automată se anulează până se termină tura lui.
- [ ] Zgomotul în afara ferestrei nu oprește vorbirea lui Jarvis.
