# Serverul minim (tichetul 04 al platformei)

FastAPI pe AWS Lambda (cu Lambda Web Adapter), DynamoDB pentru evenimente. Primește evenimentele PWA-ului, le dă înapoi de la un cursor și refuză orice cerere fără secret. Deciziile: `docs/adr/0003` și `0004`; faptele AWS verificate: `research/platforma-facts.md` (secțiunea 7). Spec: `.scratch/platforma/spec.md`.

Serverul nu știe ce e un răspuns la o grilă. Cere doar un `id` pe eveniment și păstrează restul neschimbat. Cutiile, treptele și scadențele le calculează clientul.

## Endpointuri

Toate, afară de `/health`, cer antetul `Authorization: Bearer <secret>`.

| Cerere | Ce face |
|---|---|
| `POST /events` cu `{"events": [{"id": "...", ...}, ...]}` | Păstrează evenimentele noi (1–500 pe cerere, fiecare ≤ 100 KB). Un id deja păstrat se ignoră: primul câștigă. Răspuns: `{"accepted": [ids noi], "duplicates": [ids ignorate], "cursor": n, "epoch": "..."}`. |
| `GET /events?after=<cursor>&limit=<n>` | Întoarce evenimentele cu număr mai mare decât `after` (implicit 0), în ordinea sosirii, cel mult `limit` (implicit 100, maximum 500). Răspuns: `{"events": [...], "cursor": n, "more": bool, "epoch": "..."}`. Clientul repetă cu `after=cursor` cât timp `more` e `true`. |
| `POST /live-token` (fără corp) | Jeton de scurtă durată pentru Gemini Live (tichetul 08). Serverul cere la Gemini un jeton cu `uses: 1`, `expireTime` = acum + 60 de minute și `newSessionExpireTime` = acum + 2 minute. Răspuns: `{"token": "auth_tokens/…", "expireAt": "2026-11-12T19:00:00Z", "expiresIn": 3600}`. Erori: `503 {"detail": {"error": "gemini_key_missing"}}` (serverul n-are `GEMINI_API_KEY`), `502` cu `error` = `gemini_unreachable`, `gemini_error` (plus `upstream_status`) sau `gemini_bad_response`. Cheia Gemini și corpul erorii Google nu ajung niciodată la client. |
| `POST /events/purge` cu `{"confirm": "purge-all-events"}` | Șterge tot jurnalul utilizatorului: evenimentele, contorul și marcajele de idempotență (contorul zilnic al `/ai` rămâne). Fără câmpul `confirm` exact, sau cu alte câmpuri, `422` și nu se șterge nimic; fără secret, `401`. Răspuns: `{"deleted": <câte evenimente>, "epoch": "<epoca nouă>"}`. Numerele de secvență pornesc apoi din nou de la 1. Ruta e POST, nu DELETE, fiindcă CORS-ul funcției permite doar GET și POST. Nu e atomică (evenimentele și marcajele, apoi contorul, apoi epoca). Tichetul 09. |
| `GET /health` | `{"ok": true}`, fără secret. |
| `POST /ai` | Promptul gata făcut al clientului, textul modelului înapoi. Vezi „AI prin server” mai jos. |

Orice altceva fără secret primește `401 {"detail": "unauthorized"}`, la fel pentru secret lipsă, greșit sau neconfigurat (inclusiv cu corp stricat). Documentația automată FastAPI e oprită.

`epoch` (tichetul 09) e un șir care se schimbă la fiecare `POST /events/purge`; `"0"` cât jurnalul n-a fost șters niciodată. Un client care vede altă epocă decât cea păstrată își reia cursorul de la 0 (altfel ar sări peste evenimentele scrise după ștergere, ale căror numere reîncep de la 1). Epoca stă într-un articol `E` din partiția utilizatorului (`v`); lipsa lui înseamnă `"0"`.

Cursorul e un număr 1, 2, 3, ... fără goluri: evenimentele primesc numere în ordinea comiterii, deci un cititor care a ajuns la 6 a văzut și 5.

## Cum e făcut

```
server/
  ba_server/
    main.py        create_app(settings=None, store=None): fabrica aplicației
    config.py      Settings.from_env(): APP_SECRET, TABLE_NAME, USER_PK, LOCAL_CORS_ORIGIN
    auth.py        require_secret: hmac.compare_digest, 401 generic
    deps.py        get_settings, get_store (Depends în rutere)
    store.py       interfața EventStore + MemoryStore (falsul din teste)
    dynamo.py      DynamoStore: un tabel, contor + S#<n> + I#<id>, tranzacții de cel mult 49 de evenimente
    local.py       make_app(): rulare locală pe memorie
    routers/       un modul pe temă: events.py, purge.py, health.py, ai.py, live_token.py
  tests/           pytest, fără cont AWS (moto pentru DynamoDB)
  template.yaml    SAM: funcția, adresa funcției cu CORS, tabelul, jurnalele
  deploy.sh        lansarea cu o comandă
  run.sh           pornit de Lambda Web Adapter: uvicorn --factory
```

