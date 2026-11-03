# 20: Desfășurări pentru domain (11 puncte)

**What to build:** Când Alex deschide fișa `domain` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** ready-for-agent

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Notă: scris înainte de calibrare. Regulile de stil și de validare sunt cele stabilite după tichetul 02; dacă ele contrazic ce scrie aici, câștigă ele.


Unghiul C++ și legăturile pentru `domain`: fără C++ în general; faptele despre Onapsis și SAP se verifică pe web înainte de scriere.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [ ] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**3 nov. 2026:** `domain` are acum harta și 11 desfășurări (`src/desf/domain.md`), în ordinea punctelor.

- `Greu: da` la 4, 5, 6, 7, 8, 10 și 11 (plafonul rămâne 180 de cuvinte); 1, 2, 3 și 9 rămân în banda normală (la 1 și 9 validarea nu avertizează).
- C++: nicăieri. Modulul nu are echivalent real în standard (produse, vulnerabilități, vocabular SOC, pipeline); nu există nici `Unde nu ține`.
- Legăturile: cardul o-dom-1 la 1; anunțul RO-1186 la 2; DOM-01 la 3; kata k12 și DOM-03 la 4; DOM-05 și DOM-08 la 5; punctul 7 la 6; DOM-08 la 7; cardul o-beh-5 la 8; DOM-02 la 9; DOM-04, DOM-05 și DOM-06 la 10; kata k2, DOM-07 și punctul 3 din fișa celery la 11.
- Exemple: Python la 3 (diff de roluri), 4 (reguli ca funcții), 10 (MTTD cu `statistics.mean`) și 11 (alertă idempotentă); `text` la 2, 6, 7, 8 și 9 (liste și cronologii); analogii la 1 și 5. Cele 4 blocuri Python rulează în `desf_examples` (95 de exemple în total în acest worktree, 0 picate). Exemplele arată ideea în mic, nu codul din Defend.
- Faptele sunt în secțiunea 39 (`research/_desf_facts_domain.md`, de lipit în `research/interview-facts.md`): anunțul Greenhouse, paginile onapsis.com (principală, Defend, Assess, Control, blogul OVERPASS), datasheet-ul Defend, comunicatul din 2022 despre cele 1.000 de zero-day-uri, README-ul scannerului RECON, SAP Learning și help.sap.com (ERP, S/4HANA, ABAP), MITRE ATT&CK, NIST (IoC, SIEM) și Atlassian (MTTD / MTTR). Paginile sap.com au răspuns 403, deci pagina de produs „SAP Endorsed Apps” a Onapsis nu a fost citită.
- Afirmațiile firmei sunt atribuite în text („după Onapsis”, „pagina produsului”): reguli (2.600 față de 2.000 în datasheet), protecția „cu patru luni înainte de patch”, Defend la OVERPASS, formularea „only SAP-endorsed” (apare la Control).
- Erori de fapt în punctele fișei: niciuna; punctele nu au fost modificate. Precizări, nu erori: la 4, cifra 2.600 vine de pe pagina produsului, lista ABAP / Java / HANA / SAProuter din datasheet, iar „analiză de comportament” e parafraza pentru „AI-powered anomaly scoring” și „user anomalies” (pagina nu folosește „behavioral analysis”); la 7, afirmația despre Defend e a firmei (desfășurarea o atribuie); la 9, „SAP = ERP” confundă firma cu produsul (desfășurarea le desparte); cifra de 1.000 de zero-day-uri vine din comunicatul din 2022 și n-a fost regăsită într-un comunicat din 2026; la 10, definiția SIEM din fișă (adună și corelează) e mai largă decât cea NIST SP 800-92 (logare centralizată).
- Rândurile de cod din `domain.md` au cel mult 36 de caractere; `fencew 36` nu raportează nimic pentru fișier.
- `tools/test_desf.py` are acum o secțiune pentru `domain` (11 desfășurări și 6 grupuri în hartă, fără C++, Python colorat la 3, 4, 10 și 11, `text` necolorat la 2, 6, 7, 8 și 9, fără cod la 1 și 5, fără overflow la 360 px, light și dark, starea `S` neschimbată, fără erori de consolă).
- Verificat înainte de commit: `validate` (OK, fără avertismente pentru `domain.md`), `build`, `node --check`, `desf_examples` (95, 0 picate), `fencew 36`, `test_desf.py` (ALL PASS), screenshot la 360 px în light și dark cu „Deschide tot” (felii din elementul fișei). Rămân pentru publicare: suita completă de teste, îmbinarea secțiunii 39 în `interview-facts.md` și publicarea la același link.
