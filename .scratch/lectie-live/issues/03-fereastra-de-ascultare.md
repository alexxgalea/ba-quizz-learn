# 03: Fereastra de ascultare

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** după ce audio-ul unei bucăți s-a redat complet, aplicația redă un sunet scurt și discret și deschide microfonul pentru ~3 secunde. Dacă Alex tace, lecția trece singură la bucata următoare. Dacă vorbește, fereastra ține cât vorbește, apoi Jarvis răspunde și revine la lecție. Ceasul ferestrei îl ține aplicația, nu modelul. Sunetul vine dintr-o metodă nouă a adaptorului audio (cu varianta falsă în teste).

**Blocked by:** 02.

**Status:** done

- [x] Testele cu ceas fals arată: fereastra se deschide doar după redarea completă a bucății, are ~3 secunde, iar la tăcere se cere bucata următoare.
- [x] Sunetul scurt se redă la deschiderea ferestrei (adaptorul audio fals îl înregistrează).
- [x] În fereastră, microfonul ajunge la server; în afara ei, nu.
- [x] Dacă Alex începe să vorbească în fereastră, trecerea automată se anulează până se termină tura lui.
- [x] Zgomotul în afara ferestrei nu oprește vorbirea lui Jarvis.

## Comments

Implementat. `Call` emite `spoken` (redarea s-a golit și tura s-a încheiat, fără tăieri) și `voice`; Jarvis deschide fereastra cu `audio.beep("window")` și `clock.after(3000)`. Poarta microfonului: `Call.mic(open)`. Ceasul fals din `tools/unit/fakes.mjs` primește `after`.

**2 nov. 2026 — status actualizat.** Implementat în commit-urile `ba6d7af`, `daf52fb` și `96bd2ee` (toate criteriile bifate); statusul din fișier rămăsese `ready-for-agent`.
