# Conturile sunt un secret pe persoană, nu un login

Alex vrea să-i dea aplicația și Ioanei, sora lui. ADR 0004 spunea „Nu există conturi”: serverul îl recunoștea pe Alex după un singur secret. Acum serverul ține o listă de conturi, fiecare cu secretul lui, și alege după secret partiția din DynamoDB (`u#<id>`). Fiecare cont are astfel jurnalul, cursorul, epoca, ștergerea și plafonul zilnic de AI ale lui. Conținutul e același pentru toate conturile.

Contul lui Alex rămâne cel de dinainte: `APP_SECRET` și `u#alex`, fără migrare și fără un secret nou pe dispozitivele lui. Celelalte conturi le creează Alex de mână, în `server/.accounts.json` (în afara repo-ului), pe care `deploy.sh` îl cere la fiecare lansare. Persoana primește adresa și secretul pe un canal privat și le introduce o singură dată, în Progres › Serverul.

Pe cont stau și numele, forma de adresare (masculin sau feminin) și profilul (experiența persoanei). `GET /me` le întoarce, aplicația le pune în prompturile AI (Jarvis, intervievatorul, golurile, „Întreabă”, scheletele) și arată „Conectat ca: <nume>”. Fără valori în cache, aplicația folosește valorile lui Alex.

## Considered Options

- **Un singur secret, folosit de amândoi**: zero muncă, dar jurnalele s-ar amesteca, iar o ștergere ar șterge tot.
- **Login adevărat (Cognito, Google)**: parole sau OAuth, jetoane, reîmprospătare și un ecran nou. E prea mult pentru doi-trei oameni pe care îi cunoaște Alex.
- **Numele și profilul ca setări în aplicație**, editate de persoană și sincronizate prin jurnal: i-ar da libertatea să-și scrie singură profilul, dar ar cere un tip nou de eveniment și UI nou. Se poate adăuga mai târziu, peste `GET /me`.
- **Conturile în SSM Parameter Store**: un cont s-ar adăuga fără relansare, dar cu un rol IAM în plus și latență la pornire.

## Consequences

- O relansare fără fișierul de conturi i-ar tăia pe ceilalți (datele ar rămâne). De aceea `deploy.sh` se oprește dacă fișierul lipsește.
- Variabilele de mediu ale funcției au cel mult 4 KB în total, deci sunt cel mult 10 conturi, iar profilul are cel mult 800 de caractere.
- Alex, ca proprietar al contului AWS, poate citi datele celorlalți. Cheile Gemini și DeepSeek sunt ale lui, iar costul AI e limitat de plafonul zilnic al fiecărui cont. Jarvis (`/live-token`) n-are plafon.
- Un dispozitiv ține un singur cont. Schimbarea contului pe același dispozitiv ar cere ca jurnalul local să fie separat pe cont.
- Câmpurile „Legătură” din explicații rămân scrise despre experiența lui Alex.
