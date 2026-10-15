<!-- Securitate. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### sec-01
Pe scurt: `pickle.loads` pe date pe care le poate controla altcineva permite execuție de cod: oricine poate scrie în cheia din Redis poate rula cod pe serverul tău.
Scop: La o firmă de securitate, deserializarea nesigură e o întrebare de reflex: transformă o problemă minoră (acces la Redis) în preluarea completă a aplicației.
Mecanism: pickle reconstruiește obiectele apelând funcțiile indicate chiar în date, prin `__reduce__`. Un atacator care poate scrie în Redis (o instanță expusă fără parolă, alt serviciu compromis) pune acolo bytes care, la `loads`, apelează `os.system(...)`.
Pas cu pas:
```text
atacatorul scrie în session:abc
  bytes pickle: __reduce__ -> os.system
aplicația: pickle.loads(data)
  -> rulează comanda atacatorului
cu JSON: loads -> doar un dict
```
Aplicare:
```python
data = redis_client.get(f"session:{sid}")
session = SessionData.model_validate_json(data)
```
Legătură: E exact motivul pentru care Celery folosește JSON, nu pickle (CEL-11).
Limită: Dacă trebuie neapărat să păstrezi pickle, pentru date strict interne, semnezi datele cu HMAC și verifici semnătura înainte de `loads`. Dar JSON cu validare e aproape mereu alegerea corectă.
La interviu: „`pickle.loads` pe date pe care le poate controla altcineva înseamnă execuție de cod: pickle poate apela orice funcție la deserializare. Pentru date care trec granițe de încredere folosesc JSON plus validare, de exemplu cu Pydantic.”
Verificare: Redis e protejat cu parolă și nu e expus în internet. Mai e o problemă `pickle.loads`?
Răspuns verificare: Da, mai mică, dar reală: oricine ajunge la Redis (credențiale scurse, alt serviciu compromis) poate obține execuție de cod în aplicație. Nu te bazezi pe un singur strat de apărare.
Varianta greșită B: Redis stochează fără probleme date binare: valorile sunt șiruri de bytes, de orice fel.
Varianta greșită C: Numele cheii e trimis ca argument separat al comenzii, nu interpretat ca text de comandă, deci nu permite injecție de comenzi în Redis. Riscul real e deserializarea.
Varianta greșită D: Rețeaua internă nu e un control de securitate: un singur serviciu compromis din ea poate scrie în Redis.

### sec-02
Pe scurt: Cu un hash lent, cu salt, făcut special pentru parole: Argon2id sau bcrypt.
Scop: Dacă baza de date scapă, vrei ca spargerea fiecărei parole să coste enorm de mult timp de calcul, nu secunde.
Mecanism: Un hash e ireversibil, iar salt-ul aleator per user face ca parole identice să dea hash-uri diferite, deci tabelele precalculate nu mai ajută. Diferența o face viteza: SHA-256 se calculează de miliarde de ori pe secundă pe un GPU, pe când Argon2id e lent intenționat și cere multă memorie la fiecare încercare, deci ghicitul în masă devine foarte scump.
Pas cu pas:
```text
înregistrare: argon2id(parolă, salt)
  -> "$argon2id$v=19$m=65536,t=3,p=4$..."
login: verify(hash, parola introdusă)
baza scapă: fiecare încercare costă
  memorie și timp -> ghicit lent
```
Aplicare:
```python
ph = PasswordHasher()  # argon2-cffi
h = ph.hash(password)  # la înregistrare
ph.verify(h, attempt)  # la login; aruncă la eșec
if ph.check_needs_rehash(h):
    h = ph.hash(attempt)  # parametri noi
```
Legătură: Django face asta implicit: `make_password` folosește PBKDF2, iar Argon2 îl activezi din `PASSWORD_HASHERS`. Keycloak are și el propria politică de hashing.
Limită: Hash-ul lent costă și la login: alegi parametrii astfel încât verificarea să dureze zeci până la sute de milisecunde, iar endpoint-ul de login are rate limiting, altfel devine țintă de DoS.
La interviu: „Parolele le stochez cu un algoritm de password hashing, lent intenționat și cu salt: Argon2id sau bcrypt. SHA-256, chiar cu salt, e prea rapid: pe GPU permite miliarde de încercări pe secundă.”
Verificare: De ce nu ajunge SHA-256 aplicat de 10 ori la rând?
Răspuns verificare: Rămâne extrem de rapid: de 10 ori mai lent înseamnă tot sute de milioane de încercări pe secundă pe GPU. Algoritmii de password hashing au costul reglabil, iar Argon2id cere și memorie, cu care GPU-urile se descurcă greu.
Varianta greșită B: Salt-ul oprește tabelele precalculate, dar SHA-256 rămâne foarte rapid: pe GPU, miliarde de încercări pe secundă.
Varianta greșită C: Criptarea e reversibilă: cine obține cheia (din configurare, adesea chiar lângă bază) decriptează toate parolele.
Varianta greșită D: Base64 e o codificare, nu o protecție: oricine o decodifică instant.

