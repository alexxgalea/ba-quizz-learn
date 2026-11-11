# 02: Jurnalul de încercări în client, cu proiecția lui `S`

**Parent:** `.scratch/platforma/spec.md`

**What to build:** aplicația scrie fiecare răspuns ca eveniment într-un jurnal local și citește tot ce citea din `S` dintr-o proiecție a jurnalului. Comportamentul vizibil nu se schimbă: aceleași cutii, aceleași scadențe, același plan. Încă fără server; sincronizarea veche prin `window.claude` se oprește în PWA. **Jurnal de încercări** intră în `CONTEXT.md`.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Forma evenimentului e cea din spec; tipuri pentru răspuns, setări, bifă de plan, poziția lecției, reset.
- [ ] O funcție pură `jurnal → S`; `updQ`, `updO`, `updX`, `updS`, kata-urile, golurile și lecția adaugă evenimente.
- [ ] Jurnalul stă în IndexedDB; pornirea nu recalculează din tot jurnalul.
- [ ] Testele existente de plan, scadențe și goluri trec neschimbate.
- [ ] Un reset ascunde tot ce e mai vechi.
- [ ] `CONTEXT.md` are **Jurnal de încercări**.

## Comments
