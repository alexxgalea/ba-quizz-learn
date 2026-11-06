<!-- Depanare frontend (modulul fedebug, frontend extins). Variantele greșite: B, C, D = ordinea din sursă (A e cea corectă). Fapte verificate pe MDN, react.dev și Chrome DevTools, mesaje rulate în Node 22 și în vitest (react 19.3): research/interview-facts.md, secțiunea 45. -->

### fd-01
Pe scurt: `user.profile`: mesajul spune că `name` a fost citit dintr-o valoare `undefined`, iar valoarea din fața punctului e `user.profile`.
Scop: Citești corect cel mai frecvent mesaj de eroare din JavaScript. Mulți caută `name`, deși `name` e doar proprietatea citită.
Mecanism: V8 scrie `Cannot read properties of undefined (reading 'name')`: între paranteze e numele proprietății, iar `undefined` e valoarea din care s-a citit. În `user.profile.name`, citirea lui `name` se face pe `user.profile`. Dacă lipsea `user`, citirea lui `profile` ar fi dat `(reading 'profile')`.
Pas cu pas:
```text
user.profile.name
user → { } (există)
.profile → undefined
.name pe undefined → TypeError
mesaj: (reading 'name')
```
Aplicare:
```js
const l = user.profile?.name ?? "—";
```
Legătură: FE-10: un `user.profile` care lipsește vine adesea dintr-un răspuns de API cu altă formă decât cea din tip. O eroare Python similară e `AttributeError: 'NoneType' object has no attribute 'name'`.
Limită: `?.` ascunde eroarea, nu o explică. Dacă `profile` trebuia să existe, repari sursa lipsei, nu doar citirea.
La interviu: „Mesajul numește proprietatea citită, nu pe cea lipsă. `reading 'name'` înseamnă că valoarea din fața lui `.name` e `undefined`. Caut de unde vine acea valoare.”
Verificare: Ce ar fi spus mesajul dacă `user` era `undefined`?
Răspuns verificare: `Cannot read properties of undefined (reading 'profile')`. Citirea eșuează la primul punct, iar numele din paranteze e proprietatea citită atunci.
Varianta greșită B: Mesajul numește proprietatea citită, nu pe cea lipsă. `name` e doar proprietatea căutată.
Varianta greșită C: Dacă `user` ar fi fost `undefined`, citirea lui `profile` ar fi eșuat prima, deci mesajul ar fi numit `profile`, nu `name`.
Varianta greșită D: Mesajul conține destul ca să ajungi la cauză fără rulare: proprietatea din paranteze și locul din stack trace.

