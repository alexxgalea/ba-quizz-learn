# 06: Verificarea AI trece prin server

**Parent:** `.scratch/platforma/spec.md`

**What to build:** serverul primește un prompt și întoarce textul modelului, cu Gemini întâi și DeepSeek la eșec, cu cheile ca secrete ale funcției. În client, `AskModel` capătă sursa „server”, prima în ordine. „Întreabă despre asta”, verificarea scheletelor, golurile și verificarea cardurilor orale merg în PWA fără nicio cheie în browser.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Cu serverul configurat, nicio cerere AI nu pleacă direct din browser către Gemini sau DeepSeek (în afară de Jarvis).
- [ ] Eșecul Gemini duce la DeepSeek; eșecul amândurora duce la calea fără AI, nu la o eroare care blochează.
- [ ] Limită de mărime pe prompt și un plafon zilnic de cereri, ca un secret scăpat să nu coste.
- [ ] Teste cu model fals, pe server și în client.

## Comments
