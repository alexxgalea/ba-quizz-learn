# 01: Formatul, de la cap la coadă, pe `oop`

**What to build:** Alex deschide fișa `oop` în Studiu și găsește, sub ideea principală, „Harta modulului ›” și, sub fiecare dintre cele 12 puncte (numerotate), „Pe larg ›”. Fiecare desfășurare pornește de la o problemă concretă, are ideea, un exemplu sau o analogie și, unde e cazul, comparația cu C++ și locul unde ea nu mai ține. „Deschide tot” deschide harta și toate desfășurările. „Întreabă despre asta” pe fișa `oop` știe desfășurările. Celelalte fișe arată exact ca azi. Modulul e publicat la același link (artifact și PWA), iar Alex primește un mesaj.

**Blocked by:** None (can start immediately)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Pregătire (întâi): parserul de câmpuri al explicațiilor primește ca parametri setul de câmpuri și forma titlului, fără nicio schimbare pentru grile (explicațiile grilelor se parsează identic, dovedit de build și de testele existente). Desfășurările îl refolosesc, cu titlurile lor proprii, care nu se ciocnesc cu id-urile grilelor.

- [x] Desfășurările stau în Markdown, câte un fișier pe modul, separat de explicațiile grilelor; build-ul le parsează și le injectează pe modul (harta + lista indexată ca punctele).
- [x] Validarea cere: modul complet sau absent; număr egal cu punctele; Problema și Ideea; Exemplu sau Analogie; „Unde nu ține” lângă „În C++”; ~60–90 de cuvinte (≤ ~180 la punctele marcate grele); exemplu ≤ ~8 rânduri; rânduri de cod ≤ 36; harta are Problema și grupuri care acoperă toate punctele, fără suprapuneri. Fiecare regulă e dovedită o dată cu un caz care pică.
- [x] Check-ul de exemple rulează fiecare bloc Python într-un proces izolat, cu timeout, și compară în ordine ce afișează cu comentariile `# → …`; o excepție așteptată, marcată explicit, trebuie să oprească blocul cu exact acel tip. Dovedit întâi pe un rezultat greșit și pe o excepție greșită, care pică.
- [x] Ecranul: harta sub ideea principală, închisă; „Pe larg ›” sub fiecare punct, închis; „Deschide tot” / „Închide tot”; numere la puncte doar la modulele cu desfășurări; câmpurile opționale doar când există; C++ și TSX fără colorare Python; termenii din glosar legați; starea doar în `ui`, nu în `S`; desfășurările deschise rămân deschise după o întrebare în „Întreabă”.
- [x] „Întreabă” pe o fișă cu desfășurări primește harta și desfășurările în context; pe o fișă fără ele, cererea e identică cu azi.
- [x] Conținut: harta `oop` și cele 12 desfășurări, cu comparațiile C++ (C++11/17: `virtual` și duck typing, constructor față de `__new__` / `__init__`, `__eq__` / `__hash__` față de `operator==` și `std::hash`, membri `static` față de atribute de clasă, MRO / C3 față de moștenirea în diamant și `virtual` la bază, clase abstracte cu metode pur virtuale față de ABC, RAII față de context manager), fiecare cu Unde nu ține. Faptele C++ verificate pe cppreference și trecute într-o secțiune nouă a fișierului de fapte; erorile de fapt găsite în puncte sunt corectate și enumerate.
- [x] Test de interfață nou (Playwright, 360 px), cu acoperirea din spec (Testing Decisions, cusătura A), adăugat în lista testelor din `CLAUDE.md`; testele existente trec, actualizate doar unde numerotarea schimbă ce văd.
- [x] `CLAUDE.md`: C++ în lista experiențelor lui Alex pentru „Legătură”, regulile desfășurării în „Stilul explicațiilor”, check-ul de exemple în pașii de dinainte de publicare, arhitectura pe scurt; README: secțiunea „Desfășurări”.
- [x] Toate verificările de dinainte de publicare trec; screenshot la 360 px, light și dark, pe fișa `oop` cu „Deschide tot”; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română, care îi cere să citească `oop` pe telefon pentru calibrare.

## Comments

**2 nov. 2026 — implementat** (commit-urile `151fbcc`, `03458af` și PWA-ul din `docs/app`; artifactul publicat la același link, versiunea 29).

- Parserul: `parseFields` generic (titlul, câmpurile, literele A–D și câmpurile repetabile sunt parametri), `parseExpl` îl folosește neschimbat (ieșire identică pe toate cele 284 de explicații, verificat față de versiunea veche), `parseDesf` pentru `src/desf/<modul>.md`.
- Validarea (`checkDesf`, `DESF_LIMITS`), câte un caz care pică pe regulă în `tools/unit/desf.test.mjs`; check-ul exemplelor (`node tools/desf_examples.mjs`, `npm run test:desf`), dovedit pe rezultat greșit și pe excepție greșită (și prin mutație: stricat verificatorul, testele cad); test de interfață `tools/test_desf.py` (360 px, light și dark).
- Conținut: harta `oop` (5 grupuri) și cele 12 desfășurări; șapte comparații cu C++ (punctele 1, 2, 3, 7, 8, 11, plus 4, 5 și 9), toate cu Unde nu ține. Exemplele Python (11 blocuri) rulează. **Erori de fapt în punctele fișei `oop`: niciuna găsită** (recitite față de secțiunile 4 și 10 din `research/interview-facts.md` și față de rulări).
- **Abatere de la ticket**: faptele C++ nu au fost verificate pe cppreference (răspunde 403 din mediul de lucru), ci în draftul standardului (N4659 pentru C++17, draftul curent pentru `= default` din C++20) și prin compilare cu `g++ 13` și `clang++ 18` în `-std=c++17`. Secțiunea 19 din fișierul de fapte spune asta.
- **Decizii în afara textului spec-ului**: (1) plafonul materialului pentru „Întreabă” urcă de la 3500 la `ASK_DZ_MAX` = 16000 de caractere doar la fișele cu desfășurări (`oop` are ~12,8k; fără asta harta și desfășurările ar fi tăiate), iar `validate.mjs` avertizează de la `DESF_ASK_BUDGET` = 15000; (2) `Unde nu ține` fără `În C++` e eroare (reciproca regulii din spec); (3) lungimea: eroare în afara 50–100 de cuvinte (până la 180 la punctele grele), avertisment în afara benzii 60–90; (4) ID-urile de grile din Legătură (OOP-04…) rămân text, ca în explicații, nu linkuri.
- Review (`/code-review`, axele Standards și Spec): corectat plafonul punctelor grele (180, nu 190), `Ideea` redusă la una-două propoziții (trei la punctul 7), titlul `### Harta` în orice literă, `codeBlocks` refolosit, avertismentul de buget, testele lipsă și compararea exactă a contextului „Întreabă” la fișele fără desfășurări. Lăsat, ca judecată: lista de etichete a câmpurilor stă în trei locuri (`DESF_LABEL`, `DZ_ASK`, `vDz`), fiindcă `app.js` nu poate importa `lib.mjs`.
- Ce nu s-a schimbat: punctele fișei, scorul, Leitner-ul, golurile, planul, sincronizarea, brief-ul.
- Calibrarea urmează în tichetul 02 (Alex citește `oop` pe telefon); până atunci, formatul nu se aplică altor module.
