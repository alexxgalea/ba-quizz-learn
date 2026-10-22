# Jarvis: intervievator vocal nativ (design)

Data: 2026-10-22. Autor: Claude, cu Alex. Stare: aprobat pe secțiuni în chat. Proba de 10 minute a fost rulată pe telefonul lui Alex, iar rezultatele sunt fixate în §11.

## 1. Scop

Alex vrea un dialog vorbit, nativ, cu un intervievator AI, care să se simtă ca discuția dintre Tony Stark și Jarvis. Îl folosește pe telefon (Android), în română, pentru proba tehnică Onapsis (data implicită: luni, 26 octombrie 2026) și după aceea.

**Livrarea (decizia „c”):** o versiune minimă, folosibilă înainte de luni, care e și prima felie din aplicația pe termen lung. Nu e un prototip de aruncat.

**Priorități, în ordinea dată de Alex:**
1. **(a) Voce naturală**: nu sintetizatorul robotic.
2. **(d) Mâini libere**: de la „Începe” până la final nu atinge telefonul.
3. **(e) Personalitate**: Jarvis.

Pe deasupra: răspuns rapid (b) și posibilitatea de a-l întrerupe (c), pentru că furnizorul ales le oferă gratuit.

**Criterii de succes:**
- Alex face o sesiune completă de antrenament pe telefon, vorbind în română, fără să atingă ecranul după „Începe”.
- Jarvis pune întrebarea, întreabă mai departe, dă verdictul și trece la cardul următor.
- Alex îl poate întrerupe, iar Jarvis tace imediat.
- Rezultatele intră în același model de progres (Leitner, goluri, plan) ca restul aplicației.

## 2. Decizii luate

| Decizie | Alegere | Motiv |
|---|---|---|
| Furnizor de voce | Gemini Live API, nivelul gratuit | Singura variantă gratuită cu voce nativă, întreruperi și detectarea vorbirii integrate. Româna e suportată. Alex acceptă că pe nivelul gratuit Google poate folosi conversațiile. |
| Unde stă progresul | Aplicația nouă devine cea principală | Progresul se mută o dată (Export din artifact → Import). Sincronizarea vine după interviu. |
| Găzduire și cheie | Fără server până după interviu | PWA pe GitHub Pages. Cheia Gemini stă doar în `localStorage`-ul telefonului, ca azi cheia DeepSeek. |
| Ce poate face vocea | Interviu + comenzi | Jarvis conduce interviul; Alex îl dirijează prin voce (funcții ale aplicației). |
| Persona | Jarvis | Politicos și sec, îi spune „Alex”, umor discret, exigent pe conținut. Ton neutru în „Interviu tehnic simulat”. |
| Abordare | A: aceeași aplicație, cu „modul Jarvis” | Un singur cod, refolosește conținutul și progresul. Variantele B (aplicație separată) și C (Android nativ de la început) au fost respinse pentru acum. |

## 3. Fapte verificate (surse primare, 2026-10-22)

**Artifactul nu poate găzdui vocea:**
- Capabilitatea `sample` primește și întoarce doar text (plus imagini).
- Contractul de runtime 0.2.87 nu are capabilitate pentru microfon.
- CSP-ul artifactului blochează conexiunile către alte hosturi.