### sec-03
Pe scurt: Verifici semnătura cu cheia publică din JWKS, algoritmul (dintr-o listă permisă), expirarea (`exp`), emitentul (`iss`) și destinatarul (`aud`).
Scop: Un token acceptat fără aceste verificări înseamnă că oricine poate fabrica un token și intra ca orice utilizator.
Mecanism: Keycloak semnează token-ul cu cheia lui privată și publică cheile publice la un URL JWKS. Serviciul tău ia cheia după `kid`, din header, și verifică semnătura, deci conținutul n-a fost modificat. Apoi verifică dacă token-ul a expirat, dacă l-a emis realm-ul așteptat (`iss`) și dacă e destinat serviciului tău (`aud`).
Pas cu pas:
```text
header: {"alg": "RS256", "kid": "k1"}
1. kid -> cheia publică din JWKS
2. alg în lista permisă (RS256)
3. semnătura e validă?
4. exp în viitor? iss, aud corecte?
abia apoi: user = sub, roluri
```
Aplicare:
```python
jwks = jwt.PyJWKClient(
    f"{ISSUER}/protocol/openid-connect/certs")
key = jwks.get_signing_key_from_jwt(token)
claims = jwt.decode(token, key.key,
                    algorithms=["RS256"],
                    audience="alerts-api",
                    issuer=ISSUER)
```
Legătură: Ai lucrat cu Keycloak: un adapter sau o bibliotecă OIDC face exact aceste verificări în spate. La interviu arăți că știi ce verifică.
Limită: JWT-ul e semnat, nu criptat: oricine îi poate citi conținutul, deci nu pui secrete în el. Iar un token valid rămâne valid până la `exp`, chiar dacă userul e dezactivat, așa că păstrezi expirări scurte.
La interviu: „La un JWT de la Keycloak verific semnătura cu cheia din JWKS, algoritmul dintr-o listă permisă, `exp`, `iss` și `aud`. Decodarea singură nu dovedește nimic, iar token-ul e semnat, nu criptat.”
Verificare: Un atacator trimite un token cu `"alg": "none"`, fără semnătură. Ce te protejează?
Răspuns verificare: Lista de algoritmi permiși (`algorithms=["RS256"]`): biblioteca respinge orice token care nu e semnat cu un algoritm din listă.
Varianta greșită B: Oricine poate crea un JWT care se decodează corect, pentru că base64 nu dovedește nimic. Doar semnătura arată că l-a emis Keycloak.
Varianta greșită C: `sub` spune cine pretinde că e userul, dar fără o semnătură validă oricine poate scrie orice `sub`.
Varianta greșită D: HTTPS protejează doar transportul. Nu spune nimic despre cine a creat token-ul sau dacă a expirat.

