// Înlocuitori falși pentru testele de unitate (Node). Fiecare stă la o cusătură: socketul lui GeminiLive, Live, Audio.

// Un „WebSocket” fals. `net.sockets` păstrează conexiunile deschise, în ordine; `sent` păstrează mesajele JSON trimise de client.
export function fakeNetwork() {
  // `plan`: ce face fiecare socket nou, pe rând: { close: [cod, motiv] } îl închide imediat, altfel se deschide.
  const net = { sockets: [], holdOpen: false, plan: [] };
  net.Socket = class FakeSocket {
    constructor(url) {
      this.url = url; this.readyState = 0; this.sent = [];
      net.sockets.push(this);
      const step = net.plan.shift();
      queueMicrotask(() => {
        if (step && step.close) this.serverClose(step.close[0], step.close[1] || "");
        else if (this.readyState === 0 && !net.holdOpen) this.open();
      });
    }
    open() { this.readyState = 1; if (this.onopen) this.onopen({}); }
    send(data) { this.sent.push(JSON.parse(data)); }
    close(code = 1000, reason = "") {
      if (this.readyState === 3) return;
      this.readyState = 3;
      queueMicrotask(() => { if (this.onclose) this.onclose({ code, reason }); });
    }
    // Ce face serverul:
    serverSend(obj, as = "string") { const t = JSON.stringify(obj); if (this.onmessage) this.onmessage({ data: as === "blob" ? new Blob([t]) : t }); }
    serverClose(code, reason = "") { this.readyState = 3; if (this.onclose) this.onclose({ code, reason }); }
  };
  return net;
}

// Lasă să ruleze toate microtask-urile și timerele deja programate.
export const tick = () => new Promise(r => setTimeout(r, 0));

// Câteva tick-uri la rând: pentru lanțuri de promisiuni și decodări de Blob.
export async function settle(n = 4) { for (let i = 0; i < n; i++) await tick(); }

// Un AudioContext fals, cât să programeze redarea: `sources` păstrează sursele create, în ordine.
export function fakeAudioContext() {
  const ctx = { currentTime: 0, destination: {}, sources: [] };
  ctx.createBuffer = (channels, length, rate) => {
    const data = new Float32Array(length);
    return { duration: length / rate, data, copyToChannel(f32) { data.set(f32); } };
  };
  ctx.createBufferSource = () => {
    const s = {
      buffer: null, startedAt: null, stopped: false, onended: null,
      connect() {},
      start(t) { s.startedAt = t; },
      stop() { s.stopped = true; queueMicrotask(() => { if (s.onended) s.onended(); }); },     // ca în browser: `ended` vine și după stop()
      end() { if (s.onended) s.onended(); }                                                    // sfârșitul firesc, declanșat de test
    };
    ctx.sources.push(s);
    return s;
  };
  return ctx;
}
