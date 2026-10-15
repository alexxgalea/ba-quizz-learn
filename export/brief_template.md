# Brief pentru Perplexity: cum explicăm conceptele în aplicația de pregătire pentru interviul Onapsis

**Pentru Perplexity.** Fișierul are două părți. Partea 1 (secțiunile 1–8) e brief-ul și conține tot ce îți trebuie pentru sarcină, inclusiv grilele de rescris. Partea 2 (Anexe) conține tot conținutul aplicației, pentru referință și verificare. Răspunde în română.

## 1. Pe scurt: ce îți cer

Avem o aplicație de grile pe telefon, cu care Alex se pregătește pentru un interviu tehnic de backend Python. Explicațiile din ea sunt prea scurte și prea dense: ca să înțeleagă un concept, Alex iese din aplicație și îl caută în altă parte. Vrem ca explicația să fie în aplicație, să apară când are nevoie de ea și să-i ajungă, fără să mai caute altundeva.

Îți cer să propui cum ar trebui explicate conceptele și să arăți asta pe exemple:

- **A. Ghidul de explicare:** principiile, pe cel mult o pagină.
- **B. Template-urile:** câmpuri fixe, cu lungimi maxime, pentru contextul dinaintea grilei, pentru explicația de după răspuns și pentru o fișă scurtă de termen (glosar).
- **C. Propunerile UX:** cel mult 5, ordonate după impact și efort, ca explicațiile să fie la îndemână.
- **D. Eșantionul:** cele 13 grile din secțiunea 7.1, rescrise după template-urile tale.
- **E. Glosarul:** definiții scurte pentru termenii din secțiunea 7.2 (dacă nu mai încap, în mesajul următor).
- **F. Opțional:** greșelile factuale pe care le observi în conținutul din anexe.

Formatul exact al răspunsului e în secțiunea 8. Îl importăm automat în aplicație, așa că te rog să-l respecți.

## 2. Cine învață

- **Alex**, Full Stack Engineer cu peste 3 ani de experiență: React, Django/DRF, Elasticsearch, Docker Swarm, Keycloak. Lucrează în producție pe o platformă de video analytics și are un master în AI.
- **Limba:** română. Termenii tehnici rămân în engleză (GIL, event loop, worker, ack, fixture...), așa cum se folosesc la interviu.
- **Stilul de învățare:** vizual. Diagramele simple îl ajută mult.
- **Ce știe bine:** Django ORM, API-uri REST, Docker, Elasticsearch, autentificarea cu Keycloak (OAuth2/OIDC), React.
- **Unde are lacune** (văzute la un interviu anterior, la Lateral Group): concurența în Python (GIL, threads vs procese vs asyncio), cum rulează Python (bytecode vs „interpretat”), serverele web Python (WSGI/ASGI, Gunicorn, Uvicorn), indexurile din bazele de date, argumentarea SQL vs NoSQL și Celery.

## 3. Interviul

- **Firma:** Onapsis, pentru poziția Software Engineer – Python, în echipa produsului Defend (monitorizare continuă și detecție de amenințări pentru sistemele SAP ale clienților).
- **Stack-ul din anunț:** Python, PostgreSQL, SQLAlchemy, Docker, Pytest, Redis, RabbitMQ, Celery, AWS, GraphQL, Grafana, New Relic, GitLab.
- **Data:** interviul tehnic e luni, 19 octombrie 2026. Azi e joi, 15 octombrie, deci rămân 4 zile, cu 2–3 ore de studiu pe zi.

## 4. Cum arată aplicația azi

Aplicația e o singură pagină web, folosită mai ales pe telefon, cu cinci taburi: Plan, Grile, Oral, Studiu și Progres.

**Grile:** 221 de întrebări cu câte 4 variante, în 23 de module tehnice. Fiecare modul are o prioritate (P1 critic, P2 important, P3 util, P4 bonus), iar fiecare grilă are un nivel: bază, practic sau avansat. O grilă are cinci părți:

1. **Contextul** (1–3 propoziții) apare deasupra întrebării cât timp grila e nouă sau a fost greșită ultima dată. Explică noțiunile fără să dea răspunsul. După primul răspuns corect dispare, dar poate fi redeschis.
2. **Întrebarea**, uneori cu un fragment de cod.
3. **Cele 4 variante**, amestecate la fiecare rulare. Au lungimi comparabile, ca răspunsul corect să nu se ghicească după lungime.
4. **Butonul „Nu știu încă”** arată direct răspunsul.
5. **Explicația** (1–3 propoziții) apare după răspuns, împreună cu varianta corectă.

Modurile de lucru sunt:

- **Test diagnostic:** 30 de grile, începând cu baza din fiecare modul.
- **Mix inteligent:** 15 grile, care urcă pe niveluri.
- **Greșelile mele.**
- **Simulare de interviu:** 25 de grile în 25 de minute, fără context, cu feedback la final.
- **Pe module:** de la bază la avansat.