### sec-04
Pe scurt: OAuth2 e pentru autorizare: aplicația primește un access token ca să cheme un API. OpenID Connect adaugă identitatea peste OAuth2: un ID token care spune cine e userul.
Scop: Ai lucrat cu Keycloak, care le implementează pe amândouă. La interviu arăți că știi ce rezolvă fiecare și ce flux alegi.
Mecanism: În OAuth2, userul îi dă unei aplicații dreptul de a accesa un API în numele lui, iar aplicația primește un access token. OAuth2 nu definește cum afli cine e userul. OIDC adaugă scope-ul `openid`, un ID token (un JWT cu `sub`, `email`, `name`) și endpoint-ul `userinfo`, deci permite login.
Pas cu pas:
```text
login (Authorization Code + PKCE):
  access token -> chemi API-ul
  ID token (OIDC) -> cine e userul
  refresh token -> token-uri noi
serviciu -> serviciu: Client Credentials
```
Aplicare: Aplicații web, SPA-uri (React) și mobile: Authorization Code + PKCE. Comunicare între servicii, fără user: Client Credentials. Fluxurile Implicit și Password nu se mai recomandă.
Legătură: Într-o aplicație React cu Keycloak, ID token-ul îți dă numele userului în interfață, iar access token-ul pleacă în header-ul `Authorization: Bearer` spre API.
Limită: API-ul validează access token-ul, nu ID token-ul. ID token-ul e pentru client, ca să afle cine s-a logat, și are de obicei ca destinatar (`aud`) aplicația client, nu API-ul.
La interviu: „OAuth2 e autorizare delegată: un access token pentru API-uri. OIDC adaugă identitatea peste OAuth2, prin ID token. Pentru aplicații web și SPA folosesc Authorization Code cu PKCE, iar între servicii Client Credentials.”
Verificare: Un job care rulează noaptea cheamă API-ul de alerte, fără niciun user implicat. Ce flux folosește?
Răspuns verificare: Client Credentials: serviciul se autentifică cu propriul client id și secret (sau cu o cheie) și primește un access token pentru el însuși.
Varianta greșită B: Nu sunt același protocol: OIDC e un strat construit peste OAuth2, care adaugă identitatea.
Varianta greșită C: OIDC nu e un algoritm de semnare. Token-urile se semnează cu algoritmi ca RS256, iar OIDC e un protocol de identitate.
Varianta greșită D: OAuth2 funcționează cu orice server de autorizare, inclusiv cu un Keycloak găzduit de tine.

### sec-05
Pe scurt: `subprocess.run(["ping", "-c", "1", host])`: lista de argumente nu trece prin shell, deci `host` rămâne un singur argument, oricâte caractere speciale ar conține.
Scop: Command injection transformă un câmp de formular în execuție de comenzi pe server. E una dintre cele mai grave vulnerabilități.
Mecanism: Cu `shell=True` sau cu `os.system`, comanda e un string interpretat de shell, unde `;`, `&&`, `|` sau `$(...)` pornesc comenzi noi. Cu o listă, Python pornește direct programul `ping`, cu argumentele date, fără shell, iar `8.8.8.8; rm -rf /` devine un singur nume de host, invalid.
Pas cu pas:
```text
host = "8.8.8.8; rm -rf /"
shell=True:
  sh -c "ping -c 1 8.8.8.8; rm -rf /"
  -> două comenzi
listă: ["ping", "-c", "1", host]
  -> ping eșuează, atât
```
Aplicare:
```python
ipaddress.ip_address(host)  # validezi: doar IP-uri
subprocess.run(["ping", "-c", "1", host],
               check=True, timeout=5,
               capture_output=True)
```
Legătură: E aceeași idee ca la SQL: query-urile parametrizate separă datele de comandă, iar lista de argumente face asta pentru procese.
Limită: Lista te apără de shell, nu și de programul apelat: dacă `host` începe cu `-`, poate fi interpretat ca opțiune. De aceea validezi oricum input-ul sau pui `--` înaintea argumentelor, acolo unde programul suportă.
La interviu: „Nu trec niciodată input de la user printr-un shell. Folosesc `subprocess.run` cu listă de argumente, fără `shell=True`, și validez input-ul, ca să nu poată fi interpretat nici ca opțiune a programului.”
Verificare: Folosești lista, dar userul trimite `host = "-f"`. E vreo problemă?
Răspuns verificare: Da, una mai mică: `ping` primește `-f` ca opțiune (flood), nu ca nume de host. Shell-ul nu e implicat, dar programul tot interpretează argumentul. Validarea input-ului rezolvă și asta.
Varianta greșită B: `strip()` scoate doar spațiile de la capete. `;` și celelalte caractere speciale rămân, iar `os.system` trece totul prin shell.
Varianta greșită C: Cu `shell=True`, f-string-ul ajunge întreg la shell, care execută și comenzile adăugate după `;`.
Varianta greșită D: Concatenarea nu schimbă nimic față de f-string: shell-ul primește tot string-ul și execută orice comandă injectată.

