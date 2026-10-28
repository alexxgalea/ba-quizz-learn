# 01: Pagina de probă pentru metrou

**Parent:** `.scratch/lectie-live/spec.md` (secțiunea „Further Notes”: proba înainte de cod).

**What to build:** o pagină de probă, de aruncat, în stilul probei Jarvis din 22 octombrie, pe care Alex o rulează pe telefon, în metrou. Răspunde la patru întrebări care decid tichetele 10 și 11 și confirmă ipotezele celorlalte: (1) merg conexiunea Live și sunetul cu ecranul stins, în PWA; (2) merg butoanele căștilor Bluetooth prin Media Session; (3) cum se poartă reconectarea și reluarea într-un tunel adevărat; (4) cum se poartă zgomotul din fereastra de ascultare și butonul Vorbește (microfon deschis doar cât e ținut apăsat) într-un vagon zgomotos.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Pagina rulează pe telefon și deschide o sesiune Live cu cheia deja salvată a lui Alex, fără să o ceară din nou.
- [ ] Un test pornește sesiunea, apoi stinge ecranul și raportează dacă audio-ul continuă și dacă socket-ul rămâne deschis (și după cât timp se închide, dacă se închide).
- [ ] Un test afișează ce evenimente primește pagina de la butoanele căștilor (play/pauză, următorul, anterior).
- [ ] Un test deschide microfonul doar cât e ținut apăsat un buton „Vorbește” și arată dacă zgomotul de fond declanșează întreruperi.
- [ ] Pagina înregistrează un jurnal simplu (pierderi de semnal, reconectări, durata) pe care Alex îl poate copia.
- [ ] Alex rulează proba în metrou și notează rezultatele la sfârșitul acestui fișier, sub `## Comments`, cu câte un rând pentru fiecare dintre cele patru întrebări.
- [ ] Rezultatele sunt reflectate în tichetele 10 și 11 (care ramură se aplică).
