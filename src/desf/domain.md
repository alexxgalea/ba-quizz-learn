<!-- Desfășurările fișei `domain` (11 puncte). Format și reguli: lib.mjs (checkDesf), .scratch/desfasurari/spec.md. Faptele: research/interview-facts.md, secțiunea 39 (Onapsis, SAP, SOC; verificate pe onapsis.com, sap.com, learning.sap.com, NIST, MITRE), plus 20 și 22 la exemplele Python. Fără C++: modulul nu are echivalent real (spec și tichet). Ce spune Onapsis despre propriile produse e marcat în text drept afirmația firmei („după Onapsis”, „pagina produsului”); exemplele Python arată ideea în mic, nu codul Defend. -->

### harta
Problema: O companie mare își ține facturile, salariile și stocurile într-un sistem SAP, deci o compromitere îi oprește business-ul. După fișă, un SIEM generic primește logurile lui, dar nu înțelege contextul SAP și nu știe care rând e un atac. Modulul răspunde la șase întrebări: ce vinde Onapsis și pe ce zone lucrează inginerii, cum detectează Defend atacurile, ce dovezi reale are Onapsis, cum arată platforma de azi, ce vocabular trebuie să știi și ce ai construi tu în jurul detecției.
Grupuri:
- 1–2: ce vinde Onapsis și pe ce zone de produs lucrează inginerii
- 3–5: cum detectează Defend (monitorizare, reguli, alerte în SIEM, pre-patch protection)
- 6–7: dovezi reale (RECON, ICMAD, OVERPASS)
- 8: platforma de azi și AI
- 9–10: vocabularul (SAP, ERP, ABAP, apoi SOC)
- 11: cum arată pipeline-ul pe care l-ai construi

### 1
Problema: O companie mare își ține facturile, salariile și stocurile într-un sistem SAP. Antivirusul și firewall-ul nu văd în aplicație. Dacă e compromis, se oprește business-ul.
Ideea: Onapsis vinde securitate pentru aplicații business-critical, mai ales SAP și Oracle. Research Labs caută vulnerabilități în ele și le raportează producătorului. Un comunicat din 2022 spune că a găsit și a ajutat la remedierea a peste 1.000 de zero-day-uri.
Analogie: Paznicul unei bănci știe ce înseamnă ușa seifului deschisă noaptea. Cel dintr-un bloc de birouri vede doar o ușă.
Legătură: Cardul oral o-dom-1 cere prezentarea.

### 2
Problema: Anunțul numește trei zone de produs: Threat Detection & Response, Vulnerability Management și Compliance Automation. Pentru cineva din afară sună la fel, iar la interviu le amesteci.
Ideea: Fiecare zonă răspunde la altă nevoie a unui client SAP. Detecția prinde un atac în desfășurare. Managementul vulnerabilităților găsește și prioritizează găurile deschise. Compliance-ul dă auditorului dovezi că regulile se respectă. Pe pagina principală, Defend e detecția, iar Assess acoperă vulnerabilitățile și compliance-ul.
Exemplu:
```text
„Cineva exploatează o breșă acum”
  → detecție (Defend)
„Lipsește un patch pe 40 de sisteme”
  → vulnerabilități (Assess)
„Auditorul cere dovezi SOX”
  → compliance (Assess)
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
Ideea: Defend rulează reguli de detecție peste evenimentele unui sistem SAP. O regulă e o condiție pe un eveniment, iar exemplul încearcă două. Pagina produsului spune „over 2,600 detection rules”. Tot acolo apar „600+ exclusive, proprietary exploit rules”. Datasheet-ul spune „2,000+”, deci cifra diferă între documente. Datasheet-ul numește ABAP, Java, HANA și SAProuter. Pagina de azi adaugă on-prem, cloud, RISE și BTP. Ea vorbește și de „AI-powered anomaly scoring”.
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
Ideea: La interviu spui „Endorsed by SAP” și dai un caz. Site-ul folosește „Endorsed by SAP” despre platformă. „The only SAP-endorsed automated SAP application security testing software” apare la Control și e afirmația firmei. RECON (CVE-2020-6287, CVSS 10) e din NetWeaver AS Java, cu patch în iulie 2020. Numele înseamnă Remotely Exploitable Code On NetWeaver. ICMAD, din februarie 2022, include CVE-2022-22536, tot CVSS 10, plus două defecte mai mici. Onapsis a lucrat cu SAP la ambele.
Exemplu:
```text
„Platforma e Endorsed by SAP.
 Research Labs a găsit RECON,
 CVSS 10, în NetWeaver Java.”
