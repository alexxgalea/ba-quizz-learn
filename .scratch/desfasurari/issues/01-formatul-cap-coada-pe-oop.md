# 01: Formatul, de la cap la coadă, pe `oop`

**What to build:** Alex deschide fișa `oop` în Studiu și găsește, sub ideea principală, „Harta modulului ›” și, sub fiecare dintre cele 12 puncte (numerotate), „Pe larg ›”. Fiecare desfășurare pornește de la o problemă concretă, are ideea, un exemplu sau o analogie și, unde e cazul, comparația cu C++ și locul unde ea nu mai ține. „Deschide tot” deschide harta și toate desfășurările. „Întreabă despre asta” pe fișa `oop` știe desfășurările. Celelalte fișe arată exact ca azi. Modulul e publicat la același link (artifact și PWA), iar Alex primește un mesaj.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Pregătire (întâi): parserul de câmpuri al explicațiilor primește ca parametri setul de câmpuri și forma titlului, fără nicio schimbare pentru grile (explicațiile grilelor se parsează identic, dovedit de build și de testele existente). Desfășurările îl refolosesc, cu titlurile lor proprii, care nu se ciocnesc cu id-urile grilelor.

- [ ] Desfășurările stau în Markdown, câte un fișier pe modul, separat de explicațiile grilelor; build-ul le parsează și le injectează pe modul (harta + lista indexată ca punctele).
- [ ] Validarea cere: modul complet sau absent; număr egal cu punctele; Problema și Ideea; Exemplu sau Analogie; „Unde nu ține” lângă „În C++”; ~60–90 de cuvinte (≤ ~180 la punctele marcate grele); exemplu ≤ ~8 rânduri; rânduri de cod ≤ 36; harta are Problema și grupuri care acoperă toate punctele, fără suprapuneri. Fiecare regulă e dovedită o dată cu un caz care pică.
- [ ] Check-ul de exemple rulează fiecare bloc Python într-un proces izolat, cu timeout, și compară în ordine ce afișează cu comentariile `# → …`; o excepție așteptată, marcată explicit, trebuie să oprească blocul cu exact acel tip. Dovedit întâi pe un rezultat greșit și pe o excepție greșită, care pică.
- [ ] Ecranul: harta sub ideea principală, închisă; „Pe larg ›” sub fiecare punct, închis; „Deschide tot” / „Închide tot”; numere la puncte doar la modulele cu desfășurări; câmpurile opționale doar când există; C++ și TSX fără colorare Python; termenii din glosar legați; starea doar în `ui`, nu în `S`; desfășurările deschise rămân deschise după o întrebare în „Întreabă”.
- [ ] „Întreabă” pe o fișă cu desfășurări primește harta și desfășurările în context; pe o fișă fără ele, cererea e identică cu azi.
- [ ] Conținut: harta `oop` și cele 12 desfășurări, cu comparațiile C++ (C++11/17: `virtual` și duck typing, constructor față de `__new__` / `__init__`, `__eq__` / `__hash__` față de `operator==` și `std::hash`, membri `static` față de atribute de clasă, MRO / C3 față de moștenirea în diamant și `virtual` la bază, clase abstracte cu metode pur virtuale față de ABC, RAII față de context manager), fiecare cu Unde nu ține. Faptele C++ verificate pe cppreference și trecute într-o secțiune nouă a fișierului de fapte; erorile de fapt găsite în puncte sunt corectate și enumerate.
- [ ] Test de interfață nou (Playwright, 360 px), cu acoperirea din spec (Testing Decisions, cusătura A), adăugat în lista testelor din `CLAUDE.md`; testele existente trec, actualizate doar unde numerotarea schimbă ce văd.
- [ ] `CLAUDE.md`: C++ în lista experiențelor lui Alex pentru „Legătură”, regulile desfășurării în „Stilul explicațiilor”, check-ul de exemple în pașii de dinainte de publicare, arhitectura pe scurt; README: secțiunea „Desfășurări”.
- [ ] Toate verificările de dinainte de publicare trec; screenshot la 360 px, light și dark, pe fișa `oop` cu „Deschide tot”; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română, care îi cere să citească `oop` pe telefon pentru calibrare.