Repetiția e spațiată, cu cutii Leitner.

**Oral:** 42 de carduri, fiecare cu o întrebare de interviu, 3–5 puncte-cheie și un răspuns-model. Alex răspunde cu voce tare, apoi bifează punctele atinse.

**Studiu:** pentru fiecare modul, o fișă cu o idee principală, 6–9 puncte, o listă „de evitat” și, uneori, o diagramă. Tot aici sunt 9 exerciții de live coding și un walkthrough de system design.

Exemplu de grilă, așa cum apare azi:

{{EXAMPLE}}

## 5. Problema

- **Explicația de după răspuns e prea densă.** Are 1–3 propoziții și presupune că știi deja termenii vecini (bytecode, event loop, pickle, IPC, ack, snapshot...).
- **Explicația aprofundată stă în altă parte.** Fișa modulului e în alt tab și nu e legată de conceptul exact din grilă.
- **Termenii nu sunt definiți acolo unde apar.**
- **Variantele greșite nu sunt explicate.** Nu afli de ce e greșită varianta plauzibilă pe care ai ales-o.
- **Ce arată datele:** la diagnostic a avut 23 din 30, dar sesiunile pe module au durat mult (Indexuri: 12 grile în 75 de minute; Python core: 13 grile în 69 de minute). Cel mai probabil iese din aplicație ca să înțeleagă explicațiile.

{{STATS}}

Grilele greșite la ultimul răspuns:

{{WEAK}}

## 6. Ce vrem și ce constrângeri avem

**Ce vrem:**

- O explicație care apare în aplicație exact când e nevoie de ea, în straturi: întâi răspunsul în cuvinte simple (o propoziție), apoi mecanismul, apoi detaliile, la cerere.
- Legături cu ce știe deja Alex (Django, DRF, Elasticsearch, Docker Swarm, Keycloak), acolo unde ajută.
- Pentru fiecare concept, o formulare scurtă pe care o poate spune la interviu.
- Diagrame simple, în ASCII sau descrise în text ca să le desenăm noi, acolo unde un desen explică mai bine decât textul.

**Constrângeri:**

- **Ecran de telefon:** blocuri de text de cel mult ~350 de caractere, fără tabele late, cod inline între backticks și blocuri de cod de cel mult 8 linii, a câte cel mult 50 de caractere.
- **Contextul de dinaintea întrebării nu are voie să dea răspunsul.**
- **Corectitudine pentru octombrie 2026:** Python 3.13/3.14 (inclusiv build-ul free-threaded), SQLAlchemy 2.0, Celery 5.x, RabbitMQ 4.x, PostgreSQL 17/18, versiunile actuale de FastAPI și Starlette, OWASP Top 10:2025.
- **Limba:** română cu diacritice, ton direct, fără umplutură și fără emoji.
- **Conținut static, scris dinainte.** Implementarea durează o zi, așa că propunerile UX trebuie să se poată face repede.

## 7. Ce trebuie rescris

### 7.1 Eșantionul (pentru D)

Sunt 13 grile, alese să acopere niveluri și tipuri diferite: cu cod, de formulare, de concept. Cele mai multe sunt dintre cele greșite de Alex. Pentru fiecare vrem contextul nou, explicația nouă, în straturi, și câte o explicație pentru fiecare variantă greșită.

{{SAMPLE}}

### 7.2 Termeni pentru glosar (pentru E)

{{TERMS}}

## 8. Formatul răspunsului

Îl importăm automat, așa că folosește exact titlurile de mai jos. Nu folosi tabele, iar codul pune-l între backticks.

```
## A. Ghid
(text liber, cel mult o pagină)

## B. Template-uri
### Context
- `nume_câmp` — ce conține — max. N caractere
### Explicație
- `nume_câmp` — ce conține — max. N caractere — vizibil imediat / la cerere
### Fișă de termen
- `nume_câmp` — ce conține — max. N caractere

## C. Propuneri UX
1. **Titlu** — ce face și unde apare. Impact: mare/mediu/mic. Efort: mic/mediu/mare.

## D. Eșantion
### py-01
**Câmp 1:** text
**Câmp 2:** text
**Varianta greșită:** „textul variantei” — de ce e greșită
(aceleași câmpuri, în aceeași ordine, la toate grilele; câte un rând „Varianta greșită” pentru fiecare variantă greșită)

## E. Glosar
### termen
**Definiție:** ...
**Analogie:** ... (opțional)
**Vezi și:** termen, termen

## F. Probleme găsite (opțional)
- `id` — problema — sursa
```

Dacă răspunsul devine prea lung, livrează A, B, C și primele 5 grile din D, apoi continuă când primești mesajul „continuă”.

---

# Anexe: tot conținutul actual al aplicației

Partea comportamentală (pitch, povești personale) lipsește din anexe, pentru că nu ține de explicarea conceptelor tehnice.

{{APPENDIX}}
