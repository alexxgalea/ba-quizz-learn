<!-- Desfășurările fișei `ops` (7 puncte: observabilitate și GitLab CI). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_ops.md (secțiunea 36). Fără C++: nimic din modul nu are echivalent real în C++11/17. Exemplele Python rulează; YAML și comenzi sunt în blocuri `text`. -->

### harta
Problema: Un serviciu din producție încetinește sau dă erori, iar userii se plâng înaintea ta. Fără date nu știi unde e problema, fără ținte nu știi dacă e gravă, iar o alertă prost făcută te trezește degeaba sau tace când trebuie. Modulul răspunde la patru întrebări: ce semnale colectezi, cum le citești, când te alertezi și cum livrezi codul într-un pipeline de încredere.
Grupuri:
- 1–3: ce măsori și cum citești numerele (semnale, RED și USE, percentile)
- 4–5: când contează o problemă (SLO, buget de erori, alerte)
- 6: cum urmărești un request prin servicii (correlation ID)
- 7: cum livrezi codul (GitLab CI)

### 1
Greu: da
Problema: Userii spun că „aplicația e lentă”. Dashboardul arată că p95 a crescut, dar nu și care endpoint sau serviciu. Logurile au un milion de linii, iar nimeni nu știe de unde să pornească.
Ideea: Trei semnale răspund la trei întrebări. Metricile sunt numere agregate în timp (Prometheus, Grafana) și spun că e o problemă și cât de mare. Trace-urile (OpenTelemetry, New Relic APM) arată drumul unui request prin servicii, deci unde s-a pierdut timpul. Logurile sunt evenimente cu context, scrise în JSON, și spun de ce. Pornești de la metrică, mergi la trace, apoi la log.
Exemplu:
```text
metrică: p99 pe /alerts = 7 s
trace: 6,5 s în SELECT din Postgres
log: seq scan pe alerts, 40M rânduri
```
Legătură: OBS-02 și OBS-04. New Relic APM (OBS-04) e partea de trace-uri: defalcă tranzacția pe componente.

### 2
Greu: da
Problema: Ai 40 de grafice pentru un singur serviciu și nu știi care contează. Alt serviciu e un worker fără request-uri HTTP, iar un grafic de request-uri pe secundă nu-i spune nimic.
Ideea: RED e pentru servicii cu request-uri: Rate (request-uri pe secundă), Errors (câte eșuează), Duration (cât durează). USE e pentru resurse (CPU, disc, rețea): Utilization (cât e ocupată), Saturation (cât așteaptă la coadă), Errors. La o coadă urmărești adâncimea și vârsta celui mai vechi mesaj: vârsta arată cât așteaptă un mesaj, iar adâncimea singură nu.
Exemplu:
```python
from datetime import datetime as D
m = [D(2026, 11, 3, 9, 0),
     D(2026, 11, 3, 9, 7)]
acum = D(2026, 11, 3, 9, 12)
print(acum - min(m))  # → 0:12:00
```
Legătură: OBS-03. Un worker fără HTTP se măsoară cu USE și cu vârsta mesajelor din coadă, nu cu RED.

### 3
Problema: Dashboardul arată latență medie de 245 ms, deci pare în regulă. Totuși un request din zece durează 2 secunde, iar userii se plâng.
Ideea: Media adună toate duratele și ascunde coada lentă. p95 e valoarea sub care se află 95% din request-uri, p99 la fel pentru 99%. Urmărești percentilele per endpoint, calculate din histograme. Percentilele nu se mediază între instanțe: le calculezi din histograma agregată, cu `histogram_quantile` în Prometheus.
Exemplu:
```python
t = [50] * 90 + [2000] * 10  # ms
print(sum(t) / len(t))  # → 245.0
print(sorted(t)[94])  # → 2000
```
Legătură: OBS-01. Valoarea 2000 e p95: al 95-lea request din 100, în ordine crescătoare.

