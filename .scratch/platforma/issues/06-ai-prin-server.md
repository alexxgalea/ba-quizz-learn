# 06: Verificarea AI trece prin server

**Parent:** `.scratch/platforma/spec.md`

**What to build:** serverul primește un prompt și întoarce textul modelului, cu Gemini întâi și DeepSeek la eșec, cu cheile ca secrete ale funcției. În client, `AskModel` capătă sursa „server”, prima în ordine. „Întreabă despre asta”, verificarea scheletelor, golurile și verificarea cardurilor orale merg în PWA fără nicio cheie în browser.

**Blocked by:** 04

**Status:** done

- [x] Cu serverul configurat, nicio cerere AI nu pleacă direct din browser către Gemini sau DeepSeek (în afară de Jarvis).
- [x] Eșecul Gemini duce la DeepSeek; eșecul amândurora duce la calea fără AI, nu la o eroare care blochează.
- [x] Limită de mărime pe prompt și un plafon zilnic de cereri, ca un secret scăpat să nu coste.
- [x] Teste cu model fals, pe server și în client.

## Comments

### Implementat (agent, 2026-11-11)

- Server: `server/ba_server/routers/ai.py` (`POST /ai`), `models.py` (Gemini, DeepSeek, client HTTP injectabil), `take_ai_slot` în `EventStore` / `MemoryStore` / `DynamoStore` (articolul `AI#<zi>`, `ADD` atomic), variabile `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `AI_DAILY_CAP` etc. în `Settings` și în `template.yaml` / `deploy.sh`. Contractul: `server/README.md`. Teste: `server/tests/test_ai.py` (căderea pe DeepSeek, plafon pe memorie și moto, concurență, limită de mărime, 401, fără chei în răspunsuri și jurnale).
- Client: `src/server_ai.js` (`ServerAi`: configurare, cerere, coduri de eroare, ordinea surselor), teste în `tools/unit/server_ai.test.mjs`; în `src/app.js` doar `Srv`, `AskModel`, `aiGrade` / `srvGrade`, `gapText` / `gapReady`, `vServerSettings`. Test de interfață cu server fals: `tools/test_server_ai.py` (și Gemini / DeepSeek spionate: nicio cerere directă).
- Cererile reale către Gemini, DeepSeek, DynamoDB și Lambda **nu s-au putut verifica fără AWS și fără chei**; totul e testat cu modele false și moto. Prima rulare pe cont real: `make deploy` cu cheile, apoi „Testează” din Progres › Serverul.
- Interviul scris (`IV`) și Certificarea rămân pe `sample` până la tichetul 07; golurile și verificarea cardurilor orale merg deja prin server.