**Rutere noi (tichetele 06 `/ai` și 08 `/live-token`).** Un fișier nou în `ba_server/routers/`, cu `router = APIRouter()`. `create_app` îl găsește singur și pune secretul pe fiecare rută a lui; un ruter public declară `PUBLIC = True` (ca `health.py`). Codul evenimentelor nu se atinge. Un ruter își ia depozitul și setările cu `Depends(get_store)` / `Depends(get_settings)`; cheile Gemini și DeepSeek se adaugă în `Settings` (variabile de mediu ale funcției, nu Secrets Manager: costă 0,40 USD pe secret pe lună).

**AI prin server (tichetul 06).** `POST /ai` cu corpul `{"system": "", "user": "...", "kind": "quick" | "default", "json_mode": false, "max_tokens": null, "model": null}` (`user` obligatoriu; `max_tokens` 1–4096, implicit 500 la `quick` și 1500 la `default`; `model` = `"gemini"` sau `"deepseek"`, sursa încercată prima). Răspuns `200`: `{"text": "...", "model": "gemini" | "deepseek"}`. Gemini (`gemini-3.5-flash-lite`, `generateContent`, cheia în antetul `x-goog-api-key`) răspunde întâi; la orice eșec (HTTP, rețea, text gol, blocat) urmează DeepSeek (`deepseek-flash`, `/chat/completions`, `thinking` oprit). `json_mode` cere JSON (`responseMimeType`, respectiv `response_format: json_object`). Erorile au `{"detail": "<cod>"}`:

| Cod HTTP | `detail` | Când |
|---|---|---|
| 401 | `unauthorized` | secret lipsă sau greșit (ca la toate rutele) |
| 413 | `prompt_too_large` | `system` + `user` > `AI_MAX_PROMPT_CHARS` (nu consumă plafonul) |
| 429 | `daily_cap` | plafonul zilnic `AI_DAILY_CAP` e atins (ziua UTC; 0 oprește AI-ul) |
| 502 | `ai_unavailable` | niciun model n-a dat text, sau nu e nicio cheie |
| 422 | (lista FastAPI) | corp invalid (nu consumă plafonul) |

Clientul mapează fiecare cod la un mesaj și lasă calea fără AI (bifele proprii). Plafonul e un articol `AI#<zi>` în același tabel, cu `ADD cnt` condiționat de plafon (atomic), în spatele aceleiași interfețe de depozit (`take_ai_slot`; `MemoryStore` în teste). Fiecare cerere admisă consumă o unitate, chiar dacă modelele pică. Apelurile HTTP trec prin același client injectabil ca `/live-token` (`ba_server/http_client.py`, `Depends(get_http)`; testele pun un fals cu `app.dependency_overrides[get_http]`), deci un singur punct de injectare și un singur fals. Jurnalele spun doar sursa, motivul (`auth`, `rate`, `server`, `empty`, `network`) și mărimea; nu intră chei, secret sau textul promptului. Variabile de mediu: `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` (parametri `NoEcho` ai șablonului; o cheie lipsă înseamnă sursa sărită), `AI_DAILY_CAP` (implicit 300), `AI_MAX_PROMPT_CHARS` (60000), `AI_TIMEOUT_S` (20 pe model; funcția are 60 s), `GEMINI_MODEL`, `DEEPSEEK_MODEL`.

**Datele.** Un tabel DynamoDB, partiția `u#alex` (un singur utilizator, dar cheia permite mai mulți), articole de felurile:

- `N`: contorul (`n` = ultimul număr folosit);
- `S#<n>` (12 cifre, cu zerouri): evenimentul, ca JSON într-un atribut `data` (fără probleme cu numerele zecimale);
- `I#<id>`: marcajul de idempotență, cu numărul evenimentului;
- `E` (doar după prima ștergere): epoca, atributul `v`. `AI#<zi>` e contorul zilnic al `/ai`.

Un lot se scrie într-o singură `TransactWriteItems`: contorul trece de la `n` la `n + k` doar dacă e încă `n`, plus câte un `S#` și un `I#` (cu `attribute_not_exists`) pe eveniment. Dacă alt scriitor a câștigat cursa, tranzacția pică pe condiție și lotul se reia de la citirea contorului. Loturile mari se împart în tranzacții de cel mult 49 de evenimente (limita e 100 de acțiuni) și ~3,5 MB. Tabelul e cu capacitate provizionată, clasa Standard (singura formă din limita gratuită: 25 RCU și 25 WCU pe cont, în regiune). Scrierile tranzacționale consumă dublu, de aceea implicit 15 WCU și 10 RCU.

**CORS.** Se configurează o singură dată, pe adresa funcției (`FunctionUrlConfig.Cors` din `template.yaml`): doar originea `https://alexxgalea.github.io` (fără cale, fără `*`), metodele GET și POST, antetele `authorization` și `content-type`. FastAPI nu pune antete CORS, altfel Lambda le dublează și browserul refuză cererea („multiple values”). `LOCAL_CORS_ORIGIN` pornește CORS în aplicație doar pentru rulare locală.

