<!-- Domeniu: Onapsis, SAP, detecție. Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). -->

### dom-01
Pe scurt: Onapsis Defend monitorizează continuu sistemele SAP, detectează amenințări în timp real și trimite alerte cu context în SIEM-ul clientului.
Scop: Dacă știi exact ce face produsul la care ai lucra, arăți interes real și poți lega întrebările tehnice de domeniu.
Mecanism: Defend colectează loguri și evenimente din componentele SAP (ABAP, Java, HANA, SAProuter, plus cloud: RISE, BTP) și le trece prin reguli de detecție: peste 2.000 în datasheet, peste 2.600 pe pagina actuală a produsului, inclusiv pentru exploit-uri zero-day. Alertele pleacă spre SIEM-ul clientului (Splunk, Microsoft Sentinel, QRadar) cu context: user, sistem, gravitate, recomandări.
Pas cu pas:
```text
sisteme SAP -> loguri, evenimente
  -> colectare
  -> reguli de detecție
  -> alertă cu context
  -> SIEM-ul clientului
```
Aplicare: Rolul tău ar fi în serviciile Python din spatele detecției: ingestia evenimentelor, rularea regulilor, corelarea și trimiterea alertelor. Întrebările despre cozi, idempotență și ordine se leagă direct de asta.
Legătură: Seamănă cu un pipeline de loguri spre Elasticsearch, doar că la capăt nu stă un dashboard, ci reguli care decid dacă un comportament e un atac.
Limită: Accentul e pe detecție și alertare: răspunsul la incident îl coordonează echipa SOC a clientului, de obicei prin SIEM sau prin unelte de automatizare (SOAR).
La interviu: „Defend monitorizează continuu sistemele SAP, rulează mii de reguli de detecție pe evenimentele lor, inclusiv pentru zero-day, și trimite alerte cu context în SIEM-ul clientului. M-ar interesa partea de servicii Python: ingestie, corelare și livrarea alertelor.”
Verificare: Intervievatorul te întreabă de ce nu ajunge un SIEM generic pentru SAP. Ce răspunzi?
Răspuns verificare: SIEM-ul generic primește logurile, dar nu știe ce înseamnă o tranzacție SAP periculoasă, un apel RFC riscant sau o schimbare critică de rol. Defend aduce regulile specifice SAP și trimite în SIEM alerte deja interpretate.
Varianta greșită B: Antivirusul pentru stații e alt tip de produs (endpoint). Defend monitorizează aplicațiile SAP, nu laptopurile angajaților.
Varianta greșită C: Un firewall filtrează traficul de rețea, pe când Defend analizează ce se întâmplă în interiorul aplicațiilor SAP.
Varianta greșită D: Backup-ul și restaurarea țin de operare, nu de securitate. Defend detectează amenințări.

### dom-03
Pe scurt: E o detecție cu prag (cel puțin 5 eșecuri), fereastră de timp (2 minute) și corelare (eșecuri urmate de un succes): tiparul unui brute force reușit.
Scop: Multe reguli de detecție au exact aceste ingrediente. Dacă le recunoști, știi cum le implementezi și ce stare trebuie să păstrezi.
Mecanism: Pentru fiecare user păstrezi eșecurile recente într-o fereastră glisantă. La fiecare eveniment scoți ce e mai vechi de 2 minute. La un login reușit verifici câte eșecuri au rămas în fereastră: dacă sunt cel puțin 5, emiți alerta.
Pas cu pas:
```text
10:00:05 FAIL ana (1)
10:00:20 FAIL ana (2)
...
10:01:10 FAIL ana (5 în ultimele 2 min)
10:01:15 OK ana -> ALERTĂ: brute force
```
Aplicare:
```python
fails = defaultdict(deque)

def on_event(ev):
    q = fails[ev.user]
    while q and q[0] < ev.ts - 120:
        q.popleft()
    if not ev.ok:
        q.append(ev.ts)
    elif len(q) >= 5:
        alert(ev.user, list(q))
```
Legătură: E exact structura de la PY-06 (deque ca fereastră glisantă) și din exercițiul de brute force din secțiunea de live coding.
Limită: În memorie, starea se pierde la restart și nu e comună între replici; la scară mare o muți în Redis (un sorted set per user). Iar evenimentele trebuie procesate în ordine per user, altfel un succes procesat înaintea eșecurilor scapă regulii (DOM-07).
La interviu: „E o regulă cu prag, fereastră de timp și corelare. O implementez cu o fereastră glisantă per user (deque sau sorted set în Redis), procesând evenimentele în ordine per sursă și deduplicând alertele.”
Verificare: Același user generează 50 de eșecuri, apoi un succes. Câte alerte vrei?
Răspuns verificare: Una singură, nu câte una pe eșec: deduplici sau grupezi alertele pe user și interval, ca analistul să nu primească zeci de alerte pentru același incident.
Varianta greșită B: Detecția pe semnături caută un tipar cunoscut, de exemplu hash-ul unui malware, nu un comportament numărat într-o fereastră de timp.
Varianta greșită C: Scanarea de vulnerabilități verifică periodic configurația și patch-urile. Regula de aici analizează evenimente în timp real.
Varianta greșită D: Analiza statică a codului ABAP se face pe cod, înainte de deploy. Regula de aici analizează login-uri, la rulare.

