Status: ready-for-agent

# Platforma minimă: jurnal de încercări, server propriu, AI prin server

Secțiunea „Platforma” din `docs/imbunatatire.md`, partea de care au nevoie valurile 0 și 1. Deciziile sunt în ADR 0003 (jurnal de încercări, server simplu, calcul în client), ADR 0004 (AWS Lambda + DynamoDB în locul artifactului) și ADR 0005 (verdictul AI). Termen nou, care intră în `CONTEXT.md` cu tichetul 02: **Jurnal de încercări** (lista tuturor răspunsurilor lui Alex, în ordinea în care au fost date; din ea se calculează cutiile, treptele și măsurătorile).

## Problem Statement

Progresul lui Alex e o stare îmbinată: pentru fiecare item, cutia și ultimul răspuns. Orarul de durată, treptele pe punct și măsurarea reținerii au nevoie de istoricul întreg, care nu există. Fiecare val nou ar adăuga chei în stare și reguli de îmbinare.

Aplicația depinde de artifactul de pe claude.ai pentru sincronizare și pentru verificarea AI. Cheile Gemini și DeepSeek stau în browser. Ce scrie Alex (răspunsuri, cod, formulări) nu se păstrează nicăieri, deci caietul și „față de data trecută” nu au pe ce se sprijini.

## Solution

Fiecare răspuns al lui Alex devine un eveniment într-un **jurnal de încercări** care doar crește. Clientul (PWA-ul) ține jurnalul local, calculează din el tot ce calcula din `S` și merge fără semnal. Un server mic, pe AWS Lambda cu DynamoDB, păstrează evenimentele, le dă înapoi de la un cursor și trimite cererile către AI cu cheile ascunse. Starea de azi se importă ca evenimente sintetice, fără pierderi. Când importul e verificat pe datele lui Alex, artifactul se retrage.

## User Stories

1. Ca Alex, vreau ca progresul de până acum să fie acolo după mutare, cu aceleași cutii și aceleași scadențe, ca să nu o iau de la zero.
2. Ca Alex, vreau să răspund la grile în metrou, fără semnal, și să găsesc răspunsurile pe laptop seara, ca să nu depind de conexiune.
3. Ca Alex, vreau să introduc un singur secret, o dată pe fiecare dispozitiv, ca să nu am cont, parolă și e-mail.
4. Ca Alex, vreau ca verificarea AI să meargă fără să pun vreo cheie în browser, ca să nu le mai port de pe un dispozitiv pe altul.
5. Ca Alex, vreau ca intervievatorul scris și Certificarea să meargă în PWA, ca să nu mai am nevoie de artifact pentru ele.
6. Ca Alex, vreau ca Jarvis să pornească fără cheia Gemini în telefon, ca o cheie furată din browser să nu fie o problemă.
7. Ca Alex, vreau să-mi pot exporta tot jurnalul într-un fișier și să-l pot șterge de pe server, ca datele să rămână ale mele.
8. Ca Alex, vreau o copie locală a jurnalului mereu la zi, ca închiderea contului AWS să nu-mi poată lua progresul.
9. Ca Alex, vreau ca artifactul vechi să rămână deschis și neschimbat până verific că totul s-a mutat, ca să am unde mă întoarce.
10. Ca Alex, vreau ca un reset să se poarte ca azi (totul de la zero, pe toate dispozitivele), ca să nu reapară progres vechi de pe alt telefon.
11. Ca agent care scrie valurile următoare, vreau să adaug o formă nouă de învățare scriind un tip de eveniment și o proiecție, fără să ating regulile de îmbinare.

## Implementation Decisions