### sec-06
Pe scurt: SSRF: atacatorul dă un URL spre o resursă internă, iar serverul tău face request-ul în locul lui, din rețeaua internă.
Scop: Serverul are acces la lucruri pe care internetul nu le vede: servicii de admin, baze de date, metadata cloud cu credențiale. SSRF îl transformă în proxy pentru atacator.
Mecanism: Request-ul pleacă de pe serverul tău, deci trece de firewall-uri și ajunge la adrese interne. Un URL ca `http://169.254.169.254/latest/meta-data/iam/security-credentials/` poate întoarce, pe AWS fără IMDSv2, credențialele temporare ale rolului mașinii.
Pas cu pas:
```text
POST /import
  {"url": "http://169.254.169.254/..."}
serverul -> GET metadata, din interior
răspuns -> credențiale AWS
atacatorul le primește în răspuns
```
Aplicare: Folosești un allowlist de domenii; rezolvi DNS-ul și blochezi IP-urile private, loopback și link-local, verificând IP-ul la care te conectezi efectiv; controlezi sau dezactivezi redirect-urile; pe AWS impui IMDSv2. Ideal, request-urile spre exterior pleacă printr-un proxy de egress dedicat.
Legătură: În OWASP Top 10:2025, SSRF a intrat în Broken Access Control: serverul accesează resurse în numele cuiva care n-ar avea voie la ele.
Limită: Nu ajunge să validezi textul URL-ului: un domeniu poate rezolva la un IP intern (DNS rebinding), iar un redirect poate trimite request-ul spre interior după ce validarea a trecut.
La interviu: „Un endpoint care descarcă de la un URL dat de user e expus la SSRF: serverul poate fi folosit să acceseze servicii interne sau metadata cloud. Folosesc allowlist, blochez IP-urile private și link-local după rezolvarea DNS, controlez redirect-urile și impun IMDSv2.”
Verificare: Validezi că URL-ul începe cu `https://files.partener.com`, apoi urmezi automat redirect-urile. Unde e gaura?
Răspuns verificare: Serverul partenerului, sau un atacator care îl controlează, poate răspunde cu un redirect spre `http://169.254.169.254/...`, iar clientul tău îl urmează. Validezi fiecare destinație, inclusiv după redirect, sau dezactivezi redirect-urile.
Varianta greșită B: XSS înseamnă script injectat în pagina din browserul altui user. Aici, request-ul periculos îl face serverul tău.
Varianta greșită C: CSRF înseamnă că alt site declanșează o acțiune folosind cookie-urile userului. Problema de aici e ce poate accesa serverul tău, nu cine declanșează request-ul.
Varianta greșită D: Clickjacking înseamnă să păcălești userul să dea click într-un iframe ascuns. N-are legătură cu request-urile făcute de server.

