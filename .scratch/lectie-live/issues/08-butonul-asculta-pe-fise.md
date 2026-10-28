# 08: Butonul „Ascultă” pe fișe

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** pe fiecare fișă din Studiu apare un buton „Ascultă”, care pornește lecția pe modulul fișei. Butonul apare doar în aplicația instalată (PWA), nu în artifact. Dacă nu există cheie Gemini, trimite la câmpul cheii.

**Blocked by:** 02.

**Status:** ready-for-agent

- [x] Butonul „Ascultă” apare pe fiecare fișă din Studiu în PWA și nu apare în artifact.
- [x] Apăsarea pornește lecția pe modulul fișei curente, cu poziția lui salvată (dacă există).
- [x] Fără cheie, apăsarea duce la câmpul cheii.
- [x] Butonul arată bine la 360 px, în light și dark, fără să acopere conținutul fișei.

## Comments

Implementat. Butonul `data-a="listen"` din `vSheets`, doar când `!IN_ARTIFACT`; fără cheie, trimite la tab-ul Jarvis cu mesajul „adaugă mai întâi cheia Gemini”.
