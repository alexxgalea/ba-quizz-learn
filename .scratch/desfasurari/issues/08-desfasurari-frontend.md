# 08: Desfășurări pentru frontend (13 puncte)

**What to build:** Când Alex deschide fișa `frontend` în Studiu, găsește harta modulului și câte o desfășurare pentru fiecare punct, în formatul calibrat la `oop`: Problema, Ideea, Exemplu sau Analogie, În C++ cu Unde nu ține doar unde există un echivalent real, Legătură opțională. Modulul e publicat la același link, iar Alex primește un mesaj cu ce s-a adăugat și cu erorile de fapt corectate în puncte.

**Blocked by:** 02 (Calibrarea: Alex citește `oop` pe telefon)

**Status:** done

Spec: `.scratch/desfasurari/spec.md`. Vocabular: `CONTEXT.md` (Fișă, Punct, Desfășurare, Harta modulului).

Unghiul C++ și legăturile pentru `frontend`: exemplele sunt în TypeScript/TSX (fără colorare Python, nerulate; verificate la citire). C++ ajută la TypeScript (generice față de template-uri, tipare structurală față de nominală, `const` față de `readonly`) și aproape deloc la React; Legătura cu React-ul din experiența lui Alex contează mai mult.

- [x] Fiecare modul din tichet are harta (problema mare și grupurile care acoperă toate punctele) și câte o desfășurare pentru fiecare punct, în ordinea punctelor.
- [x] Fiecare desfășurare pornește de la o Problemă concretă și nu repetă punctul cuvânt cu cuvânt; Ideea are câte un fapt pe propoziție.
- [x] Comparațiile cu C++ apar doar unde există un echivalent real, la nivel C++11/17, și au întotdeauna Unde nu ține.
- [x] Punctele nu sunt împărțite, unite sau reordonate; erorile de fapt găsite sunt corectate și enumerate în comentariul de închidere și în mesajul către Alex.
- [x] Faptele noi (Python și C++) sunt verificate pe surse primare și trecute în fișierul de fapte verificate.
- [x] Validarea trece (câmpuri, lungimi, rânduri de cod ≤ 36, hartă completă), iar check-ul de exemple trece pe toate exemplele Python.
- [x] `xcheck` / `fencew` curate; screenshot la 360 px, light și dark, pe fișă cu „Deschide tot”.
- [x] Toate testele de interfață și de unitate din `CLAUDE.md` trec; publicat la același link (artifact și PWA); mesaj scurt către Alex, în română.

## Comments

**2 nov. 2026:** `frontend` are acum harta și 13 desfășurări (`src/desf/frontend.md`), în ordinea punctelor, cu exemple TS / TSX / JS (fără colorare Python, nerulate de `desf_examples`).

- `Greu: da` la 1, 2, 3, 6, 7, 8, 10, 12 și 13 (plafonul rămâne 180 de cuvinte); 4, 5, 9 și 11 rămân în banda normală.
- C++ doar la 1 (lambdă cu captură prin valoare `[n]` față de `[&n]`, ca snapshot-ul unui render) și 10 (`std::variant` + `std::visit` față de uniunea discriminată cu `never`), ambele cu `Unde nu ține`. Fără C++ la restul: generice / template-uri, tipare structurală și `const` / `readonly` nu sunt puncte ale acestei fișe.
- Exemplele le-am verificat eu: componentele React (state ca snapshot, regulile hooks cu mesajele exacte, ordinea effect-urilor, Strict Mode, stare derivată, cursa cu `ignore`, fragmentul Testing Library, XSS în jsdom) rulate în vitest + jsdom, `switch`-ul exhaustiv și `unknown` cu `tsc --strict` 7.0.2, ordinea microtask / timer și `Promise.all` cu Node 22, `QueryObserver` din TanStack Query 5, zod și `openapi-typescript` pe un schema FastAPI; C++ compilat cu g++ și clang++. Faptele noi sunt în `research/interview-facts.md`, secțiunea 25.
- Erori de fapt în punctele fișei: niciuna. Precizări, nu erori: la 2, React aruncă „Rendered more hooks…” doar dacă render-ul anterior a apelat măcar un hook (primul hook adăugat într-o componentă fără hooks nu aruncă nimic); la 7, `gcTime` 5 min și `retry` 3 sunt din docs TanStack v5, nu din rulare; la 12, `credentials: "include"` cere și `Access-Control-Allow-Credentials: true`, iar Keycloak aplică PKCE doar dacă e setat pe client sau trimis de client.
- `tools/test_desf.py` are acum o secțiune pentru `frontend` (13 desfășurări, C++ doar la 1 și 10, exemple fără colorare Python, fără overflow la 360 px, light și dark). Fixture-ul de probă al testului suprascrie desfășurările reale de la `frontend`; comentariul din antet o spune.
- Review (`/code-review`, Standards și Spec): fără defecte blocante. Corectate: comentariul `// → n = 1` de la 1 (acum după handler), tipul din exemplul de la 5 (`useState(items)`, fiindcă `useState([])` dă `never[]`), `userEvent.click` direct la 11, Legăturile la grile care nu acopereau afirmația (2, 3, 6, 9, 11), comparația C++ din Legătura de la 9 (scoasă), ACAC și formularea PKCE la 12, eticheta grupului 10–13 din hartă, `Greu: da` la 2, 3 și 8, notația și provenința din fapte, README (faptele C++ sunt în secțiunile 19–25). Rămân judecăți asumate: rupturile de rând din exemple la 360 px și Problema de la 12, care acoperă doar XSS (CORS, PKCE și BFF sunt în Idee).
