// Schelete: codul minim, canonic, al unui concept, scris din memorie în câteva minute (vezi CONTEXT.md).
// id: „s-<modul>-<nume>”; referința e secțiunea „=== <id> ===” din katas/skel_*.{py,mjs,ts,tsx,sql}, testată.
// t titlul, p cerința, k punctele esențiale (3–5), lang limbajul referinței (py, js, ts, tsx, sql, yaml, docker),
// v marcajul de versiune (de pildă „3.11+”), st = true pentru „verificat structural”, g grupa (doar la frontend: react, js, ts).
window.PREP.skel = [
  {
    id: "s-gil-bq", m: "gil", lang: "py",
    t: "Coadă blocantă mărginită cu Condition",
    p: "Scrie o clasă `BoundedQueue(cap)` cu `put(item)` și `get()`, sigure între thread-uri: `put` așteaptă cât coada e plină, `get` așteaptă cât e goală. Fără `queue.Queue`; doar `threading`.",
    k: [
      "`while`, nu `if`, în jurul lui `wait()`: la trezire condiția se verifică din nou (trezire falsă sau alt thread a luat locul).",
      "Ambele condiții (`not_full` / `not_empty`) folosesc același lock, iar bufferul se citește și se modifică doar sub el.",
      "`put` face `notify` pe condiția „nu e goală”, `get` pe „nu e plină”, după ce au schimbat bufferul.",
      "Bufferul e un `deque` (`popleft` în O(1)), iar o capacitate < 1 e respinsă."
    ]
  },
  {
    id: "s-frontend-closure", m: "frontend", g: "js", lang: "js",
    t: "Closure și factory: un contor cu stare privată",
    p: "Scrie `makeCounter(start = 0)`, care întoarce un obiect cu `inc()`, `dec()` și `value()`. Starea nu trebuie să fie accesibilă din afară, iar doi contori creați separat nu își împart valoarea.",
    k: [
      "Starea e o variabilă locală a fabricii (`let n`), nu o proprietate a obiectului întors: din afară nu o poți citi sau scrie.",
      "Metodele sunt closure-uri: păstrează accesul la `n` și după ce `makeCounter` s-a terminat, fiindcă closure-ul capturează variabila, nu o copie a valorii.",
      "Fiecare apel al fabricii creează o variabilă `n` nouă, deci doi contori nu își împart starea; fără `new`, fără clasă.",
      "Metodele nu folosesc `this`, deci merg și extrase (`const { inc } = c; inc()`), unde o metodă de clasă și-ar pierde contextul."
    ]
  },
  {
    id: "s-frontend-union-never", m: "frontend", g: "ts", lang: "ts",
    t: "Union discriminat și switch exhaustiv cu never",
    p: "Modelează rezultatul unei cereri ca union discriminat de `status`: `loading`, `ok` (cu `data: string[]`) și `error` (cu `message`). Scrie `label(r)` cu un `switch` exhaustiv, astfel încât un caz nou în union să nu compileze până nu primește ramura lui.",
    k: [
      "Uniunea e discriminată de un câmp literal comun (`status`), nu de câmpuri opționale; în fiecare `case` tipul se îngustează (`r.data` există doar la `ok`).",
      "`default` apelează `assertNever(r)`, iar parametrul ei are tipul `never`: după ce toate cazurile sunt tratate, `r` nu mai poate avea alt tip.",
      "Un caz nou în union face `r` ne-`never` în `default`, deci eroarea apare la compilare, nu în producție.",
      "`assertNever` aruncă și la runtime (date din afara tipului, de pildă un JSON) și întoarce `never`, deci funcția nu are nevoie de alt `return`."
    ]
  }
];