- **Evenimentul.** Un răspuns e un obiect care nu se mai schimbă: un id unic generat de client, timpul, dispozitivul, itemul, punctele atinse (goale până la Val 0.1), forma (grilă, deschisă, card oral, schelet, kata, apoi cele noi), rezultatul, încrederea (când există), durata, intervalul față de încercarea precedentă pe același item și, opțional, textul lui Alex. Setările, bifele din plan, poziția lecției și resetul sunt tot evenimente, de alt tip.
- **Proiecțiile.** O funcție pură primește jurnalul și întoarce ce citește azi aplicația din `S` (cutii, contoare, goluri, poziția lecției, istoricul). Restul aplicației citește proiecția; `updQ`, `updO`, `updX`, `updS` devin „adaugă un eveniment”. Proiecția se ține în memorie și se actualizează la fiecare eveniment, nu se recalculează din tot jurnalul.
- **Îmbinarea e reuniune după id.** Două dispozitive își unesc listele; ordinea e după timp, apoi după id. Un reset e un eveniment: proiecția ignoră tot ce e mai vechi decât ultimul reset.
- **Depozitul local**: IndexedDB pentru jurnal (nu `localStorage`, care e prea mic pentru textul lui Alex), cu coada evenimentelor netrimise.
- **Importul.** Exportul `S` de azi devine evenimente sintetice: unul pe item, cu cutia, contoarele și `t`-ul lui, marcate ca importate. Proiecția lor trebuie să dea exact `S`-ul din care au venit.
- **Serverul.** FastAPI pe AWS Lambda, expus printr-o adresă a funcției, fără API Gateway. Trei lucruri: primește evenimente (idempotent, după id), le întoarce pe cele de după un cursor, trimite cereri către AI. Fără logică de orar. Stă în repo, într-un director propriu, cu testele lui (pytest) și cu infrastructura descrisă în cod.
- **Datele pe server.** Un tabel DynamoDB cu evenimentele, în ordinea sosirii, ca să existe un cursor monoton. Capacitate provizionată, în limita gratuită.
- **Recunoașterea.** Un secret lung, generat o dată, ținut ca secret al funcției și introdus de Alex pe fiecare dispozitiv. Fiecare cerere îl poartă. Fără conturi.
- **AI prin server.** Un singur punct de intrare primește promptul gata făcut de client și întoarce textul modelului: Gemini întâi, DeepSeek la eșec. Cheile sunt secrete ale funcției. În client, `AskModel` capătă sursa „server”, prima în ordine; parserele și prompturile rămân în client. Răspunsul în flux nu e cerut de niciun val de acum și nu se construiește încă.
- **Jarvis.** Serverul creează un jeton de scurtă durată pentru Gemini Live, iar clientul deschide conexiunea direct cu el. Cheia Gemini din `localStorage` dispare după ce jetonul merge.
- **PWA-ul** rămâne servit de GitHub Pages; serverul îi permite originea.
- **Artifactul** nu mai primește versiuni noi din momentul în care clientul scrie în jurnal. Rămâne publicat până la tichetul 10.

## Testing Decisions

- Proiecțiile și importul se scriu cu TDD, în Node, lângă testele de unitate existente. Testul de bază: `proiecție(import(S)) = S`, pe o stare reală exportată și pe stări construite (reset, două dispozitive, goluri).
- Testele de plan și de scadențe existente (`test_plan.py`, `__prep`) trebuie să treacă neschimbate peste proiecție: comportamentul nu se schimbă în acest spec.
- Sincronizarea se testează cu un server fals în memorie: fără semnal, reconectare, același eveniment trimis de două ori, două dispozitive.
- Serverul se testează cu pytest, cu DynamoDB local sau fals; idempotența și cursorul au teste proprii.
- Sursa AI „server” se testează cu model fals, după tiparul din `tools/test_skel_ai.py`.

## Out of Scope

- Orarul de durată, treptele, legăturile item–punct (Val 0, `fundatie-concepte`).
- Notificările și rezumatul scadențelor pentru amintirea zilnică (Val 7).
- Programul local pentru laboratoarele de pe laptop (Val 10).
- Răspunsul AI în flux.
- Ecranul de măsurare (Val 6).
- Mai mulți utilizatori.

## Further Notes

- Contul AWS nou e pe planul gratuit: 6 luni sau până se termină creditele, apoi se închide dacă nu trece pe planul plătit. Alex trece pe plătit înainte de luna a șasea (tichetul 03 pune amintirea).
- De verificat pe surse primare înainte de cod (tichetul 01): limitele gratuite DynamoDB și Lambda pentru conturi noi, adresa funcției fără API Gateway, durata și prelungirea jetonului Gemini Live.
