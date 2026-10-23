// GeminiText: un singur apel de text către Gemini (REST generateContent), pentru funcțiile AI din PWA, unde nu există `sample`.
// `fetch` și cheia se primesc prin `create`. În pagină e o declarație globală, în Node un modul.
const GeminiText = (() => {
  const BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
  const fail = code => Object.assign(new Error(code), { code });

  function create(env) {
    const model = env.model || "gemini-3.8-flash", timeoutMs = env.timeoutMs || 30000;
    return {
      // req = { system, user }; întoarce textul răspunsului sau aruncă o eroare cu `code`: nokey, auth, rate, server, http, network, timeout, refused, format.
      async generate(req) {
        const key = env.getKey();
        if (!key) throw fail("nokey");
        const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), timeoutMs);
        try {
          let r;
          try {
            r = await env.fetch(BASE + model + ":generateContent?key=" + encodeURIComponent(key), {
              method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: req.system }] },
                contents: [{ role: "user", parts: [{ text: req.user }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 900, responseMimeType: "application/json" }
              })
            });
          } catch (err) { throw fail(err && err.name === "AbortError" ? "timeout" : "network"); }
          let j;
          try { j = await r.json(); } catch (err) { throw fail(err && err.name === "AbortError" ? "timeout" : "format"); }
          if (!r.ok) {
            const msg = String((j && j.error && j.error.message) || "");
            throw fail(r.status === 401 || r.status === 403 || (r.status === 400 && /api key/i.test(msg)) ? "auth" : r.status === 429 ? "rate" : r.status >= 500 ? "server" : "http");
          }
          const parts = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
          const text = parts.map(p => (typeof p.text === "string" ? p.text : "")).join("");
          if (!text.trim()) throw fail(j && j.promptFeedback && j.promptFeedback.blockReason ? "refused" : "format");
          return text;
        } finally { clearTimeout(tm); }
      }
    };
  }
  return { create };
})();
if (typeof module !== "undefined" && module.exports) module.exports = GeminiText;
