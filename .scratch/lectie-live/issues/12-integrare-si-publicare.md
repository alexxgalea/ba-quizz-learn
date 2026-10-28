# 12: Integrare: documentație, teste de ecran, publicare

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** se închide funcția. Se actualizează secțiunea „Arhitectura” din `CLAUDE.md` și `README.md` cu modul Lecție (poziția lecției, recomandarea, Mut și Vorbește, fereastra de ascultare). Testele de ecran din `tools/` acoperă vederea lecției, butonul din Studiu și butonul pentru lecția recomandată, la 360 px în light și dark. Se rulează toate testele cerute în `CLAUDE.md`, apoi PWA se publică din ramura de lucru.

**Blocked by:** 02, 03, 04, 05, 06, 07, 08, 09, 10, 11.

**Status:** ready-for-agent

- [ ] `CLAUDE.md` și `README.md` descriu modul Lecție, în română, în stilul existent.
- [ ] Testele de ecran din `tools/` (inclusiv cele pentru Jarvis, cu `window.__jarvisFakes`) acoperă lecția, butonul „Ascultă” din Studiu și butonul recomandat.
- [ ] `node validate.mjs`, `node build.mjs`, `node --check dist/bundle-check.js` și `npm run test:unit` trec.
- [ ] Verificare vizuală a ecranelor noi la 360 px, în light și dark.
- [ ] PWA publicată (`npm run pages`), cu lecția funcțională pe telefon.
- [ ] Alex a ascultat o lecție completă pe telefon și a notat în `## Comments` ce a mers și ce nu.
