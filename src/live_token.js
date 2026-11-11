// LiveToken: cere serverului un jeton de scurtă durată pentru Gemini Live (`POST /live-token`, server/README.md).
// Clientul nu vede niciodată cheia Gemini. Un jeton ține ~60 de minute și deschide O SINGURĂ sesiune nouă;
// reînnoirea înseamnă un jeton nou, deci `get()` cere de fiecare dată unul proaspăt (GeminiLive decide când).
// Fără importuri: serverul (ServerConn), `fetch` și ceasul se primesc prin `create`. În pagină e o declarație globală, în Node un modul.
const LiveToken = (() => {
  const TIMEOUT_MS = 12000;
  // Eroarea are `reason`, ca cele din GeminiLive: noserver (nu e configurat), offline (nu ajunge la server), unauthorized (secret greșit),
  // nokey (serverul n-are cheia Gemini), gemini (Gemini a refuzat sau nu răspunde), server (orice altceva).
  const fail = (reason, detail) => Object.assign(new Error(detail || reason), { reason, code: 0, detail: detail || "" });

  function create(env) {
    const now = env.now || Date.now;
    // Întoarce { token, expireAt } cu expireAt în milisecunde după ceasul telefonului (din `expiresIn`, nu din ora serverului: un ceas dereglat nu strică reînnoirea).
    async function get() {
      if (!env.server.configured()) throw fail("noserver", "serverul nu e configurat");
      const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), env.timeoutMs || TIMEOUT_MS) : null;
      let res;
      try { res = await env.fetch(env.server.endpoint("/live-token"), { method: "POST", headers: env.server.headers(), signal: ctl ? ctl.signal : undefined }); }
      catch (e) { throw fail("offline", "nu ajung la server"); }
      finally { if (timer) clearTimeout(timer); }
      let body = null;
      try { body = await res.json(); } catch (e) { /* corp fără JSON: se judecă după status */ }
      if (res.status === 401) throw fail("unauthorized", "secret refuzat");
      if (!res.ok) {
        const code = body && body.detail && body.detail.error;
        throw fail(code === "gemini_key_missing" ? "nokey" : /^gemini_/.test(code || "") ? "gemini" : "server", code || "http " + res.status);
      }
      if (!body || typeof body.token !== "string" || !body.token) throw fail("server", "răspuns fără jeton");
      const t = now(), expireAt = body.expiresIn > 0 ? t + body.expiresIn * 1000 : Date.parse(body.expireAt);
      if (!(expireAt > t)) throw fail("server", "jeton fără expirare");
      return { token: body.token, expireAt };
    }
    return { get };
  }
  return { create };
})();
if (typeof module !== "undefined" && module.exports) module.exports = LiveToken;
