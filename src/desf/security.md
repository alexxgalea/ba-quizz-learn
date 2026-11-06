<!-- Desfășurările fișei `security` (11 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunile 7, 12, 21, 25, 27 și 32 (OWASP, RFC-uri, docs Python); secțiunea 32 e cea nouă. C++ doar la 3 (std::system față de execvp) și 10 (random_device, memcmp); la restul nu există un echivalent real. -->

### harta
Problema: Un endpoint Python primește de la oricine un nume, un fișier, un URL, un token, un ID. Dacă tratezi oricare dintre ele ca fiind de încredere, atacatorul o face cod pe serverul tău, o cerere în rețeaua ta internă sau factura altui client. Modulul răspunde la patru întrebări: ce date nesigure ajung să fie executate, ce poate face serverul în numele altcuiva, cum dovedești cine ești și ce ai voie, și ce păstrezi și ce instalezi.
Grupuri:
- 1–3: date de la utilizator care ajung să se execute (SQL, deserializare, comenzi)
- 4: serverul păcălit să facă cereri în locul atacatorului (SSRF)
- 5–7: cine ești (parole, JWT, OAuth2 și OIDC)
- 8: ce ai voie (autorizare la nivel de obiect)
- 9–11: ce păstrezi și ce instalezi (secrete, comparații, dependențe)

### 1
Problema: Căutarea după nume e scrisă cu un f-string. Cineva trimite numele `x' OR '1'='1` și primește toate rândurile.
Ideea: Cu un placeholder (`?` la `sqlite3`, `%s` la `psycopg`), driverul tratează valoarea ca date, nu ca sintaxă SQL. Placeholderul ține locul unei valori, nu al unui nume de tabel sau de coloană; pe acelea (la `ORDER BY`) le alegi dintr-o listă albă. Să „escapezi” singur textul nu e o apărare.
Exemplu:
```python
import sqlite3
c = sqlite3.connect(":memory:")
n = "x' OR '1'='1"
f = f"select 1 where 'a'='{n}'"
list(c.execute(f))  # → [(1,)]
q = "select 1 where 'a'=?"
list(c.execute(q, [n]))  # → []
```
Legătură: Fișa sqlalchemy, punctul 11: `text()` cu `:nume` face același lucru. Django ORM parametrizează singur; riscul apare la `.raw()` cu f-string.

### 2
Problema: Sesiunile stau în Redis, serializate cu `pickle`. Cineva ajunge să scrie în cheia unei sesiuni (o instanță fără parolă, un serviciu compromis). La următorul `loads`, serverul tău rulează codul lui.
Ideea: `pickle` reconstruiește un obiect apelând o funcție indicată chiar în date (`__reduce__`), deci `loads` poate apela orice. În exemplu e `print`; ar putea fi `os.system`. `yaml.load` cu `Loader` sau `UnsafeLoader` face la fel, iar `yaml.safe_load` construiește doar tipuri simple. Pentru date nesigure folosești JSON și validare (Pydantic).
Exemplu:
```python
import pickle
class Evil:
    def __reduce__(self):
        return print, ("rulat",)
d = pickle.dumps(Evil())
x = pickle.loads(d)  # → rulat
```
Legătură: SEC-01. Celery folosește implicit JSON, nu pickle, din versiunea 4.0 (CEL-11).

### 3
Problema: Un endpoint rulează `ping` pe host-ul din cerere, cu `shell=True`. Cineva trimite un host urmat de `;` și altă comandă. Shell-ul le rulează pe amândouă.
Ideea: Cu `shell=True`, șirul trece printr-un shell, care interpretează `;`, `&&` și `$()`. Cu o listă, `subprocess.run([...])` pornește programul direct, iar fiecare element e un singur argument.
Exemplu:
```python
import subprocess as sp
co = sp.check_output
n = "a; echo X"
r = co("echo " + n, shell=True)
r  # → b'a\nX\n'
r = co(["echo", n])
r  # → b'a; echo X\n'
```
În C++: `std::system(("ping " + host).c_str())` trimite șirul la un shell, ca `shell=True`. Cu `fork` și `execvp` pasezi un vector de argumente, fără shell.
Unde nu ține: `execvp` e POSIX, nu standard C++. Standardul are doar `std::system`: lista nu are echivalent portabil.
Legătură: SEC-05.

### 4
Greu: da
Problema: Endpoint-ul `/preview?url=…` descarcă o pagină și o arată. Cineva trimite `http://169.254.169.254/latest/meta-data/`. Serverul, aflat în rețeaua internă, citește metadatele instanței, care pot conține chei temporare ale rolului lui.
Ideea: Compari host-ul cu o listă albă, nu cu una de interzise: acelea se ocolesc. Rezolvi tu numele prin DNS, verifici și IP-ul, ca în exemplu (nu privat, nu loopback, nu link-local, deci nu `169.254.169.254`) și te conectezi la exact acel IP. Un al doilea lookup poate da altă adresă (DNS rebinding). Dezactivezi redirect-urile, fiindcă un host permis te poate trimite spre unul interzis. Pe AWS, IMDSv2 cere întâi un `PUT` cu header-e, iar multe SSRF-uri fac doar `GET`.
Exemplu:
```python
from ipaddress import ip_address
def ok(a):
    x = ip_address(a)
    return x.is_global
ok("8.8.8.8")  # → True
ok("169.254.169.254")  # → False
ok("10.0.0.5")  # → False
ok("::1")  # → False
```
Legătură: SEC-06. În OWASP 2025, SSRF a intrat în Broken Access Control (punctul 8).

### 5
Greu: da
Problema: Baza de date scapă la un atacator, iar parolele erau `sha256(parola)`. Pe un GPU, SHA-256 se calculează de miliarde de ori pe secundă, deci parolele slabe cad repede. Doi utilizatori cu aceeași parolă au același hash.
Ideea: Salt-ul e aleator și unic per parolă, deci aceeași parolă dă hash-uri diferite, iar tabelele precalculate nu ajută. Algoritmul e lent intenționat. OWASP pune pe primul loc Argon2id (minim 19 MiB, 2 iterații, paralelism 1), apoi scrypt. bcrypt e pentru sisteme vechi, cu limită de 72 de octeți. PBKDF2-HMAC-SHA256, cu 600 000 de iterații, e pentru mediile cu cerințe FIPS. Valoarea stocată ține algoritmul, parametrii și salt-ul, ca să poți crește costul mai târziu. Criptarea e reversibilă: cine ia cheia citește toate parolele.
Exemplu:
```python
import hashlib, os
def h(p, s):
    return hashlib.pbkdf2_hmac(
        "sha256", p, s, 600_000)
a, b = map(os.urandom, (8, 8))
x = h(b"pw", a)
x == h(b"pw", a)  # → True
x == h(b"pw", b)  # → False
```
Legătură: SEC-02. Django folosește implicit PBKDF2 cu SHA-256 și stochează `algoritm$iterații$salt$hash`; Argon2 îl pui în `PASSWORD_HASHERS`.

### 6
Greu: da
Problema: Un client schimbă în payload `"role": "user"` în `"admin"` și retrimite tokenul. Serverul îl acceptă, fiindcă a citit claim-urile fără să verifice semnătura. Sau acceptă un token făcut pentru alt serviciu.
Ideea: Un JWT obișnuit e semnat, nu criptat. Payload-ul e doar base64url: exemplul îl decodează fără nicio cheie, deci nu pui secrete în el. Semnătura arată doar dacă tokenul a fost modificat. Verifici semnătura cu cheia din JWKS a emitentului, algoritmul dintr-o listă permisă (`algorithms=[...]`, nu cel din antet), `exp`, `iss` și `aud`. PyJWT verifică `exp` doar dacă tokenul îl are (îl ceri cu `require`) și `iss` doar dacă îi dai `issuer=`.
Exemplu:
```python
import base64 as b
p = b.urlsafe_b64encode(
    b'{"sub":"7"}').rstrip(b"=")
h = b"eyJhbGciOiJIUzI1NiJ9"
t = h + b"." + p + b".sig"
x = t.split(b".")[1]
y = b.urlsafe_b64decode(x+b"==")
y  # → b'{"sub":"7"}'
```
Legătură: SEC-03. Keycloak își publică cheile publice la `/realms/{realm}/protocol/openid-connect/certs`.

### 7
Greu: da
Problema: Aplicația React trebuie să apeleze API-ul în numele utilizatorului, fără să-i vadă parola. Apoi vrei „Intră cu contul firmei”, iar OAuth2 singur nu spune cine e utilizatorul.
Ideea: OAuth2 e autorizare delegată: aplicația primește un access token cu scope-uri limitate. OIDC adaugă identitatea peste OAuth2: scope-ul `openid` și un ID token (JWT) cu datele autentificării. ID token-ul e pentru aplicația client, access token-ul pentru API. Frontend-ul folosește Authorization Code + PKCE: clientul trimite întâi hash-ul unui secret, apoi secretul, deci un cod furat nu ajunge. Între servicii, fără utilizator, folosești Client Credentials.
Exemplu:
```python
import base64, hashlib
# vector din RFC 7636, anexa B
v = "dBjftJeZ4CVP-mB92K27uhbUJU"
v += "1p1r_wW1gFWFOEjXk"
d = hashlib.sha256(v.encode())
c = base64.urlsafe_b64encode(
    d.digest()).rstrip(b"=")
c[:9].decode()  # → 'E9Melhoa2'
```
Legătură: SEC-04. RFC 9700 cere PKCE la clienții publici, descurajează implicit grant și interzice password grant. Punctul 12 din fișa frontend arată același flux într-un SPA.

### 8
Greu: da
Problema: `GET /invoices/42` verifică doar că utilizatorul e autentificat. Clientul A schimbă 42 în 43 și citește factura clientului B. Endpoint-ul era protejat, obiectul nu.
Ideea: Autentificarea spune cine ești, iar rolul de la endpoint spune ce fel de acțiuni poți face. Autorizarea la nivel de obiect spune dacă acest rând e al tău: o verifici la fiecare acces prin ID, după `tenant_id` din token. UUID-urile greu de ghicit ajută, dar nu înlocuiesc verificarea. OWASP numește asta Broken Access Control (A01), prima categorie și în 2021, și în 2025; în lista pentru API-uri e BOLA, API1:2023.
Exemplu:
```python
owner = {42: 1, 43: 2}
def get(tenant, i):
    if owner[i] != tenant:
        raise PermissionError
    return f"factura {i}"
get(1, 42)  # → 'factura 42'
get(1, 43)  # ! PermissionError
```
Legătură: SEC-08. Punctul 8 din fișa design pune aceeași regulă și în Postgres, cu row-level security, ca plasă de siguranță. În DRF, `has_object_permission` rulează la `get_object()`, dar nu filtrează listele: acolo filtrezi `get_queryset()`.

### 9
Greu: da
Problema: Cineva comite `.env` cu parola bazei de date, apoi îl șterge într-un commit nou. Fișierul dispare, dar parola rămâne în istoric și în fiecare clonă. Altcineva pune parola într-un `ENV` din Dockerfile, iar ea rămâne în imagine.
Ideea: Un secret manager ține secretele și le dă aplicației la rulare, deci ele nu ajung în cod, în istoricul git sau într-un layer al imaginii. Un secret ajuns unde nu trebuia se revocă și se rotește; ștergerea din git nu ajunge. Least privilege înseamnă că userul de DB al aplicației are doar drepturile de care are nevoie, nu e superuser. La fel rolul IAM și userul din container.
Exemplu:
```text
$ git rm .env
$ git commit -m "rm"
$ git log -p | grep DB_PASS
-DB_PASS=hunter2
+DB_PASS=hunter2
```
Legătură: SEC-09 și SEC-10. În Docker Swarm, un `docker secret` ajunge în container ca fișier în `/run/secrets/`, pe un sistem de fișiere din memorie, nu ca variabilă de mediu.

### 10
Greu: da
Problema: Compari tokenul primit cu cel așteptat prin `==`, care se oprește la primul caracter diferit. Un atacator care măsoară timpul răspunsului poate ghici tokenul caracter cu caracter. Iar tokenul de resetare a parolei a fost generat cu `random`, ale cărui ieșiri pot fi prezise.
Ideea: `hmac.compare_digest(a, b)` compară fără să se oprească la prima diferență. Ambele argumente au același tip: `str` doar ASCII sau bytes. Modulul `secrets` ia octeții de la sistemul de operare (`token_urlsafe`, `token_hex`). `random` e un generator pentru simulări: cu același seed dă aceeași secvență.
Exemplu:
```python
import hmac, random, secrets
eq = hmac.compare_digest
eq("tok1", "tok1")  # → True
random.seed(7)
a = random.random()
random.seed(7)
a == random.random()  # → True
len(secrets.token_hex(4))  # → 8
```
În C++: `std::mt19937` cu seed fix dă aceeași secvență, ca `random`. `std::random_device` e sursa de aleator nedeterminist, rolul lui `secrets`. `memcmp` sau `==` pe șiruri pot ieși la prima diferență.
Unde nu ține: `std::random_device` poate fi implementat cu un generator pseudo-aleator, iar atunci `entropy()` întoarce 0.0. Standardul nu cere comparații în timp constant, așa că pentru ele folosești funcția din biblioteca de criptografie.
Legătură: SEC-07.

### 11
Greu: da
Problema: `requirements.txt` listează `requests` fără versiune. Peste o lună, `pip install` aduce altă versiune a lui `requests`, deci build-ul nu se mai repetă. O dependență are de luni o vulnerabilitate cunoscută, iar nimeni nu știe.
Ideea: Fixezi versiunile exacte, și pe cele indirecte, cu hash-uri: cu `--require-hashes`, pip verifică fiecare fișier. `pip-audit` compară ce ai instalat cu vulnerabilitățile cunoscute și rulează în CI. OWASP Top 10:2025 are A03, Software Supply Chain Failures, care extinde A06:2021 (componente vulnerabile) la tot lanțul, pipeline-ul CI/CD inclus.
Exemplu:
```text
$ cat requirements.txt
flask==0.12
$ pip-audit -r requirements.txt
flask 0.12 PYSEC-2019-179 1.0
...
```
Legătură: SEC-11. Și `FROM python:3` din Dockerfile e o dependență nefixată.
