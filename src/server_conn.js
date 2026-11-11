// ServerConn: adresa și secretul serverului (platforma, tichetul 08), într-un singur loc.
// Stau doar în `localStorage`, la cheia `onapsis-server-v1`, ca JSON `{ url, secret }`. Nu intră în starea `S`, în export sau în brief.
// Mic și fără importuri: stocarea se primește prin `create`. Orice cod care vorbește cu serverul citește de aici
// (get / set / valid / configured / endpoint / headers), nu din `localStorage` direct. În pagină e o declarație globală, în Node un modul.
const ServerConn = (() => {
  const ITEM = "onapsis-server-v1";

  // Adresa fără spații și fără „/” la capăt; secretul fără spații. Orice altceva e lăsat cum l-a scris Alex.
  const cleanUrl = u => String(u || "").trim().replace(/\/+$/, "");
  const cleanSecret = s => String(s || "").trim();

  // Regulile de validare, într-un singur loc (le folosesc formularul din Progres, AI-ul, Jarvis și sincronizarea).
  // Adresa: https, sau http doar pe localhost (dezvoltare), fără „/” la capăt, fără spații; altfel "". Secretul merge într-un antet HTTP:
  // doar caractere ASCII tipăribile, fără spații.
  function normUrl(u) {
    u = cleanUrl(u);
    return /^https:\/\/[^\s/]+(\/\S*)?$/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/\S*)?$/i.test(u) ? u : "";
  }
  const validSecret = s => /^[\x21-\x7e]+$/.test(cleanSecret(s));

  function create(storage) {
    function get() {
      let o = {};
      try { o = JSON.parse(storage.getItem(ITEM) || "{}") || {}; } catch (e) { /* JSON stricat: ca și cum n-ar fi nimic */ }
      return { url: cleanUrl(o.url), secret: cleanSecret(o.secret) };
    }
    // `set` îmbină peste ce există ({ url } schimbă doar adresa); ambele goale șterg intrarea.
    function set(patch) {
      const next = Object.assign(get(), patch);
      const url = cleanUrl(next.url), secret = cleanSecret(next.secret);
      if (!url && !secret) storage.removeItem(ITEM); else storage.setItem(ITEM, JSON.stringify({ url, secret }));
    }
    return {
      get, set,
      clear: () => storage.removeItem(ITEM),
      // Perechea validă (adresă normalizată + secret ASCII) sau null; de aici citesc AI-ul și sincronizarea.
      valid() { const s = get(), url = normUrl(s.url); return url && validSecret(s.secret) ? { url, secret: s.secret } : null; },
      // Configurat = are o adresă validă și un secret valid.
      configured() { return !!this.valid(); },
      endpoint: path => get().url + path,
      headers() { return { authorization: "Bearer " + get().secret }; }
    };
  }
  return { create, ITEM, normUrl, validSecret };
})();
if (typeof module !== "undefined" && module.exports) module.exports = ServerConn;
