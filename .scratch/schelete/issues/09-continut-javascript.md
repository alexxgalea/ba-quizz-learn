# 09: Conținut: JavaScript (12 schelete)

**What to build:** Alex are scheletele de JavaScript ca limbaj, ca să răspundă la întrebările omului de frontend fără să se blocheze.

**Blocked by:** 07 (Primul schelet JavaScript și primul TypeScript, de la cap la coadă)

**Status:** ready-for-agent

Spec: `.scratch/schelete/spec.md`. Vocabular: `CONTEXT.md` (Schelet, Punct esențial, Kata).

- [ ] closure și factory cu stare privată (din tichetul 7, revăzut) · `this` (arrow vs `function`, `bind`, metodă pasată ca handler) · ordinea pe event loop (`setTimeout` vs `.then` vs `queueMicrotask` vs `await`; cerința cere și predicția output-ului) · promisify + `async` / `await` cu `try` / `catch` / `finally` · retry cu backoff exponențial + timeout (`AbortSignal.timeout` / `Promise.race`) · `debounce` și `throttle` · update imutabil imbricat (spread, `structuredClone`) · `map` / `filter` / `reduce` + grupare (`Object.groupBy` sau `reduce`) · `Map` / `Set` · generator async + `for await` peste un API paginat · clasă ES cu `#private`, `static`, getter · module ESM (named vs default, import dinamic).
- [ ] Fiecare referință are un test Node care verifică proprietatea punctelor (ordinea exactă pe event loop, debounce cu ceas fals, originalul neschimbat după update, câmpul privat inaccesibil).
- [ ] API-urile folosite există în versiunea de Node din notele de fapte verificate (de pildă `Object.groupBy`, `AbortSignal.timeout`); unde nu, punctul o spune.
- [ ] Textele sunt în română, cu termenii tehnici în engleză.
- [ ] Validarea datelor trece; codul încape în 42 de coloane.
