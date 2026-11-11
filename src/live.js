// GeminiLive: protocolul WebSocket al serverului vocal, ascuns în spatele lui `open` (spec §4.1).
// Fără importuri: socketul și ceasul se primesc prin `create`. În pagină e o declarație globală, în Node un modul.
// Autentificarea: `cfg.getToken()` (jeton efemer de la server, tichetul 08) sau, ca rezervă veche, `cfg.key` (cheia Gemini).
//   - Jetonul deschide `BidiGenerateContentConstrained?access_token=` (doar v1beta), cheia deschide `BidiGenerateContent?key=`.
//   - `getToken()` întoarce `{ token, expireAt }` (expireAt în ms, după ceasul telefonului) și se cheamă: la pornire, la reconectare
//     când jetonul ține mai puțin de `cfg.renewMs` (implicit 12 minute) și o singură dată când Gemini refuză jetonul curent.
//   - Reconectările la `goAway` (conexiunea ține ~10 minute) merg cu ACELAȘI jeton și cu handle-ul de reluare. Cu un jeton NOU
//     handle-ul vechi nu e documentat: dacă e refuzat, sesiunea repornește curat (fără handle) și anunță `restarted`, ca stratul de
//     deasupra să retrimită contextul (poziția lecției). Vezi docs/probe-jeton-live.html pentru proba pe API-ul real.
const GeminiLive = (() => {
  const WS_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.";
  const WS_URL = WS_BASE + "BidiGenerateContent";                         // cu ?key=
  const WS_TOKEN_URL = WS_BASE + "BidiGenerateContentConstrained";         // cu ?access_token=
  const RETRY_MS = [500, 1000, 2000];                // pauzele dinaintea celor trei încercări de reluare
  // Conexiunea ține ~10 minute, deci un jeton care mai ține 5 ar expira între două reconectări; pragul e peste durata unei conexiuni.
  const RENEW_MS = 12 * 60000;

  function setupMessage(cfg, handle) {
    const setup = {
      model: "models/" + cfg.model,
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cfg.voice } } } },
      systemInstruction: { parts: [{ text: cfg.system }] },
      realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: cfg.silenceMs } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      sessionResumption: handle ? { handle } : {},
      contextWindowCompression: { slidingWindow: {} }
    };
    if (cfg.tools && cfg.tools.length) setup.tools = [{ functionDeclarations: cfg.tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) }];
    return { setup };
  }

  // PCM 16 biți little-endian → Base64, cum cere protocolul.
  function toBase64(pcm) {
    const u8 = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    let bin = "";
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromBase64(b64) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Int16Array(u8.buffer, 0, u8.length >> 1);
  }

  // De ce s-a închis conexiunea, după codul și textul serverului: auth (cheie), quota (limită), rejected (cerere greșită), network (restul).
  function closeInfo(code, detail) {
    detail = detail || "";
    const reason = /api key|permission|unauthenticated|credential|forbidden|(access|auth).?token|token.*(expired|invalid)|expired.*token/i.test(detail) ? "auth"
      : /quota|exhaust|rate.?limit|too many|429/i.test(detail) ? "quota"
      : code === 1007 || code === 1008 ? "rejected" : "network";
    return { reason, code, detail };
  }
  const failure = info => Object.assign(new Error(info.detail || info.reason), info);

  function create(env) {
    const Socket = (env && env.WebSocket) || (typeof WebSocket !== "undefined" ? WebSocket : null);
    const sleep = (env && env.sleep) || (ms => new Promise(r => setTimeout(r, ms)));
    const now = (env && env.now) || Date.now;

    function open(cfg, onEvent) {
      if (!cfg.key && !cfg.getToken) return Promise.reject(failure({ reason: "auth", code: 0, detail: "lipsește cheia" }));
      const tools = new Map((cfg.tools || []).map(t => [t.name, t]));
      let sock = null, gen = 0, live = false, closed = false, reconnecting = false, handle = null;
      // Jetonul curent și jetonul cu care s-a primit ultimul handle (un handle obținut cu alt jeton nu e garantat că se acceptă).
      let tok = null, handleTok = null;

      const send = obj => { if (closed || !live || sock.readyState !== 1) return false; sock.send(JSON.stringify(obj)); return true; };
      // O singură închidere definitivă, anunțată cu `closed`.
      const finish = info => {
        if (closed) return;
        closed = true; live = false;
        onEvent(Object.assign({ type: "closed" }, info));
      };

      // Apelurile de funcții se rulează pe rând, în ordinea sosirii, chiar dacă vin în mesaje diferite.
      // Răspunsul pleacă după ce `run` s-a terminat; un apel anulat de server nu primește răspuns.
      let queue = Promise.resolve();
      const cancelled = new Set();
      const runCalls = calls => { queue = queue.then(async () => {
        for (const c of calls) {
          if (cancelled.has(c.id) || closed) continue;
          const args = c.args || {}, tool = tools.get(c.name), out = {};
          try {
            if (!tool) throw new Error("funcție necunoscută: " + c.name);
            out.result = await tool.run(args);
          } catch (err) { out.error = String((err && err.message) || err); }
          if (cancelled.has(c.id) || closed) continue;
          send({ toolResponse: { functionResponses: [{ id: c.id, name: c.name, response: out }] } });
          onEvent(Object.assign({ type: "tool", name: c.name, args }, out));
        }
      }); };

      // Un mesaj de la server → evenimente.
      const route = msg => {
        const sc = msg.serverContent || {};
        if (sc.interrupted) onEvent({ type: "interrupted" });
        if (sc.inputTranscription && sc.inputTranscription.text) onEvent({ type: "transcript", who: "me", text: sc.inputTranscription.text });
        if (sc.outputTranscription && sc.outputTranscription.text) onEvent({ type: "transcript", who: "model", text: sc.outputTranscription.text });
        const parts = (sc.modelTurn && sc.modelTurn.parts) || [];
        for (const p of parts) if (p.inlineData && p.inlineData.data) onEvent({ type: "audio", pcm: fromBase64(p.inlineData.data) });
        if (sc.turnComplete) onEvent({ type: "turnComplete" });
        if (msg.toolCall) runCalls(msg.toolCall.functionCalls || []);
        if (msg.toolCallCancellation) (msg.toolCallCancellation.ids || []).forEach(id => cancelled.add(id));
        const u = msg.sessionResumptionUpdate;
        if (u && u.resumable && u.newHandle) { handle = u.newHandle; handleTok = tok && tok.token; }
        // Serverul anunță că închide curând: se trece pe o conexiune nouă acum, nu după ce cade.
        if (msg.goAway) { const old = sock; gen++; old.close(1000); lost({ reason: "network", code: 0, detail: "goAway" }); }
      };

      // Deschide un socket. Se rezolvă cu null când serverul confirmă setup-ul sau cu motivul închiderii dacă pică înainte.
      // Un socket înlocuit (`gen` mai nou) nu mai are voie să schimbe nimic.
      const connect = () => new Promise(done => {
        const id = ++gen, s = sock = new Socket(cfg.getToken ? WS_TOKEN_URL + "?access_token=" + encodeURIComponent(tok.token) : WS_URL + "?key=" + encodeURIComponent(cfg.key));
        let settled = false;
        const settle = v => { if (!settled) { settled = true; done(v); } };
        s.onopen = () => s.send(JSON.stringify(setupMessage(cfg, handle)));
        s.onmessage = async m => {
          let msg;
          try { msg = JSON.parse(typeof m.data === "string" ? m.data : await m.data.text()); } catch (e) { return; }      // serverul trimite cadre binare: Blob
          if (id !== gen || closed) return;
          if (msg.setupComplete) settle(null);
          route(msg);
        };
        s.onclose = e => {
          if (id !== gen) return;
          const info = closeInfo(e.code, e.reason);
          if (!settled) settle(info); else lost(info);
        };
      });

      // Cere un jeton nou dacă n-avem unul sau ține mai puțin de pragul de reînnoire (sau dacă `force`). Întoarce null la succes
      // sau motivul eșecului: ce a spus `getToken` (offline = fără semnal, retriabil ca rețeaua), altfel network.
      const ensureToken = async force => {
        if (!cfg.getToken) return null;
        if (!force && tok && tok.expireAt - now() >= (cfg.renewMs == null ? RENEW_MS : cfg.renewMs)) return null;
        try {
          const t = await cfg.getToken();
          if (!t || !t.token) throw new Error("jeton gol");
          tok = { token: t.token, expireAt: t.expireAt };
          return null;
        } catch (err) {
          return { reason: (err && err.reason) || "network", code: 0, detail: String((err && err.detail) || (err && err.message) || "jeton") };
        }
      };
      // O conectare completă: jetonul la zi, apoi socketul. Întoarce { info, restarted }: info = null la succes, altfel motivul.
      // Două ieșiri pentru jeton: refuzat de Gemini → un jeton nou, o singură dată; handle refuzat după un jeton nou → fără handle (repornire curată).
      const establish = async () => {
        const out = { info: null, restarted: false };
        const before = tok;
        const bad = await ensureToken(false);
        if (bad) { out.info = bad; return out; }
        let fresh = tok !== before;
        let r = await connect();
        if (r && r.reason === "auth" && cfg.getToken && !fresh) {
          const bad2 = await ensureToken(true);
          if (bad2) { out.info = bad2; return out; }
          fresh = true;
          r = await connect();
        }
        if (r && handle && cfg.getToken && tok.token !== handleTok && r.reason !== "network") {
          handle = null; handleTok = null; out.restarted = true;
          r = await connect();
        }
        out.info = r;
        return out;
      };
      const retriable = info => info.reason === "network" || info.reason === "offline";

      // Conexiunea s-a pierdut după ce era în picioare: se reia doar cu un handle și doar dacă motivul e rețeaua.
      const lost = info => {
        if (closed || reconnecting) return;
        if (!handle || info.reason !== "network") finish(info); else reconnect(info);
      };
      const reconnect = async info => {
        reconnecting = true; live = false;
        onEvent({ type: "reconnecting" });
        let last = info;
        for (const ms of (cfg.retryMs || RETRY_MS)) {
          await sleep(ms);
          if (closed) return;
          const { info: r, restarted } = await establish();
          if (closed) return;
          if (!r) { reconnecting = false; live = true; if (restarted) onEvent({ type: "restarted" }); onEvent({ type: "live" }); return; }
          last = r;
          if (!retriable(r)) break;
        }
        reconnecting = false;
        finish(last);
      };

      return establish().then(({ info: first }) => {
        if (first) { closed = true; throw failure(first); }      // a căzut înainte de confirmare
        live = true;
        return {
          audio: pcm => send({ realtimeInput: { audio: { data: toBase64(pcm), mimeType: "audio/pcm;rate=16000" } } }),
          text: text => send({ realtimeInput: { text } }),
          // Microfonul s-a oprit (sau poarta lui s-a închis): serverul golește audio-ul păstrat și închide tura.
          audioEnd: () => send({ realtimeInput: { audioStreamEnd: true } }),
          close() { finish({ reason: "user", code: 1000, detail: "" }); sock.close(1000); }
        };
      });
    }
    return { open };
  }

  return { create, open: (cfg, onEvent) => create().open(cfg, onEvent) };
})();
if (typeof module !== "undefined" && module.exports) module.exports = GeminiLive;
