// JournalSync: sincronizarea jurnalului de încercări cu serverul (ADR 0003, tichetul 05). Cod pur, fără DOM și fără rețea proprie: `fetch`, cronometrele și legătura cu serverul se dau de la apelant,
// deci se testează în Node cu un server fals în memorie. În pagină e o declarație globală, în Node un modul.
//
// Un ciclu: (1) trimite evenimentele netrimise ale jurnalului în loturi de cel mult 500 (POST /events) și le marchează trimise doar după ce serverul le-a primit (`accepted` sau `duplicates`);
// (2) cere de la cursorul păstrat tot ce e nou (GET /events?after=&limit=), îmbină cu `merge(events, { remote: true })` și abia apoi mută cursorul, până când `more` e fals.
// Un eșec nu pierde nimic: ce nu e confirmat rămâne în coadă, iar cursorul nu trece peste ce nu s-a îmbinat. Nu blochează aplicația: totul e asincron, cu timeout pe cerere și reîncercări cu pauze tot mai mari.
//
// Contractul serverului (server/README.md): antet `Authorization: Bearer <secret>`; POST /events { events } → { accepted, duplicates, cursor }; GET /events → { events, cursor, more }.
const JournalSync = (() => {
  const BATCH = 500, AUX_KEY = "sync";
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

  // opts: journal (create-ul din journal.js, cu depozit), fetch, link: () => ({ url, secret }) | null, onStatus, setTimeout / clearTimeout / random / now,
  //       batch (500), debounceMs (1500), timeoutMs (20000), backoff: { base: 2000, max: 300000 }
  function create(opts) {
    const j = opts.journal, doFetch = opts.fetch, linkOf = opts.link || (() => null);
    const T = opts.setTimeout || ((f, ms) => setTimeout(f, ms)), C = opts.clearTimeout || (t => clearTimeout(t));
    const rnd = opts.random || Math.random, now = opts.now || Date.now;
    const batch = opts.batch || BATCH, debounceMs = opts.debounceMs == null ? 1500 : opts.debounceMs, timeoutMs = opts.timeoutMs || 20000;
    const base = (opts.backoff && opts.backoff.base) || 2000, cap = (opts.backoff && opts.backoff.max) || 300000;
    let st = { state: "idle", unsent: 0, stuck: 0, lastOk: 0, retryAt: 0, error: "" };
    let running = null, again = false, fails = 0, debT = 0, retryT = 0;

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
        const ok = new Set([].concat(r && r.accepted || [], r && r.duplicates || []));
        const sent = b.filter(e => ok.has(e.id)).map(e => e.id);
        if (sent.length) await j.markSent(sent);
        if (sent.length < b.length) throw fail("server", "lot confirmat incomplet");
      }
      return stuck;
    }

    // Cursorul e legat de adresa serverului: la alt server se pornește de la zero (îmbinarea e idempotentă, deci nu strică nimic).
    async function readCursor(link) { const c = await j.getAux(AUX_KEY); return c && c.url === link.url && c.after >= 0 ? c.after : 0; }
    async function pull(link) {
      let cur = await readCursor(link);
      for (let i = 0; i < 100000; i++) {
        const r = await call(link, "GET", "/events?after=" + cur + "&limit=" + batch);
        if (!r || !Array.isArray(r.events) || typeof r.cursor !== "number") throw fail("server", "răspuns neașteptat");
        try {
          if (r.events.length) await j.merge(r.events, { remote: true });
          if (r.cursor !== cur) { await j.setAux(AUX_KEY, { url: link.url, after: r.cursor }); }
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
        const wait = Math.min(cap, base * Math.pow(2, Math.min(fails, 20))) * (0.5 + rnd() * 0.5);
        fails++;
        emit({ retryAt: now() + wait });
        retryT = T(() => { retryT = 0; syncNow(); }, wait);
      }
      return false;
    }

    // Un singur ciclu odată; o cerere venită în timpul lui (un răspuns nou) cere încă unul după el.
    function syncNow() {
      C(debT); debT = 0;
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
      if (running) { again = true; return; }
      C(debT); debT = T(() => { debT = 0; syncNow(); }, debounceMs);
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
    return { start, syncNow, poke, attach, stop, status: () => Object.assign({}, st), refreshCount };
  }

  return { BATCH, AUX_KEY, label, create };
})();
if (typeof module !== "undefined" && module.exports) module.exports = JournalSync;