### fd-02
Pe scurt: Apare o cerere `OPTIONS` (preflight), fiindcă `application/json` nu e un `Content-Type` permis fără verificare.
Scop: Știi ce vezi în Network când o cerere către alt origin pică sau pare dublată. E întrebarea de bază despre CORS.
Mecanism: Browserul trimite direct doar cereri simple: `GET`, `HEAD` sau `POST`, cu headere obișnuite și `Content-Type` de tip `text/plain`, `multipart/form-data` sau `application/x-www-form-urlencoded`. Cererea de aici e `POST` cu `application/json`, deci nu e simplă. Browserul trimite întâi `OPTIONS`, cu `Access-Control-Request-Method` și `Access-Control-Request-Headers`. Cererea reală pleacă doar dacă serverul răspunde cu `Access-Control-Allow-*` potrivit.
Pas cu pas:
```text
OPTIONS /items
Origin: https://a.ro
Access-Control-Request-Method: POST
Access-Control-Request-Headers:
  content-type
server răspunde cu Allow-*
abia apoi pleacă POST-ul
```
Aplicare:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://a.ro"],
    allow_methods=["POST"],
    allow_headers=["content-type"],
)
```
Legătură: FE-13: cu `credentials`, `Access-Control-Allow-Origin` nu poate fi `*`. În FastAPI folosești `CORSMiddleware`.
Limită: Preflight-ul e păstrat în cache cât spune `Access-Control-Max-Age`. Un POST cu `text/plain` n-ar avea preflight, dar nu schimbi formatul ca să ocolești CORS.
La interviu: „Un POST cu `application/json` către alt origin declanșează preflight. Browserul trimite `OPTIONS`, iar serverul trebuie să răspundă cu `Access-Control-Allow-Origin`, `Methods` și `Headers`. Postman nu aplică CORS.”
Verificare: De ce merge aceeași cerere în Postman?
Răspuns verificare: CORS e o regulă aplicată de browser, nu de rețea. Postman și curl trimit cererea fără să ceară permisiunea serverului.
Varianta greșită B: O cerere `POST` e simplă doar cu un `Content-Type` din lista scurtă. `application/json` nu e în ea.
Varianta greșită C: Browserul nu trimite un `GET` de verificare: verificarea se face cu `OPTIONS`.
Varianta greșită D: `credentials: "include"` schimbă ce trebuie să răspundă serverul, dar nu e condiția pentru preflight.

### fd-03
Pe scurt: Fallback-ul nu apare: boundary-ul nu prinde erorile din handlere, iar eroarea ajunge în consolă.
Scop: Știi ce nu prinde un error boundary. Întrebarea apare ca „cum tratezi erorile în React?”.
Mecanism: Un error boundary prinde erorile aruncate de copii în timpul randării. Un handler de click rulează mai târziu, după randare, deci boundary-ul nu e implicat. Eroarea e una obișnuită din JavaScript: ajunge în consolă, iar UI-ul rămâne cum era. Tot așa, boundary-ul nu prinde cod asincron (`setTimeout`, promisiuni), SSR sau erori aruncate de el însuși.
Pas cu pas:
```text
randare: <Bomb /> aruncă
→ boundary prinde → fallback
click: handlerul aruncă
→ nu e randare
→ boundary nu e implicat
→ eroare în consolă, UI neschimbat
```
Aplicare:
```tsx
const save = () => {
  try {
    doSave();
  } catch (e) {
    setError(String(e));
  }
};
```
Legătură: JS-07: promisiunile respinse nu sunt prinse de boundary; le tratezi cu `.catch` sau `try` / `catch` în jurul lui `await`.
Limită: Un boundary rămâne o clasă; nu există un echivalent în componente-funcții. Scrii o clasă o singură dată sau folosești `react-error-boundary`.
La interviu: „Error boundary prinde erorile de randare ale copiilor. Nu prinde event handlers, cod asincron, SSR sau erori din el însuși. În handler folosesc `try` / `catch`.”
Verificare: Cum raportezi totuși o eroare dintr-un handler?
Răspuns verificare: Ai `try` / `catch` în handler și o trimiți la un serviciu de raportare sau o pui în state. Ca plasă de siguranță poți asculta evenimentul `error` pe `window`.
Varianta greșită B: Boundary-ul reacționează la randare, nu la click, deci fallback-ul nu apare.
Varianta greșită C: Pagina nu rămâne albă: React demontează arborele doar când o eroare de randare nu e prinsă de niciun boundary.
Varianta greșită D: Un re-render nu schimbă regula: eroarea aruncată din handler nu devine niciodată o eroare de randare.

### fd-04
Pe scurt: Cu source maps: build-ul generează fișiere `.map`, iar DevTools arată sursa originală în locul celei minificate.
Scop: Poți citi un stack trace din producție. E o întrebare practică despre ce face build-ul.
Mecanism: Codul de producție e minificat: pe un singur rând, cu nume scurte. Un source map e un fișier care leagă fiecare poziție din fișierul minificat de fișierul și rândul original. DevTools îl găsește prin comentariul `//# sourceMappingURL` de la finalul fișierului, iar stack trace-urile, erorile și breakpoint-urile apar apoi în codul scris de tine.
Pas cu pas:
```text
build → main.4f2a.js + .map
eroare la main.4f2a.js:1:48210
DevTools citește sourceMappingURL
caută poziția în .map
arată Card.tsx:12
```
Aplicare:
```ts
// vite.config.ts
export default {
  build: { sourcemap: true },
};
```
Legătură: FD-01: un stack trace se citește la fel, dar aici pe sursă, nu pe bundle. Un traceback de Celery sau de Django arată direct fișierul și rândul sursă; în frontend build-ul le ascunde, iar un serviciu de monitorizare (Sentry) cere source maps încărcate la deploy.
Limită: Un source map expune codul sursă oricui îl poate descărca. De aceea unele echipe îl publică doar către serviciul de monitorizare.
La interviu: „Din producție primesc un stack trace pe cod minificat. Cu source maps, generate la build și servite împreună cu fișierele, DevTools îl arată pe sursa originală.”
Verificare: Cum afli dacă DevTools a găsit source map-ul?
Răspuns verificare: În Sources vezi fișierele originale (cu extensia ta, `.tsx`), iar stack trace-ul arată numele lor. DevTools anunță și când găsește comentariul `sourceMappingURL`.
Varianta greșită B: „Pretty print” doar indentează codul minificat; numele scurte și fișierele originale rămân pierdute.
Varianta greșită C: `debugger;` într-un bundle minificat te oprește pe o linie imposibil de citit și nu te duce la sursă.
Varianta greșită D: Nu e nevoie să dezactivezi minificarea: source maps rezolvă exact asta, păstrând codul mic în producție.
