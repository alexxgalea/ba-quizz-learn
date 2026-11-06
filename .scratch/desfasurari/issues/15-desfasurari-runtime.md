# 15: Desfășurări pentru runtime (8 puncte)

**What to build:** Când Alex deschide fișa `runtime` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `runtime`: aici C++ are cel mai mult de spus: compilat la cod mașină față de bytecode interpretat, tipare statică față de dinamică, `TypeError` la runtime față de eroarea de compilare, refcount + GC față de `shared_ptr` și ciclurile lui.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `runtime` are acum harta și 8 desfășurări (`src/desf/runtime.md`), în ordinea punctelor.

- `Greu: da` la 1, 3, 4, 5, 6, 7 și 8 (plafonul rămâne 180 de cuvinte); 2 rămâne în banda normală.
- C++ la 1 (`g++ app.cpp`: analiză, traducere, linker; bytecode-ul nu e cod mașină), 3 (tipul aparține variabilei, `auto x = 1; x = "unu";` nu compilează; `Base*` cu `virtual` ca „tipul e al obiectului”), 4 (C++ e static, dar `'a' + 1` și `"1" + 1`, aritmetică de pointeri, compilează), 6 (eroarea de tip oprește build-ul; dar `v[10]`, `any_cast` și `dynamic_cast` scapă), 7 (`shared_ptr` și ciclul scurs, `weak_ptr`) și 8 (`main()` față de gardă, gol la nivel de fișier, constructori globali, `#include`), toate cu `Unde nu ține`. Fără C++ la 2 (interpretorul în C și JIT-ul n-au echivalent în C++11/17) și 5 (hint-urile n-au echivalent: în C++ tipurile sunt impuse).
- Legăturile merg spre RT-01…RT-08 (câte una-două pe punct), spre punctul 6 al fișei `python` (`with`, nu `__del__`) la 7, spre punctul 6 al fișei `oop` (duck typing) la 3, spre FastAPI / Pydantic (422 la `int`, rulat) la 5, spre Docker (`PYTHONDONTWRITEBYTECODE`) la 1, spre React (`e.target.value` e șir) la 4, spre TypeScript (`tsc`, tipurile dispar la runtime) la 5 și 6 și spre Uvicorn (`uvicorn app:app` importă modulul, rulat) la 8.
- Exemplele Python (toate cele 8) rulează în `desf_examples` (77 de exemple în total, 0 picate). Exemplul de la 8 scrie `m.py` în directorul curent (gol în check) și îl importă de două ori. Faptele sunt în secțiunea 31 (`research/_desf_facts_runtime.md`, de lipit în `research/interview-facts.md`): docs.python.org (tutorial, reference, `gc`, `dis`, `ast`, `typing`, `__main__`, What's New 3.13 / 3.14 / 3.15), draftul standardului C++, compilare cu `g++` și `clang++`, FastAPI / Pydantic / Uvicorn rulate în mediu.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la 1, doar modulele importate se salvează ca `.pyc`, scriptul pornit direct se recompilează; la 2, „JIT oprit implicit” e adevărat pentru build-urile obișnuite 3.13 / 3.14 (3.15 l-a îmbunătățit; starea lui implicită nu a fost confirmată); la 3, `TypeError` apare la rulare fiindcă compilarea verifică doar sintaxa; la 5, „ignorate de interpretor” = nu sunt verificate (până la 3.13 expresia se evaluează la `def`, `NameError`; din 3.14 leneș); la 6, „erorile de tip nu ajung în producție” se referă la erorile prinse de verificarea de tipuri, nu la toate; la 7, „GC generațional” e adevărat pe 3.13 și pe 3.14.5+ (3.14.0–3.14.4 au avut un GC incremental, revenit) și „eliberare imediată” e detaliu al CPython; la 8, motivul gărzii e că importul execută corpul, iar un fișier pornit ca script și importat apoi rulează de două ori.
- `tools/test_desf.py` are acum o secțiune pentru `runtime` (8 desfășurări, C++ la 1, 3, 4, 6, 7 și 8 cu `Unde nu ține`, toate exemplele Python colorate, fără overflow la 360 px, light și dark, starea `S` neschimbată).
- Verificat înainte de commit: `validate` (OK, fără avertismente pentru `runtime`), `build`, `node --check`, `desf_examples` (77, 0 picate), `fencew 36` (nimic în `desf/runtime.md`), `test_desf.py` (ALL PASS), `npm run test:unit` (338, 0 picate), screenshot la 360 px în light și dark cu „Deschide tot”, citit pe toată fișa. Rămân pentru publicare: suita completă de teste de interfață și publicarea la același link.

**3 nov. 2026 (închidere):** Review (`/code-review`, Standards și Spec): fără defecte blocante. Corectate după el: trimiterea de la 3 merge acum la punctul 8 din `oop` (duck typing și `Protocol`), nu la 6; harta spune patru întrebări, ca grupurile; „(compilat)” scos din 7 și propoziția despre ciclu împărțită în două.
