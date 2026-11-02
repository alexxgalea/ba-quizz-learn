# 01: Un schelet de la cap la coadă, fără AI

**What to build:** Alex deschide Studiu › „Schelete”, vede lista grupată pe modul și deschide primul schelet real: coada blocantă mărginită scrisă cu `threading.Condition`. Vede conceptul, cerința și un câmp de cod; scrie, iar ciorna rămâne dacă pagina se reîncarcă. Bifează singur punctele esențiale atinse și salvează; scheletul intră într-o cutie Leitner după pragurile de la cardurile orale. Poate deschide oricând referința, dar dacă o deschide înainte de o încercare, încercarea se notează cu 0. Referința e cod real, testat, injectat de build ca la kata.

Tichetul face și prefactorul necesar: build-ul extrage pe lângă codul kata și referințele de schelet (alt prefix de identificator, extensii noi), iar validarea datelor primește regulile pentru schelete.

**Blocked by:** None (can start immediately)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] Lista de schelete există ca fișier de date propriu, încărcat ca restul datelor și listat în lista de fișiere de date și în exportul brief-ului.
- [x] Scheletul are: identificator stabil, modul, titlu, cerință, 3–5 puncte esențiale, limbaj și (opțional) marcaj de versiune „3.11+” și „verificat structural”.
- [x] Referința coada blocantă rulează într-un test pytest care o pune sub mai mulți produceri și consumatori și verifică: nimic pierdut, nimic dublat, capacitatea nedepășită, `put` / `get` blocante corect.
- [x] Build-ul injectează referințele de schelet lângă codul kata; codul kata existent rămâne neschimbat în pagină.
- [x] Validarea datelor respinge: cerință goală, mai puțin de 3 sau mai mult de 5 puncte, referință lipsă, rând de cod peste 42 de caractere (limita măsurată la 360 px, fără împachetare), modul inexistent.
- [x] Segmentul „Schelete” apare în Studiu între „Live coding” și „System design”; lista e grupată pe modul, după prioritate; fiecare rând arată titlul, marcajele și starea (nou / cutia / scadent).
- [x] Ecranul scheletului are conceptul, cerința, câmpul de cod (monospace, fără autocorrect, autocapitalize și spellcheck; Tab inserează indentare), „Arată referința”, bifele punctelor și „Salvează”; înapoi la listă păstrează locul.
- [x] Ciorna rămâne pe dispozitiv, pe schelet, după reload și după ieșirea din ecran; nu intră în `S`, în sincronizare, în export sau în brief; se șterge la salvare.
- [x] Salvarea scrie în cheia nouă din `S` cutia, numărul de încercări, scorul în procente și timestamp-ul; pragurile: ≥ 80% urcă o cutie, 50–80% rămâne (minimum 1), < 50% cutia 1.
- [x] Referința deschisă înainte de o încercare salvată dă scor 0 la salvarea următoare, indiferent de bife.
- [x] Normalizarea, îmbinarea pe item după timestamp, curățarea și reset-ul tratează scheletele ca pe cardurile orale; scorul de pregătire nu se schimbă.
- [x] Un test Playwright nou (pagina la 360 px, stare prin `__prep`) acoperă toate punctele de mai sus și verifică lipsa overflow-ului orizontal; testele existente trec (actualizate doar unde lista de segmente s-a schimbat).
- [x] README și instrucțiunile proiectului descriu pe scurt scheletele (date, stare, ecran).

## Comments

**1 nov. 2026 — implementat** (8c81caf, 0feb22a). Abateri față de textul inițial: limita de rânduri e 42, nu 38. Referința se afișează fără împachetare, la 11 px, iar la 360 px încap 43 de caractere (măsurat); împachetarea rupea codul (`self.full.wai t()`). Ligaturile fontului sunt oprite în tot codul din aplicație, fiindcă `>=` apărea ca `≥`. Review-ul pe două axe a găsit trei defecte, toate reparate și acoperite de teste: ocolirea regulii „referința înainte → 0” prin ieșire și revenire, testul de concurență care se bloca la un bug de lock în loc să pice, și newline-ul de la începutul ciornei. Neacoperit: Shift+Tab (dedent) iese din câmp.
