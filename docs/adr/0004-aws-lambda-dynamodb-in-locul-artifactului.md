# Aplicația trece pe un server propriu, pe AWS Lambda și DynamoDB; artifactul se retrage

Aplicația trăia ca artifact pe claude.ai (sincronizare prin `window.claude`, verificare AI prin `sample`) și ca PWA pe GitHub Pages. Jurnalul de încercări, textul lui Alex, cheile AI scoase din browser și amintirea zilnică cer un server. Alex vrea găzduire gratuită fără termen, pentru o aplicație folosită doar de el. Am ales AWS Lambda cu FastAPI și DynamoDB, expus printr-o adresă a funcției (Function URL), cu PWA-ul drept singur client.

Lambda (1 milion de cereri pe lună) și DynamoDB (25 GB) rămân gratuite și după perioada de credite. Serverul e în Python, limbajul pe care Alex îl exersează, iar AWS e deja modul în aplicație.

## Considered Options

- **Cloudflare Workers + D1**: fără operare și fără termen, dar serverul ar fi în JavaScript. Era recomandarea; Alex a preferat să lucreze pe AWS și în Python.
- **Supabase**: Postgres adevărat și aproape niciun cod de server, dar proiectul gratuit se oprește după o săptămână cu prea puțină activitate.
- **Forma actuală, cu platforma amânată**: fără migrare acum, dar fiecare val ar fi adăugat chei în `S` pe care le-am fi aruncat apoi.

## Consequences

- Dispare `sample`, deci Claude gratuit. Supervizarea trece pe Gemini, cu DeepSeek ca rezervă, cu cheile ca secrete pe server. Certificarea și intervievatorul scris, care azi merg doar cu `sample`, trebuie mutate pe această sursă.
- Artifactul rămâne publicat și înghețat până e verificat importul stării pe datele lui Alex. Apoi regula de publicare la același link iese din `CLAUDE.md`.
- Un cont AWS nou pe planul gratuit se închide după 6 luni (sau când se termină creditele) dacă nu trece pe planul plătit, iar după încă 90 de zile datele se șterg. Alex trece pe planul plătit înainte de luna a șasea; până atunci, copia locală a jurnalului e plasa de siguranță.
- DynamoDB nu e Postgres: jurnalul se citește după cheie și cursor, nu cu interogări libere. Măsurătorile se calculează în client.
- Răspunsul în flux din Python nu e nativ pe Lambda; cere Lambda Web Adapter și o adresă a funcției cu fluxul pornit.
- Jarvis rămâne conexiune directă către Gemini Live (ADR 0001 nu se schimbă); serverul îi dă doar un jeton de scurtă durată.
- Serverul îl recunoaște pe Alex după un singur secret lung, introdus o dată pe fiecare dispozitiv. Nu există conturi.
