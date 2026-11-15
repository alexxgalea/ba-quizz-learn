# 01: Treptele în lecție (logica)

**Parent:** `.scratch/tabla-trepte/spec.md`

**What to build:** schema de tablă a secvenței `ideea` se spune în trepte. Funcția pură `trepte(schema)` în `src/jarvis.js` (regula din spec). `boardSequences` face o secvență pe treaptă: cartonașul are schema întreagă și indexul treptei, materialul pentru model are treptele de până acum și pe cea curentă, marcată. Prima treaptă poartă cuvintele cheie ale ideii. Între trepte e `STEP_GAP_MS` (2 s), între secvențe rămâne `SEQ_GAP_MS` (4 s). Modul audio primește treptele la fel. Validarea: schema de tablă are cel puțin o săgeată și cel mult 5 trepte (`checkTab`). `CONTEXT.md` › **Cartonaș** se corectează (cartonașul și materialul se despart la trepte).

**Blocked by:** none

**Status:** ready-for-agent

- [ ] TDD în `tools/unit/lesson.test.mjs`: tăierea pe toate cele 9 scheme din `asyncio` (săgeată goală, două săgeți la rând, săgeată la final); o schemă fără săgeți rămâne o singură secvență.
- [ ] `next_chunk` dă o treaptă pe rând; materialul nu conține treapta următoare; `k / of` numără treptele.
- [ ] Ceas fals: treapta următoare se cere după `STEP_GAP_MS`, secvența următoare după `SEQ_GAP_MS`; Repetă, Pauză, Sari, Vorbește și o întrebare anulează pauza; o bucată întreruptă se reia de la prima secvență.
- [ ] Modul audio: aceleași trepte, instrucțiunea „din material”.
- [ ] `tools/unit/desf.test.mjs`: fără săgeată → eroare, 6 trepte → eroare; `node validate.mjs` → OK pe `asyncio`.
- [ ] `npm run test:unit` trece.