### dom-04
Pe scurt: Fals-pozitivele duc la „alert fatigue”: copleșiți de alerte false, analiștii încep să le ignore, iar atacurile reale se pierd printre ele.
Scop: Calitatea unui produs de detecție nu se măsoară în câte alerte dă, ci în câte dintre ele merită atenție.
Mecanism: Fiecare alertă consumă minute din timpul unui analist din SOC. Dacă 9 din 10 alerte sunt false, analistul se obișnuiește să le închidă repede, fără investigație, inclusiv pe a zecea. O regulă bună echilibrează precizia (câte alerte sunt reale) și recall-ul (câte atacuri prinde).
Pas cu pas:
```text
1.000 de alerte pe zi, 95% false
3 min per alertă -> 50 de ore de muncă
în realitate: închise în masă
atacul real -> închis odată cu restul
```
Aplicare: Reduci zgomotul cu praguri calibrate pe date reale, excepții documentate (de exemplu conturi de serviciu cunoscute), deduplicare și context bogat în fiecare alertă: cine, ce sistem, ce criticitate, ce recomandare.
Legătură: E compromisul pe care îl știi din AI: precizie versus recall, reglat prin pragul de decizie al modelului.
Limită: Scopul nu e zero fals-pozitive: o regulă prea strictă ratează atacuri (fals-negative), care sunt mai periculoase. Ajustarea e continuă, pe baza feedback-ului din SOC.
La interviu: „Fals-pozitivele produc alert fatigue: analiștii încep să ignore alertele, iar cele reale se pierd. Echilibrez precizia și recall-ul, deduplic alertele și pun context bogat în fiecare alertă, ca triajul să fie rapid.”
Verificare: O regulă nouă dă 200 de alerte pe zi, aproape toate de la un cont de serviciu care se reloghează automat. Ce faci?
Răspuns verificare: Investighezi contul, iar dacă comportamentul e legitim și documentat, adaugi o excepție precisă (doar acel cont, doar acel tipar) și păstrezi regula activă pentru restul.
Varianta greșită B: Spațiul pe disc e ieftin. Costul real e timpul și atenția analiștilor.
Varianta greșită C: Detecția analizează logurile separat de sistemul SAP, deci alertele false nu încetinesc sistemul monitorizat.
Varianta greșită D: Închiderea automată ascunde și cazurile reale care seamănă cu alertele false, iar dacă regula de închidere greșește, ratezi atacuri.