### 4
Greu: da
Problema: Clientul întreabă cât de disponibil e serviciul. Echipa răspunde „foarte”. Nimeni nu poate spune dacă luna asta a mers bine, nici când e momentul să oprești feature-urile și să repari stabilitatea.
Ideea: SLI e măsura (de pildă fracția request-urilor reușite). SLO e ținta internă pentru acea măsură (99,9% într-o lună). SLA e contractul cu clientul, cu consecințe dacă îl ratezi. Error budget e cât îți permiți să ratezi până la SLO: la 99,9% pe 30 de zile, 43,2 minute. Când bugetul se golește, o politică uzuală oprește lansările și repară stabilitatea.
Exemplu:
```python
slo, minute = 0.999, 30 * 24 * 60
buget = minute * (1 - slo)
print(round(buget, 1))  # → 43.2
```
Legătură: OBS-09. Pentru latență, SLI-ul e o percentilă (punctul 3), nu media.

### 5
Problema: Telefonul sună la 3 noaptea pentru „CPU 85% pe worker-3”, deși userii n-au simțit nimic. Peste o lună ignori alertele.
Ideea: Alertezi pe simptomul pe care îl simte userul (rata erorilor 5xx, latența p99), nu pe cauza posibilă (CPU). O alertă cere o acțiune acum; altfel e doar un grafic. Condiția trebuie să țină un timp (`for: 10m`), ca un vârf scurt să nu trezească pe nimeni.
Exemplu:
```text
- alert: Erori5xx
  expr: ratio_5xx_5m > 0.05
  for: 10m
```
Legătură: OBS-01 și punctul 4. O alertă bună ține cont de bugetul de erori, nu de un prag ales la întâmplare.

### 6
Greu: da
Problema: Un user raportează o eroare. Request-ul a trecut prin API, a publicat un task Celery și a ajuns într-un worker. Logurile din cele trei locuri nu au nimic în comun, deci nu poți spune care linii țin de același request.
Ideea: Generezi un ID la intrare (sau îl iei din header, de pildă `X-Request-ID`) și îl pui în `contextvars`; fiecare linie de log îl primește de acolo. La publicarea unui task îl pui în headerele lui, iar workerul îl pune în context când pornește task-ul. Apoi cauți ID-ul și vezi tot drumul. În loguri nu intră secrete.
Exemplu:
```python
import contextvars as cv
rid = cv.ContextVar("rid")
rid.set("a1b2")
def line(m):
    return f"{rid.get()} {m}"
print(line("start"))  # → a1b2 start
```
Legătură: OBS-05. Pentru trace-uri, standardul este header-ul `traceparent` (W3C), pe care OpenTelemetry îl propagă singur.

### 7
Greu: da
Problema: Pipeline-ul durează 20 de minute, fiindcă tot ce ai rulează pe rând. Testele de integrare au nevoie de Postgres, pe care runnerul nu-l are. Iar tokenul de deploy stă într-un fișier din repo.
Ideea: `.gitlab-ci.yml` grupează joburile în stages: joburile unui stage rulează în paralel, iar următorul stage pornește după ce toate au reușit. Un runner execută fiecare job. `rules` decid dacă jobul intră în pipeline, iar `needs` îl pornește de îndată ce dependențele lui sunt gata, fără să aștepte stage-ul. `artifacts` duc rezultatele între joburi, garantat; `cache` doar accelerează. `services` pornește Postgres lângă job, sub hostname-ul `postgres`. Secretele sunt variabile protejate (doar pe ramuri protejate) și mascate.
Exemplu:
```text
unit:
  stage: test
  services: [postgres:16]
  script: pytest
image:
  stage: build
  needs: [unit]
  rules: [{if: $CI_COMMIT_TAG}]
```
Legătură: OBS-06, OBS-07 și OBS-08. Cache-ul de pip din GitLab are același rol ca ordinea layerelor din Dockerfile (DK-02).
