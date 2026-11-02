# 09: Conținut: JavaScript (12 schelete)

**What to build:** Alex are scheletele de JavaScript ca limbaj, ca să răspundă la întrebările omului de frontend fără să se blocheze.

**Blocked by:** 07 (Primul schelet JavaScript și primul TypeScript, de la cap la coadă)

**Status:** done

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [x] closure și factory cu stare privată (din tichetul 7, revăzut) · `this` (arrow vs `function`, `bind`, metodă pasată ca handler) · ordinea pe event loop (`setTimeout` vs `.then` vs `queueMicrotask` vs `await`; cerința cere și predicția output-ului) · promisify + `async` / `await` cu `try` / `catch` / `finally` · retry cu backoff exponențial + timeout (`AbortSignal.timeout` / `Promise.race`) · `debounce` și `throttle` · update imutabil imbricat (spread, `structuredClone`) · `map` / `filter` / `reduce` + grupare (`Object.groupBy` sau `reduce`) · `Map` / `Set` · generator async + `for await` peste un API paginat · clasă ES cu `#private`, `static`, getter · module ESM (named vs default, import dinamic).
- [x] Fiecare referință are un test Node care verifică proprietatea punctelor (ordinea exactă pe event loop, debounce cu ceas fals, originalul neschimbat după update, câmpul privat inaccesibil).
- [x] API-urile folosite există în versiunea de Node din notele de fapte verificate (de pildă `Object.groupBy`, `AbortSignal.timeout`); unde nu, punctul o spune.
- [x] Textele sunt în română, cu termenii tehnici în engleză.
- [x] Validarea datelor trece; codul încape în 42 de coloane.

## Comments

**2 nov. 2026 — implementat.** 12 schelete JavaScript la `frontend` › JavaScript (closure din tichetul 7, plus 11 noi: `this`, ordinea pe event loop, promisify, retry cu timeout, debounce și throttle, update imutabil, filter / map / reduce + grupare, Map / Set, generator async, clasă ES, module ESM). Referințele sunt în `katas/skel_js.mjs`, testele în `katas/skel_js.test.mjs` (43 de teste, `node --test`); catalogul are acum 74 de schelete. Faptele verificate sunt în `research/interview-facts.md` § 17.

Lucruri de știut:
1. **Mutații**: am stricat referințele în 14 locuri (fără `clearTimeout`, `sort()` fără comparator, `return fn()` fără `await`, `#balance` redenumit `_balance`, `uniqueBy` pe array etc.) și testele pică la fiecare. Un test de complexitate a fost prea slab (1000 de valori unice nu distingeau `Set` de `includes`); acum folosește 60 000.
2. **Referința ESM are două fișiere** (`util.mjs`, `app.mjs`), deci nu poate fi cod valid într-un singur modul. Stă într-un comentariu bloc în `skel_js.mjs`, în afara marcajelor; build-ul extrage textul dintre marcaje, iar testul îl scrie în două fișiere reale într-un director temporar și le importă (live binding, `import()`, același namespace).
3. **Greșeală prinsă la verificare**: getterul fără setter aruncă `TypeError` doar în codul strict care atribuie (modul ESM), nu „fiindcă clasa e strictă”; în `node -e` (sloppy) trece în tăcere. Punctul o spune corect.
4. **`AbortSignal.timeout` are timerul `unref` în Node** (observat, nedocumentat): testul de retry cu semnal ține bucla trează cu un `setInterval` temporar.
5. **`Object.groupBy` cere Node 21+** (deducție din V8 11.8 la Node 21.0.0; rulat pe 22.22.0). Pe CoderPad versiunea e neconfirmată, de aceea punctul o spune.
6. Ceasul fals (`t.mock.timers`, cu `setTimeout` și `Date`) acoperă debounce și throttle; `AbortSignal.timeout` nu e acoperit, deci retry-ul folosește timere reale de 5–20 ms și verifică doar limite inferioare.
7. Rândurile de cod au cel mult 42 de coloane (15 rânduri rupte după prima trecere); punctele care citează cod au fost aliniate (`lid`, `page.items`, `const n = counts.get(w) ?? 0`).
8. Verificat: `node validate.mjs` (OK), `build.mjs` + `node --check`, `tools/test_skel.py` și `test_skel_ai.py` (toate trec), screenshot la 360 px în light și dark (fără overflow, fără erori de consolă).