### sec-07
Pe scurt: `hmac.compare_digest(a, b)` compară în timp constant, deci timpul de răspuns nu dezvăluie câte caractere din token sunt corecte.
Scop: Comparațiile de token-uri, semnături de webhook sau API key-uri sunt ținte pentru timing attacks, iar o funcție standard închide complet problema.
Mecanism: `==` se oprește la primul caracter diferit, așa că un token care începe corect e respins puțin mai încet decât unul greșit de la primul caracter. Măsurând statistic mii de răspunsuri, un atacator poate ghici token-ul caracter cu caracter. `compare_digest` parcurge mereu toată lungimea, indiferent unde apare diferența.
Pas cu pas:
```text
secret: "k7Q9..."
"a..." vs "k..." -> diferă la 1, rapid
"k7a..." vs "k7Q..." -> la 3, mai lent
=> atacatorul află caracter cu caracter
compare_digest -> mereu același timp
```
Aplicare:
```python
expected = hmac.new(SECRET, body,
                    hashlib.sha256).hexdigest()
if not hmac.compare_digest(expected, sig_header):
    raise HTTPException(status_code=401)
```
Legătură: Așa verifici semnătura unui webhook (GitHub, Stripe): calculezi HMAC-ul local și îl compari, în timp constant, cu cel din header.
Limită: `compare_digest` ascunde unde diferă valorile, nu și lungimea lor. Iar token-urile le generezi cu modulul `secrets` (`secrets.token_urlsafe(32)`), nu cu `random`, care e previzibil.
La interviu: „Compar token-uri și semnături cu `hmac.compare_digest`, în timp constant, ca timpul de răspuns să nu dezvăluie prefixul corect; `==` se oprește la primul caracter diferit. Token-urile le generez cu `secrets`.”
Verificare: Generezi token-uri de resetare a parolei cu `random.choice` dintr-un alfabet. Ce problemă ai?
Răspuns verificare: `random` e un generator previzibil: din suficiente valori observate, starea lui poate fi reconstruită, iar token-urile viitoare pot fi ghicite. Folosești `secrets.token_urlsafe`.
Varianta greșită B: `==` se oprește la primul caracter diferit, deci timpul de răspuns depinde de cât de mult din token e corect.
Varianta greșită C: `is` compară identitatea obiectelor, nu valoarea: două string-uri egale pot fi obiecte diferite, deci verificarea ar eșua aleator.
Varianta greșită D: Așa cum e scrisă, compară două obiecte hash, nu digest-urile, deci rezultatul e mereu `False`. Soluția standard rămâne `compare_digest`.

### sec-08
Pe scurt: Broken Access Control: userul autentificat poate accesa sau modifica date și acțiuni la care n-ar trebui să aibă drept.
Scop: E pe primul loc pentru că apare în aproape orice aplicație testată și nu o prinde automat niciun framework: verificarea drepturilor ține de logica ta.
Mecanism: Autentificarea răspunde la „cine ești”, autorizarea la „ai voie la asta”. Cazul clasic e IDOR: `GET /alerts/123` verifică doar că userul e logat, nu și că alerta 123 aparține tenantului lui, deci schimbând id-ul vezi datele altcuiva.
Pas cu pas:
```text
user din tenantul A: GET /alerts/123
  alerta 123 e a tenantului B
fără verificare -> 200, datele lui B
cu filtru pe tenant în query -> 404
```
Aplicare:
```python
alert = db.scalar(select(Alert).where(
    Alert.id == alert_id,
    Alert.tenant_id == user.tenant_id))
if alert is None:
    raise HTTPException(status_code=404)
```
Legătură: În DRF faci asta în `get_queryset()`, filtrând după userul curent, plus `permission_classes`. Tot aici a intrat în 2025 și SSRF (SEC-06).
Limită: Un 404 în loc de 403 ascunde și existența resursei. Iar verificarea se face pe server, la fiecare endpoint: butoanele ascunse în interfață nu sunt control de acces.
La interviu: „Broken Access Control e pe locul 1 atât în 2021, cât și în 2025. Exemplul clasic e IDOR: verifici autentificarea, dar nu dreptul asupra obiectului. Filtrez fiecare query după tenant sau owner și testez explicit accesul încrucișat.”
Verificare: Ce test scrii ca să prinzi un IDOR pe `/alerts/{id}`?
Răspuns verificare: Creezi o alertă pentru tenantul B, te autentifici ca user din tenantul A și ceri alerta respectivă. Testul trece doar dacă răspunsul e 404 (sau 403).
Varianta greșită B: Injection a fost pe locul 3 în 2021 și a coborât pe locul 5 în 2025.
Varianta greșită C: XSS nu e o categorie separată: face parte din Injection.
Varianta greșită D: Security Misconfiguration a urcat pe locul 2 în 2025, dar locul 1 a rămas al lui Broken Access Control.

