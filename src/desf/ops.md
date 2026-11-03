<!-- Desfășurările fișei `ops` (7 puncte: observabilitate și GitLab CI). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/_desf_facts_ops.md (secțiunea 36). Fără C++: nimic din modul nu are echivalent real în C++11/17. Exemplele Python rulează; YAML și comenzi sunt în blocuri `text`. -->

### harta
Problema: Un serviciu din producție încetinește sau dă erori, iar userii se plâng înaintea ta. Fără date nu știi unde e problema, fără ținte nu știi dacă e gravă, iar o alertă prost făcută te trezește degeaba sau tace când trebuie. Modulul răspunde la patru întrebări: ce măsori și cum citești numerele, când contează o problemă și cum te alertezi, cum urmărești un request prin servicii și cum livrezi codul într-un pipeline de încredere.
Grupuri:
- 1–3: ce măsori și cum citești numerele (semnale, RED și USE, percentile)
- 4–5: când contează o problemă și cum te alertezi (SLO, buget de erori, alerte)
- 6: cum urmărești un request prin servicii (correlation ID)
- 7: cum livrezi codul (GitLab CI)

### 1
Greu: da
Problema: Userii spun că „aplicația e lentă”. Dashboardul arată că p95 a crescut, dar nu și care endpoint sau serviciu. Logurile au un milion de linii, iar nimeni nu știe de unde să pornească.
Ideea: Trei semnale răspund la trei întrebări. Metricile sunt numere agregate în timp (Prometheus, Grafana) și spun că e o problemă și cât de mare. Trace-urile (OpenTelemetry, New Relic APM) arată drumul unui request prin servicii, deci unde s-a pierdut timpul. Logurile sunt evenimente cu context, scrise în JSON, și spun de ce. Pornești de la metrică, mergi la trace, apoi la log.
Exemplu:
```text
# valori ilustrative
metrică: p99 pe /alerts = 7 s
trace: 6,5 s în SELECT din Postgres
log: seq scan pe alerts, 40M rânduri
```
Legătură: OBS-02, cei trei piloni, și OBS-04, New Relic APM.

### 2
Greu: da
Problema: Ai 40 de grafice pentru un singur serviciu și nu știi care contează. Alt serviciu e un worker care consumă o coadă și nu știi ce să măsori la el.
Ideea: RED e pentru servicii cu request-uri: Rate (request-uri pe secundă), Errors (câte eșuează), Duration (cât durează). USE e pentru resurse (CPU, disc, rețea): Utilization (cât e ocupată), Saturation (cât așteaptă la coadă), Errors. În plus, la o coadă urmărești adâncimea și vârsta celui mai vechi mesaj: vârsta arată cât așteaptă un mesaj, iar adâncimea singură nu.
Exemplu:
```python
from datetime import datetime as D
m = [D(2026, 11, 3, 9, 0),
     D(2026, 11, 3, 9, 7)]
acum = D(2026, 11, 3, 9, 12)
print(acum - min(m))  # → 0:12:00
```
Legătură: OBS-03.

### 3
Greu: da
Problema: Dashboardul arată latență medie de 245 ms, deci pare în regulă. Totuși un request din zece durează 2 secunde, iar userii se plâng.
Ideea: Media adună toate duratele și ascunde coada lentă. p95 e valoarea sub care se află 95% din request-uri, p99 la fel pentru 99%. Urmărești percentilele per endpoint, calculate din histograme. Percentilele nu se mediază între instanțe. Le calculezi din histograma agregată, cu `histogram_quantile` în Prometheus.
Exemplu:
```python
t = [50] * 90 + [2000] * 10  # ms
print(sum(t) / len(t))  # → 245.0
print(sorted(t)[94])  # → 2000
```
Legătură: OBS-01.

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
Legătură: OBS-09. La latență, SLI-ul poate fi o percentilă (punctul 3).

### 5
Greu: da
Problema: Telefonul sună la 3 noaptea pentru „CPU 85% pe worker-3”, deși userii n-au simțit nimic. Peste o lună ignori alertele.
Ideea: Alertezi pe simptomul pe care îl simte userul, cum e rata erorilor 5xx sau latența p99. Nu alertezi pe o cauză posibilă, cum e CPU-ul. O alertă cere o acțiune acum; altfel e doar un grafic. Condiția trebuie să țină un timp, `for: 10m`, ca un vârf scurt să nu trezească pe nimeni.
Exemplu:
```text
- alert: Erori5xx
  expr: ratio_5xx_5m > 0.05
  for: 10m
```
Legătură: punctele 3 și 4.

### 6
Greu: da
Problema: Un user raportează o eroare. Request-ul a trecut prin API, a publicat un task Celery și a ajuns într-un worker. Logurile din cele trei locuri nu au nimic în comun, deci nu poți spune care linii țin de același request.
Ideea: Generezi un ID la intrare sau îl iei dintr-un header, de pildă `X-Request-ID`. Îl pui în `contextvars`, iar fiecare linie de log îl ia de acolo. La publicarea unui task îl pui în headerele lui, de pildă în semnalul Celery `before_task_publish`. La pornire, workerul îl poate pune în contextul lui. Apoi cauți ID-ul și vezi tot drumul. Pentru trace-uri, standardul e header-ul `traceparent` (W3C). În loguri nu intră secrete.
Exemplu:
```python
import contextvars as cv
rid = cv.ContextVar("rid")
rid.set("a1b2")
def line(m):
    return f"{rid.get()} {m}"
print(line("start"))  # → a1b2 start
```
Legătură: OBS-05.

### 7
Greu: da
Problema: Pipeline-ul durează 20 de minute, fiindcă tot ce ai rulează pe rând. Testele de integrare au nevoie de Postgres, pe care runnerul nu-l are. Iar tokenul de deploy stă într-un fișier din repo.
Ideea: `.gitlab-ci.yml` grupează joburile în stages (implicit build, test, deploy). Joburile unui stage pot rula în paralel, iar următorul stage pornește după ce toate au reușit. Runnerii execută joburile. `rules` decid dacă jobul intră în pipeline. `needs` pornește un job imediat ce dependențele lui sunt gata, fără să aștepte stage-ul. `artifacts` duc rezultate între joburi, garantat; `cache` doar accelerează. `services` pornește Postgres lângă job, sub hostname-ul `postgres`. Secretele sunt variabile protejate (doar pe ramuri și taguri protejate) și mascate.
Exemplu:
```text
unit:
  stage: test
  services: [postgres:16]
  script: pytest
deploy:
  stage: deploy
  needs: [unit]
  script: ./deploy.sh
```
Legătură: OBS-06, OBS-07 și OBS-08.
