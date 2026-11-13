# 05: Cartonaș la întrebări, la „mai simplu” și la „exemplu”

**Parent:** `.scratch/lectie-sincronizata/spec.md`

**What to build:** când Alex pune o întrebare liberă, ecranul trece pe cartonașul `intrebare`: răspunsul lui Jarvis ca subtitrare și, dacă transcrierea intrării e disponibilă, întrebarea lui Alex deasupra. Când Jarvis revine la lecție, revine și cartonașul bucății. La „mai simplu” și „exemplu”, cartonașul bucății rămâne, cu eticheta „Mai simplu” sau „Alt exemplu”.

**Blocked by:** 02

**Status:** done

- [x] Se verifică în `live.js` dacă transcrierea intrării există; rezultatul e notat aici, sub `## Comments`.
- [x] La o întrebare liberă, `#jv-chunk` nu mai arată cartonașul vechi fără nicio marcă.
- [x] Întrebările lui Alex tot nu se salvează nicăieri.
- [x] Teste de unitate pentru cele trei cazuri.

## Comments

Transcrierea intrării există: `live.js` cere `inputAudioTranscription: {}` în setup (l. 27) și emite `transcript` cu `who: "me"`; `Call` o adună în replici cu id. Textul întrebării apare pe cartonaș dacă ajunge înainte sau în timpul răspunsului; altfel cartonașul `intrebare` arată doar eticheta „Întrebarea ta”. „Mai simplu” și „exemplu” se recunosc doar din transcrierea lui Alex (cerere de cel mult 8 cuvinte cu „mai simplu” sau „exemplu”); fără transcriere, cartonașul trece pe `intrebare`.