### sec-09
Pe scurt: Userul de DB al aplicației primește doar drepturile de care are nevoie (SELECT, INSERT, UPDATE, DELETE pe tabelele ei), nu superuser și nici drepturi de schimbare a schemei.
Scop: Dacă aplicația e compromisă, de exemplu printr-un SQL injection, paguba se oprește la ce putea face ea, nu la tot serverul de baze de date.
Mecanism: Postgres verifică drepturile la fiecare query. Un superuser poate citi orice tabelă, șterge baze întregi sau citi fișiere de pe server cu `COPY ... FROM`. Un rol limitat primește `permission denied` pentru tot ce nu i s-a dat explicit.
Pas cu pas:
```text
SQL injection în aplicație:
  ca superuser -> DROP DATABASE, fișiere
  ca app_rw -> doar tabelele aplicației
migrațiile -> alt rol (app_migrator),
  folosit doar la deploy
```
Aplicare:
```sql
CREATE ROLE app_rw LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA app TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA app TO app_rw;
GRANT USAGE
  ON ALL SEQUENCES IN SCHEMA app TO app_rw;
```
Legătură: E același principiu ca rolurile din Keycloak: fiecare client primește doar rolurile de care are nevoie, nu admin peste tot.
Limită: Least privilege nu înlocuiește query-urile parametrizate, doar limitează paguba. Iar drepturile tind să se adune în timp (permisiuni adăugate „temporar”), deci le revizuiești periodic.
La interviu: „Aplicația folosește un rol cu doar drepturile de care are nevoie, pe tabelele ei; migrațiile rulează cu alt rol, doar la deploy. Dacă aplicația e compromisă, atacatorul are doar drepturile ei. E defense in depth.”
Verificare: Aplicația are doar SELECT, INSERT, UPDATE și DELETE, dar migrațiile rulează la pornirea containerului, cu același user. Ce trebuie să schimbi?
Răspuns verificare: Migrațiile au nevoie de drepturi pe schemă (CREATE, ALTER), deci le rulezi separat, cu un rol dedicat, într-un job de deploy, iar aplicația rămâne pe rolul limitat.
Varianta greșită B: Ca superuser, o singură vulnerabilitate în aplicație dă acces complet la tot serverul de baze de date.
Varianta greșită C: Un user comun leagă toate serviciile: compromiterea unuia le expune pe toate, iar în loguri nu mai știi cine a făcut ce.
Varianta greșită D: Rețeaua internă nu e un control de securitate: orice serviciu compromis din ea ar avea acces liber la DB.

