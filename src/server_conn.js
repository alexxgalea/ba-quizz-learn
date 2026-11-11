// ServerConn: adresa și secretul serverului (platforma, tichetul 08), într-un singur loc.
// Stau doar în `localStorage`, la cheia `onapsis-server-v1`, ca JSON `{ url, secret }`. Nu intră în starea `S`, în export sau în brief.
// Mic și fără importuri: stocarea se primește prin `create`. Orice cod care vorbește cu serverul citește de aici
// (get / set / configured / endpoint / headers), nu din `localStorage` direct. În pagină e o declarație globală, în Node un modul.
const ServerConn = (() => {
  const ITEM = "onapsis-server-v1";

  // Adresa fără spații și fără „/” la capăt; secretul fără spații. Orice altceva e lăsat cum l-a scris Alex.
  const cleanUrl = u => String(u || "").trim().replace(/\/+$/, "");
  const cleanSecret = s => String(s || "").trim();

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
      // Configurat = are și adresa, și secretul.
      configured() { const s = get(); return !!(s.url && s.secret); },
      endpoint: path => get().url + path,
      headers() { return { authorization: "Bearer " + get().secret }; }
    };
  }
  return { create, ITEM };
})();
if (typeof module !== "undefined" && module.exports) module.exports = ServerConn;