### dom-05
Pe scurt: Un SIEM (Security Information and Event Management) e platforma care adună evenimentele de securitate din toată compania, le corelează și generează alerte pentru echipa SOC.
Scop: Defend își trimite alertele în SIEM-ul clientului, deci trebuie să știi unde ajunge munca ta și cine o folosește.
Mecanism: SIEM-ul colectează loguri din zeci de surse (firewall-uri, servere, Active Directory, aplicații), le aduce la un format comun, le păstrează și rulează peste ele reguli de corelare. Analiștii din SOC lucrează în SIEM: văd alertele, investighează și răspund.
Pas cu pas:
```text
firewall, AD, servere, Defend
  -> SIEM: colectare, normalizare
  -> corelare între surse
  -> alerte pentru SOC
  -> investigație, răspuns
```
Aplicare: Alertele trimise de Defend trebuie să fie ușor de consumat de SIEM: format standard (CEF, LEEF sau JSON, prin syslog), câmpuri stabile, identificatori de eveniment și context suficient pentru corelare.
Legătură: Seamănă cu Elasticsearch plus Kibana pentru loguri, doar că specializat pe securitate: reguli de corelare, alerte și fluxuri de lucru pentru analiști. Elastic chiar apare printre SIEM-urile cu care se integrează Defend.
Limită: Un SIEM generic nu înțelege contextul SAP: vede loguri, dar nu știe ce înseamnă o tranzacție sau un RFC periculos. De aceea un produs specializat face detecția și trimite în SIEM alerte deja interpretate.
La interviu: „Un SIEM, ca Splunk sau Microsoft Sentinel, adună și corelează evenimentele de securitate din toată compania. Defend face detecția specifică SAP și trimite în SIEM alerte curate, cu context, ca SOC-ul să le poată corela cu restul.”
Verificare: De ce contează ca alertele trimise în SIEM să aibă un format standard și câmpuri stabile?
Răspuns verificare: Pentru că SIEM-ul le parsează și le corelează automat cu alte surse; un format care se schimbă strică regulile și dashboard-urile clientului.
Varianta greșită B: Un firewall filtrează traficul. SIEM-ul nu blochează nimic: adună, corelează și alertează.
Varianta greșită C: SIEM-ul e o platformă, nu un protocol. Logurile ajung la el prin protocoale ca syslog sau prin API-uri.
Varianta greșită D: SIEM-ul păstrează logurile, dar rolul lui principal e corelarea și alertarea, nu arhivarea.

### dom-06
Pe scurt: MITRE ATT&CK e un catalog public al tacticilor (ce vrea atacatorul să obțină) și tehnicilor (cum obține) folosite în atacuri reale.
Scop: E limbajul comun dintre produsele de detecție și echipele SOC: o regulă mapată la o tehnică ATT&CK spune imediat ce comportament acoperă.
Mecanism: Tacticile sunt etapele unui atac: acces inițial, persistență, escaladarea privilegiilor, mișcare laterală, exfiltrare. Fiecare tactică are tehnici concrete, cu id-uri, de exemplu T1110, Brute Force. Mapând regulile la tehnici, vezi ce etape ale unui atac detectezi și unde ai goluri.
Pas cu pas:
```text
tactică: Credential Access
  tehnică: T1110 Brute Force
regula „5 eșecuri, apoi succes”
  -> mapată la T1110
matricea de acoperire -> goluri vizibile
```
Aplicare: Fiecare regulă de detecție are în metadate tehnica ATT&CK pe care o acoperă. Alerta trimisă în SIEM include acest id, iar echipa SOC îl folosește la prioritizare și raportare.
Legătură: Regula de la DOM-03 (eșecuri urmate de un succes) e exemplul clasic pentru T1110, Brute Force.
Limită: A acoperi o tehnică nu înseamnă detecție perfectă: o regulă poate prinde doar o variantă a ei. Iar matricea principală (Enterprise) e generală, deci comportamentele specifice SAP le mapezi cu interpretare.
La interviu: „MITRE ATT&CK e un catalog al tacticilor și tehnicilor atacatorilor. Mapez regulile de detecție la tehnici ATT&CK, ca să arăt acoperirea și să vorbesc același limbaj cu SOC-ul.”
Verificare: Ce diferență e între o tactică și o tehnică în ATT&CK?
Răspuns verificare: Tactica e scopul atacatorului într-o etapă (de exemplu Credential Access), iar tehnica e metoda concretă prin care îl atinge (de exemplu T1110, Brute Force).
Varianta greșită B: ATT&CK nu e un antivirus, ci o bază de cunoștințe: descrie comportamente, nu le blochează.
Varianta greșită C: ATT&CK n-are legătură cu criptarea: catalogează tehnici de atac.
Varianta greșită D: ATT&CK nu e un atac, ci un catalog cu sute de tehnici; denial of service apare acolo doar ca una dintre ele.

