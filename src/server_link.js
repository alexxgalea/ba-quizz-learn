// ServerLink: adresa serverului și secretul lui Alex, introduse o dată pe dispozitiv (Progres › Sincronizare). Doar localStorage, cheia `onapsis-server-v1`, JSON { url, secret }.
// Nu intră în S, în jurnal, în export sau în brief. Alte funcții care vorbesc cu serverul (AI, jeton Jarvis) citesc aceeași pereche prin `get()`.
const ServerLink = (() => {
  const KEY = "onapsis-server-v1";
  const store = s => { if (s) return s; try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; } };
  // https://exemplu.on.aws/ → https://exemplu.on.aws; doar https (și http pe localhost, pentru rulare locală). Altfel null.
  function cleanUrl(u) {
    u = String(u || "").trim().replace(/\/+$/, "");
    return /^https:\/\/[^\s/]+(\/[^\s]*)?$/i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/[^\s]*)?$/i.test(u) ? u : null;
  }
  function get(storage) {
    const st = store(storage); if (!st) return null;
    try {
      const o = JSON.parse(st.getItem(KEY) || "null");
      const url = o && cleanUrl(o.url), secret = o && typeof o.secret === "string" ? o.secret.trim() : "";
      return url && secret ? { url, secret } : null;
    } catch (e) { return null; }
  }
  // secretul merge într-un antet HTTP: doar caractere ASCII tipăribile, fără spații
  function set(cfg, storage) {
    const st = store(storage), url = cleanUrl(cfg && cfg.url), secret = cfg && typeof cfg.secret === "string" ? cfg.secret.trim() : "";
    if (!st || !url || !/^[\x21-\x7e]+$/.test(secret)) return false;
    try { st.setItem(KEY, JSON.stringify({ url, secret })); return true; } catch (e) { return false; }
  }
  function clear(storage) { const st = store(storage); try { if (st) st.removeItem(KEY); return true; } catch (e) { return false; } }
  return { KEY, cleanUrl, get, set, clear };
})();
if (typeof module !== "undefined" && module.exports) module.exports = ServerLink;