**Autentificare.** Adresa funcției e `AuthType: NONE`; secretul se verifică în aplicație. Secretul vine din variabila de mediu `APP_SECRET` a funcției (gratuit) și nu stă în repo. Nu se scriu în jurnale secretul și textul lui Alex.

## Teste

```
cd server
make install   # o dată: pip install -r requirements-dev.txt
make test      # sau: python3 -m pytest -q
```

Rulează fără cont AWS. `MemoryStore` și `DynamoStore` (peste moto) trec aceleași teste de contract: același eveniment de două ori (în lot, între loturi, din cereri simultane) se păstrează o dată; cursorul e fără goluri și paginat; reluarea la scriere concurentă; secretul lipsă sau greșit; CORS; forma șablonului SAM (originea PWA-ului, capacitatea provizionată, fără secrete în repo). Moto nu e sigur la fire de execuție, deci testele serializează fiecare apel către el (ca DynamoDB), dar lasă firele să se intercaleze între apeluri.

Rulare locală, pe memorie: `APP_SECRET=$(make -s secret) make run`, apoi `curl -H "Authorization: Bearer ..." localhost:8080/events`.

## Lansarea (pentru Alex)

Se poate face doar după tichetul 03 (contul AWS). Pași, o singură dată:

1. Instalează AWS CLI și SAM CLI și rulează `aws configure` (o cheie de acces a unui utilizator IAM, nu a contului rădăcină), cu regiunea aleasă în tichetul 03. Ai nevoie și de Python 3 cu `pip`.
2. Generează secretul și păstrează-l (managerul de parole): `make secret`. Are cel puțin 32 de caractere. Același secret îl scrii apoi în PWA, pe fiecare dispozitiv.
3. Lansează:

   ```
   cd server
   BA_SECRET='<secretul>' GEMINI_API_KEY='<cheia>' DEEPSEEK_API_KEY='<cheia>' AWS_REGION=<regiunea> make deploy
   ```

   `GEMINI_API_KEY` ajunge variabilă de mediu a funcției (nu stă în repo) și o folosesc `/live-token` (tichetul 08) și `/ai` (tichetul 06); `DEEPSEEK_API_KEY` e rezerva de la `/ai`. La fiecare lansare le dai din nou, iar una lipsă se golește (sursa respectivă se sare). Fără Gemini, `/live-token` răspunde 503 și Jarvis arată un mesaj clar; fără nicio cheie, `/ai` răspunde `502 ai_unavailable`.

   Scriptul construiește pachetul (Linux x86_64, Python 3.14), apoi rulează `sam deploy` și la sfârșit scrie adresa funcției (`https://<id>.lambda-url.<regiune>.on.aws`). Aceeași comandă actualizează serverul; dai de fiecare dată același secret (un secret diferit îl înlocuiește pe cel vechi, iar dispozitivele vechi sunt refuzate).
4. Notează adresa în `.scratch/platforma/issues/04-serverul-minim.md` și bifează „Lansat”.
5. Test de fum: `URL=<adresa> BA_SECRET='<secretul>' make smoke`. Trebuie să vezi `{"ok":true}`, apoi `401` fără secret, apoi `{"events":[],"cursor":0,"more":false}`.
6. Dacă `curl` dă 403 pe adresă, lipsește una dintre cele două permisiuni publice (`lambda:InvokeFunctionUrl` și `lambda:InvokeFunction` cu `InvokedViaFunctionUrl`). Șablonul le adaugă pe ambele; verifică în consolă, la funcție › Configuration › Permissions.

Opțional: `ReservedConcurrency=5` în `--parameter-overrides` (în `deploy.sh`) limitează numărul de cereri simultane și, la `0`, oprește funcția (comutator de urgență). Pe un cont nou rezervarea poate fi refuzată; atunci rămâne secretul lung ca singură apărare, iar schimbarea lui (alt `make deploy`) blochează dispozitivele vechi.

Tabelul are `DeletionPolicy: Retain`: dacă ștergi stiva, datele rămân. Costul așteptat e zero în limitele Always Free (Lambda: 1 milion de cereri pe lună; DynamoDB: 25 GB și 25 RCU/WCU); vezi `research/platforma-facts.md`, secțiunile 1 și 2, pentru ce se întâmplă la 6 luni.

**Netestat pe AWS real.** Șablonul și scriptul nu au fost rulate pe un cont AWS (nu exista contul). La primul deploy pot ieși mici ajustări: numărul versiunii stratului Lambda Web Adapter (`LambdaAdapterLayerX86:30`, verifică ultima versiune în README-ul proiectului `awslabs/aws-lambda-web-adapter`), proprietatea `InvokedViaFunctionUrl` a permisiunii, cota de memorie a contului nou.

Tichetul 06, tot netestat pe AWS real: apelurile către Gemini și DeepSeek (în teste sunt false), `ADD cnt` pe DynamoDB real (doar pe moto) și cele două modele la rând sub `Timeout: 60`.