```
Legătură: OVERPASS (punctul 7) e al treilea caz.

### 7
Greu: da
Problema: În septembrie 2026 apare un defect cu scor maxim în kernelul SAP, exploatabil de la distanță și fără parolă. Clientul trebuie să testeze patch-ul înainte să-l pună în producție. Până atunci sistemul rămâne expus.
Ideea: OVERPASS (CVE-2026-44756) e un defect în procesarea Extended Passport (EPP), structura SAP de tracing atașată cererilor. Are CVSS 10.0. Onapsis Research Labs l-a găsit și l-a raportat la SAP. Patch-ul e Security Note 3747649, din Patch Day-ul din septembrie 2026. Onapsis spune că Defend putea detecta încercările de exploatare înainte de patch. Articolul spune și că Onapsis nu observase exploatare in the wild.
Exemplu:
```text
Research Labs găsește defectul
→ îl raportează la SAP
→ Defend detectează tentative
   (după Onapsis)
→ Patch Day: Note 3747649
→ clientul aplică patch-ul
```
Legătură: E exemplul tău pentru pre-patch protection (DOM-08).

### 8
Problema: Intervievatorul întreabă cum folosești AI în lucru. Dacă nu știi că și produsul Onapsis are straturi de AI, răspunsul rămâne generic.
Ideea: Pagina principală spune că platforma livrează prin „Agentic AI Fabric”. Agenții ei includ Autonomous SOC, VulnOps, Remediation, Compliance și Threat Intel. Meniul are și Security Advisor, „AI-powered SAP security guidance”. Anunțul cere experiență practică cu Cursor, GitHub Copilot, Claude Code, LLM APIs și scripturi agentice.
Exemplu:
```text
1. unealta: Cursor, Claude Code…
2. ce ai livrat mai repede
3. ce ai verificat tu
4. legătura: produsul are agenți
```
Legătură: Cardul o-beh-5 cere un exemplu concret cu AI în livrare.

### 9
Greu: da
Problema: Anunțul și grilele spun „SAP”, „ERP”, „ABAP” și „S/4HANA”. Dacă le amesteci, spui că ABAP e o bază de date sau că S/4HANA e un limbaj.
Ideea: SAP e firma, iar produsul ei de bază e un ERP. Un ERP ține procesele de bază ale unei companii: finanțe, contabilitate, HR, logistică. ABAP e limbajul propriu SAP pentru aplicații de business. HANA e baza de date în memorie. S/4HANA e „next-generation ERP” al SAP și rulează doar pe HANA.
Exemplu:
```text
„ABAP e o bază de date.”
  → nu: e limbajul, baza e HANA
„S/4HANA e un limbaj.”
  → nu: e ERP-ul, pe HANA
```
Legătură: DOM-02 întreabă ce e SAP; explicația lui pomenește ERP, ABAP și S/4HANA.

### 10
Greu: da
Problema: Intervievatorul întreabă: „Cum scazi MTTD fără să crească alert fatigue?” Dacă nu știi termenii, nu poți răspunde, chiar dacă știi tehnic.
Ideea: După fișă, SIEM adună și corelează evenimentele de securitate (NIST SP 800-92 spune doar „centralized logging”). IoC e un artefact observabil care sugerează un atac sau o compromitere (NIST). MITRE ATT&CK e o bază de cunoștințe cu tacticile și tehnicile atacatorilor. Fals-pozitivul e o alertă pe ceva legitim. Prea multe duc la alert fatigue: analiștii încep să le ignore. MTTD e timpul mediu până la detecție. La MTTR, R poate fi repair, recovery, respond sau resolve, deci întrebi ce înseamnă la ei.
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
Ideea: Fluxul e: ingestie de loguri, normalizare, reguli, alerte, integrare cu SIEM. Ordinea contează per sistem, deci partiționezi după `system_id`. Idempotența înseamnă că aceeași alertă trimisă de două ori are efectul uneia. O ții cu o cheie. Multi-tenant înseamnă mai mulți clienți în același sistem, deci cheia îi separă. Regulile le testezi pe loguri reale, anonimizate.
Exemplu:
```python
seen = set()
def send(tenant, system, ts):
    k = (tenant, system, ts)
    if k in seen: return False
    seen.add(k); return True
print(send("A", "P1", 5))  # → True
print(send("A", "P1", 5))  # → False
print(send("B", "P1", 5))  # → True
```
Legătură: Kata k2 (deduplicare de alerte), DOM-07 și fișa celery, punctul 3.
