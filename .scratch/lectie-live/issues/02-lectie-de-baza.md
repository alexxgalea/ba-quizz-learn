# 02: Lecție de bază: asculți o fișă de la cap la coadă

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** în tab-ul Jarvis apare modul „Lecție”, lângă celelalte moduri, doar în PWA. Alex alege un modul din listă, iar Jarvis îi explică fișa cu voce tare: începe cu ideea principală și numărul de bucăți („Asyncio, în 10 idei. Prima: ...”), apoi parcurge bucățile în ordine (un punct din fișă, ~1–1,5 minute, cu un exemplu din experiența lui Alex, fără fapte noi). Încheie cu formulările de evitat, spuse ca „capcane la interviu”, apoi o recapitulare în trei propoziții și un rămas-bun. Modelul primește bucățile printr-o funcție nouă; punctele nu intră în instrucțiunile de sistem. Fără fereastră de ascultare încă: bucățile curg una după alta. Cât vorbește Jarvis, microfonul nu ajunge la server. Ecranul arată textul bucății curente din fișă, „4/10”, butoanele Pauză (doar oprește deocamdată) și Gata, și transcrierea restrânsă. La final apare în istoric un rând „Jarvis · Lecție · <modul>” cu durata, marcat ca lecție, dacă s-a ascultat cel puțin o bucată; rândul nu se numără în minutele serii. Lecția nu scrie în scor, Leitner și goluri.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Pornirea unei lecții fără cheie trimite la câmpul cheii, ca la celelalte moduri.
- [x] Testele (Jarvis cu serviciul vocal, audio și ceas false, aplicația stub extinsă) arată că modelul primește bucățile în ordine, cu numărul bucății și totalul, și că cere bucata următoare după ce audio-ul s-a redat.
- [x] Prima replică a lecției conține ideea principală și numărul de bucăți; ultima conține capcanele (doar dacă fișa are formulări de evitat), recapitularea și rămas-bunul.
- [x] Instrucțiunile de sistem cer exemple legate de experiența lui Alex, fără fapte noi, fără liste și markdown, cu termeni tehnici în engleză și persona Jarvis în rol de explicator.
- [x] Microfonul nu trimite sunet cât se redă audio-ul lui Jarvis.
- [x] Ecranul arată textul bucății curente, „n/total”, Pauză, Gata și transcrierea restrânsă, lizibil la 360 px în light și dark.
- [x] Rândul din istoric apare doar dacă s-a ascultat cel puțin o bucată și nu scade din bugetul de azi al planului.
- [x] Scorul, cutiile Leitner și golurile rămân neschimbate după o lecție.
- [x] Modul „Lecție” nu apare în artifact.

## Comments

Implementat. Modul `lesson` în `src/jarvis.js` (`makeLessonTools`, `buildLessonSystem`, controlerul `lz`), `PrepApp.sheet` în `src/app.js`, ecranul `vLessonActive` / `vLessonEnded`. Teste: `tools/unit/lesson.test.mjs`, `tools/test_lesson.py` (360 px, light și dark). `next_chunk` dă la prima apelare ideea principală și totalul (`intro`); sfârșitul (`closing`) dă capcanele și textul pentru recapitulare.
