Status: ready-for-agent

# Lecția pe tablă: cuvinte cheie și scheme, nu paragrafe

Continuă `.scratch/lectie-sincronizata/` (PR #10). Vocabularul vine din `CONTEXT.md` (**Lecție**, **Bucată**, **Secvență**, **Cartonaș**, **Desfășurare**, **Pas cu pas**) plus un termen nou, **Tablă**, care intră în `CONTEXT.md` cu tichetul 01. Se construiește pe PWA-ul de azi și nu atinge starea.

## Problem Statement

Alex a ascultat lecția sincronizată și spune: „mult prea multă informație aruncată”. Cât vorbește Jarvis, el nu apucă să citească tot textul de pe cartonaș, iar Jarvis vorbește repede și toarnă informații. Ar fi vrut ce face un profesor: cuvinte cheie și scheme grafice.

Cauza e a noastră. Spec-ul lecției sincronizate fixa regula „cartonașul e exact textul din care vorbește Jarvis”. Aplicată literal, ecranul a ajuns o transcriere: paragraful desfășurării, plus subtitrarea vie de dedesubt. Peste asta, ritmul nu e controlat: modelul vorbește cât vrea într-o secvență de 15–30 de secunde, fără instrucțiune de viteză și fără pauză între secvențe.

## Solution

Cartonașul devine **tabla**: ce scrie un profesor în timp ce explică. Pe ecran nu mai apare niciun paragraf, doar 2–5 cuvinte cheie, o schemă unde conceptul are mecanism, și codul. Jarvis povestește în jurul tablei, nu o citește.

Fiecare punct al fișei capătă un câmp nou, `Tablă`, scris de noi (cuvinte cheie pe secvență și, unde are sens, o schemă). Cuvintele cheie apar pe rând, în clipa în care Jarvis le spune. Subtitrarea vie dispare implicit.

Secvențele se scurtează la 10–15 secunde, cu o idee fiecare. Între ele e o pauză, iar instrucțiunile cer ritm lent și propoziții scurte.

Tabla se scrie întâi pentru `asyncio`. Alex o ascultă și spune ce merge; abia apoi restul modulelor, ca la desfășurări. Până când un modul are table, lecția lui merge ca azi.

## User Stories

1. Ca Alex, vreau pe ecran câteva cuvinte cheie, nu paragrafe, ca să le prind cu coada ochiului cât ascult.
2. Ca Alex, vreau ca un cuvânt cheie să apară când Jarvis ajunge la el, ca să văd ce aud.
3. Ca Alex, vreau o schemă (cutii și săgeți) la conceptele cu mecanism, ca la un profesor la tablă.
4. Ca Alex, vreau codul pe ecran în timp ce e povestit, fără alt text lângă el.
5. Ca Alex, vreau ca Jarvis să vorbească rar, în propoziții scurte, ca să-l pot urmări.
6. Ca Alex, vreau o pauză între secvențe, ca să apuc să mă uit la tablă înainte de ideea următoare.
7. Ca Alex, vreau ca subtitrarea să nu mai ocupe ecranul, ca să nu am iar un perete de text; dacă o vreau, o pornesc.
8. Ca Alex, vreau ca la o întrebare de-a mea ecranul să arate doar ce am întrebat, nu răspunsul întreg.
9. Ca Alex, vreau ca modulele fără tablă să meargă ca până acum, ca să nu pierd lecțiile pe care le am.
10. Ca Alex, vreau să ascult întâi `asyncio` și să spun dacă ritmul și tabla merg, înainte să se scrie restul.

## Implementation Decisions

- **Tabla e conținut scris de noi**, nu extras din paragrafe. Câmp nou `Tablă` în `src/desf/<modul>.md`, la fiecare punct, parsat de `parseDesf` (`DESF_FIELDS` în `lib.mjs`) în `P.desf[modul].items[i].tab`. Formatul exact se fixează în tichetul 01, pe un punct de `asyncio`; limitele de pornire:
  - cuvinte cheie: 1–2 pe secvență (`problema`, `ideea`, `cpp`), cel mult 4 cuvinte fiecare, în total cel mult 6 pe punct;
  - schemă opțională: bloc `text`, cel mult 8 rânduri de cel mult 36 de caractere, fără aliniere cu spații (regula de la „Pas cu pas”);
  - codul rămâne în `Exemplu`; tabla nu îl duplică.
- **Câmpul `Pas cu pas` rămâne**: unde există, e schema secvenței `pas`. `Tablă` adaugă cuvintele cheie și, unde lipsește `Pas cu pas`, o schemă proprie.
- **Cartonașul de tip tablă**: `lessonSequences` produce pentru un punct cu `Tablă` secvențe al căror `continut` e `{ cuvinte, schema?, cod? }`; fără `Tablă`, secvența rămâne cea de azi (text). Modelul primește aceleași cuvinte cheie și schema ca material, plus instrucțiunea să povestească în jurul lor. Textul desfășurării nu mai intră în prompt la punctele cu tablă; rămâne pe ecranul de Studiu.
- **Cuvintele cheie apar când sunt spuse.** Potrivire pe transcrierea modelului (litere mici, fără diacritice, rădăcina cuvântului). La `spoken`, cele rămase se arată oricum. Fără sincronizare pe cuvânt, fiindcă Gemini Live nu dă timpi. Schema apare întreagă odată cu secvența ei.
- **Subtitrarea vie e oprită implicit** (hotărâtă din feedbackul lui Alex; comutator „Subtitrare” în setările Jarvis, în `onapsis-jarvis-v1`). Blocul „Transcriere” rămâne ca istoric.
- **Întrebarea liberă**: cartonașul `intrebare` arată doar întrebarea lui Alex; răspunsul apare doar dacă subtitrarea e pornită.
- **Ritm**: secvențele de tablă au instrucțiuni de 10–15 s, o idee, „vorbește rar, propoziții scurte, nu enumera tot ce e pe tablă”. După `spoken`, aplicația așteaptă `SEQ_GAP_MS` (de pornit la 2 s, prin `env.clock.after`) înainte să ceară secvența următoare; Repetă, Pauză, Sari și o întrebare anulează așteptarea. Se aplică și la „Doar audio”.
- **Doar audio** rămâne ca azi: nicio tablă pe ecran, codul povestit în cuvinte; ritmul nou se aplică.
- **Fișierele**: `src/jarvis.js` (`lessonSequences`, `seqKit`, `showPending`, ritm), `src/app.js` (`jvCard` → `jvBoard`, `jvSub`), `src/app.css`, `lib.mjs` + `validate.mjs` (câmpul și limitele), `src/desf/asyncio.md`.
- **Principiul 3 din `docs/imbunatatire.md`** („cartonașul e sursa din care vorbește Jarvis”) se schimbă: cartonașul e tabla, iar Jarvis o completează. Termenul **Cartonaș** din `CONTEXT.md` se corectează la fel.

## Testing Decisions

- Logica se scrie cu TDD, la interfața lui `Jarvis.create`, în `tools/unit/lesson.test.mjs`, peste `Call` real și falsurile din `tools/unit/fakes.mjs`.
- Parserul și limitele câmpului `Tablă`: teste în `tools/unit/desf.test.mjs` și `node validate.mjs`; la `asyncio`, un test pe fișierul real.
- Apariția cuvintelor cheie: teste peste `Call` real cu transcriere falsă (apare când e spus; cele nespuse apar la `spoken`; nimic nu rămâne din secvența veche).
- Pauza dintre secvențe: ceas fals; Repetă, Pauză, Sari și întrebarea o anulează.
- `tools/test_lesson.py`: pe ecran, un cartonaș de tablă nu are mai mult de ~25 de cuvinte; subtitrarea e ascunsă implicit; scheme și cod la 360 px, light și dark, fără scroll orizontal.
- Ritmul și tabla se judecă pe ureche: proba lui Alex (tichetul 05).

## Out of Scope

- Evidențierea rândului de cod citit în clipa respectivă (potrivirea pe transcriere e prea fragilă pentru cod; se reia după probă).
- Tabla pentru modulele în afară de `asyncio` (tichetul 06, după probă).
- Schimbarea vocii sau a vitezei modelului prin setările Gemini (nu există parametru de viteză; ritmul se obține din instrucțiuni și pauze).
- Lecția care întreabă (tichetul 09 din `lectie-sincronizata/`), lecția inversă.

## Further Notes

- Dacă după probă ritmul tot e prea alert, următoarea pârghie e o singură secvență pe cerere de la Alex („Mai departe”) în loc de pauză automată.
- Costul de conținut: câteva sute de puncte. Se lucrează pe module, în ordinea modulelor P1, cu calibrare după primul.
