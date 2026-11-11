# 07: Intervievatorul scris și Certificarea pe sursa de pe server

**Parent:** `.scratch/platforma/spec.md`

**What to build:** intervievatorul (`IV`), interviul tehnic simulat și Certificarea merg azi doar cu `sample`. Trec pe sursa „server”, ca să meargă în PWA. Regulile, prompturile și scorul nu se schimbă.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] Un card oral cu intervievatorul se parcurge cap-coadă în PWA.
- [x] Certificarea pornește și se încheie în PWA; rezultatul apare în istoric.
- [x] `test_interview.py` și `test_cert.py` trec cu sursa nouă.
- [ ] (de măsurat cu serverul real; vezi comentariul) Un apel care durează mult nu e tăiat de limita de timp a funcției (de măsurat; dacă e, se notează aici și se întreabă Alex).

## Comments

### Comentariu (agent, tichetul 07)

**Ce s-a făcut.** `IV.step` (întrebare și verdict), rescrierea (`vRewrite` → `aiGrade`), interviul tehnic simulat și Certificarea folosesc aceeași ordine ca tichetul 06: serverul întâi, apoi `sample` (în artifact), prin `gapText`. `IV.ready` = `gapReady`. Regulile, prompturile, parserele, scorul și pragurile nu s-au schimbat. `ServerAi.generate` primește un `signal` opțional: „Oprește” întrerupe cererea (cod `cancelled`, nu `timeout`) și oprește lanțul de surse. Verdictul poartă numele sursei (`AI.name()`). La eșecul tuturor surselor, dialogul oferă „Continuă” (reia pasul; după o eroare la verdict `iv.final` sare peste întrebare) și „Fără AI: bifez eu punctele” (`ivManual`), deci calea manuală rămâne. Fără timere noi pe apeluri.

**Măsurat cu serverul simulat** (`tools/test_iv_server.py`, PWA și build-ul de artifact): starea de așteptare („Se gândește…” + „Oprește”) apare cât timp serverul întârzie; 502 pe verdict → mesaj, apoi „Continuă” cere doar verdictul (o singură întrebare în total); 502 pe întrebare → reia sau fără AI; 401 → mesaj spre Progres; cererea fără răspuns e tăiată de client la 50 s (ceasul paginii: încă așteaptă la 49 s, eroare „întârziat prea mult” la 51 s), iar „Continuă” duce direct la verdict; Certificarea cap-coadă (grile → 6 carduri orale, unul cu 502 reluat, unul pe calea fără AI → 2 schelete) cu `kind: "cert"` în `S.h`, și în PWA (jurnal, supraviețuiește reîncărcării), și în build-ul de artifact. Nicio cerere nu a plecat direct către Gemini sau DeepSeek, deși ambele chei erau salvate.

**Rămâne de verificat cu serverul real** (ultima bifă): fakes nu pot spune cât durează un apel real. Din cod: serverul are `AI_TIMEOUT_S = 20` pe model, Gemini apoi DeepSeek, deci cel mai rău caz în mod normal e ~40 s + overhead, sub limita clientului (50 s) și sub `Timeout: 60` din `server/template.yaml`. Rezerva: `urlopen(timeout=…)` e pe operație de socket, nu total; un răspuns care picură încet poate depăși 20 s pe model. De măsurat: un verdict `default` cu dialog complet (2 întrebări + răspunsuri) pe serverul real, cu Gemini lent; dacă depășește 50 s, mesajul de timeout apare (testat), dar Lambda ar putea să-l fi dus la capăt degeaba. Dacă măsurătorile reale arată apeluri peste ~45 s, de întrebat pe Alex dacă se ridică limita clientului sau se coboară `AI_TIMEOUT_S`.

**Bază:** `P.cfg.interview` (10 nov 2026) a trecut, deci `test_interview`, `test_gaps`, `test_lesson`, `test_cert` cad pe baza neatinsă (planul gol); au rulat pe o copie a build-ului cu data mutată, fără să schimb `P.cfg`. `test_iv_server.py` își setează data din stare (ca Progres › Interviul), deci rulează și pe baza neatinsă.
