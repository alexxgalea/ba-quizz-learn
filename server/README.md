# Serverul minim (tichetul 04 al platformei)

FastAPI pe AWS Lambda (cu Lambda Web Adapter), DynamoDB pentru evenimente. Primește evenimentele PWA-ului, le dă înapoi de la un cursor și refuză orice cerere fără secret. Deciziile: `docs/adr/0003` și `0004`; faptele AWS verificate: `research/platforma-facts.md` (secțiunea 7). Spec: `.scratch/platforma/spec.md`.

Serverul nu știe ce e un răspuns la o grilă. Cere doar un `id` pe eveniment și păstrează restul neschimbat. Cutiile, treptele și scadențele le calculează clientul.

## Endpointuri

Toate, afară de `/health`, cer antetul `Authorization: Bearer <secret>`.

| Cerere | Ce face |
|---|---|
| `POST /events` cu `{"events": [{"id": "...", ...}, ...]}` | Păstrează evenimentele noi (1–500 pe cerere, fiecare ≤ 100 KB). Un id deja păstrat se ignoră: primul câștigă. Răspuns: `{"accepted": [ids noi], "duplicates": [ids ignorate], "cursor": n}`. |
| `GET /events?after=<cursor>&limit=<n>` | Întoarce evenimentele cu număr mai mare decât `after` (implicit 0), în ordinea sosirii, cel mult `limit` (implicit 100, maximum 500). Răspuns: `{"events": [...], "cursor": n, "more": bool}`. Clientul repetă cu `after=cursor` cât timp `more` e `true`. |
| `GET /health` | `{"ok": true}`, fără secret. |

Orice altceva fără secret primește `401 {"detail": "unauthorized"}`, la fel pentru secret lipsă, greșit sau neconfigurat (inclusiv cu corp stricat). Documentația automată FastAPI e oprită.

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
    routers/       un modul pe temă: events.py, health.py
  tests/           pytest, fără cont AWS (moto pentru DynamoDB)
  template.yaml    SAM: funcția, adresa funcției cu CORS, tabelul, jurnalele
  deploy.sh        lansarea cu o comandă
  run.sh           pornit de Lambda Web Adapter: uvicorn --factory
```

**Rutere noi (tichetele 06 `/ai` și 08 `/live-token`).** Un fișier nou în `ba_server/routers/`, cu `router = APIRouter()`. `create_app` îl găsește singur și pune secretul pe fiecare rută a lui; un ruter public declară `PUBLIC = True` (ca `health.py`). Codul evenimentelor nu se atinge. Un ruter își ia depozitul și setările cu `Depends(get_store)` / `Depends(get_settings)`; cheile Gemini și DeepSeek se adaugă în `Settings` (variabile de mediu ale funcției, nu Secrets Manager: costă 0,40 USD pe secret pe lună).

**Datele.** Un tabel DynamoDB, partiția `u#alex` (un singur utilizator, dar cheia permite mai mulți), trei feluri de articole:

- `N`: contorul (`n` = ultimul număr folosit);
- `S#<n>` (12 cifre, cu zerouri): evenimentul, ca JSON într-un atribut `data` (fără probleme cu numerele zecimale);
- `I#<id>`: marcajul de idempotență, cu numărul evenimentului.

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
   BA_SECRET='<secretul>' AWS_REGION=<regiunea> make deploy
   ```

   Scriptul construiește pachetul (Linux x86_64, Python 3.14), apoi rulează `sam deploy` și la sfârșit scrie adresa funcției (`https://<id>.lambda-url.<regiune>.on.aws`). Aceeași comandă actualizează serverul; dai de fiecare dată același secret (un secret diferit îl înlocuiește pe cel vechi, iar dispozitivele vechi sunt refuzate).
4. Notează adresa în `.scratch/platforma/issues/04-serverul-minim.md` și bifează „Lansat”.
5. Test de fum: `URL=<adresa> BA_SECRET='<secretul>' make smoke`. Trebuie să vezi `{"ok":true}`, apoi `401` fără secret, apoi `{"events":[],"cursor":0,"more":false}`.
6. Dacă `curl` dă 403 pe adresă, lipsește una dintre cele două permisiuni publice (`lambda:InvokeFunctionUrl` și `lambda:InvokeFunction` cu `InvokedViaFunctionUrl`). Șablonul le adaugă pe ambele; verifică în consolă, la funcție › Configuration › Permissions.

Opțional: `ReservedConcurrency=5` în `--parameter-overrides` (în `deploy.sh`) limitează numărul de cereri simultane și, la `0`, oprește funcția (comutator de urgență). Pe un cont nou rezervarea poate fi refuzată; atunci rămâne secretul lung ca singură apărare, iar schimbarea lui (alt `make deploy`) blochează dispozitivele vechi.

Tabelul are `DeletionPolicy: Retain`: dacă ștergi stiva, datele rămân. Costul așteptat e zero în limitele Always Free (Lambda: 1 milion de cereri pe lună; DynamoDB: 25 GB și 25 RCU/WCU); vezi `research/platforma-facts.md`, secțiunile 1 și 2, pentru ce se întâmplă la 6 luni.

**Netestat pe AWS real.** Șablonul și scriptul nu au fost rulate pe un cont AWS (nu exista contul). La primul deploy pot ieși mici ajustări: numărul versiunii stratului Lambda Web Adapter (`LambdaAdapterLayerX86:30`, verifică ultima versiune în README-ul proiectului `awslabs/aws-lambda-web-adapter`), proprietatea `InvokedViaFunctionUrl` a permisiunii, cota de memorie a contului nou.
