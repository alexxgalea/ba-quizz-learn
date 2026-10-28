# 07: Poziția lecției și recomandarea

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** aplicația ține minte la fiecare modul **poziția lecției** (bucata la care a ajuns Alex, data ultimei terminări). Poziția avansează doar când o bucată s-a redat complet; terminarea fișei o aduce la zero și notează data. Se sincronizează cu restul progresului, cu îmbinare pe item după timestamp, și un reset de progres o șterge. În tab-ul Jarvis, butonul mare „Ascultă lecția recomandată” arată modulul și poziția („Continuă asyncio, 4/10”). Recomandarea, în ordine: lecția începută; altfel modulul cu cea mai mare nevoie dintre cele terminate acum mai mult de 2 zile sau niciodată; fără Bonus și fără comportamental (pe care Alex le poate alege din listă). La reluare dintr-o poziție > 0, Jarvis începe cu o propoziție de recapitulare a ultimei bucăți ascultate.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] Testele pe aplicație arată: poziția avansează doar după redarea completă, nu la Sari, nu la o bucată întreruptă.
- [ ] La terminarea fișei, poziția revine la zero și se notează data.
- [ ] Îmbinarea a două dispozitive păstrează poziția cea mai nouă pe fiecare modul; un reset o șterge.
- [ ] Recomandarea respectă ordinea din spec (lecția începută, apoi nevoia cea mai mare dintre modulele nefăcute în 2 zile, fără Bonus și comportamental).
- [ ] Butonul recomandat arată numele modulului și poziția.
- [ ] La reluare, prima replică a lui Jarvis conține o recapitulare a ultimei bucăți ascultate.
- [ ] Modulele fără lecție începută și fără termen apar în listă și pot fi alese oricând.
