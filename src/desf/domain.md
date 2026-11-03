<!-- Desfășurările fișei `domain` (11 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunea 39 (Onapsis, SAP, SOC; verificate pe onapsis.com, sap.com, learning.sap.com, NIST, MITRE), plus 20 și 22 la exemplele Python. Fără C++: modulul nu are echivalent real (spec și tichet). Ce spune Onapsis despre propriile produse e marcat în text drept afirmația firmei („după Onapsis”, „pagina produsului”); exemplele Python arată ideea în mic, nu codul Defend. -->

### harta
Problema: O companie mare își ține facturile, salariile și stocurile într-un sistem SAP, deci o compromitere îi oprește business-ul. Un SIEM generic primește logurile lui, dar nu înțelege contextul SAP: nu știe care rând e un atac. Modulul răspunde la șase întrebări: ce vinde Onapsis și pe ce zone lucrează inginerii, cum detectează Defend atacurile, ce dovezi reale are Onapsis, cum arată platforma de azi, ce vocabular trebuie să știi și ce ai construi tu în jurul detecției.
Grupuri:
- 1–2: ce vinde Onapsis și pe ce zone de produs lucrează inginerii
- 3–5: cum detectează Defend (monitorizare, reguli, alerte în SIEM, pre-patch protection)
- 6–7: dovezi reale (RECON, ICMAD, OVERPASS)
- 8: platforma de azi și AI
- 9–10: vocabularul (SAP, ERP, ABAP, apoi SOC)
- 11: cum arată pipeline-ul pe care l-ai construi

### 1
Problema: O companie mare își ține facturile, salariile și stocurile într-un sistem SAP. Antivirusul și firewall-ul nu văd ce se petrece în aplicație. Dacă sistemul e compromis, se oprește business-ul.
Ideea: Onapsis vinde securitate pentru aplicații business-critical, mai ales SAP și Oracle. Research Labs caută vulnerabilități în ele și le raportează producătorului. Un comunicat din 2022 vorbește de peste 1.000 de vulnerabilități zero-day descoperite și remediate.
Analogie: Paznicul unei bănci știe ce înseamnă ușa seifului deschisă noaptea. Paznicul unui bloc de birouri vede doar o ușă.
Legătură: Cardul oral o-dom-1 cere exact prezentarea asta.

### 2
Problema: Anunțul numește trei zone de produs: Threat Detection & Response, Vulnerability Management și Compliance Automation. Pentru cineva din afară sună la fel, iar la interviu le amesteci.
Ideea: Fiecare zonă răspunde la altă întrebare a unui client SAP. Detecția întreabă dacă cineva atacă acum. Managementul vulnerabilităților întreabă ce găuri sunt deschise. Compliance-ul întreabă dacă poți dovedi unui auditor că regulile se respectă. Pe site, Defend e detecția, iar Assess e vulnerabilitățile și compliance-ul.
Exemplu:
```text
Defend: ne atacă cineva acum?
Assess: ce vulnerabilități avem?
Assess: putem dovedi conformitatea?
```
Legătură: Zonele vin din anunțul RO-1186 (research/job-8805551002-gaps.md).

### 3
Problema: La 2 noaptea cineva își dă un rol de administrator în sistemul SAP al companiei. Nimeni nu se uită la loguri până la următorul audit.
Ideea: Defend monitorizează continuu un sistem SAP. Datasheet-ul îl numește „early warning system” pentru schimbări neautorizate, abuz sau atacuri. Alerta vine cu severitate, scor de anomalie, cauză și pași de remediere. Exemplul compară rolurile de ieri cu cele de azi, în mic, nu ca în Defend.
Exemplu:
```python
old = {"ana": {"citire"}}
new = {"ana": {"citire", "admin"}}
for u, r in new.items():
    if "admin" in r - old[u]:
        print(u)  # → ana
```
Legătură: DOM-01.

### 4
Greu: da
Problema: Un sistem SAP scrie evenimente non-stop, iar un analist nu le poate citi rând cu rând. Un login ciudat arată ca oricare altul până când o regulă îl recunoaște.
Ideea: Defend rulează reguli de detecție peste evenimente. Pagina produsului spune „over 2,600 detection rules”, din care „600+ exclusive, proprietary exploit rules”. Datasheet-ul mai vechi spune „2,000+”, deci cifra crește. Datasheet-ul numește ABAP, Java, HANA și SAProuter. Pagina de azi adaugă on-prem, cloud, RISE și BTP. Același produs vorbește de „AI-powered anomaly scoring”. O regulă e o condiție pe un eveniment; exemplul încearcă două.
Exemplu:
```python
def brute(e): return e["fail"] > 4
def adm(e): return e["adm"]
e = {"fail": 7, "adm": False}
for r in (brute, adm):
    if r(e):
        print(r.__name__)  # → brute
```
Legătură: Kata k12 (motorul de reguli de detecție) și DOM-03.

### 5
Greu: da
Problema: SAP publică un patch, dar clientul îl aplică abia după testare și o fereastră de mentenanță. Între timp vulnerabilitatea e publică, iar SOC-ul nu știe dacă o exploatează cineva.
Ideea: Defend trimite alertele în SIEM, în SOAR sau în fluxuri de AI (pagina produsului). Datasheet-ul numește Splunk, Microsoft Sentinel, IBM QRadar, ArcSight și Elasticsearch Kibana. Alte SIEM-uri merg dacă primesc LEEF, CEF sau JSON syslog. „Pre-patch protection” înseamnă că monitorizezi exploatarea cât timp patch-ul lipsește: nu există încă (zero-day) sau nu e aplicat. După Onapsis, protecția vine în medie cu patru luni înaintea patch-ului oficial.
Analogie: Broasca ușii e defectă, iar lăcătușul vine peste două luni. Între timp pui o cameră pe ușă. Nu repari broasca, dar afli dacă cineva o încearcă.
Legătură: DOM-05 și DOM-08.

### 6
Greu: da
Problema: Spui la interviu „Onapsis e singura platformă aprobată de SAP”, iar intervievatorul cere un exemplu. Ai dat o afirmație mai tare decât site-ul și niciun caz concret.
Ideea: Site-ul spune „Endorsed by SAP” despre platformă. „The only SAP-endorsed automated SAP application security testing software” apare doar la Control și e afirmația firmei. RECON (CVE-2020-6287, CVSS 10) e din NetWeaver AS Java, cu patch în iulie 2020. Numele înseamnă Remotely Exploitable Code On NetWeaver. ICMAD, din februarie 2022, include CVE-2022-22536, tot CVSS 10, plus două defecte mai mici. Onapsis le-a anunțat împreună cu SAP.
Exemplu:
```text
iul. 2020: RECON, CVE-2020-6287
feb. 2022: ICMAD, CVE-2022-22536
amândouă: CVSS 10
```
Legătură: OVERPASS (punctul 7) e al treilea caz.

### 7
Greu: da
Problema: În septembrie 2026 apare un defect cu scor maxim în kernelul SAP, exploatabil de la distanță și fără parolă. Clientul trebuie să testeze patch-ul înainte să-l pună în producție. Până atunci sistemul rămâne expus.
Ideea: OVERPASS (CVE-2026-44756) e un defect în procesarea Extended Passport (EPP), structura SAP de tracing atașată cererilor. Are CVSS 10.0. Onapsis Research Labs l-a găsit și l-a raportat la SAP. Patch-ul e Security Note 3747649, din Patch Day-ul din septembrie 2026. Onapsis spune că Defend putea detecta încercările de exploatare înainte de patch. Tot după Onapsis, nu exista exploatare activă observată la publicarea articolului.
Exemplu:
```text
Research Labs găsește defectul
→ îl raportează la SAP
→ Defend detectează tentative
   (după Onapsis)
→ Patch Day: Security Note 3747649
→ clientul aplică patch-ul
```
Legătură: E exemplul tău pentru pre-patch protection (DOM-08).

### 8
Greu: da
Problema: Intervievatorul întreabă cum folosești AI în lucru. Dacă nu știi că și produsul Onapsis are straturi de AI, răspunsul rămâne generic.
Ideea: Platforma de azi are patru produse. Assess ține vulnerabilitățile. Defend face detecție și răspuns. Control analizează codul și transporturile SAP. Security Advisor dă ghidare cu AI. Peste ele stă „Agentic AI Fabric”, care rulează agenți: Autonomous SOC, VulnOps, remediere, compliance, threat intel. Anunțul cere experiență practică cu Cursor, GitHub Copilot, Claude Code, LLM APIs și scripturi agentice.
Exemplu:
```text
Assess: vulnerabilități
Defend: detecție și răspuns
Control: cod și transporturi
Security Advisor: ghidare cu AI
peste ele: Agentic AI Fabric
```
Legătură: Cardul o-beh-5 cere un exemplu concret cu AI în livrare.

### 9
Problema: Anunțul și grilele spun „SAP”, „ERP”, „ABAP” și „S/4HANA”. Dacă le amesteci, spui că ABAP e o bază de date sau că S/4HANA e un limbaj.
Ideea: SAP e firma, iar produsul ei de bază e un ERP. Un ERP ține procesele de bază ale unei companii: finanțe, contabilitate, HR, logistică. ABAP e limbajul propriu SAP pentru aplicații de business. HANA e baza de date în memorie. S/4HANA e „next-generation ERP” al SAP și rulează doar pe HANA.
Exemplu:
```text
SAP: firma și produsele ei
ERP: finanțe, supply chain, HR
ABAP: limbajul aplicațiilor SAP
HANA: baza de date în memorie
S/4HANA: ERP-ul actual, pe HANA
```
Legătură: DOM-02 întreabă exact asta.

### 10
Greu: da
Problema: Intervievatorul întreabă: „Cum scazi MTTD fără să crească alert fatigue?” Dacă nu știi termenii, nu poți răspunde, chiar dacă știi tehnic.
Ideea: SIEM adună și corelează evenimentele de securitate. IoC e un artefact observabil care sugerează un atac sau o compromitere (NIST). MITRE ATT&CK e o bază de cunoștințe cu tacticile și tehnicile atacatorilor. Fals-pozitivul e o alertă pe ceva legitim. Prea multe duc la alert fatigue: analiștii încep să le ignore. MTTD e timpul mediu până la detecție. La MTTR, R poate fi repair, recovery, respond sau resolve, deci întrebi ce înseamnă la ei.
Exemplu:
```python
from statistics import mean
# (început atac, alertă), în minute
ev = [(10, 14), (20, 21)]
mttd = mean(d - a for a, d in ev)
print(mttd)  # → 2.5
```
Legătură: DOM-04, DOM-05 și DOM-06.

### 11
Greu: da
Problema: Un worker pică și coada retrimite evenimentele. Clientul primește aceeași alertă de două ori, iar SOC-ul o investighează de două ori.
Ideea: Fluxul e: ingestie de loguri, normalizare, reguli, alerte, integrare cu SIEM. Ordinea contează per sistem, deci partiționezi după `system_id`. Idempotența cere o cheie de alertă, ca o retrimitere să nu dubleze. Multi-tenant înseamnă că și cheia include clientul. Regulile le testezi pe loguri reale, anonimizate.
Exemplu:
```python
seen = set()
def send(k):
    new = k not in seen
    seen.add(k)
    return new
k = ("A", "P1", 5)
print(send(k))  # → True
print(send(k))  # → False
```
Legătură: Kata k2 (deduplicare de alerte), DOM-07 și fișa celery, punctul 3.
