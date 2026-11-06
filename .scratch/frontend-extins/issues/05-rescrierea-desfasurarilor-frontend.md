# 05: Rescrierea celor 13 desfășurări din `frontend`

**What to build:** Alex redeschide fișa `frontend` și găsește aceleași 13 puncte, neschimbate, dar desfășurări rescrise în formatul de frontend: mai lungi, termenii legați de glosar sau explicați pe loc, exemplul cu ✗ / ✓ și „Pas cu pas” la punctele cu secvență (cel puțin 1, 3, 4 și 6). Punctele 10 și 13 trimit la `ts` și `js`. Publicat la același link, cu mesaj.

**Blocked by:** 02

**Status:** done

Spec: `.scratch/frontend-extins/spec.md`. ADR 0002. Tichetul anterior: `.scratch/desfasurari/issues/08-desfasurari-frontend.md` (verificările și precizările de atunci rămân valabile).

- [x] Harta e rescrisă: problema mare și grupurile, plus o frază că bazele sunt în `react`, iar limbajul în `js` și `ts`.
- [x] Cele 13 desfășurări sunt rescrise. Punctele nu se împart, nu se unesc și nu se reordonează. Erorile de fapt găsite sunt corectate și anunțate.
- [x] Niciun termen greu fără definiție (glosar sau explicat în frază). Verificat la citire.
- [x] Exemplele JS / TS trec de check, iar cele TSX sunt reverificate în vitest.
- [x] Secțiunea `frontend` din `tools/test_desf.py` e actualizată (C++ unde a rămas, „Pas cu pas”).
- [x] Toate verificările din `CLAUDE.md` trec. Screenshot la 360 px, light și dark. Publicat la același link și mesaj.

## Comments

**5 nov. 2026:** Cele 13 desfășurări din `frontend` sunt rescrise în formatul de frontend (`src/desf/frontend.md`), punctele neschimbate ca număr și ordine.

- Harta are o frază nouă: bazele sunt în `react`, limbajul în `js`, tipurile în `ts`. Fiecare punct are acum exemplul cu `// ✗` / `// ✓` alături (la 12 în ordinea ✓ apoi ✗, ca în fișier), iar „Pas cu pas” apare la 1, 2, 3, 4, 6, 7, 8 și 13 (cerut: cel puțin 1, 3, 4, 6). Punctele 10 și 13 trimit la `ts` și `js` în Legătură.
- Termenii noi sunt explicați în frază: snapshot, hook, `return` timpuriu, effect, Strict Mode, subscribe, cursă, cache / `queryKey` / stale / backoff, memoizare, Profiler, `never`, zod, SPA, PKCE, BFF, event loop, stivă. Cei din glosar se leagă automat la prima apariție pe fișă.
- Erori de fapt: niciuna. Faptele sunt cele din tichetul 08, plus cronologia TanStack Query (verificată cu `@tanstack/query-core` 5.106.1) în `research/interview-facts.md`, secțiunea 46. Observație nouă: într-un mediu fără `window` (Node, SSR), `gcTime` implicit e `Infinity`; cele 5 minute sunt implicitul din browser.
- Verificări: exemplele `ts` și `js` trec prin `desf_examples`; exemplele TSX (1–6, 8, 9, 11, 12) le-am rulat de mână în vitest + jsdom (test temporar, șters). Plafonul „Întreabă” pentru fișe cu desfășurări a urcat de la 16000 la 20000 de caractere (`ASK_DZ_MAX`), iar avertismentul din `validate` la 18500, fiindcă fișa `frontend` are acum ~17,5k de caractere de material.
- `tools/test_desf.py` are verificări noi la `frontend` (Pas cu pas la 1, 2, 3, 4, 6, 7, 8 și 13, ✗ / ✓, termeni legați).
