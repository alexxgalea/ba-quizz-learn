// ServerAi: sursa „server" pentru funcțiile AI din PWA (tichetul 06 al platformei).
// Serverul propriu (POST /ai) primește promptul gata făcut și întoarce textul modelului (Gemini întâi, DeepSeek la eșec, cheile stau pe server).
// Aici stau cererea, maparea erorilor și ordinea surselor. Adresa și secretul NU se țin aici: le dă `ServerConn` (src/server_conn.js,
// `localStorage` `onapsis-server-v1`, niciodată în S, în export sau în brief), primit prin `create({ conn, fetch })`.
// Prompturile și parserele rămân în aplicație. În pagină e o declarație globală, în Node un modul.
const ServerAi = (() => {
  const TIMEOUT_MS = 50000;                              // serverul poate încerca două modele a câte 20 s
  const fail = (code, detail) => Object.assign(new Error(code), { code, detail: detail || "" });

  // Ordinea surselor, ca listă de nume. Cu serverul configurat, nicio cerere nu pleacă direct către Gemini sau DeepSeek
  // (`sample` rămâne, fiindcă nu iese din Claude); fără server, ordinea de dinainte: sample, Gemini, DeepSeek.
  function order(av) {
    if (av.server) return av.sample ? ["server", "sample"] : ["server"];
    return ["sample", "gemini", "deepseek"].filter(n => av[n]);
  }

  function create(env) {
    const timeoutMs = env.timeoutMs || TIMEOUT_MS;
    // Adresa și secretul vin de la ServerConn (`env.conn`, același accesor ca la Jarvis și la sincronizare); validarea (https, secret ASCII) e tot acolo (`valid()`).
    function config() {
      return env.conn.valid();
    }
    return {
      config,
      configured: () => !!config(),
      // req = { system, user, kind ("quick" | "default"), json (bool), maxTokens, prefer ("gemini" | "deepseek"), signal (AbortSignal, opțional) }.
      // `signal` oprește cererea la cererea utilizatorului (butonul „Oprește" al intervievatorului): codul e `cancelled`, nu `timeout`.
      // Întoarce textul sau aruncă o eroare cu `code`: nokey (nu e configurat), network, timeout, cancelled, srv_auth (401), srv_big (413),
      // srv_cap (429, plafonul zilnic), rate (alt 429), srv_ai (502: niciun model n-a răspuns), server (5xx), http (alt 4xx), format.
      async generate(req) {
        const cfg = config();
        if (!cfg) throw fail("nokey");
        const body = { system: req.system || "", user: req.user, kind: req.kind === "quick" ? "quick" : "default", json_mode: !!req.json };
        if (req.maxTokens) body.max_tokens = req.maxTokens;
        if (req.prefer) body.model = req.prefer;
        if (req.signal && req.signal.aborted) throw fail("cancelled");
        const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), timeoutMs);
        const stop = () => ctl.abort(), aborted = () => fail(req.signal && req.signal.aborted ? "cancelled" : "timeout");
        if (req.signal) req.signal.addEventListener("abort", stop);
        try {
          let r;
          try {
            r = await env.fetch(cfg.url + "/ai", { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + cfg.secret }, body: JSON.stringify(body) });
          } catch (err) { throw err && err.name === "AbortError" ? aborted() : fail("network", String((err && err.message) || err).slice(0, 120)); }
          let j = null;
          try { j = await r.json(); } catch (err) { if (err && err.name === "AbortError") throw aborted(); }
          if (!r.ok) {
            const d = j && typeof j.detail === "string" ? j.detail : "";
            throw fail(r.status === 401 ? "srv_auth" : r.status === 413 ? "srv_big" : r.status === 429 ? (d === "daily_cap" ? "srv_cap" : "rate") : r.status === 502 ? "srv_ai" : r.status >= 500 ? "server" : "http", "HTTP " + r.status + (d ? ": " + d : ""));
          }
          if (!j || typeof j.text !== "string" || !j.text.trim()) throw fail("format");
          return j.text;
        } finally { clearTimeout(tm); if (req.signal) req.signal.removeEventListener("abort", stop); }
      }
    };
  }

  // Încearcă pe rând sursele (liste de { name, generate(req) }) și întoarce primul text. La eșecul tuturor aruncă prima eroare
  // (a sursei principale). O anulare ("cancelled") oprește lanțul: nu are sens să încerci altă sursă.
  async function run(sources, req) {
    let first = null;
    for (const s of sources) {
      try { return await s.generate(req); }
      catch (err) {
        if (err && err.code === "cancelled") throw err;
        if (!first) first = err;
      }
    }
    throw first || fail("nokey");
  }

  return { create, order, run };
})();
if (typeof module !== "undefined" && module.exports) module.exports = ServerAi;
