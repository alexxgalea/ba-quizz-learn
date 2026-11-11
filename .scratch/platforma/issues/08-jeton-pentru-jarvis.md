# 08: Jarvis pornește cu un jeton de la server

**Parent:** `.scratch/platforma/spec.md`

**What to build:** serverul creează un jeton de scurtă durată pentru Gemini Live, iar clientul deschide sesiunea cu el, direct. Câmpul pentru cheia Gemini dispare din setările Jarvis. O lecție mai lungă decât viața jetonului cere unul nou la reconectare, fără ca Alex să observe.

**Blocked by:** 01, 04

**Status:** ready-for-agent

- [x] Antrenamentul și lecția pornesc fără cheie în `localStorage`. (Bifat pe fapte din cod: teste de unitate `tools/unit/token.test.mjs` și ecran `tools/test_jarvis.py`. **Doar pe API-ul real** rămâne de văzut că jetonul deschide efectiv o sesiune: `docs/probe-jeton-live.html`, pasul A.)
- [x] O sesiune care depășește durata jetonului continuă (test de unitate peste `fakes.mjs`: „a session longer than the token life continues”, plus refuzul handle-ului vechi și cererea unui jeton nou la `auth`). **Doar pe API-ul real:** dacă Gemini acceptă handle-ul vechi cu un jeton nou (proba, pasul C); codul acoperă ambele rezultate.
- [x] Fără semnal la pornire: mesaj clar, nu o eroare ciudată. „Fără conexiune la server: Jarvis are nevoie de internet ca să pornească…”; jetonul se cere înainte de microfon, deci nici cererea de permisiune nu apare.
- [x] Dacă tichetul 01 arată că jetonul nu merge cu modelul folosit, tichetul se oprește aici și Alex e întrebat. Nu se declanșează (documentația Google folosește `gemini-3.8-live` în exemplele cu jeton); proba de la A o confirmă pe API-ul real, iar dacă pică, tichetul se oprește și Alex e întrebat.

## Comments

### Ce s-a făcut (agentul tichetului 08)

- **Server** (`server/ba_server/routers/live_token.py`, `http_client.py`): `POST /live-token` (cu secretul) cere la Gemini `POST /v1beta/auth_tokens` cu `uses: 1`, `expireTime` = acum + 60 min, `newSessionExpireTime` = acum + 2 min; răspuns `{token, expireAt, expiresIn}`. Clientul HTTP e injectabil (`Depends(get_http)`), implicit `urllib`. Cheia vine din `GEMINI_API_KEY` (`Settings.gemini_api_key`, parametrul `GeminiApiKey` din `template.yaml`, `deploy.sh` îl ia din mediu). Erori: 503 `gemini_key_missing`, 502 `gemini_unreachable` / `gemini_error` / `gemini_bad_response`; cheia și corpul erorii Google nu ies.
- **Client**: `src/server_conn.js` (adresă + secret, `onapsis-server-v1`), `src/live_token.js`, `src/live.js` (`cfg.getToken`, URL `Constrained?access_token=`, reînnoire, handle refuzat → `restarted`), `src/call.js` (`restarted` mai departe; `offline` supraviețuiește ca `network`), `src/jarvis.js` (jeton înainte de microfon, mesaje în română, recapitularea după repornire, cheia veche ștearsă după prima sesiune cu serverul), setările Jarvis (cardul „Server”; cheia Gemini rămâne doar fără server).
- **Abatere de la recomandare:** pragul de reînnoire e 12 minute, nu 5. O conexiune ține ~10 minute (`goAway`); cu 5 minute un jeton ar putea expira între două reconectări.

### De verificat pe API-ul real (Alex, după ce serverul e lansat cu `GEMINI_API_KEY`)

Deschide `docs/probe-jeton-live.html` (aceeași origine ca PWA-ul, deci adresa și secretul se completează singure) și apasă „Rulează proba”. Rezultatele care contează:

1. **A** (jetonul deschide o sesiune pe `BidiGenerateContentConstrained` cu `gemini-3.8-live`): dacă pică, tichetul se oprește aici.
2. **B** (reluare cu același jeton): documentată; ar trebui să meargă.
3. **C** (reluare cu alt jeton și handle vechi): nedocumentată. Trei rezultate, toate acoperite de cod: acceptată cu context (nu se întâmplă nimic), acceptată fără context (modelul a uitat; se retrimite poziția doar dacă Gemini refuză, altfel lecția continuă fără recapitulare) sau refuzată (repornire curată + `recap`).
4. **D** (sesiune nouă, fără handle, cu un jeton nou).

Lipite rezultatele aici. Rămân neverificate pe real: formatul exact al erorii Gemini la un jeton expirat sau la un handle străin (regexul din `closeInfo` e o presupunere), `newSessionExpireTime` de 2 minute la reluare, și CORS-ul `POST /live-token` de pe `alexxgalea.github.io` (preflight cu `authorization`; șablonul îl permite).