### sec-10
Pe scurt: Într-un secret manager (AWS Secrets Manager, Vault), injectat în aplicație la runtime, cu acces controlat, auditat și rotație.
Scop: Un secret scăpat (pe un laptop, în logurile de CI, într-o imagine publicată) trebuie să fie ușor de revocat și înlocuit, iar accesul la el trebuie să lase urme.
Mecanism: Secretul stă criptat într-un serviciu dedicat, cu permisiuni pe identitatea aplicației (rolul IAM, service account-ul). La pornire, aplicația îl citește sau îl primește de la orchestrator, ca variabilă de mediu ori ca fișier montat. Rotația schimbă valoarea fără modificări în cod sau în imagine.
Pas cu pas:
```text
secret manager: api_key (criptat, auditat)
rolul aplicației: drept de citire
pornire: secretul -> variabilă de mediu
  sau fișier în /run/secrets/
rotație: se schimbă doar valoarea
```
Aplicare: În Docker Swarm folosești `docker secret create`, iar secretul apare ca fișier în `/run/secrets/`; pe AWS, Secrets Manager plus rolul IAM al task-ului. În CI pui un scanner de secrete (secret detection în GitLab), ca să prinzi ce ajunge din greșeală în cod.
Legătură: Ai lucrat cu Docker Swarm: secretele lui funcționează exact așa, montate ca fișiere doar în serviciile care le cer.
Limită: Variabilele de mediu pot scăpa în loguri, în dump-uri de eroare sau în `docker inspect`; fișierele montate sunt de obicei mai sigure. Iar un secret comis o dată în git rămâne în istoric: îl rotești, nu doar îl ștergi din cod.
La interviu: „Secretele stau într-un secret manager și sunt injectate la runtime, cu acces auditat și rotație; niciodată în cod, într-un `.env` comis sau în imagine. În CI rulez secret detection, iar un secret scăpat îl rotesc imediat.”
Verificare: Ai comis din greșeală un API key, apoi l-ai șters într-un commit nou. Ești în siguranță?
Răspuns verificare: Nu: cheia rămâne în istoricul git și în clonele existente. O rotești imediat (o revoci și generezi alta), iar curățarea istoricului vine abia după.
Varianta greșită B: Repo-urile private se clonează pe multe laptopuri și în pipeline-uri, iar un singur acces scăpat expune secretul. În plus, rotația ar cere modificare de cod și deploy.
Varianta greșită C: Un `.env` comis are aceleași probleme ca un secret hardcodat: ajunge în istoric și în fiecare clonă.
Varianta greșită D: Variabilele setate la build rămân în imagine și pot fi citite de oricine o are (`docker history`, `docker inspect`).

### sec-11
Pe scurt: Software Supply Chain Failures (A03:2025): riscurile din dependențele pe care le instalezi și din pipeline-ul care îți construiește și publică aplicația.
Scop: Un proiect Python tipic are sute de dependențe directe și indirecte. Una compromisă (typosquatting, cont de maintainer furat) rulează cod pe mașinile tale și în producție.
Mecanism: Categoria extinde „Vulnerable and Outdated Components” din 2021: nu mai e vorba doar de versiuni cu CVE-uri cunoscute, ci de tot lanțul: de unde vin pachetele, cine le-a publicat, ce rulează la instalare, cum e protejat pipeline-ul CI/CD și dacă livrezi chiar artefactele construite de tine.
Pas cu pas:
```text
atacatorul publică „reqeusts” (typosquat)
dev: pip install reqeusts
  -> cod rulat la instalare
sau: o versiune nouă, compromisă,
  preluată automat fără lock file
```
Aplicare: Fixezi dependențele cu hash-uri (lock file: `uv lock`, `pip-compile --generate-hashes`, Poetry), le scanezi (pip-audit, dependency scanning în GitLab), folosești surse de pachete de încredere, cum ar fi un mirror intern, limitezi drepturile pipeline-ului și semnezi artefactele.
Legătură: Celălalt nou-venit din 2025 e A10, Mishandling of Exceptional Conditions: erori tratate greșit, care lasă aplicația într-o stare nesigură. Iar SSRF a fost mutat în Broken Access Control.
Limită: Scanerele găsesc doar vulnerabilitățile cunoscute. Un pachet compromis recent sau unul malițios nou nu apare încă în bazele de date, de aceea contează și sursele de încredere, și fixarea versiunilor.
La interviu: „Categoria nouă din OWASP 2025 care mă privește direct e Software Supply Chain Failures: fixez dependențele cu hash-uri, le scanez cu pip-audit sau în GitLab, folosesc surse de încredere și protejez pipeline-ul CI/CD.”
Verificare: `requirements.txt` conține `requests>=2.0`, fără lock file. Ce risc ai la fiecare build?
Răspuns verificare: Fiecare build poate instala altă versiune, inclusiv una nouă compromisă sau cu o regresie. Cu lock file și hash-uri instalezi exact ce ai verificat.
Varianta greșită B: SSRF n-a devenit categorie separată: în 2025 a fost inclus în Broken Access Control.
Varianta greșită C: XSS a rămas parte din Injection, nu a fost separat.
Varianta greșită D: Buffer overflow-urile nu formează o categorie OWASP Top 10, iar categoria nouă privește lanțul de aprovizionare, nu limbajul.
