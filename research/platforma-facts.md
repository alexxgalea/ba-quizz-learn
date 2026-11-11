# Fapte verificate pentru platformă (AWS Lambda + DynamoDB, jeton Gemini Live, costuri AI)

Verificat la: **2026-11-11**, doar din surse primare (docs.aws.amazon.com, aws.amazon.com, aws.github.io și README-ul proiectului `awslabs/aws-lambda-web-adapter`, ai.google.dev, api-docs.deepseek.com, pypi.org). Tichetul: `.scratch/platforma/issues/01-verificari-aws-si-gemini.md`. Hotărârile puse la încercare: `docs/adr/0003`, `0004`, `0005`.

Legendă: ✅ confirmat · ⚠️ confirmat cu o condiție sau o nuanță · ❌ contrazice textul ADR sau codul de azi · ❓ nu s-a putut verifica din surse primare.

## De citit întâi: ce contrazice sau nuanțează ADR 0004

Hotărârea de fond (AWS Lambda + DynamoDB, gratuit prin Always Free, cont pe plan plătit după 6 luni) **se confirmă**. Nu am găsit nicio contradicție care s-o răstoarne. Am găsit patru puncte unde textul ADR/spec e inexact sau se sprijină pe o presupunere care nu ține. Nu le-am rezolvat; hotărăște Alex.

1. **Secretele nu sunt gratuite în forma „Secrets Manager”.** Spec și ADR zic „cheile sunt secrete ale funcției” fără să spună unde. AWS Secrets Manager nu e în lista Always Free și costă **0,40 USD pe secret pe lună** (+ 0,05 USD la 10.000 de apeluri), conform exemplelor de pe pagina de prețuri. Cu 3–4 secrete (secretul lui Alex, cheile Gemini și DeepSeek) înseamnă ~1,2–1,6 USD pe lună după trecerea pe planul plătit. Alternativa gratuită: variabile de mediu ale funcției (4 KB în total, criptate la repaus cu o cheie AWS gestionată, fără cost) sau Parameter Store, parametri standard. Documentația Lambda recomandă totuși Secrets Manager în locul variabilelor de mediu pentru chei API. Decizie pentru Alex: variabile de mediu (gratuit, mai puțin curat) sau Secrets Manager (~1,5 USD/lună). Vezi secțiunea 1.
2. **Jetonul Gemini Live nu se folosește pe aceeași adresă și cu același parametru ca azi.** `src/live.js` se conectează la `…BidiGenerateContent?key=<cheie>`. Un jeton efemer cere `…BidiGenerateContentConstrained?access_token=<jeton>`, doar pe `v1beta`. ADR 0004 spune „serverul îi dă doar un jeton”; e adevărat, dar `live.js` se schimbă (URL, parametru, reînnoire). Jetonurile efemere sunt marcate **preview** în documentație. Modelul din `src/jarvis.js` (`gemini-3.8-live`) merge, iar condiția de oprire din tichetul 08 **nu** se declanșează. Vezi secțiunea 4.
3. **Planul gratuit Gemini folosește conținutul pentru îmbunătățirea produselor Google.** Pagina de prețuri are, pentru `gemini-3.8-live` și `gemini-3.5-flash-lite`, „Used to improve our products: Yes” la nivelul gratuit și „No” la cel plătit. ADR 0004 mută supravegherea pe Gemini gratuit, iar ADR 0003 spune că textul scris de Alex (răspunsuri, cod, formulări) intră în jurnal și că datele rămân ale lui. Cu nivelul gratuit, ce trimite serverul către Gemini (prompturile cu răspunsurile lui) poate ajunge la îmbunătățirea produselor Google. Decizie pentru Alex: acceptă asta sau leagă un cont de facturare Gemini (nivelul 1; datele nu mai sunt folosite, iar prețul vine la tokeni). Vezi secțiunea 5.
4. **Ce se întâmplă la 6 luni e mai blând decât „înainte de luna a șasea”, dar documentația se contrazice într-un loc.** ADR zice că Alex trebuie să treacă pe plătit înainte de luna a șasea. De fapt contul se suspendă la expirare și poate fi redeschis prin upgrade în 90 de zile (datele rămân 90 de zile). Pe aceeași pagină FAQ, un răspuns spune că creditele expiră la 6 luni, iar altul (la upgrade) că „Free Tier credits expire 12 months after you create your account”. Nu se poate decide din documentație care e valabilă. Nu schimbă recomandarea (trecerea pe plătit înainte de termen), doar o face mai puțin riscantă. Vezi secțiunea 2.

Încă două lucruri de știut, fără să contrazică ADR:

