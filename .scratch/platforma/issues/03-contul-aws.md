# 03: Alex își face contul AWS

**Parent:** `.scratch/platforma/spec.md`

**What to build:** nimic de cod. Alex creează un cont AWS pe planul gratuit, pune o alarmă de buget și dă agentului acces de lansare (cum anume se hotărăște după tichetul 01; candidat pentru un script de tip wizard).

**Blocked by:** 01

**Status:** ready-for-human

- [x] Cont AWS existent (mai vechi, deci pe planul plătit, nu pe cel gratuit), cu autentificare în doi pași pe root, prin aplicație pe telefon.
- [x] Alarmă de buget la 1 USD, pe e-mail.
- [x] Amintirea la 5 luni nu mai are rost: contul e deja pe planul plătit, deci regula celor 6 luni nu se aplică. Rămâne alarma de buget ca plasă de siguranță.
- [x] Regiunea aleasă: `eu-central-1` (Frankfurt). Adresa funcției (Function URL) nu există în toate regiunile și nu am putut confirma Frankfurt dintr-o sursă primară; se vede la primul deploy (dacă nu merge, alternativa e `eu-west-1`).
- [ ] Accesul pentru lansare e pus unde spune tichetul 04, nu în repo.

## Comments

Rămâne deschis: accesul pentru lansare (utilizator IAM `ba-deploy` cu MFA, cheia doar în `~/.aws/` pe laptopul lui Alex, nu în repo și nu în chat).

### 2026-11-11, Alex
Contul a fost creat mai demult, deci e pe planul plătit. Ofertele Always Free (Lambda: 1 milion de cereri și 400.000 GB-s pe lună; DynamoDB: 25 GB și 25 WCU / 25 RCU provizionate, clasa Standard) se aplică și pe planul plătit (`research/platforma-facts.md`, secțiunea 1), dar fără credite care să acopere depășirea: peste limită se plătește tariful standard. Cele 25 WCU / 25 RCU sunt pe toate tabelele contului din regiune; de verificat dacă `eu-central-1` are deja tabele DynamoDB provizionate.
