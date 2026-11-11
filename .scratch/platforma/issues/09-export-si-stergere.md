# 09: Exportul și ștergerea jurnalului

**Parent:** `.scratch/platforma/spec.md`

**What to build:** din Progres, Alex descarcă tot jurnalul ca fișier și îl poate încărca înapoi. Tot de acolo poate șterge jurnalul de pe server, cu confirmare. Brief-ul pentru Perplexity (`export/make_brief.js`) citește exportul nou.

**Blocked by:** 05

**Status:** done (de verificat pe serverul real)

- [x] Export → ștergere → import dă aceeași proiecție.
- [x] Exportul include textul lui Alex; nu include secretul.
- [x] `make_brief.js` merge pe exportul nou.

## Comments

### Implementat

- **Fișierul** (`Journal.exportDoc` / `parseExport`, `src/journal.js`): `{ format: "ba-journal", version: 1, exportedAt, device, devices, count, events }`, tot jurnalul cu textul lui Alex, fără adresa și secretul serverului. Progres › Salvare: „Exportă jurnalul” (descărcare `jurnal-onapsis-AAAA-LL-ZZ.json`) și „Importă jurnalul” (fișier; un jurnal lipit în caseta „Importă” e recunoscut după `format`). Importul vechi (text `S`) merge neschimbat; tichetul 10 îl folosește.
- **Import** = `J.merge` (reuniune după id, fără dubluri, fără server, validare întreagă cu mesaje românești, nimic importat pe jumătate). Ce lipsea intră în coada obișnuită de trimis; serverul ignoră după id ce are deja.
- **Server**: `POST /events/purge { "confirm": "purge-all-events" }` (`server/ba_server/routers/purge.py`; secret obligatoriu, 422 fără confirmarea exactă) șterge evenimentele, contorul și marcajele de idempotență (nu și contorul zilnic al `/ai`), pe `MemoryStore` și `DynamoStore`; `store.purge()` / `store.epoch()`. IAM: `dynamodb:BatchWriteItem` adăugat în `template.yaml` (ștergerea în lot se autorizează prin el; `DeleteItem` rămâne neacordat).
- **Epoca**: `GET` / `POST /events` întorc `epoch` (`"0"` până la prima ștergere, apoi un șir nou la fiecare). `src/sync.js` o ține lângă cursor; la o epocă diferită, cursorul se reia de la 0, datele locale rămân și ce era deja trimis nu se retrimite singur. „Retrimite jurnalul local” (`resend`) pune tot jurnalul în coadă. Un server fără epocă nu schimbă nimic. Detalii: README › Exportul și ștergerea jurnalului.
- Progres › Sincronizare: „Șterge jurnalul de pe server” în doi pași (panou + cuvântul „sterge”), „Retrimite jurnalul local”, notă când serverul a fost șters (de aici sau de pe alt dispozitiv).
- `make_brief.js` citește ambele formate; același progres dă același brief.
- Teste: `tools/unit/export.test.mjs` (22), `tools/test_export.py`, `server/tests/test_purge.py`, `fake_server.mjs` extins (epoch, purge, `legacy`).
- **Are nevoie de serverul real**: purge pe DynamoDB real (doar moto), politica IAM nelansată, CORS din browser pentru `POST /events/purge`, timpul funcției la un jurnal mare, ștergerea fiind în mai multe cereri `BatchWriteItem` (nu atomică).
