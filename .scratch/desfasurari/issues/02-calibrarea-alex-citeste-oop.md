# 02: Calibrarea: Alex citește `oop` pe telefon

**What to build:** Alex citește harta și desfășurările `oop` pe telefon, seara, ca la o fișă nouă, și spune ce merge și ce nu. Ce schimbă intră în regulile de stil și în validare înainte ca restul modulelor să fie scrise, ca cele ~230 de desfășurări rămase să fie scrise direct în forma bună.

**Blocked by:** 01 (Formatul, de la cap la coadă, pe `oop`)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`.

Întrebările pentru Alex, după citire:

- [x] Lungimea: 60–90 de cuvinte e bine, prea mult sau prea puțin? Punctele grele au nevoie de mai mult? → **Bine; punctele grele au nevoie de mai mult.**
- [x] Problema: e destul de concretă ca să știi de ce există ideea înainte să o citești? → **În general e bine.**
- [x] C++: comparațiile ajută? „Unde nu ține” e clar? Lipsesc comparații pe care le-ai fi vrut? → **Da.**
- [x] Harta: te ajută să lege punctele? Ar trebui să fie deschisă implicit? → **Da, ajută; rămâne închisă implicit.**
- [x] Exemplele: lizibile pe telefon? Prea multe sau prea puține? → **Da.**
- [x] Ecranul: „Pe larg” și „Deschide tot” sunt la îndemână? Numerele punctelor deranjează? → **Da.**
- [x] Ce schimbi (dacă e ceva): agentul actualizează regulile de stil din `CLAUDE.md` și validarea, rescrie `oop` dacă e nevoie, republică și notează deciziile mai jos, la Comments.

## Comments

**2 nov. 2026:** tichetul 01 e gata și publicat; `oop` e acum cu hartă și desfășurări în Studiu › Fișe › OOP. Aștept părerea lui Alex după citire, înainte să scriu `python` (03) și restul.

**2 nov. 2026, răspunsurile lui Alex:** lungime, Problemă, C++, hartă, exemple și ecran sunt bune. Singura schimbare cerută: punctele grele au nevoie de mai mult. Alex a numit punctele `oop` 2, 6, 8, 10, 11 și 12 (7, MRO, era deja marcat), a ales să se marcheze mai multe puncte cu plafonul de ~180 de cuvinte neschimbat și să rămână harta închisă implicit.

Decizii aplicate:

- `oop` 2, 6, 8, 10, 11 și 12 sunt acum `Greu: da` (7 din 12), cu 101–160 de cuvinte fiecare (plafon 180); punctele fișei sunt neatinse. Adăugat: consecințele lui `__new__` (singleton și `__init__` repetat, alt tip întors), motivul compoziției, ABC față de `Protocol` și `@runtime_checkable`, numele principiilor SOLID, semnalul „clasă cu o metodă”, un exemplu Observer; la 6 a apărut și o comparație cu C++ (`unique_ptr<Notifier>`). Faptele noi, verificate prin rulare (Python 3.13) și compilare (`g++` 13.3, `-std=c++17`), sunt în `research/interview-facts.md`, secțiunea 19.
- Regula din `CLAUDE.md` (Stilul explicațiilor): se marchează `Greu: da` orice punct cu mai multe idei sau capcane, nu doar cel mai greu. Validarea (`DESF_LIMITS`) nu se schimbă: plafonul rămâne 180.
- Erori de fapt în punctele fișei: niciuna.
- Testul `tools/test_desf.py` se sprijinea pe punctul 6 ca „fără C++”; acum folosește punctul 10, cu o aserțiune care îl păzește.
- Deblocate: 03–09 (restul modulelor P1) și 11–21, în ordinea din spec. Următorul: 03 (`python`).