### dom-07
Pe scurt: Partiționezi evenimentele după `system_id`: fiecare sistem ajunge mereu pe aceeași coadă, consumată de un singur worker, iar paralelismul rămâne între sisteme.
Scop: Corelarea are nevoie de evenimentele unui sistem în ordine, dar nu poți procesa totul secvențial: ai sute de sisteme de monitorizat.
Mecanism: Un hash pe `system_id` alege coada: același sistem merge mereu în aceeași coadă, iar coada are un singur consumator activ, deci evenimentele lui sunt procesate în ordine. Sistemele diferite merg pe cozi diferite, procesate în paralel. E aceeași idee ca partițiile din Kafka.
Pas cu pas:
```text
hash(system_id) % 8 -> coada 0..7
SAP-PRD-1 -> mereu coada 3 -> worker 3
SAP-DEV-2 -> mereu coada 5 -> worker 5
ordine per sistem, paralel între sisteme
```
Aplicare: În RabbitMQ folosești exchange-ul consistent hash sau un routing explicit pe N cozi, fiecare cu single active consumer. Evenimentele poartă timestamp-ul de la sursă, iar fereastra de corelare tolerează evenimentele întârziate.
Legătură: E soluția de la RMQ-06: ordinea se păstrează doar într-o coadă cu un singur consumator, deci împarți munca pe chei.
Limită: Un sistem foarte zgomotos își poate supraîncărca singur coada (hot partition). Iar când schimbi numărul de cozi, cheile se redistribuie, deci planifici tranziția.
La interviu: „Partiționez după `system_id`: același sistem merge mereu pe aceeași coadă, cu un singur consumator, deci ordinea per sistem se păstrează, iar paralelismul rămâne între sisteme, ca la partițiile Kafka. Folosesc timestamp-ul de la sursă și tolerez evenimentele întârziate.”
Verificare: Crești numărul de cozi de la 8 la 16, cu hash-ul `hash(system_id) % N`. Ce se întâmplă cu sistemele?
Răspuns verificare: Multe își schimbă coada, deci în timpul tranziției evenimentele unui sistem pot fi în două cozi simultan și pot fi procesate în neordine. Golești întâi cozile vechi sau folosești consistent hashing, care mută mai puține chei.
Varianta greșită B: Un singur worker pentru toți clienții păstrează ordinea, dar devine gâtul de sticlă și punctul unic de defect.
Varianta greșită C: Corelarea manuală nu scalează și elimină chiar valoarea produsului: detecția automată.
Varianta greșită D: Sortarea zilnică întârzie detecția cu până la o zi, iar un atac trebuie semnalat în minute.

### dom-08
Pe scurt: Pre-patch protection înseamnă că detectezi încercările de a exploata o vulnerabilitate cât timp sistemul încă nu e patch-uit: înainte să existe patch sau până îl aplică clientul.
Scop: Clienții SAP aplică patch-urile cu săptămâni sau luni de întârziere, iar în acest timp vulnerabilitatea e cunoscută și exploatabilă. Detecția acoperă exact această fereastră.
Mecanism: Când apare o vulnerabilitate (sau chiar înainte, pentru zero-day-urile descoperite de cercetătorii Onapsis), echipa de cercetare scrie reguli care recunosc tiparul exploatării. Regulile ajung în Defend, care alertează la orice încercare de exploatare, până când clientul aplică patch-ul.
Pas cu pas:
```text
vulnerabilitate descoperită
  -> regulă de detecție în Defend
SAP publică security note-ul
clientul: mentenanță peste 2 luni
  -> între timp, Defend alertează
patch aplicat -> fereastra se închide
```
Aplicare: Pentru serviciile din spate, asta înseamnă că regulile noi trebuie livrate repede și sigur: versionate, testate pe evenimente reale (PT-04) și actualizate fără să oprești detecția.
Legătură: Leagă-l de SEC-11: și în lanțul tău de dependențe există o fereastră între anunțarea unei vulnerabilități și update, pe care trebuie s-o acoperi.
Limită: Detecția nu repară vulnerabilitatea, doar o face vizibilă când e atacată. Patch-ul rămâne soluția, iar detecția e controlul compensatoriu până atunci.
La interviu: „Pre-patch protection înseamnă că detectăm exploatarea unei vulnerabilități înainte ca sistemul să fie patch-uit, inclusiv pentru zero-day-uri. Clienții SAP patch-uiesc greu, iar regulile de detecție acoperă fereastra până la patch.”
Verificare: De ce nu ajunge să-i spui clientului „aplicați patch-ul imediat”?
Răspuns verificare: Sistemele SAP sunt critice pentru business: un patch cere testare și o fereastră de mentenanță, uneori la luni distanță. Până atunci, sistemul rămâne expus, iar detecția e protecția activă.
Varianta greșită B: Defend nu aplică patch-uri: patch-urile SAP le aplică echipele clientului, în ferestre de mentenanță planificate.
Varianta greșită C: Nu e vorba să blochezi patch-urile, ci să protejezi sistemul până când patch-ul e aplicat.
Varianta greșită D: Testarea patch-urilor într-un mediu izolat e o practică bună de operare, dar nu asta înseamnă pre-patch protection.
