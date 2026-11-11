# 05: Sincronizarea jurnalului între dispozitive

**Parent:** `.scratch/platforma/spec.md`

**What to build:** clientul trimite evenimentele netrimise și le cere pe cele noi, la pornire, la revenirea semnalului și după fiecare răspuns. Fără semnal, sesiunea continuă și evenimentele se strâng local. Alex introduce secretul o dată pe dispozitiv, în Progres.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [x] Un răspuns dat pe telefon apare pe laptop după sincronizare, cu aceeași cutie.
- [x] Răspunsuri date fără semnal pe două dispozitive se regăsesc toate după reconectare.
- [x] Un reset făcut pe un dispozitiv se aplică pe celălalt.
- [x] Starea sincronizării e vizibilă (la zi / N netrimise / fără semnal), fără să blocheze nimic.
- [x] Teste cu server fals în memorie.

## Comments

### Implementat

- `src/sync.js` (`JournalSync.create`, în `LIB_FILES`): ciclu push (loturi ≤ 500, scoase din coadă doar după `accepted`/`duplicates`) + pull (după cursor, `merge(..., { remote: true })`, cursorul avansează după îmbinare), un singur ciclu odată, cerere nouă în timpul unui ciclu = încă un ciclu după el, timeout pe cerere, reîncercări cu pauze 2 s → 5 min (rețea, 5xx, 408, 429), 401 fără reîncercări, 4xx pe un lot înjumătățește lotul până izolează evenimentul refuzat. Pornire, `online`, `visibilitychange`, după fiecare răspuns (debounce 1,5 s).
- `src/server_link.js` (`ServerLink.get/set/clear`, `localStorage` `onapsis-server-v1` = `{ url, secret }`), separat ca să poată fi unificat cu ajutoarele din tichetele 06 și 08. Secretul: doar ASCII tipăribil (merge într-un antet).
- Cursorul stă lângă jurnal: `getAux` / `setAux` în depozit (IndexedDB, cheia `aux:sync` din `meta`), legat de adresa serverului.
- Progres › Sincronizare (doar PWA): adresa, secretul, „Salvează”, „Sincronizează acum”, „Șterge”, linia de stare (La zi / N netrimise / Fără semnal / Secret greșit / n-a răspuns bine).
- Schimbare în jurnal (tichetul 02): starea veche din `onapsis-prep-v1` importată la pornire intră acum în coada de trimis (serverul n-o are); testul din `journal.test.mjs` și `test_journal.py` s-a schimbat în consecință.
- Teste: `tools/unit/sync.test.mjs` (19, server fals în `tools/unit/fake_server.mjs`), `tools/test_sync.py` (două dispozitive reale, rute Playwright), în `test:ui`.
- **Neverificat:** pe un server real (AWS) nu s-a rulat nimic; CORS din browser spre adresa funcției, antetul `Authorization` prin adresa funcției și comportamentul Lambda la loturi de 500 rămân de văzut la primul deploy (tichetul 03/10). Cursorul nu detectează un server golit (cursor mai mic decât cel păstrat): evenimentele locale marcate trimise nu se retrimit singure.
