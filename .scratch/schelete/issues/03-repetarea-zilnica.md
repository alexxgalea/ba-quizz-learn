# 03: Repetarea în viața de zi cu zi: scadente, plan, Progres, brief

**What to build:** Scheletele intră în ritmul serii. În segment, Alex are o intrare „Scadente” care îi dă scheletele de repetat, în ordinea cutiei. Planul de seară are o sarcină „Schelete: N scadente + 3 noi”, care îl duce direct la primul schelet de făcut, iar timpul petrecut intră în istoric. Progres arată câte schelete știe, câte are de repetat și câte n-a început; brief-ul pentru Perplexity primește numărătoarea pe modul și scheletele ratate. Din fișa unui modul ajunge la scheletele lui printr-un link.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] Intrarea „Scadente” arată numărul și deschide scheletele scadente în ordinea cutiei, cu aceleași scadențe ca la grile și orale.
- [x] Planul generează pe fiecare seară o sarcină cu cheie stabilă `sch`, așezată după oral; textul are numărul de scadente și cele 3 noi; durează ~15–20 de minute, luate din bugetul „mix inteligent”, nu din kata.
- [x] Scheletele noi din sarcină vin din modulele cu nevoia cea mai mare; sarcina deschide segmentul la primul schelet scadent sau nou.
- [x] Bifa sarcinii rămâne după regenerarea planului; minutele petrecute pe schelete intră în istoric și scad din bugetul de azi.
- [x] Progres are linia „Schelete: X știute · Y de repetat · Z neîncepute” (știute = cutia ≥ 3).
- [x] Exportul brief-ului include numărătoarea pe modul și scheletele cu ultimul scor sub 50%.
- [x] Fișa unui modul cu schelete are linkul „Schelete (N)”, care deschide lista la acel modul.
- [x] Testele de plan și testul Playwright pentru schelete acoperă sarcina, istoricul, Progresul și linkul; testele existente trec.

## Comments

**1 nov. 2026 — implementat** (4ec41ee și reparațiile din review). Abateri și interpretări: textul sarcinii e „N scadente + K noi” cu K = min(3, câte schelete neîncepute există), iar zilele viitoare au textul fix „cele scadente + 3 noi”, fiindcă scadențele lor nu se pot calcula. „Luate din bugetul mix inteligent” e implementat ca buget flexibil: minutele sarcinii intră în `fixed` din `genPlan` (scad din timpul modulelor), nu din kata; testul compară prezența kata-ului cu și fără sarcină la 1,5–6 ore pe seară. Timpul unei încercări se măsoară de la deschiderea scheletului și se plafonează la 15 minute, ca o încercare lăsată deschisă să nu consume bugetul. Intrarea „Scadente” e un filtru al listei (`ui.study.skelDue`), care rămâne deschis după „Salvează”. Brief-ul primește numărătoarea pe modul (cutia ≥ 3 = știut) și scheletele sub 50%, fără numărul de scadente, fiindcă scriptul Node nu are logica Leitner. Review-ul pe două axe n-a găsit defecte blocante; a găsit golul de test pentru bugetul de azi (acoperit acum) și lipsa filtrului `p < 4` la `dueS` (adăugat). Neschimbate cu bună știință: dublarea resetării `ui.study.*` în trei handlere și rândul lung de istoric, în stilul codului existent.
