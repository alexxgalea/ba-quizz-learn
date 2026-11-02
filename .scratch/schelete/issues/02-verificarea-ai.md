# 02: Verificarea AI a unui schelet

**What to build:** Pe ecranul unui schelet, Alex apasă „Verifică cu AI”. Cerința, punctele esențiale și codul lui pleacă la sursa AI pe care o are deja (Claude în artifact, Gemini în PWA, DeepSeek ca rezervă). Primește punctele acoperite pre-bifate, greșelile reale și ce lipsește, în română. Poate schimba bifele, modifica codul și verifica din nou; scorul vine tot din bifele confirmate de el. Fără nicio sursă AI, butonul lipsește.

**Blocked by:** 01 (Un schelet de la cap la coadă, fără AI)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] Butonul apare doar când există o sursă AI și folosește lanțul existent al lui „Întreabă” (aceeași ordine a surselor).
- [x] Promptul conține cerința, punctele numerotate și codul ca date, între delimitatori (curățat de delimitatori, tăiat la o limită); cere răspuns în română, cu termenii tehnici în engleză, și semnalarea doar a greșelilor certe.
- [x] Răspunsul JSON (și dacă vine într-un bloc ```) are `covered` (indexuri), `errors` și `missing`; indexurile invalide se ignoră, listele sunt limitate, iar un răspuns fără `covered` ca listă e un format invalid.
- [x] Verdictul pre-bifează exact punctele din `covered`; Alex le poate schimba; salvarea notează după bifele lui.
- [x] Greșelile și ce lipsește apar sub cod; o nouă verificare după modificare înlocuiește rezultatul.
- [x] Codul sub pragul minim nu se trimite și apare un mesaj; erorile (cheie lipsă sau invalidă, rețea, timeout, format) folosesc mesajele existente ale lui „Întreabă” și permit reîncercarea.
- [x] Promptul și parsarea sunt expuse în `__prep` și testate pe cazuri limită (bloc ```, câmpuri lipsă, index inexistent, JSON invalid).
- [x] Testul Playwright folosește modelul fals cu coadă de răspunsuri și jurnalul de apeluri, ca testul pentru goluri, și verifică cererea trimisă, pre-bifarea, erorile, reîncercarea și lipsa butonului fără sursă.
- [x] README descrie verificarea AI a scheletelor.

## Comments

**1 nov. 2026 — implementat** (154802b, 8be5c6b). Verificarea folosește `AskModel`; promptul și parsarea (`skelPrompt`, `parseSkelVerdict`, `SKEL_MIN`) sunt în `__prep`, testate în `tools/test_skel_ai.py`. Indexurile punctelor sunt numerotate de la 0 în prompt. Pragul minim e 20 de caractere, măsurat după curățarea delimitatorilor. Review-ul a găsit două defecte, reparate: butoanele „Gata” și „Arată referința” rămâneau active cât rula verificarea, iar lungimea minimă se măsura pe codul necurățat. Rămase neschimbate, cu bună știință: fără timeout pe apel (ca restul apelurilor AI), verdictul rămâne afișat după o editare până la „Verifică din nou”, verificarea rămâne permisă după „Arată referința” (scorul rămâne 0), iar la DeepSeek `max_tokens` e 700, deci un verdict foarte lung ar putea fi tăiat (eroare de format, cu reîncercare).