**Gemini Live:**
- **Nivelul gratuit e disponibil și în UE.** FAQ-ul de billing: „Yes, we make the free tier and paid tier available in many regions.” (https://ai.google.dev/gemini-api/docs/billing)
- **Prețuri.** `gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.1-flash-live-preview` și `gemini-2.5-flash-native-audio-preview-12-2025` sunt „Free of charge” pe nivelul gratuit, iar datele de acolo pot fi folosite de Google. Plătit: audio intrat 0,005 $/min, audio ieșit 0,018 $/min la 3.8. (https://ai.google.dev/gemini-api/docs/pricing)
- **Modelul implicit.** `gemini-3.8-live` e „New Stable”, „Default Live API model for most low-latency voice agent experiences”. `gemini-3.1-flash-live-preview` e marcat legacy. (https://ai.google.dev/gemini-api/docs/models)
- **Live guide** (https://ai.google.dev/gemini-api/docs/live-guide):
  - Româna (`ro`) e printre cele 99 de limbi. Limba nu se setează explicit; se restrânge din instrucțiunile de sistem.
  - Detectarea vorbirii (VAD) e automată, cu pragul de liniște implicit „approximately 800ms”, configurabil prin `realtimeInputConfig.automaticActivityDetection.silenceDurationMs`.
  - La întrerupere, generarea e anulată, iar serverul trimite `interrupted`; clientul oprește redarea și golește coada.
  - Intrare: „raw 16-bit PCM audio, 16kHz, little-endian”, `audio/pcm;rate=16000`. Ieșire: „always uses a sample rate of 24kHz”.
  - Textul se poate trimite în timpul sesiunii (`sendRealtimeInput`).
  - Sesiunile doar audio au 15 minute; vocea se alege prin `speechConfig`.
- **Sesiuni lungi.** Reluarea se face prin `sessionResumption`; token-urile de reluare sunt valabile 2 ore după terminarea sesiunii. `contextWindowCompression` permite sesiuni nelimitate, iar `GoAway` anunță închiderea, cu `timeLeft`. (https://ai.google.dev/gemini-api/docs/live-session)
- **Apelarea funcțiilor.** Tabelul de suport acoperă doar 3.1 Flash Live Preview (doar sincron) și 2.5 Flash Live Preview (sincron și asincron). Pentru `gemini-3.8-live` nu e confirmată în documentație, dar proba din §11 a arătat că o apelează. Clientul trimite răspunsurile manual (`sendToolResponse`). (https://ai.google.dev/gemini-api/docs/live-tools)
- **Transcrierea.** Câmpurile `inputAudioTranscription` / `outputAudioTranscription` apar în configurații. Proba din §11 a arătat că `gemini-3.8-live` le trimite.
- **Token-urile temporare** (pentru după interviu): le emite un backend cu cheia API; expiră implicit după 30 de minute, cu 1 minut pentru a porni sesiunea. Se pot lega de model și configurație. (https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- **Modele text gratuite** (pentru funcțiile AI în afara artifactului): `gemini-3.8-flash` („most intelligent Flash”) și `gemini-3.5-flash-lite` („cost-efficient”), ambele „Free of charge”.
- **Limitele nivelului gratuit pentru Live nu sunt publicate.** Le vezi în AI Studio, pe proiect. (https://ai.google.dev/gemini-api/docs/rate-limits)

**Alternativa self-hosted, respinsă:**
- Pipecat sau LiveKit Agents, cu faster-whisper, ar cere un GPU pentru latență mică.
- Piper are o singură voce românească (`mihai`, „medium”), deci ar încălca prioritatea (a).

## 4. Arhitectura

Aceeași sursă (`src/`), același build. Patru module noi, fiecare cu un singur rol și o interfață mică:

```text
telefon (Chrome / PWA)
  jarvis.js  ── regizorul sesiunii, ecranul Jarvis
    │  folosește
    ├─ live.js   ── WebSocket Gemini Live (protocol, reluare)
    ├─ audio.js  ── microfon 16 kHz, redare 24 kHz, wake lock
    └─ PrepApp   ── API-ul mic expus de app.js
  app.js ── progres, carduri, scor, goluri, aiText(...)
```

### 4.1 `src/live.js`: clientul Gemini Live

Interfață:
- `connect({ key, model, system, tools, voice, silenceMs, resumeHandle })` → `session`.
- Evenimente: `audio(pcm24)`, `transcript(role, text)` (dacă e disponibilă), `toolCall(calls)`, `interrupted()`, `turnComplete()`, `goAway(timeLeft)`, `resumeHandle(h)`, `error(code)`, `closed()`.
- Metode: `sendAudio(pcm16)`, `sendText(text)`, `sendToolResponse(responses)`, `close()`.

Ascunde:
- protocolul WebSocket (`v1beta`);
- configurarea VAD: doar `silenceDurationMs`; `prefixPaddingMs`, `startOfSpeechSensitivity` și `activityHandling` nu se trimit (§11);
- `sessionResumption` și `contextWindowCompression`;
- reconectarea la `GoAway` folosind ultimul handle de reluare.

### 4.2 `src/audio.js`: microfon și difuzor

Interfață:
- `listMics()`; `startMic({ deviceId?, onFrame(pcm16), onLevel(x) })` / `stopMic()`; `micLabel()` (dispozitivul activ);
- `play(pcm24)`, `flush()`, `level()` (pentru animație);
- `halfDuplex(on)` (opțional, implicit oprit);
- `wake(on)`.

Detalii:
- `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } })`.
- Un `AudioWorklet` face downsampling la 16 kHz și conversia Float32 → Int16. Bucățile au ~40 ms.
- Redarea dintr-o coadă la 24 kHz; `flush()` oprește instantaneu tot ce e programat.
- `halfDuplex(true)` nu trimite cadre de microfon cât se redă audio (modul „întrerupere doar cu căști”, pentru un difuzor care produce ecou).
- Cadrele se numără ca trimise doar dacă socketul e deschis.
- `wake(true)` cere `navigator.wakeLock` și îl reia la `visibilitychange`.

### 4.3 `src/jarvis.js`: regizorul sesiunii

Interfață: `Jarvis.start({ mode, module })`, `pause()`, `resume()`, `stop()`, `typeInstead(text)`, `interrupt()` (golește redarea și trimite textul „Stai.”; proba a arătat că serverul răspunde cu `interrupted` în aceeași secundă).

Stări: `idle → connecting → listening ⇄ speaking / thinking → paused → ended`.

**Construiește instrucțiunile de sistem:**
- persona;
- modul (antrenament, simulat, temă);
- profilul lui Alex (`IV_PROFILE`);
- regulile de stil: o întrebare pe tură, replici scurte, termenii tehnici în engleză, fără să dezvăluie punctele cheie înainte de verdict.

Regulile pe card (`ivRules`) și memoria cardului vin în răspunsul la `next_card`, nu în instrucțiuni, ca să se schimbe de la un card la altul.

**Funcțiile oferite modelului:**

| Funcție | Ce face în aplicație | Ce întoarce modelului |
|---|---|---|
| `next_card({ mode?, module?, difficulty? })` | Alege cardul (antrenament: scadente, goluri și `wO`; simulat: sloturile `pickTechMock`; temă: modulul). Afișează întrebarea și codul. | `card_id`, întrebarea, codul, punctele cheie, modelul de răspuns, `ivRules(card)` (maximum de întrebări, reguli de design sau snippet), ce a ratat data trecută |
| `record_result({ card_id, points[], wrong[], feedback })` | Validează (`points` are exact `k.length` valori din `spontan` / `dupa` / `nu`) și salvează prin aceeași funcție ca intervievatorul scris | Scorul, comparația cu data trecută, textul punctelor ratate; sau o eroare de validare |
| `skip_card()` | Trece la următorul card, fără scor | Confirmare |
| `explain_missed({ card_id })` | Doar în antrenament: teoria golurilor (aceleași surse ca `gapTheory`) | Text scurt, din care Jarvis explică |
| `progress_summary()` | Pregătirea, golurile principale, zilele rămase | Text scurt |
| `pause_session()` | Oprește microfonul; se reia cu un tap | Confirmare |
| `end_session()` | Închide sesiunea și arată rezumatul | Rezultatele pe carduri |

„Repetă” și „nu știu” le tratează modelul singur.

**Interfața (API-ul) `PrepApp` din `app.js`.** E expusă pe `window`, ca `jarvis.js` (alt fișier, altă IIFE) să o poată folosi:
- `pickCard(opts)`, `cardPayload(id)`;
- `recordOral(id, verdict)`: funcție comună, scoasă din `oralSave`, folosită și de intervievatorul scris;
- `gapSummary()`, `progressSummary()`, `theoryFor(id)`;
- `aiText(prompt, tier)`;
- `settings()`.

## 5. Sesiunea

- **Moduri:**
  - Antrenament: feedback după fiecare card și ofertă de explicație.
  - Interviu tehnic simulat: 6 sloturi, ton neutru, fără feedback până la final.
  - Pe o temă: modulul ales pe ecran sau prin voce.
- **Pornirea:** un singur tap pe „Începe”, pentru politica de autoplay și microfon. Salutul folosește `gapSummary()`.
- **Bucla:**
  1. `next_card`.
  2. Întrebarea, cu vorbele lui Jarvis.
  3. Răspunsul lui Alex. Tura se închide după pragul de liniște.
  4. Cel mult `ivRules(card).max` întrebări de continuare (2; la design 3), pe punctele lipsă, fără indicii.
  5. `record_result`, salvat imediat.
  6. În antrenament: feedback în 1–2 propoziții. Din pasul 4 al livrării, și „vrei să-ți explic ce ai ratat?” (`explain_missed`).
- **Scorul:** spontan = 1, `dupa` = 0,5, `nu` = 0, prin `recordOral`, adică aceeași logică de Leitner, `mc`, `m` și `w` ca acum. Nu se mai confirmă bifele de mână (prioritatea „mâini libere”); un scor contestat se rezolvă refăcând cardul.
- **Sfârșitul:** rezumat vorbit, de 2–3 propoziții, plus ecranul de rezultate pe carduri. În `S.h` intră un singur rând, cu `kind: "jarvis"` (afișat în istoric ca „Jarvis”). Transcrierea nu se salvează.

**Persona** (rezumatul instrucțiunilor):
- E Jarvis și i se adresează lui Alex pe nume.
- E politicos și sec, cu cel mult o remarcă scurtă între carduri.
- E exigent pe conținut: nu acceptă răspunsuri vagi și cere concret („cum ai face asta în producție?”).
- Vorbește în română, cu termenii tehnici în engleză.
- În modul simulat: ton neutru, fără glume, fără explicații.

## 6. Audio și ecranul Jarvis

- **Pragul de liniște** e setarea „Răbdare”: scurtă 0,8 s, normală 1,2 s (implicit), lungă 2 s. Se aplică la pornirea sesiunii (`silenceDurationMs`).
- **Difuzor sau căști:**
  - Pe difuzor, cu anularea ecoului și reducerea zgomotului din Chrome (implicit), întreruperea merge și nu apar auto-întreruperi (§11). Full-duplex e implicit.
  - Setarea manuală „Întrerupere doar cu căști” activează `halfDuplex`, pentru un telefon al cărui difuzor produce ecou.
  - **Selector de microfon** în Progres › Jarvis. Pe Android, microfonul căștilor Bluetooth poate da tăcere (nivel 0,000) la prima pornire.
  - **„Nu te aud”:** dacă nivelul microfonului rămâne sub 0,002 timp de 4 secunde cât ascultă, ecranul spune asta și oferă selectorul și „Repornește microfonul”.
- **Ieșirea din aplicație sau ecranul stins:** pauză, apoi reluare prin handle-ul de reluare.
- **Ecranul**, la 360 px, în light și dark, doar cu tokenii de culoare existenți:
  - sus: cardul și codul (format compact, 11 px);
  - în centru: un cerc animat care reflectă starea și nivelul vocii (fără animație la `prefers-reduced-motion`);
  - transcrierea ultimelor replici, care se poate ascunde;
  - butoanele „Stai” (`interrupt()`), „Pauză / Reia”, „Stop”, „Scriu în loc să vorbesc”;
  - contorul cardurilor și timpul;
  - o vibrație scurtă la schimbarea turei.

## 7. Platformă, cheie, progres

- **Build.** `build.mjs` scrie, pe lângă `dist/pregatire-onapsis.html` (artifactul, neschimbat ca rol):
  - `dist/index.html` (PWA);
  - `dist/manifest.webmanifest`, `dist/sw.js`, iconițe.

  Service worker-ul cache-uiește aplicația; cererile către API-uri merg mereu pe rețea.
- **Publicarea.** `.github/workflows/deploy-pages.yml` publică `dist/` pe GitHub Pages la push pe `main`.
- **Pașii lui Alex, o singură dată:**
  - Settings › Pages › Source: GitHub Actions;
  - aprobarea PR-ului ramurii de lucru în `main`;
  - pe Android, „Adaugă pe ecranul principal”.
- **Cheia.** Progres › Jarvis: cheia Gemini în `localStorage` (`onapsis-gemini-v1`), mascată, cu „Testează”. Nu intră în `S`, în export sau în brief. Nota de confidențialitate a nivelului gratuit e afișată acolo.
- **Mutarea progresului:** o singură dată, cu Exportul din artifact și Importul în PWA (funcțiile existente, cu îmbinare pe item).
- **Funcțiile AI în afara artifactului:**
  - Adaptorul `aiText(prompt, tier)` alege: `sample` în artifact, Gemini text în PWA (`quick` → `gemini-3.5-flash-lite`, `default` → `gemini-3.8-flash`), apoi DeepSeek ca rezervă.
  - `sampleText` și `sampleGrade` trec prin adaptor; prompturile și parserele rămân aceleași.
- **În artifact,** tab-ul Jarvis arată doar „Jarvis merge în aplicația de pe telefon”, plus linkul.

## 8. Erori

| Situație | Comportament |
|---|---|
| Fără cheie | Ecranul Jarvis arată pașii de configurare |
| Microfon refuzat | Mesaj clar; conversația continuă cu „Scriu în loc să vorbesc” |
| Microfon mut (nivel sub 0,002 timp de 4 s) | „Nu te aud”: selectorul de microfon și „Repornește microfonul” |
| 429 / limita gratuită / server indisponibil | Sesiunea se oprește cu mesaj; cardurile terminate sunt deja salvate |
| Limita de 15 minute sau rețea căzută | Reluare automată cu handle-ul; dacă eșuează, sesiunea se închide cu rezumatul de până atunci |
| `record_result` invalid | Răspuns de eroare către model; după a doua încercare greșită, cardul rămâne neînregistrat și se trece mai departe |
| Ieșirea din aplicație | Pauză și reluare la întoarcere |

## 9. Testare

**Înlocuitori falși la fiecare legătură cu exteriorul** (fiecare are două adaptoare, deci legătura e reală):
- `FakeLive`: scenarii de evenimente de la server;
- `FakeAudio`: cadre de liniște; reține ce s-a redat și apelurile `flush`;
- un răspuns fals pentru `aiText`.

**Teste pure:** conversia Float32 → Int16 la 16 kHz, construcția instrucțiunilor, declarațiile funcțiilor, validarea verdictului.

**`tools/test_jarvis.py`** (Playwright, la 360 px, light și dark), verifică:
- pornirea;
- că punctele cheie nu apar niciodată pe ecran;
- `record_result`, valid și invalid;
- golirea cozii la `interrupted`;
- că modul simulat nu dă feedback între carduri;
- comenzile;
- reluarea după `GoAway`;
- 429, lipsa cheii, microfonul refuzat;
- că nu apar erori de consolă.

**Suita existentă** trebuie să treacă pe artifact, iar un test scurt verifică PWA-ul (manifest și înregistrarea service worker-ului).

**Pe telefon, doar Alex poate testa:** proba și câte o sesiune completă, cu căști și pe difuzor.

## 10. Livrarea (fiecare pas e testat, publicat și urmat de un mesaj către Alex)

| Pas | Conținut | Gata când |
|---|---|---|
| 1 | PWA + GitHub Pages + setarea cheii + `probe.html` (de aruncat) | Pagina se instalează pe Android; proba răspunde la cele patru întrebări din §11 |
| 2 | `aiText` cu Gemini text + mutarea progresului | Verificarea și intervievatorul scris merg în PWA; progresul importat apare corect |
| 3 | Jarvis v1: antrenament, bucla, `record_result`, scorul, ecranul (cu „Stai”, selectorul de microfon și „Nu te aud”), comenzile de bază (`next_card`, `skip_card`, `pause_session`, `end_session`) | O sesiune de antrenament completă, fără atingeri, cu rezultatele în Leitner și goluri |
| 4 | Jarvis v2: simulat (ton neutru), `progress_summary`, `explain_missed`, parametrii `difficulty` / `module` ai lui `next_card` („mai greu”, „schimbă tema”), „Răbdare”, „Întrerupere doar cu căști” | Un interviu tehnic simulat complet, cu rezumatul de final |

Ținta: pașii 1–3 până luni, pasul 4 dacă e timp.

## 11. Rezultatul probei (pasul 1) și ce rezultă

Rulată pe telefonul lui Alex (Android, Chrome), pe 22 octombrie 2026, cu pagina `docs/prototype-jarvis-probe.html` (de aruncat), vocea Charon, în trei runde.

| # | Întrebare | Rezultat | Decizie |
|---|---|---|---|
| 1 | `gemini-3.8-live` apelează funcții? | **Da.** A apelat `next_card` și `record_result`, cu `points` ca listă de 4 valori. `gemini-2.5-flash-native-audio-preview-12-2025` le-a apelat și el, dar a fost „extrem de lent” și a blocat conducta după primul răspuns. | Folosim `gemini-3.8-live`. Planul de rezervă cu 2.5 cade. |
| 2 | Vin evenimentele de transcriere? | **Da**, pentru ambele sensuri (`inputTranscription`, `outputTranscription`). | Ecranul arată transcrierea. |
| 3 | Merge întreruperea pe difuzor? | **Da.** Cu anularea ecoului și reducerea zgomotului pornite: 15 s de tăcere cât vorbea Jarvis, zero auto-întreruperi (nivelul microfonului 0,011, față de ~0,5 când vorbește Alex). Alex l-a întrerupt de mai multe ori vorbind peste el, iar serverul a trimis `interrupted`. Textul „Stai.” a produs `interrupted` în aceeași secundă. | Full-duplex implicit. `halfDuplex` rămâne opțiune. Butonul „Stai” intră în v1. |
| 4 | Voce și latență | Vocea sună **natural**. Latența mediană: ~1,3–1,4 s după ultima vorbă, din care 1,2 s e pragul de liniște, deci modelul adaugă ~0,1–0,2 s. | Furnizorul rămâne. „Răbdare” 0,8 s dă ~1 s în total; 1,2 s rămâne implicit, ca să nu-l întrerupă când gândește. |

**Constatări care schimbă designul:**
- **Microfonul căștilor.** Cu căști Bluetooth, microfonul a dat tăcere (0,000) la prima pornire; după „Repornește microfonul” a dat nivel normal (maxim 0,393) și serverul a întrerupt. Chrome a listat doar `Default`, `Speakerphone` și `Headset earpiece`. Rezultat: selector de microfon și mesajul „Nu te aud” (§6, §8).
- **Setări VAD în plus.** Cu `prefixPaddingMs: 20`, `startOfSpeechSensitivity: START_SENSITIVITY_HIGH` și `activityHandling` în setup, sesiunea n-a mai răspuns deloc (probabil setup respins; jurnalul n-a arătat codul de închidere). Nu le trimitem. Doar `silenceDurationMs` e verificat: setup-ul a fost acceptat, iar latența urmărește pragul.
- **Oprirea locală** (aplicația golește redarea când aude vorbire) n-a fost necesară și n-a fost exersată. Rămâne în afara scopului.
- **Conexiunea.** Setup-ul durează ~0,5 s. O singură „eroare WebSocket” în toate rundele; tratamentul rămâne cel din §8.
- **Limite ale probei.** Nu avem un test curat al căștilor pe fereastra de întrerupere, și nici o sesiune lungă (15 minute). Le verifică Alex în folosire.

## 12. În afara scopului (sub-proiecte separate, după interviu)

- Backend-ul (FastAPI) cu token-uri temporare și sincronizarea progresului; atunci se poate opri artifactul.
- Aplicația Android nativă (Capacitor) pentru audio nativ.
- Cuvântul de trezire „Jarvis”.
- Salvarea transcrierilor; editarea manuală a verdictului; iOS.