- Un cont nou are **cote reduse de concurență și memorie** pentru Lambda („New AWS accounts have reduced concurrency and memory quotas”, valorile nu sunt date). Asta poate bloca comutatorul de urgență „concurență rezervată = 0” (regula: poți rezerva cel mult concurența neutilizată minus 100). Vezi secțiunea 7.
- Lambda a primit pe 2026-10-12 un compute nou, **Lambda Web Functions**, doar pentru Node.js. Pentru Python rămâne valabilă recomandarea ADR (Lambda Web Adapter). Funcțiile Lambda obișnuite se numesc acum „Event Functions” în documentație.

---

## 1. Ce e gratuit fără termen pe un cont AWS creat în noiembrie 2026

Surse (toate citite 2026-11-11): https://aws.amazon.com/free/serverless/ · https://aws.amazon.com/lambda/pricing/ · https://aws.amazon.com/dynamodb/pricing/provisioned/ · https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html · https://aws.amazon.com/free/free-tier-faqs/

- ✅ **Regula generală.** Ofertele „Always Free” se dau „as long as you are an AWS customer”, cu limite lunare, pe planul gratuit și pe cel plătit (FAQ). Pe pagina serverless, Lambda și DynamoDB poartă fraza „This always free service is available on the Free or Paid plan”. Peste limită, pe planul gratuit se consumă creditele; pe cel plătit se plătește tariful standard.
- ✅ **Lambda.** 1 milion de cereri pe lună **și** până la 400.000 GB-secunde de calcul pe lună (echivalent 3,2 milioane de secunde la 128 MB). Prima cifră din ADR (1 milion de cereri) e corectă, dar lipsește a doua: la 512 MB, 400.000 GB-s înseamnă 800.000 de secunde pe lună. Pentru o seară de ~200 de cereri e departe de limită.
- ✅ **Adresa funcției (Function URL).** Nu are cost propriu: „Function URLs follow the standard Lambda pricing model… There are no additional charges for the URL endpoint itself” (https://docs.aws.amazon.com/lambda/latest/dg/apig-http-invoke-decision.html). Adresa are forma `https://<url-id>.lambda-url.<regiune>.on.aws`, nu se schimbă cât există și e accesibilă doar din internetul public (nu prin PrivateLink). Nu e disponibilă în toate regiunile; de verificat la alegerea regiunii (https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html).
- ⚠️ **DynamoDB.** 25 GB de stocare, 25 WCU și 25 RCU provizionate, pe lună, pe regiune și pe cont plătitor, plus 2,5 milioane de cereri de stream și 1 GB de transfer spre exterior. Condiții: **doar capacitate provizionată** și **doar clasa de tabel Standard**; pagina spune „It uses provisioned capacity and the DynamoDB Standard table class”. Capacitatea la cerere (on-demand) nu intră în nivelul gratuit. Spec și ADR cer deja capacitate provizionată, deci sunt în regulă. Cele 25 WCU / 25 RCU sunt pe toate tabelele contului din regiune.
- ❌ **Secretele (vezi punctul 1 de sus).** Secrets Manager nu e Always Free: 0,40 USD pe secret pe lună, proporțional pe ore dacă secretul există mai puțin de o lună (https://aws.amazon.com/secrets-manager/pricing/; prețul din tabel e un substituent nerandat în pagina descărcată, cifra de 0,40 USD vine din exemplele de calcul de pe aceeași pagină). Parametrii **standard** din Systems Manager Parameter Store: „No additional charge” (https://aws.amazon.com/systems-manager/pricing/). Variabilele de mediu Lambda: cel mult 4 KB în total, criptate la repaus cu o cheie AWS gestionată, pe care AWS „doesn't charge you to use” (https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html și `configuration-envvars-encryption.html`).
- ✅ **Jurnale (CloudWatch Logs).** Nivelul gratuit: 5 GB pe lună pentru ingestie, stocare arhivată și interogări Logs Insights, plus 10 metrici personalizate și 1 milion de cereri API (https://aws.amazon.com/cloudwatch/pricing/). ❓ Nu am verificat dacă CloudWatch e listat explicit sub „Always Free” pe pagina de servicii; limitele de mai sus sunt din tabelul „Free Tier” al paginii de prețuri.
- ⚠️ **Planul gratuit are servicii excluse.** „Free account plans don't include access to AWS services and features that could possibly deplete your credits” (https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html). Lista celor eligibile e la https://aws.amazon.com/free/ (pagină dinamică, nu am putut-o extrage ca text). Lambda și DynamoDB sunt Always Free pe ambele planuri.
- ❓ **Nu s-a putut verifica:** dacă Function URL specific (nu doar Lambda) e permis pe planul gratuit. Nimic din documentație nu îl exclude; se vede la primul deploy (tichetele 03 și 04).

## 2. Ce se întâmplă la 6 luni pe planul gratuit și cum se trece pe cel plătit

Surse (citite 2026-11-11): https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html · https://aws.amazon.com/free/free-tier-faqs/

- ✅ **Credite.** Orice cont nou primește 100 USD la creare, plus până la 100 USD pentru activități (în total până la 200 USD), pe ambele planuri.
- ✅ **Expirarea.** Planul gratuit se termină la **6 luni de la deschiderea contului sau când creditele se epuizează, ce vine primul**. Nu se prelungește. Creditele nu se pot transfera la alt cont.
- ✅ **După expirare.** Contul se suspendă (documentația Billing zice „closes automatically”), pierzi accesul la resurse și date. AWS păstrează conținutul **90 de zile**, apoi șterge definitiv contul și tot ce conține. În cele 90 de zile poți trece pe plătit, ceea ce redeschide contul și restaurează accesul; apoi poți descărca datele.
- ✅ **Trecerea pe plătit.** Consola → Settings Portal → „Billing” → „Upgrade”, sau „Upgrade plan” → „Upgrade account”. Se poate oricând. Nu se poate reveni la gratuit. Creditele rămase se aplică automat facturilor viitoare.
- ❓ **Contradicție în documentație.** Aceeași pagină FAQ spune în secțiunea generală că creditele expiră la 6 luni de la creare, iar în secțiunea „Paid plan” că, după upgrade, „Free Tier credits expire 12 months after you create your account”. Pagina menționează și o „nouă experiență de înscriere din octombrie 2026”. Nu se poate stabili din surse primare care valoare se aplică; se vede în consolă (Billing, Credits) după crearea contului.
- ⚠️ Planul gratuit trece automat pe plătit dacă contul intră în AWS Organizations, Control Tower, AWS Partner Network etc. Irelevant pentru contul lui Alex, dar de nu activat din greșeală.
- ⚠️ Nu e nevoie de card la înscriere „pentru majoritatea clienților noi”, dar trecerea pe plătit cere metodă de plată. Cheltuiala reală rămâne zero cât timp încape în Always Free (plus eventualele secrete, vezi secțiunea 1).
- Pentru ADR 0004: formularea „Alex trece pe planul plătit înainte de luna a șasea; până atunci copia locală a jurnalului e plasa de siguranță” rămâne cea mai sigură. Varianta de rezervă (upgrade în cele 90 de zile) există, dar în acea fereastră serverul e oprit.

## 3. FastAPI pe Lambda în spatele unei adrese a funcției

Surse (citite 2026-11-11): README-ul proiectului `awslabs/aws-lambda-web-adapter` (ramura principală, `https://raw.githubusercontent.com/awslabs/aws-lambda-web-adapter/main/README.md`) · https://aws.github.io/aws-lambda-web-adapter/ · https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html · https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html · https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html · https://docs.aws.amazon.com/lambda/latest/dg/web-functions.html · https://aws.amazon.com/about-aws/whats-new/2026/10/aws-lambda-web-functions/ · README-ul proiectului `Kludex/mangum` · https://pypi.org/pypi/mangum/json

**Împachetarea recomandată azi**

- ✅ **Lambda Web Adapter (LWA)**, versiunea **1.1.0** (imagine) / stratul (layer) `LambdaAdapterLayerX86:30` și `LambdaAdapterLayerArm64:30`. Rulează ca extensie Lambda; aplicația rămâne un FastAPI/uvicorn obișnuit pe un port (`AWS_LWA_PORT`, implicit 8080). Suportă explicit „Lambda Function URLs”, API Gateway și ALB; răspuns în flux, compresie, oprire grațioasă. Variante: imagine Docker (`COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter`) sau pachet zip cu stratul.
- ✅ **Pachet zip, pași** (README și ghidul „Zip Packages”): atașezi stratul (ARN `arn:aws:lambda:<regiune>:753240598075:layer:LambdaAdapterLayerX86:30`), setezi `AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap`, handler-ul = scriptul de pornire (`run.sh`). Exemplul oficial FastAPI în zip are un `run.sh` cu `exec python -m uvicorn --port=$PORT main:app`, `MemorySize: 256`, `Timeout: 10` și (în exemplu) un API Gateway HttpApi în față; pentru Function URL se schimbă doar partea de eveniment (SAM: `FunctionUrlConfig` cu `AuthType`, `Cors`, `InvokeMode`).
- ✅ **Alternativa: Mangum 0.22.0** (2026-08-22), adaptor ASGI pentru Lambda (`handler = Mangum(app, lifespan="off")`). Suportă evenimente Function URL, API Gateway, ALB, Lambda@Edge și evenimentele `lifespan`. README-ul nu menționează răspunsul în flux. Fără strat, fără extensie.
- ✅ **Lambda Web Functions** (anunțat 2026-10-12): compute nou, doar **Node.js** la lansare; README-ul LWA spune că pentru alte runtimes se rămâne pe LWA. Nu e o opțiune pentru FastAPI.
- ✅ **Runtime Python.** `python3.14` și `python3.13` sunt disponibile (deprecare 30 iunie 2029); **`python3.15` e în preview public**, fără SLA, „should not be used for production workloads”. Python 3.10 și 3.11 sunt pe Amazon Linux 2, cu deprecare apropiată. FastAPI 0.162.x cere Python ≥ 3.10, iar Starlette ≥ 1.8 cere ≥ 3.11 (`research/interview-facts.md`); alegerea normală e `python3.14` sau `python3.13`.
- ✅ **Răspuns în flux** (ADR 0004): se obține cu LWA și `AWS_LWA_INVOKE_MODE=response_stream` (tabelul de variabile din README) plus modul de invocare cu flux pe adresă; nu e nevoie acum (spec).

**Limitele (Lambda, pagina de cote)**

- Durata maximă: **900 de secunde** (15 minute).
- Cerere și răspuns sincron: **6 MB** fiecare; răspuns în flux: **200 MB**, cu primii 6 MB nelimitați ca viteză, restul la 2 MBps; linia de cerere plus valorile antetelor: 1 MB în total.
- Variabile de mediu: **4 KB** în total. Pachet zip: 50 MB încărcat prin API, 250 MB necomprimat (cu straturi); imagine de container: 10 GB.
- Memorie 128–10.240 MB; un vCPU la 1.769 MB. `/tmp`: 512–10.240 MB.
- Concurență implicită: 1.000 de medii pe regiune, dar „**New AWS accounts have reduced concurrency and memory quotas**” (valorile nu sunt publicate; AWS le ridică automat după utilizare).
- Pe adresa funcției, limitarea cererilor se face prin **concurența rezervată** (RPS maxim = 10 × concurența rezervată; peste, HTTP 429). „Dezactivarea” adresei = concurență rezervată 0. Regula: se poate rezerva cel mult concurența contului minus 100.

## 4. Jetonul de scurtă durată pentru Gemini Live

Surse (citite 2026-11-11): https://ai.google.dev/gemini-api/docs/ephemeral-tokens · https://ai.google.dev/api/live (secțiunea „Ephemeral authentication tokens”) · https://ai.google.dev/gemini-api/docs/live-api/get-started-websocket · https://ai.google.dev/gemini-api/docs/live-api/session-management · https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live · https://ai.google.dev/gemini-api/docs/models. Cod citit: `src/live.js`, `src/jarvis.js`.

**Modelul folosit azi.** `src/jarvis.js` (liniile 387, 388, 413) cere `gemini-3.8-live`; `src/live.js` îl trimite ca `models/gemini-3.8-live` în mesajul `setup`. ✅ Modelul există: pagina de modele îl listează ca „Default Live API model for most low-latency voice agent experiences”. Capacități: intrare text, imagini și audio; ieșire text și audio; 131.072 de tokeni la intrare, 65.536 la ieșire; apel de funcții „supported”.

**Jetonurile efemere merg cu acest model.** ✅ Pagina oficială despre jetoane folosește exact `gemini-3.8-live` în exemplele de creare cu constrângeri (`liveConnectConstraints`) și de conectare. Condiția de oprire din tichetul 08 („jetonul nu merge cu modelul folosit”) **nu se declanșează**. Rezerve: funcția e **„in preview”** (documentația o marchează) și, în cuvintele ei, „At this time, ephemeral tokens are only compatible with Live API”.

**Cum se creează**

- ✅ Serverul apelează `POST https://generativelanguage.googleapis.com/v1beta/auth_tokens` cu antetul `x-goog-api-key: <cheia Gemini>` (cheia rămâne pe server) sau SDK-ul `google-genai` (`client.auth_tokens.create(...)`, cu `http_options={"api_version": "v1beta"}`; versiunea curentă pe PyPI: 3.1.0, 2026-11-10, Python ≥ 3.11). Corpul REST din documentație: `{"uses": 1, "expireTime": "<ISO>", "newSessionExpireTime": "<ISO>"}`; răspunsul are `name` = jetonul, pe care clientul îl folosește ca pe o cheie API.
- Pentru Lambda nu e nevoie de SDK: un POST cu `httpx` sau `urllib` ajunge și ține zip-ul mic (observație proprie, nu din documentație).

**Cât ține și dacă se prelungește**

- ✅ `expireTime` (după el, mesajele din sesiune sunt respinse; Gemini poate închide sesiunea mai devreme): implicit **30 de minute**; trebuie să fie **mai puțin de 20 de ore** în viitor.
- ✅ `newSessionExpireTime` (după el nu mai poți deschide sesiuni noi cu jetonul): implicit **60 de secunde**; aceeași limită de 20 de ore.
- ✅ `uses`: implicit **1** (o singură sesiune nouă); 0 = fără limită. „Resuming a Live API session does not count as a use.” Documentația spune că în intervalul `expireTime` poți reconecta cu `sessionResumption` „every 10 minutes”, **cu același jeton, chiar dacă `uses` e 1**.
- ✅ **Nu se prelungește.** Câmpurile sunt marcate „Input only. Immutable”. Reînnoirea înseamnă un jeton nou.
- ✅ Sesiunea, indiferent de jeton: fără compresie, sesiunile doar audio sunt limitate la **15 minute**; cu `contextWindowCompression` (cum face deja `live.js`, cu `slidingWindow`) nu mai au limită. Conexiunea WebSocket trăiește ~**10 minute**; serverul trimite `GoAway` înainte. Handle-ul de reluare e valabil **2 ore** după încheierea sesiunii.
- ❓ **Nedocumentat:** dacă un handle de reluare obținut cu un jeton se poate folosi la reconectarea cu **alt** jeton (necesar dacă o lecție depășește `expireTime`). De testat în tichetul 08 înainte de a-l da gata.

**Ce versiune de API cere și ce schimbă în `live.js`**

- ✅ Doar **`v1beta`**: „it only works for the live API, and only with the `v1beta` version of the API”.
- ❌ Adresa diferă de cea din `src/live.js` (linia 4, `…v1beta.GenerativeService.BidiGenerateContent`): pentru jetoane se folosește
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token={jeton}`.
  Jetonul poate merge și în antetul HTTP `Authorization: Token <jeton>`, dar un WebSocket din browser nu poate seta antete, deci rămâne `access_token` în adresă. Azi `live.js` (linia 100) construiește `WS_URL + "?key=" + cheie`.
- ⚠️ **Constrângeri.** Jetonul poate fi legat de un `bidiGenerateContentSetup` fix (model, config), ca instrucțiunile de sistem să rămână pe server. Fără constrângeri (fără `bidiGenerateContentSetup` și fără `fieldMask`), setup-ul vine din conexiune (referința API). Aplicația construiește instrucțiunile în client (`buildLessonSystem`, `buildSystem`) și le trimite în `setup`, deci jetonul se creează **fără** constrângere de config. Un jeton furat ține oricum cel mult `expireTime` și o sesiune nouă.

## 5. Limitele gratuite Gemini și prețul DeepSeek, pentru ≈ 50 de verificări pe seară

Surse (citite 2026-11-11): https://ai.google.dev/gemini-api/docs/pricing · https://ai.google.dev/gemini-api/docs/rate-limits · https://ai.google.dev/gemini-api/docs/billing · https://api-docs.deepseek.com/quick_start/pricing · https://api-docs.deepseek.com/quick_start/rate_limit. Modelele din cod: `gemini-3.5-flash-lite` (`src/app.js:2486`, `src/gemini_text.js:8`), `deepseek-flash` (`src/app.js:58`), `gemini-3.8-live` (Jarvis).

**Gemini**

- ✅ `gemini-3.5-flash-lite`: nivelul gratuit „Free of charge” pentru intrare și ieșire. Plătit: 0,30 USD / 1 milion de tokeni la intrare, 2,50 USD / 1 milion la ieșire.
- ✅ `gemini-3.8-live`: gratuit („Free of charge”); plătit: audio la intrare 3,00 USD / 1 milion de tokeni (0,005 USD/min), audio la ieșire 12,00 USD / 1 milion (0,018 USD/min).
- ❓ **Limitele numerice gratuite (RPM, TPM, RPD) pe model nu sunt publicate în documentație.** Pagina `rate-limits` spune doar că se văd în AI Studio (https://aistudio.google.com/rate-limit, necesită cont), că se aplică **pe proiect, nu pe cheie** și că RPD se resetează la miezul nopții, ora Pacificului. Nu pot da cifre. Alex le citește din AI Studio înainte de tichetul 06; strategia din ADR (Gemini, DeepSeek la eșec, adică și la HTTP 429) acoperă depășirea.
- ⚠️ **Confidențialitate:** la nivelul gratuit „Used to improve our products: Yes”; la cel plătit „No”. Pagina de facturare: pentru ca prompturile și răspunsurile să nu fie folosite pentru îmbunătățirea produselor Google, trebuie legat un cont de facturare (nivelul plătit).
- ✅ Treptele: gratuit; Tier 1 = cont de facturare legat (plafon 250 USD); Tier 2 = 100 USD plătiți + 3 zile; Tier 3 = 1.000 USD + 30 de zile.

**DeepSeek** (`deepseek-flash` = „DeepSeek-V4.1-Flash-1017”, context 1 milion de tokeni; numele vechi `deepseek-v4-flash` e încă acceptat; baza `https://api.deepseek.com`)

- ✅ Prețuri pe 1 milion de tokeni, **vârf / în afara vârfului**: intrare cu cache lipsă 0,30 / 0,15 USD; intrare cu cache găsit 0,006 / 0,003 USD; ieșire 1,20 / 0,60 USD. Orele de vârf: 01:00–04:00 și 06:00–10:00 UTC, de luni până vineri (fără sărbători publice chineze); restul orelor și weekendul sunt în afara vârfului. Seara lui Alex (după 18:00 ora României, adică după 16:00 UTC iarna) e în afara vârfului.
- ✅ Concurență: 2.500 de cereri simultane per cont pentru `deepseek-flash` (500 pentru `deepseek-v4-pro`). Plata se scade din sold încărcat sau acordat.
- ✅ Nu am găsit un nivel gratuit permanent pe pagina oficială de prețuri.

**Calcul pentru o seară** (ipoteze proprii, nu din documentație: 50 de verificări × ~3.000 de tokeni la intrare, adică promptul cu cardul, modelul de răspuns și răspunsul lui Alex, și ~400 la ieșire):

| Sursă | Intrare 150.000 | Ieșire 20.000 | Total/seară |
|---|---|---|---|
| DeepSeek, vârf | 0,045 USD | 0,024 USD | ~0,07 USD |
| DeepSeek, în afara vârfului | 0,023 USD | 0,012 USD | ~0,035 USD |
| Gemini 3.5 Flash-Lite plătit (dacă se leagă facturarea) | 0,045 USD | 0,050 USD | ~0,10 USD |
| Gemini gratuit | 0 | 0 | 0 (cu limitele necunoscute de mai sus) |

Deci chiar dacă ambele surse ar fi plătite, o lună cu zeci de seri costă de ordinul a 1–3 USD. Riscul nu e prețul, ci confidențialitatea nivelului gratuit (punctul 3 de sus).

## 6. Ce contrazice ADR 0004

Rezumat, cu trimitere la secțiunile de mai sus: (1) secretele cu Secrets Manager nu sunt gratuite, 0,40 USD/secret/lună (secțiunea 1); (2) jetonul Gemini Live cere altă adresă și alt parametru decât `live.js` de azi, iar funcția e în preview (secțiunea 4); (3) Gemini gratuit folosește conținutul pentru îmbunătățirea produselor, în tensiune cu „datele rămân ale mele” (secțiunea 5); (4) ce se întâmplă la 6 luni e mai blând decât spune ADR, iar documentația AWS se contrazice asupra valabilității creditelor (secțiunea 2). Confirmate fără obiecții: Lambda 1 milion de cereri, DynamoDB 25 GB (cu condiția „provizionat + Standard”), închiderea la 6 luni, ștergerea după 90 de zile, nevoia de LWA pentru răspuns în flux.

## 7. Recomandări pentru tichetul 04 (serverul minim)

**Împachetare și rulare**

- Pachet zip cu Lambda Web Adapter (stratul `LambdaAdapterLayerX86:30`; verifică numărul ultimei versiuni la deploy), `run.sh` cu uvicorn, runtime `python3.14` (GA). Motiv: același cod rulează local și pe Lambda, iar răspunsul în flux (amânat) rămâne posibil fără rescriere. Mangum e alternativa fără strat; alege-o doar dacă stratul face probleme.
- Arhitectură `x86_64`. Dependențe construite pentru Linux: `pip install --platform manylinux2014_x86_64 --only-binary=:all: -t app/ …` sau `sam build`. Memorie 256–512 MB, timeout 10–30 s (cota unui cont nou poate reduce memoria maximă; vezi mai jos).
- Infrastructura în cod: un șablon **SAM/CloudFormation** (`AWS::Serverless::Function` cu `FunctionUrlConfig`, `AWS::DynamoDB::Table`, grup de jurnale cu retenție), lansat cu `sam build && sam deploy`. Secretele ca parametri `NoEcho`, date la deploy din mediul local, **niciodată** în repo.
- Adresa se scrie în tichet (`https://<url-id>.lambda-url.<regiune>.on.aws`; nu se schimbă cât funcția are adresa).
- Versiuni PyPI la 2026-11-11: FastAPI 0.162.4, httpx 0.28.1, boto3 1.44.0, moto 5.2.5 (proiect extern). Testele pytest: un depozit (repository) mic în spatele rutelor, cu un fals în memorie pentru teste rapide, plus un test de integrare cu DynamoDB Local (AWS îl oferă descărcabil, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) sau cu `moto`. De confirmat la implementare că varianta aleasă suportă `TransactWriteItems`.

**Autentificare și CORS pe adresa funcției**

- `AuthType: NONE` și verificarea secretului în aplicație. Motiv: `AWS_IAM` cere ca apelantul să fie un principal IAM (cereri semnate), imposibil de cerut de la un PWA fără conturi (https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html). Cu `NONE`, politica pe resurse a funcției trebuie să permită acces public; din octombrie 2025 adresele noi cer **ambele** permisiuni, `lambda:InvokeFunctionUrl` și `lambda:InvokeFunction` (cu condiția `lambda:InvokedViaFunctionUrl`). La primul deploy, dacă `curl` dă 403, se adaugă ambele. ❓ Nu am verificat dacă SAM le adaugă singur.
- Secret lung (≥ 32 de octeți aleatorii, în base64url), în antetul `Authorization: Bearer …`, comparat cu `hmac.compare_digest`. Orice cerere fără secret sau cu secret greșit primește același 401, fără detalii. Nu se scrie secretul și nu se scrie textul lui Alex în jurnale.
- **CORS configurat o singură dată, pe adresa funcției** (`Cors`: `AllowOrigins`, `AllowMethods`, `AllowHeaders`, `MaxAge`), nu în FastAPI. Motiv, din documentația Lambda (https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html): la cererile preflight (OPTIONS) Lambda răspunde doar cu antetele configurate pe adresă; la cele obișnuite întoarce și antetele configurate, **și** pe cele din răspunsul funcției, ceea ce dă valori duble și eroarea „contains multiple values '*, *'”. `AllowOrigins` ia originea fără cale: `https://<utilizator>.github.io`, nu adresa cu `/ba-quizz-learn/app`; fără `*`. `AllowHeaders`: `authorization`, `content-type`.
- Limitare: concurență rezervată pe funcție (de exemplu 5), ceea ce limitează RPS-ul și dă 429 peste; `0` = comutator de urgență. ⚠️ Pe un cont nou cota de concurență e redusă: regula „cel mult concurența neutilizată minus 100” poate face imposibilă rezervarea. Se încearcă la deploy; altfel plasa e secretul lung și posibilitatea de a-l schimba.
- Secretele: variabile de mediu (gratuit, 4 KB) sau Secrets Manager (0,40 USD/secret/lună). Decizia lui Alex (punctul 1 de sus).
- Jurnale: retenție 14–30 de zile; nu se jurnalizează corpul cererilor.

**Tabelul DynamoDB** (capacitate provizionată, clasă Standard, în limita de 25 WCU / 25 RCU pe cont; de pildă 15 WCU și 10 RCU)

- Un singur tabel, cheie de partiție `pk` (un șir fix pe utilizator, de exemplu `u#alex`, ca să nu închidem drumul spre mai mulți utilizatori) și cheie de sortare `sk`.
- Trei tipuri de articole în aceeași partiție:
  - `sk = "N"`: articolul-contor, cu un atribut numeric `n` (ultimul număr de secvență folosit);
  - `sk = "S#<n>"`, cu `n` întreg completat cu zerouri la lungime fixă (sortare lexicografică corectă): evenimentul (cel mult 400 KB per articol, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html);
  - `sk = "I#<id>"`: marcajul de idempotență pentru id-ul evenimentului, cu `n`.
- **Scriere (idempotentă, cursor monoton fără goluri vizibile):** serverul citește contorul (`GetItem` cu citire consecventă), apoi o singură `TransactWriteItems` care (a) face `Update` pe contor cu condiția `n = :vechi` și îl mută la `:vechi + k`, (b) pune câte un `S#<n>` pentru fiecare eveniment nou, (c) pune câte un `I#<id>` cu `attribute_not_exists(sk)`. Evenimentele al căror `I#<id>` există deja se scot din lot înainte (citire în lot). Dacă tranzacția eșuează pe condiție (două scrieri simultane), se reia de la citirea contorului.
  - De ce așa: `TransactWriteItems` nu întoarce valorile actualizate (observație proprie), deci numărul nu poate fi obținut din tranzacție; condiția pe contor face ca ordinea de comitere să fie ordinea numerelor și evită situația în care un cititor a trecut de numărul 6 înainte ca numărul 5 să fie comis (cursorul ar rata evenimentul). Un contor incrementat simplu (`UpdateItem` cu `ADD`) nu e idempotent și permite acest lucru (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html: contoarele atomice nu sunt idempotente).
  - Limite de respectat (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html): **cel mult 100 de acțiuni și 4 MB** pe tranzacție, deci cel mult 49 de evenimente pe tranzacție (contor + 2 × 49); importul inițial se împarte în loturi. Scrierile tranzacționale consumă **dublu** capacitate („the two read or write operations for every item”), deci ~4 WCU per eveniment mic; un import de mii de evenimente se face cu pauze și reîncercări la throttling. ❓ Nu am măsurat consumul de burst.
  - Idempotența trimiterii: același id trimis a doua oară găsește `I#<id>` și e ignorat; răspunsul spune care sunt noi.
- **Citire cu cursor:** `Query` pe `pk` cu `sk` între `S#<cursor+1>` și `S#~`, sortare crescătoare; DynamoDB întoarce cel mult **1 MB pe pagină** și un `LastEvaluatedKey` (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html). Serverul oprește la o limită proprie (de exemplu 500 de evenimente sau ~3 MB, sub limita de 6 MB a răspunsului Lambda) și întoarce `cursor` = ultimul `n` citit și `more: true/false`. Cursorul e un număr, nu o cheie opacă DynamoDB; fiindcă numerele sunt fără goluri vizibile, clientul reia de la ultimul `n` fără risc.
- Alternativa mai simplă, dacă tranzacțiile se dovedesc prea grele: un articol pe eveniment cu `sk = id` și deduplicare doar în client (spec: îmbinarea e reuniune după id, deci duplicatele sunt oricum inofensive). Nu acoperă criteriul tichetului „îl păstrează o dată” pe server, deci e rezervă, nu recomandare.
- Fără TTL, fără indexuri secundare, fără DynamoDB Streams (nu sunt necesare).

**Ordinea de lucru propusă:** (1) tabelul și depozitul cu fals în memorie + teste pytest pentru idempotență și cursor; (2) rutele FastAPI și autentificarea; (3) șablonul SAM și un deploy către contul din tichetul 03; (4) test de fum cu `curl` și cu originea PWA-ului.

## 8. Recomandări pentru tichetul 08 (jeton pentru Jarvis)

- **Ruta serverului:** `POST /live-token` (autentificată cu același secret). Apelează `POST /v1beta/auth_tokens` cu `x-goog-api-key` din secretele funcției și cu corpul `{"uses": 1, "expireTime": <acum + 60 min>, "newSessionExpireTime": <acum + 2 min>}`; întoarce clientului `{ token: <name>, expireAt }`. Fără constrângeri de config (instrucțiunile sunt construite în client).
- **Durata:** 60 de minute acoperă o lecție obișnuită fără nicio reînnoire în sesiune; limita superioară admisă e 20 de ore. Reconectările la `GoAway` (~10 minute) merg cu **același** jeton și handle-ul de reluare, fără să consume utilizarea.
- **Reînnoirea:** clientul reține `expireAt`. La orice reconectare (`reconnect` din `src/live.js`) sau la pornire, dacă mai sunt sub ~5 minute, cere un jeton nou înainte să redeschidă conexiunea. Se adaugă în `cfg` un `getToken()` (în loc de `cfg.key`) și se păstrează handle-ul de reluare. ❓ Reluarea unei sesiuni cu un jeton nou, dar cu handle-ul vechi, nu e documentată: **se testează într-o probă înainte de a scrie codul** (un script de ~10 linii și pagina `docs/probe-lectie-metrou.html`). Dacă nu merge, o lecție mai lungă decât jetonul reîncepe sesiunea de la ultima poziție salvată a lecției (poziția lecției e oricum în aplicație).
- **Schimbări în `src/live.js`:** URL-ul `…BidiGenerateContentConstrained?access_token=<jeton>` (în loc de `?key=`), jetonul în loc de cheie în `cfg`, tratarea erorilor de autentificare ca „cere un jeton nou, o singură dată”. `closeInfo` are deja o ramură `auth`; se reutilizează.
- **Fără semnal la pornire:** `POST /live-token` eșuează înainte de orice conexiune; clientul afișează un mesaj propriu („Fără conexiune la server: lecția cere internet”) și nu deschide microfonul. Nu se reîncearcă în buclă.
- **Cheia din `localStorage`:** se șterge după ce jetonul merge, cum cer ADR 0004 și spec; cheia Gemini trăiește apoi doar ca secret al funcției.
- **Confidențialitate:** `gemini-3.8-live` e gratuit, dar cu „Used to improve our products: Yes” (vocea și răspunsurile lui Alex ajung în datele Google). Aceeași decizie ca la punctul 3 de sus.
- **Test în `tools/unit` peste `fakes.mjs`:** sesiune care depășește `expireAt` și cere jeton nou; fals pentru `getToken()`.
- Condiția de oprire a tichetului („dacă 01 arată că jetonul nu merge cu modelul folosit, oprește-te”) nu se declanșează: documentația Google folosește chiar `gemini-3.8-live` în exemplele cu jeton. Rămâne riscul „preview”: citește din nou pagina `ephemeral-tokens` la începutul tichetului 08.

## 9. Ce nu s-a putut verifica

- Valorile cotelor reduse ale unui cont AWS nou (concurență, memorie) și dacă blochează concurența rezervată.
- Dacă Function URL e permis pe planul gratuit al contului (nimic nu îl exclude).
- Valabilitatea creditelor după upgrade (6 sau 12 luni; documentația se contrazice).
- Limitele numerice gratuite Gemini (RPM, RPD, TPM) pe model: apar doar în AI Studio, după autentificare.
- Dacă SAM adaugă singur ambele permisiuni pentru `AuthType: NONE`.
- Că `POST /v1beta/auth_tokens` întoarce un jeton care deschide efectiv o sesiune pe `BidiGenerateContentConstrained` cu `gemini-3.8-live`: documentația o spune, dar nu am avut cheie Gemini ca s-o rulez.
- Reluarea unei sesiuni Live cu alt jeton decât cel inițial.
- Consumul real de capacitate DynamoDB al tranzacțiilor pe volumul importului.
