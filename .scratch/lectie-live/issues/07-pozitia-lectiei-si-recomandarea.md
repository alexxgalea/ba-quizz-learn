# 07: Poziția lecției și recomandarea

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** aplicația ține minte la fiecare modul **poziția lecției** (bucata la care a ajuns Alex, data ultimei terminări). Poziția avansează doar când o bucată s-a redat complet; terminarea fișei o aduce la zero și notează data. Se sincronizează cu restul progresului, cu îmbinare pe item după timestamp, și un reset de progres o șterge. În tab-ul Jarvis, butonul mare „Ascultă lecția recomandată” arată modulul și poziția („Continuă asyncio, 4/10”). Recomandarea, în ordine: lecția începută; altfel modulul cu cea mai mare nevoie dintre cele terminate acum mai mult de 2 zile sau niciodată; fără Bonus și fără comportamental (pe care Alex le poate alege din listă). La reluare dintr-o poziție > 0, Jarvis începe cu o propoziție de recapitulare a ultimei bucăți ascultate.

**Blocked by:** 02.

**Status:** ready-for-agent

- [x] Testele pe aplicație arată: poziția avansează doar după redarea completă, nu la Sari, nu la o bucată întreruptă.
- [x] La terminarea fișei, poziția revine la zero și se notează data.
- [x] Îmbinarea a două dispozitive păstrează poziția cea mai nouă pe fiecare modul; un reset o șterge.
- [x] Recomandarea respectă ordinea din spec (lecția începută, apoi nevoia cea mai mare dintre modulele nefăcute în 2 zile, fără Bonus și comportamental).
- [x] Butonul recomandat arată numele modulului și poziția.
- [x] La reluare, prima replică a lui Jarvis conține o recapitulare a ultimei bucăți ascultate.
- [x] Modulele fără lecție începută și fără termen apar în listă și pot fi alese oricând.

## Comments

Implementat. `S.l[modul] = { n, d, t }` (în `MAPS`, deci se îmbină și se șterge la reset ca restul), `PrepApp.sheet` / `lessonHeard` / `lessonDone` / `lessonRec`, butonul `#jv-rec` și lista modulelor în tab-ul Jarvis. Poziția = bucata ascultată cel mai departe: o bucată sărită nu se numără, iar una ascultată după ea mută poziția. Testele: `tools/test_lesson.py` (aplicația) și `tools/unit/lesson.test.mjs` (recapitularea la reluare).

Adăugat la cererea lui Alex: resetarea poziției (`PrepApp.lessonReset`; „Resetează lecția” sub butonul recomandat și „Resetează” în lista modulelor, doar pentru lecții începute). Păstrează data ultimei terminări și nu pornește lecția.
