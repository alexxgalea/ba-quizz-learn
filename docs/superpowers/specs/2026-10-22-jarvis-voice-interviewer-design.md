# Jarvis: intervievator vocal nativ (design)

Data: 2026-10-22. Autor: Claude, cu Alex. Stare: aprobat pe secțiuni în chat. Proba de 10 minute a fost rulată pe telefonul lui Alex (rezultatele în §11), iar interfețele modulelor sunt fixate în §4.

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
- **Apelarea funcțiilor.** Tabelul de suport acoperă doar 3.1 Flash Live Preview (doar sincron) și 2.5 Flash Live Preview (sincron și asincron). Pentru `gemini-3.8-live` nu e confirmată în documentație, dar proba din §11 a arătat că o apelează. Clientul trimite răspunsurile manual; `GeminiLive` o face din funcția `run` a fiecărei unelte (§4.1). (https://ai.google.dev/gemini-api/docs/live-tools)
- **Transcrierea.** Câmpurile `inputAudioTranscription` / `outputAudioTranscription` apar în configurații. Proba din §11 a arătat că `gemini-3.8-live` le trimite.
- **Token-urile temporare** (pentru după interviu): le emite un backend cu cheia API; expiră implicit după 30 de minute, cu 1 minut pentru a porni sesiunea. Se pot lega de model și configurație. (https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
- **Modele text gratuite** (pentru funcțiile AI în afara artifactului): `gemini-3.8-flash` („most intelligent Flash”) și `gemini-3.5-flash-lite` („cost-efficient”), ambele „Free of charge”.
- **Limitele nivelului gratuit pentru Live nu sunt publicate.** Le vezi în AI Studio, pe proiect. (https://ai.google.dev/gemini-api/docs/rate-limits)

**Alternativa self-hosted, respinsă:**
- Pipecat sau LiveKit Agents, cu faster-whisper, ar cere un GPU pentru latență mică.
- Piper are o singură voce românească (`mihai`, „medium”), deci ar încălca prioritatea (a).

## 4. Arhitectura

Vocabularul vine din skillul `codebase-design`. **Modul** = orice are interfață și implementare. **Interfață** = tot ce trebuie să știe cine îl folosește: semnături, ordine, invarianți, erori. **Cusătură** (seam) = locul unde stă interfața și unde poți schimba comportamentul fără să editezi acolo. **Adaptor** = ce satisface interfața la o cusătură. O cusătură e reală doar când are două adaptoare (producție și test).

Trei cusături reale, fiecare cu un adaptor de producție și unul fals:

| Cusătura | Adaptor de producție | Adaptor de test | Categorie |
|---|---|---|---|
| `Live` (serverul vocal) | `GeminiLive` (`src/live.js`) | `FakeLive` | extern, al unui terț |
| `Audio` (microfon, difuzor) | `BrowserAudio` (`src/audio.js`) | `FakeAudio` | local, specific browserului |
| `PrepApp` (conținut și progres) | `app.js` | un stub în memorie | în proces |

Pe deasupra, două module fără cusătură proprie: `Call` (`src/call.js`) și `Jarvis` (`src/jarvis.js`). Testele lor trec prin interfețele lor, peste adaptoarele false.

```text
app.js ── vJarvis (doar vedere, citește getState())
  │
jarvis.js ── Jarvis: sesiunea (moduri, persona, funcții, scor, rezumat)
  │ folosește
call.js ── Call: apelul vocal (stări, transcriere, întrerupere, microfon mut)
  ├─ Live      ── GeminiLive   | FakeLive
  └─ Audio     ── BrowserAudio | FakeAudio
Jarvis folosește și PrepApp ── app.js | stub
```

**Formatul fișierelor.** Fiecare `src/*.js` nou merge în două medii: în pagină (concatenat înaintea lui `app.js`, ca declarații globale) și în Node (`module.exports`, pentru testele de unitate). Nu are importuri între fișiere: dependențele se primesc ca parametri.

### 4.1 `Live`: serverul vocal (`src/live.js`, adaptor `GeminiLive`)

```text
GeminiLive.open(cfg, onEvent) → Promise<Session>
  cfg = { key, model, voice, silenceMs, system,
          tools: [{ name, description, parameters, run(args) → Promise<object> }] }
  Session = { audio(pcm16), text(str), close() }
```

Evenimentele (`onEvent(e)`, după `e.type`):

| Tip | Conținut |
|---|---|
| `audio` | `{ pcm }`: `Int16Array`, 24 kHz |
| `interrupted` | serverul a oprit generarea |
| `turnComplete` | tura modelului s-a încheiat |
| `transcript` | `{ who: "me" \| "model", text }`: o bucată nouă |
| `tool` | `{ name, args, result }` sau `{ name, args, error }`, după ce răspunsul a plecat |
| `reconnecting`, `live` | reluare după `GoAway` sau cădere |
| `closed` | `{ reason: "user" \| "auth" \| "quota" \| "rejected" \| "network", code, detail }` |

Invarianți și erori:
- `open` se rezolvă după `setupComplete` și se respinge cu un `closed`-reason (`auth`, `quota`, `rejected`, `network`).
- `audio(pcm16)` primește `Int16Array`, 16 kHz, și întoarce `true` doar dacă a plecat. În timpul unei reluări e ignorat (`false`). La fel `text`.
- `run` e apelat o dată pe apel de funcție, în ordinea sosirii. O excepție devine `{ error }` către model. Dacă serverul anulează apelul (`toolCallCancellation`), rezultatul se aruncă.
- Reluarea: doar dacă a primit un handle; până la 3 încercări (0,5 / 1 / 2 s). Altfel `closed` cu `network`.
- După `closed`, nimic nu mai emite evenimente.

Ascunde: URL-ul și cheia, mesajul de setup (din VAD, doar `silenceDurationMs`; restul câmpurilor de VAD nu se trimit, fiindcă nu avem nevoie de ele), Base64, mesajele primite ca `Blob`, id-urile apelurilor de funcții, `sessionResumption` și `contextWindowCompression`, `GoAway`, maparea codurilor de închidere pe motive.

Cusătură internă (nu face parte din interfață): `GeminiLive.create({ WebSocket })`, cu `FakeSocket` în testele lui.

### 4.2 `Audio`: microfon și difuzor (`src/audio.js`, adaptor `BrowserAudio`)

```text
audio.start({ micId?, onFrame(pcm16), onLevel(rms), onPlaying(bool) }) → Promise<{ label }>
audio.stop()
audio.play(pcm24)         // în coadă, fără goluri
audio.flush()             // oprește imediat tot ce e programat
audio.mics() → Promise<[{ id, label }]>
```

Invarianți și erori:
- `start` se cheamă dintr-un gest al utilizatorului (politica de autoplay). Se respinge cu `denied`, `no-mic` sau `failed`.
- `onFrame` primește cadre de ~40 ms, `Int16Array`, 16 kHz, indiferent de rata dispozitivului.
- `onPlaying(true)` la primul fragment după tăcere; `onPlaying(false)` când coada s-a golit sau după `flush()`, nu la `turnComplete`.
- `stop` e idempotent. `play` după `stop` nu face nimic.

Ascunde: `getUserMedia` cu anularea ecoului, reducerea zgomotului și AGC pornite; `AudioWorklet` încărcat dintr-un Blob, o singură dată; downsampling de la orice rată la 16 kHz și conversia Float32 → Int16; programarea redării la 24 kHz; `wakeLock`, reluat la `visibilitychange`; măsurarea nivelului.

### 4.3 `Call`: apelul vocal (`src/call.js`)

```text
Call.start({ live, audio, config, micId?, halfDuplex?, clock?, onEvent }) → Promise<call>
  config = cfg-ul lui Live (cheie, model, voce, silenceMs, system, tools)
call.pause() · call.resume() · call.interrupt() · call.say(text) · call.end()
```

Evenimentele: `state` (`listening` | `speaking` | `thinking` | `paused` | `ended`), `transcript` (`{ who, text }`, cumulat pe tură, înlocuit pe loc), `level` (`{ v }`), `warn` (`mic-silent` | `reconnecting` | `null`), `tool`, `ended` (`{ reason }`).

Reguli:
- `interrupted` de la Live: `audio.flush()` imediat, starea trece în `listening`.
- `interrupt()`: `audio.flush()` și `live.text("Stai.")`.
- `speaking` cât se redă audio; revine în `listening` când redarea s-a golit și tura s-a încheiat sau după `flush`.
- `thinking`: de la sfârșitul vocii lui Alex (nivelul sub prag), sau cât rulează o funcție, până la primul audio.
- `halfDuplex`: niciun cadru către Live cât `onPlaying` e adevărat.
- `pause`: cadrele nu mai pleacă și redarea se golește; microfonul rămâne deschis. `resume` revine în `listening`.
- `mic-silent`: nivelul practic zero (sub 0,0005) timp de 4 s cât e `listening`; se șterge la primul cadru cu semnal. O cameră liniștită, dar cu semnal, nu declanșează avertismentul.
- Pornirea: `audio.start` și `live.open` în paralel; dacă una cade, cealaltă se închide. `start` se respinge cu motivul (`denied`, `no-mic`, `auth`, `quota`, `rejected`, `network`).
- `end()` închide Live și Audio și emite `ended`. Un `closed` neașteptat de la Live emite `ended` cu motivul.

Ascunde: legarea cadrelor microfonului de Live și a audio-ului de la Live de redare, mașina de stări, asamblarea transcrierii pe tură, detectarea microfonului mut, gestul de pauză.

### 4.4 `Jarvis`: sesiunea (`src/jarvis.js`)

```text
Jarvis.create({ app, live, audio, storage?, clock?, onChange }) → jarvis
jarvis.start({ mode, module? }) → Promise      // mode: "train" | "mock" | "topic"
jarvis.pause() · resume() · stop() · interrupt() · say(text)
jarvis.getState() → { phase, card, transcript, level, warn, error, results, startedAt, needKey }
jarvis.settings.get() / .set(patch)            // { key, voice, patience, halfDuplex, micId }
jarvis.mics() → [{ id, label }]
jarvis.checkKey() → { ok, reason? }
```

`getState()` întoarce date simple, iar `onChange` anunță schimbarea; ecranul din `app.js` doar le desenează.

Construiește instrucțiunile de sistem (funcție pură, exportată pentru teste):
- persona;
- modul (antrenament, simulat, temă);
- profilul lui Alex (`IV_PROFILE`);
- regulile de stil: o întrebare pe tură, replici scurte, termenii tehnici în engleză, fără să dezvăluie punctele cheie înainte de verdict.

Regulile pe card (`ivRules`) și memoria cardului vin în răspunsul la `next_card`, nu în instrucțiuni, ca să se schimbe de la un card la altul.

**Funcțiile oferite modelului** (declarate aici, rulate peste `PrepApp`):

| Funcție | Ce face în aplicație | Ce întoarce modelului |
|---|---|---|
| `next_card({ module?, difficulty? })` | `app.next(...)`. Afișează întrebarea și codul. | `card_id`, întrebarea, codul, punctele cheie, modelul de răspuns, `rules` (maximum de întrebări, reguli de design sau snippet), ce a ratat data trecută; sau „nu mai sunt carduri” |
| `record_result({ card_id, points[], wrong[], feedback })` | `app.record(...)` | Scorul, comparația cu data trecută, textul punctelor ratate; sau o eroare de validare |
| `skip_card()` | Trece la următorul card, fără scor | Confirmare |
| `explain_missed({ card_id })` | `app.theory(id)`, doar în antrenament | Text scurt, din care Jarvis explică |
| `progress_summary()` | `app.summary()` | Text scurt |
| `pause_session()` | `call.pause()` | Confirmare |
| `end_session()` | `call.end()`, rezumatul | Rezultatele pe carduri |

„Repetă” și „nu știu” le tratează modelul singur.

Ascunde: alegerea și parcurgerea cardurilor, validarea și re-încercarea verdictului (după a doua greșeală cardul rămâne neînregistrat), starea cardului curent, rezumatul de final și rândul din istoric, citirea și scrierea setărilor (cheia în `localStorage` `onapsis-gemini-v1`, restul în `onapsis-jarvis-v1`).

### 4.5 `PrepApp`: conținut și progres (cusătură; implementat în `app.js`)

```text
app.next({ mode, module?, done[], difficulty? }) → card | null
  card = { id, module, q, code?, points[], model, rules: { max, turn, verdict }, missed[], best? }
app.record(id, { points[], wrong?[], feedback? }) → { ok: true, score, prev, box, missed[] } | { ok: false, error }
app.theory(id) → text simplu
app.summary() → { readiness, daysLeft, gaps[] }
app.log({ title, n, c, dur })              // un rând în S.h, cu kind: "jarvis"
```

- `mode: "mock"` urmează sloturile din `pickTechMock`; `done.length` e indexul slotului, iar după al șaselea întoarce `null`. `train` folosește ponderile `wO`; `topic` ia din modulul cerut, tot cu ponderile.
- `record` e logica din `oralSave` scoasă din starea ecranului: `updO`, golurile (`mc`, `m`, `w`), `commit()`. `points` are exact `k.length` valori din `spontan` / `dupa` / `nu`; altfel `{ ok: false }`. `oralSave` o folosește și el.
- Ascunde: ponderile, scadențele Leitner, matematica golurilor, persistența.

### Alternative respinse

- **`toolCall` ca eveniment, cu răspunsul dat de Jarvis.** Id-urile, anulările, erorile și ordinea ar fi ajuns la fiecare apelant. Cu `run` în `cfg`, interfața lui Live e mai mică.
- **`Call` înăuntrul lui `Jarvis`.** Mecanica de timp real (cozi, praguri, stări) s-ar amesteca cu logica sesiunii (carduri, scor). Testul de ștergere: fără `Call`, mecanica ar reapărea în `Jarvis`.
- **`FakeCall`.** Testele lui `Jarvis` trec prin `Call` real, peste `FakeLive` și `FakeAudio`. O cusătură în plus ar fi doar ipotetică.
- **`WebSocket` ca cusătură publică.** Rămâne internă lui `GeminiLive`.

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
- **Scorul:** spontan = 1, `dupa` = 0,5, `nu` = 0, prin `PrepApp.record`, adică aceeași logică de Leitner, `mc`, `m` și `w` ca acum. Nu se mai confirmă bifele de mână (prioritatea „mâini libere”); un scor contestat se rezolvă refăcând cardul.
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
  - **„Nu te aud”:** dacă nivelul microfonului rămâne practic zero (sub 0,0005) timp de 4 secunde cât ascultă, ecranul spune asta și oferă selectorul și „Repornește microfonul”.
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
| Microfon mut (nivel sub 0,0005 timp de 4 s) | „Nu te aud”: selectorul de microfon și „Repornește microfonul” |
| 429 / limita gratuită / server indisponibil | Sesiunea se oprește cu mesaj; cardurile terminate sunt deja salvate |
| Limita de 15 minute sau rețea căzută | Reluare automată cu handle-ul; dacă eșuează, sesiunea se închide cu rezumatul de până atunci |
| `record_result` invalid | Răspuns de eroare către model; după a doua încercare greșită, cardul rămâne neînregistrat și se trece mai departe |
| Ieșirea din aplicație | Pauză și reluare la întoarcere |

## 9. Testare

Testele trec prin interfețele din §4 și descriu comportament, nu implementare. Se scriu pe rând, câte un comportament, cu skillul `tdd`.

**Teste de unitate, în Node** (`node --test tools/unit`, fără dependențe), câte unul pe interfață:
- `live.test.mjs`: `GeminiLive` peste `FakeSocket` (setup acceptat și respins, audio în ambele sensuri, funcții cu `run`, anulări, transcrieri, întrerupere, reluare cu handle, maparea închiderilor);
- `audio.test.mjs`: partea pură (downsampling, conversii, nivelul);
- `call.test.mjs`: `Call` peste `FakeLive` și `FakeAudio`, cu un ceas fals (stările, golirea la `interrupted`, `interrupt()`, `halfDuplex`, pauza, `mic-silent`, pornirea în paralel, închiderea);
- `jarvis.test.mjs`: `Jarvis` peste `Call` real, `FakeLive`, `FakeAudio` și un `PrepApp` stub (funcțiile, validarea verdictului, punctele cheie care nu ajung în stare, modul simulat fără feedback, rezumatul și rândul din istoric).

Înlocuitorii falși stau în `tools/unit/fakes.mjs`. `FakeLive` știe să emită evenimente și să apeleze `run`-urile din `cfg`; `FakeAudio` reține ce s-a redat și câte `flush` au fost; `FakeSocket` simulează `Blob`-uri și coduri de închidere.

**`PrepApp` din `app.js`**, în Playwright, cu `window.__prep`: `record` dă aceeași stare ca `oralSave` pentru același verdict; `next` respectă modurile.

**`tools/test_jarvis.py`** (Playwright, la 360 px, light și dark), cu `FakeLive` și `FakeAudio` injectate înainte de încărcare:
- pornirea și cheia lipsă;
- că punctele cheie nu apar niciodată pe ecran;
- `record_result`, valid și invalid;
- „Stai”, „Pauză”, „Nu te aud”;
- că modul simulat nu dă feedback între carduri;
- reluarea după `GoAway`, 429, microfonul refuzat;
- că nu apar erori de consolă.

**Suita existentă** trebuie să treacă pe artifact, iar un test scurt verifică PWA-ul (manifest și înregistrarea service worker-ului).

**Pe telefon, doar Alex poate testa:** `BrowserAudio` și `GeminiLive` cu serverul real, într-o sesiune completă, cu căști și pe difuzor. Proba din §11 a validat deja protocolul de bază.

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
- **Setările de sesiune.** Un test separat (22 octombrie, pagina de probă, runda 4) a arătat că serverul acceptă pe `gemini-3.8-live` toate cele cinci setup-uri încercate: cel de bază, `sessionResumption`, `contextWindowCompression`, ambele împreună și varianta „VAD sensibil” (`prefixPaddingMs: 20`, `startOfSpeechSensitivity: START_SENSITIVITY_HIGH`, `activityHandling` explicit). Reluarea și compresia din §4.1 se pot folosi. Tăcerea variantei „sensibil” din runda 2 nu venea dintr-un setup respins; cauza rămâne necunoscută (probabil nu mai vorbea nimeni în fereastra de întrerupere). Nu trimitem câmpurile de VAD în plus, fiindcă n-avem nevoie de ele: doar `silenceDurationMs` e verificat și în folosire.
- **Oprirea locală** (aplicația golește redarea când aude vorbire) n-a fost necesară și n-a fost exersată. Rămâne în afara scopului.
- **Conexiunea.** Setup-ul durează ~0,5 s. O singură „eroare WebSocket” în toate rundele; tratamentul rămâne cel din §8.
- **Limite ale probei.** Nu avem un test curat al căștilor pe fereastra de întrerupere, și nici o sesiune lungă (15 minute). Le verifică Alex în folosire.

## 12. În afara scopului (sub-proiecte separate, după interviu)

- Backend-ul (FastAPI) cu token-uri temporare și sincronizarea progresului; atunci se poate opri artifactul.
- Aplicația Android nativă (Capacitor) pentru audio nativ.
- Cuvântul de trezire „Jarvis”.
- Salvarea transcrierilor; editarea manuală a verdictului; iOS.
