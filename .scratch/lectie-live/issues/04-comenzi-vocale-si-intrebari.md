# 04: Comenzi vocale și întrebări libere

**Parent:** `.scratch/lectie-live/spec.md`

**What to build:** în fereastra de ascultare, Alex poate spune „repetă”, „mai simplu”, „dă-mi un exemplu”, „sari” sau „gata”, sau poate pune o întrebare liberă („stai, de ce anulează `TaskGroup` tot grupul?”). Modelul primește funcții pentru bucata următoare, repetă bucata și încheiere; „mai simplu” și „exemplu” le tratează prin reexplicarea aceleiași bucăți. La o întrebare liberă, Jarvis răspunde scurt (sub ~30 de secunde), poate folosi ce știe el, spune când nu e sigur și apoi revine la lecție. Întrebările nu se salvează. Pe ecran apar butoanele Repetă și Sari.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Funcțiile noi ale modelului sunt oferite în lecție, cu descriere și parametri, și nu apar în celelalte moduri.
- [ ] „Sari” trece la bucata următoare fără să marcheze bucata sărită ca ascultată.
- [ ] „Repetă” reia bucata curentă de la început.
- [ ] „Gata” încheie lecția cu rezumat, ca butonul Gata.
- [ ] Instrucțiunile de sistem fixează regulile pentru „mai simplu”, „exemplu” și întrebări libere (sub ~30 s, „nu sunt sigur”, revenirea la lecție).
- [ ] Butoanele Repetă și Sari de pe ecran fac același lucru ca vocea.
- [ ] Întrebările libere nu apar în starea salvată, nici în istoric, nici în export.
