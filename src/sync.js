// JournalSync: sincronizarea jurnalului de încercări cu serverul (ADR 0003, tichetul 05). Cod pur, fără DOM și fără rețea proprie: `fetch`, cronometrele și legătura cu serverul se dau de la apelant,
// deci se testează în Node cu un server fals în memorie. În pagină e o declarație globală, în Node un modul.
//
// Un ciclu: (1) trimite evenimentele netrimise ale jurnalului în loturi de cel mult 500 (POST /events) și le marchează trimise doar după ce serverul le-a primit (`accepted` sau `duplicates`);
// (2) cere de la cursorul păstrat tot ce e nou (GET /events?after=&limit=), îmbină cu `merge(events, { remote: true })` și abia apoi mută cursorul, până când `more` e fals.
// Un eșec nu pierde nimic: ce nu e confirmat rămâne în coadă, iar cursorul nu trece peste ce nu s-a îmbinat. Nu blochează aplicația: totul e asincron, cu timeout pe cerere și reîncercări cu pauze tot mai mari.
//
// Contractul serverului (server/README.md): antet `Authorization: Bearer <secret>`; POST /events { events } → { accepted, duplicates, cursor, epoch }; GET /events → { events, cursor, more, epoch };
// POST /events/purge { confirm } → { deleted, epoch }.
//
// Epoca (tichetul 09): serverul are un șir care se schimbă când jurnalul lui e șters. După o ștergere numerele de secvență pornesc din nou de la 1, deci cursorul păstrat de un dispozitiv n-ar mai însemna nimic.
// Regula, cea mai simplă și sigură: la o epocă diferită de cea păstrată (lângă cursor, `getAux`), cursorul se reia de la 0 și epoca nouă se păstrează; NIMIC altceva nu se schimbă.
// Evenimentele locale rămân, iar cele deja trimise NU se retrimit singure (utilizatorul tocmai a șters serverul); cele netrimise (netrimise = serverul nu le-a avut) pleacă ca de obicei.
// Primul răspuns cu epocă (nimic păstrat înainte) doar o reține. Un server fără epocă (mai vechi) nu schimbă nimic. `resend()` („Retrimite jurnalul local”) e singura cale de a trimite din nou tot.
const JournalSync = (() => {
  const BATCH = 500, AUX_KEY = "sync", PURGE_CONFIRM = "purge-all-events";
  const fail = (kind, msg) => { const e = new Error(msg || kind); e.kind = kind; return e; };

  // Textul de stare de pe ecran, din starea întoarsă de `status()`.
  function label(st) {
    const n = st.unsent, nets = n === 1 ? "1 netrimis" : n + " netrimise";
    if (st.state === "off") return n ? "Sincronizarea nu e configurată · " + nets + "." : "Sincronizarea nu e configurată.";
    if (st.state === "syncing") return "Se sincronizează…";
    if (st.state === "auth") return "Secret greșit" + (n ? " · " + nets : "") + ". Verifică secretul în Sincronizare.";
    if (st.state === "offline") return "Fără semnal" + (n ? " · " + nets : "") + ". Se reîncearcă singur.";
    if (st.state === "error") return (st.stuck ? st.stuck + " evenimente refuzate de server" : "Serverul nu a răspuns bine") + (n ? " · " + nets : "") + ".";
    if (n) return nets + ".";
    return st.state === "synced" ? "La zi." : "În așteptare.";
  }

  // opts: journal (create-ul din journal.js, cu depozit), fetch, link: () => ({ url, secret }) | null, onStatus, onMerged (n => …: un pull a îmbinat n evenimente noi de la server; aplicația se redesenează), setTimeout / clearTimeout / random / now,
  //       batch (500), debounceMs (1500), timeoutMs (20000), backoff: { base: 2000, max: 300000 }
  function create(opts) {
    const j = opts.journal, doFetch = opts.fetch, linkOf = opts.link || (() => null);
    const T = opts.setTimeout || ((f, ms) => setTimeout(f, ms)), C = opts.clearTimeout || (t => clearTimeout(t));
    const rnd = opts.random || Math.random, now = opts.now || Date.now;
    const batch = opts.batch || BATCH, debounceMs = opts.debounceMs == null ? 1500 : opts.debounceMs, timeoutMs = opts.timeoutMs || 20000;
    const base = (opts.backoff && opts.backoff.base) || 2000, cap = (opts.backoff && opts.backoff.max) || 300000;
    // Fără semnal, telefoanele nu anunță mereu revenirea (evenimentul `online` lipsește sau vine prea devreme), deci pauza rămâne scurtă: reîncercarea costă o cerere eșuată.
    const offCap = Math.min(cap, (opts.backoff && opts.backoff.offlineMax) || 30000);
    let st = { state: "idle", unsent: 0, stuck: 0, lastOk: 0, retryAt: 0, error: "", wiped: 0 };
    let running = null, paused = false, again = false, fails = 0, debT = 0, retryT = 0, poked = false, purging = null;

    const emit = patch => { Object.assign(st, patch); if (opts.onStatus) { try { opts.onStatus(Object.assign({}, st)); } catch (e) { /* ecranul nu strică sincronizarea */ } } };
    async function refreshCount() { try { emit({ unsent: (await j.unsent()).length }); } catch (e) { /* rămâne numărul vechi */ } }

    // O cerere, cu timeout. Eșecurile se clasifică: offline (rețea), auth (401), server (5xx, 408, 429, răspuns ciudat), client (alt 4xx: lotul însuși e refuzat).
    async function call(link, method, path, body) {
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      let timer = 0;
      const timeout = new Promise((_, rej) => { timer = T(() => { if (ctl) ctl.abort(); rej(fail("offline", "timeout")); }, timeoutMs); });
      let res;
      try {
        const req = { method, headers: { Authorization: "Bearer " + link.secret }, signal: ctl ? ctl.signal : undefined };
        if (body !== undefined) { req.headers["Content-Type"] = "application/json"; req.body = JSON.stringify(body); }
        res = await Promise.race([Promise.resolve().then(() => doFetch(link.url + path, req)), timeout]);
      } catch (e) {
        throw e && e.kind ? e : fail("offline", e && e.message);
      } finally { C(timer); }
      if (res.status === 401) throw fail("auth", "401");
      if (!res.ok) throw fail(res.status >= 500 || res.status === 403 || res.status === 404 || res.status === 408 || res.status === 429 ? "server" : "client", "HTTP " + res.status);
      try { return await res.json(); } catch (e) { throw fail("server", "răspuns ilizibil"); }
    }

    // Trimite coada. Un lot refuzat de server ca invalid (4xx) se înjumătățește ca să treacă restul; un eveniment singur refuzat rămâne în coadă și se numără.
    async function push(link) {
      const queue = [], evs = await j.unsent();
      for (let i = 0; i < evs.length; i += batch) queue.push(evs.slice(i, i + batch));
      let stuck = 0;
      while (queue.length) {
        const b = queue.shift();
        let r;
        try { r = await call(link, "POST", "/events", { events: b }); }
        catch (e) {
          if (e.kind !== "client") throw e;
          if (b.length > 1) { const h = b.length >> 1; queue.unshift(b.slice(0, h), b.slice(h)); } else stuck++;
          continue;
        }
        await noteEpoch(link, r && r.epoch);
        const ok = new Set([].concat(r && r.accepted || [], r && r.duplicates || []));
        const sent = b.filter(e => ok.has(e.id)).map(e => e.id);
        if (sent.length) await j.markSent(sent);
        if (sent.length < b.length) throw fail("server", "lot confirmat incomplet");
      }
      return stuck;
    }

    // Cursorul și epoca sunt legate de adresa serverului: la alt server se pornește de la zero (îmbinarea e idempotentă, deci nu strică nimic).
    async function readAux(link) { const c = await j.getAux(AUX_KEY); return c && c.url === link.url && c.after >= 0 ? { after: c.after, epoch: typeof c.epoch === "string" ? c.epoch : null } : { after: 0, epoch: null }; }
    // Un răspuns a adus epoca `epoch`. Întoarce true dacă s-a schimbat față de cea păstrată (cursorul a fost reluat de la 0).
    async function noteEpoch(link, epoch) {
      if (typeof epoch !== "string" || !epoch) return false;
      const a = await readAux(link);
      if (a.epoch === epoch) return false;
      try { await j.setAux(AUX_KEY, { url: link.url, after: a.epoch === null ? a.after : 0, epoch }); } catch (e) { throw fail("local", e && e.message); }
      if (a.epoch === null) return false;
      emit({ wiped: now() });
      return true;
    }
    async function pull(link) {
      let { after: cur, epoch: ep } = await readAux(link);
      let added = 0;
      try { await pullPages(link, cur, ep, n => { added += n; }); }
      finally { if (added && opts.onMerged) { try { opts.onMerged(added); } catch (e) { /* ecranul nu strică sincronizarea */ } } }
    }
    async function pullPages(link, cur, ep, count) {
      for (let i = 0; i < 100000; i++) {
        const r = await call(link, "GET", "/events?after=" + cur + "&limit=" + batch);
        if (!r || !Array.isArray(r.events) || typeof r.cursor !== "number") throw fail("server", "răspuns neașteptat");
        if (await noteEpoch(link, r.epoch)) { cur = 0; ep = r.epoch; continue; }       // serverul a fost șters: pagina de mai sus e a unui cursor vechi, se reia de la 0
        if (typeof r.epoch === "string" && r.epoch) ep = r.epoch;
        try {
          if (r.events.length) { const m = await j.merge(r.events, { remote: true }); count((m && m.added) || 0); }
          if (r.cursor !== cur) { await j.setAux(AUX_KEY, { url: link.url, after: r.cursor, epoch: ep }); }
        } catch (e) { throw fail("local", e && e.message); }       // cursorul nu trece peste ce nu s-a îmbinat
        const moved = r.cursor !== cur;
        cur = r.cursor;
        if (!r.more || (!moved && !r.events.length)) break;
      }
    }

    async function cycle() {
      C(retryT); retryT = 0;
      const link = linkOf();
      if (!link) { emit({ state: "off", stuck: 0, retryAt: 0, error: "" }); await refreshCount(); return true; }
      emit({ state: "syncing", retryAt: 0 });
      let err = null, stuck = 0;
      try { stuck = await push(link); } catch (e) { err = e; }
      if (!err || err.kind === "server" || err.kind === "local") { try { await pull(link); } catch (e) { err = err || e; } }
      let n = st.unsent; try { n = (await j.unsent()).length; } catch (e) { /* idem */ }
      if (!err && !stuck) { fails = 0; emit({ state: "synced", unsent: n, stuck: 0, lastOk: now(), retryAt: 0, error: "" }); return true; }
      const kind = err ? err.kind : "client";
      emit({ state: kind === "auth" ? "auth" : kind === "offline" ? "offline" : "error", unsent: n, stuck, retryAt: 0, error: err ? err.message : "refuzat" });
      if (kind === "offline" || kind === "server" || kind === "local") {
        const wait = Math.min(kind === "offline" ? offCap : cap, base * Math.pow(2, Math.min(fails, 20))) * (0.5 + rnd() * 0.5);
        fails++;
        emit({ retryAt: now() + wait });
        retryT = T(() => { retryT = 0; syncNow(); }, wait);
      }
      return false;
    }

    // Un singur ciclu odată; o cerere venită în timpul lui (un răspuns nou) cere încă unul după el.
    function syncNow() {
      C(debT); debT = 0;
      if (paused) { poked = true; return Promise.resolve(Object.assign({}, st)); }
      if (running) { again = true; return running; }
      running = (async () => {
        try {
          let ok = true;
          do { again = false; ok = await cycle(); } while (again && ok);
        } catch (e) { emit({ state: "error", error: e && e.message }); }
        finally { running = null; }
        return Object.assign({}, st);
      })();
      return running;
    }
    // După un răspuns: așteaptă puțin (alte răspunsuri pot veni), apoi un ciclu.
    function poke() {
      if (paused) { poked = true; return; }
      if (running) { again = true; return; }
      C(debT); debT = T(() => { debT = 0; syncNow(); }, debounceMs);
    }
    // „Șterge jurnalul de pe server”: așteaptă ciclul în curs, oprește ciclurile cât durează cererea, apoi trimite POST /events/purge cu confirmarea explicită.
    // Reușita păstrează epoca nouă și cursorul 0; copia locală nu se atinge. Ce era netrimis rămâne în coadă și pleacă la următorul ciclu (serverul nu-l avea, deci nu s-a șters nimic din el).
    // Aruncă erori cu `kind`: auth, offline, server, client.
    // O singură ștergere odată: un al doilea apel se alătură primului (aceeași promisiune), ca `paused` să nu fie ridicat de alt apel decât cel care l-a pus.
    // Când ștergerea se termină (cu bine sau nu), dacă între timp s-a cerut un ciclu (poke / syncNow ignorate, sau un cronometru oprit de ștergere), pornește unul.
    function purgeServer() {
      if (purging) return purging;
      const p = purgeOnce().finally(() => {
        purging = null; paused = false;
        if (poked) { poked = false; poke(); }
      });
      purging = p;
      return p;
    }
    async function purgeOnce() {
      const link = linkOf();
      if (!link) throw fail("none", "serverul nu e configurat");
      paused = true; poked = false;
      if (running) { try { await running; } catch (e) { /* ciclul își raportează singur eșecul */ } }
      if (debT || retryT) poked = true;                              // un ciclu programat se oprește mai jos: să nu se piardă
      C(debT); debT = 0; C(retryT); retryT = 0;
      const r = await call(link, "POST", "/events/purge", { confirm: PURGE_CONFIRM });
      if (!r || typeof r.epoch !== "string" || !r.epoch) throw fail("server", "răspuns neașteptat");
      try { await j.setAux(AUX_KEY, { url: link.url, after: 0, epoch: r.epoch }); } catch (e) { throw fail("local", e && e.message); }
      emit({ wiped: now() });
      return { deleted: +r.deleted || 0, epoch: r.epoch };
    }
    // „Retrimite jurnalul local”: tot jurnalul intră în coada de trimis (serverul ignoră ce are deja, după id) și pleacă într-un ciclu. Întoarce numărul de evenimente puse în coadă.
    async function resend() {
      const n = await j.resendAll();
      emit({ wiped: 0 });
      await refreshCount();
      syncNow();
      return n;
    }
    function start() { refreshCount(); return syncNow(); }
    // Pornire / revenirea semnalului / revenirea în prim-plan. `win` și `doc` vin de la apelant.
    function attach(win, doc) {
      const on = () => { fails = 0; syncNow(); };
      const off = () => { if (linkOf()) emit({ state: "offline" }); };
      const vis = () => { if (!doc.hidden) syncNow(); };
      win.addEventListener("online", on); win.addEventListener("offline", off); doc.addEventListener("visibilitychange", vis);
      return () => { win.removeEventListener("online", on); win.removeEventListener("offline", off); doc.removeEventListener("visibilitychange", vis); };
    }
    function stop() { C(debT); C(retryT); debT = 0; retryT = 0; }
    return { start, syncNow, poke, attach, stop, purgeServer, resend, status: () => Object.assign({}, st), refreshCount };
  }

  return { BATCH, AUX_KEY, PURGE_CONFIRM, label, create };
})();
if (typeof module !== "undefined" && module.exports) module.exports = JournalSync;
