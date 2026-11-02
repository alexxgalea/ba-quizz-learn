// Call: apelul vocal peste Live și Audio (spec §4.3). Leagă microfonul de server și serverul de difuzor,
// ține stările și asamblează transcrierea. Fără importuri: Live, Audio și ceasul se primesc ca parametri.
// Pentru lecție, în plus: poarta microfonului (`gate`, `mic`, `talk`), `spoken` / `voice`, pauza cu coada păstrată și supraviețuirea unei pierderi de conexiune (`survive`).
// În pagină e o declarație globală, în Node un modul.
const Call = (() => {
  const LEVEL_MS = 100;                    // cel mult zece niveluri pe secundă către ecran
  const VOICE = 0.03, THINK_MS = 400;     // vocea lui Alex: peste prag; după 400 ms sub prag a terminat de vorbit
  const DEAD = 0.0005, DEAD_MS = 4000;     // microfon mut: nivel practic zero timp de 4 s cât se așteaptă răspunsul

  async function start(o) {
    let session = null, state = null, playing = false, turnDone = true, ended = false, paused = false, pauseMode = null;
    let utt = null, uttId = 0, lastLevelAt = -Infinity, lastAlive = o.clock.now(), talking = false, talkedAt = 0, warn = null;
    let gateOpen = o.gate !== false, ptt = false, stale = false, lost = false, reopening = false, voiceOn = false, voiceAt = 0;
    const flags = { reconnecting: false, mic: false };
    const emit = e => { if (!ended) o.onEvent(e); };
    // În pauză starea rămâne „paused”, chiar dacă vine audio de la model sau se golește redarea.
    const setState = st => { if (st !== state && !(paused && st !== "paused" && st !== "ended")) { state = st; emit({ type: "state", state: st }); } };
    const refreshWarn = () => {
      const code = flags.reconnecting ? "reconnecting" : flags.mic ? "mic-silent" : null;
      if (code !== warn) { warn = code; emit({ type: "warn", code }); }
    };
    // Vorbește cât se redă audio; revine la ascultare când redarea s-a golit și tura modelului s-a încheiat.
    // Când vorbirea se termină de la sine (nu tăiată), ecranul primește `spoken`: lecția știe că bucata s-a auzit toată.
    let cutting = false;                     // golirea redării de către noi nu e „s-a auzit toată”
    const flushNow = () => { cutting = true; o.audio.flush(); cutting = false; };
    const settleSpeaking = () => { if (state === "speaking" && !playing && turnDone && !paused && !cutting) { setState("listening"); emit({ type: "spoken" }); } };
    const stopSpeaking = () => { flushNow(); turnDone = true; utt = null; setState("listening"); };
    // Poarta microfonului spre server: deschisă de `mic(true)` sau cât e apăsat Vorbește. La închidere serverul primește sfârșitul fluxului.
    const gateNow = () => gateOpen || ptt;
    const syncGate = was => { if (was && !gateNow() && session) session.audioEnd(); };
    const micOpen = () => !paused && !(o.halfDuplex && playing) && gateNow();

    // Transcrierea: bucățile primite se adună într-o replică care crește; replica se încheie când se schimbă vorbitorul sau tura.
    const onTranscript = e => {
      if (!utt || utt.who !== e.who) utt = { id: ++uttId, who: e.who, text: "" };
      utt.text += e.text;
      emit({ type: "transcript", id: utt.id, who: utt.who, text: utt.text });
    };

    // Un singur sfârșit: ecranul află motivul, apoi nu mai primește nimic.
    const finish = async (reason, closeLive) => {
      if (ended) return;
      setState("ended");
      emit({ type: "ended", reason });
      ended = true;
      if (closeLive && session) session.close();
      await o.audio.stop();
    };

    const onLive = e => {
      if (ended) return;
      if (e.type === "closed") { if (o.survive && e.reason === "network") goLost(); else finish(e.reason, false); return; }
      if (e.type === "reconnecting") { flags.reconnecting = true; refreshWarn(); return; }
      if (e.type === "live") { flags.reconnecting = false; refreshWarn(); return; }
      if (e.type === "tool") { stale = false; emit(e); return; }          // un apel de funcție începe o tură nouă: restul turei tăiate nu mai contează
      if (paused && pauseMode !== "keep") return;          // pauza simplă: ce mai vine de la model se aruncă
      if (e.type === "audio") { if (stale) return; turnDone = false; talking = false; o.audio.play(e.pcm); }
      else if (e.type === "turnComplete") { stale = false; turnDone = true; utt = null; settleSpeaking(); }
      else if (e.type === "interrupted") { stale = false; stopSpeaking(); }
      else if (e.type === "transcript") onTranscript(e);
    };
    const onLevel = v => {
      if (ended) return;
      const now = o.clock.now();
      if (now - lastLevelAt >= LEVEL_MS) { lastLevelAt = now; emit({ type: "level", v }); }
      // Cât timp te așteaptă, vocea ta (peste prag) îl face să asculte; după o pauză de THINK_MS se gândește.
      // Vocea lui Alex pe o poartă deschisă (o dată pe replică): lecția oprește trecerea automată la bucata următoare.
      if (v > VOICE) { voiceAt = now; if (!voiceOn && micOpen()) { voiceOn = true; emit({ type: "voice" }); } }
      else if (voiceOn && now - voiceAt >= THINK_MS) voiceOn = false;
      if (v > VOICE && (state === "listening" || state === "thinking")) { talking = true; talkedAt = now; if (state === "thinking") setState("listening"); }
      else if (talking && state === "listening" && now - talkedAt >= THINK_MS) { talking = false; setState("thinking"); }
      if (v >= DEAD) { lastAlive = now; flags.mic = false; refreshWarn(); }
      else if (state === "listening" && now - lastAlive >= DEAD_MS) { flags.mic = true; refreshWarn(); }
    };
    const onPlaying = v => { if (ended) return; playing = v; if (v) setState("speaking"); else settleSpeaking(); };
    // Cu `halfDuplex`, microfonul tace cât se redă audio (pentru un difuzor care face ecou).
    const onFrame = pcm => { if (session && !ended && micOpen()) session.audio(pcm); };

    // Conexiunea a căzut definitiv, dar apelul rămâne: pe pauză, cu microfonul și difuzorul pornite, până la `resume`, care redeschide sesiunea.
    const goLost = () => {
      session = null; lost = true; flags.reconnecting = false; refreshWarn();
      paused = true; pauseMode = "drop"; turnDone = true; utt = null; stale = false;
      setState("paused"); flushNow();
      emit({ type: "lost" });
    };
    async function reopen() {
      if (reopening) return false;
      reopening = true;
      try {
        const s = await o.live.open(o.config, onLive);
        if (ended) { s.close(); return false; }
        session = s; lost = false; paused = false; pauseMode = null; turnDone = true; utt = null;
        setState("listening"); emit({ type: "reopened" });
        return true;
      } catch (err) { emit({ type: "lost", reason: err && err.reason }); return false; }
      finally { reopening = false; }
    }

    // Microfonul și serverul pornesc în paralel; dacă unul cade, celălalt se închide.
    const [live, mic] = await Promise.allSettled([
      o.live.open(o.config, onLive),
      o.audio.start({ micId: o.micId, onFrame, onLevel, onPlaying })
    ]);
    if (live.status === "rejected" || mic.status === "rejected") {
      ended = true;
      if (live.status === "fulfilled") live.value.close();
      await o.audio.stop();
      throw (mic.status === "rejected" ? mic.reason : live.reason);
    }
    session = live.value;
    setState("listening");
    return {
      // Fără text: „Stai.” Cu text (lecția): restul turei tăiate se aruncă până răspunde modelul cu un apel de funcție.
      interrupt(text) { if (ended || !session) return; const open = !turnDone; stopSpeaking(); if (text && open) stale = true; session.text(text || "Stai."); },
      cut() { if (!ended) stopSpeaking(); },
      say(text) { if (ended || !session) return; session.text(text); talking = false; setState("thinking"); },
      // `keep`: redarea se oprește fără să piardă coada, iar ce mai vine de la model se adaugă la ea.
      pause(opts) {
        if (ended || paused) return;
        paused = true; pauseMode = opts && opts.keep ? "keep" : "drop";
        setState("paused");
        if (pauseMode === "keep") o.audio.pause(); else flushNow();
      },
      // `fresh`: coada veche se aruncă. După o pierdere de conexiune redeschide sesiunea; întoarce o promisiune cu true dacă a mers.
      resume(opts) {
        if (ended) return Promise.resolve(false);
        if (lost) return reopen();
        if (!paused) return Promise.resolve(true);
        const keep = pauseMode === "keep", fresh = !!(opts && opts.fresh);
        paused = false; pauseMode = null;
        if (fresh) { flushNow(); turnDone = true; utt = null; }
        if (keep) o.audio.resume();
        setState(playing && !fresh ? "speaking" : "listening");
        return Promise.resolve(true);
      },
      // Poarta microfonului: `mic(false)` oprește tot ce pleacă spre server, `mic(true)` îl pornește.
      mic(open) { const was = gateNow(); gateOpen = !!open; syncGate(was); },
      // Vorbește, ținut apăsat: tace Jarvis, se deschide microfonul; la eliberare serverul primește sfârșitul fluxului.
      // Restul turei tăiate se aruncă doar dacă tura mai era deschisă: una încheiată nu mai trimite nimic de ignorat, iar răspunsul la întrebare trebuie să se audă.
      talk(down) {
        if (ended) return;
        const was = gateNow();
        if (down) {
          if (paused || !session) return;
          const open = !turnDone;
          ptt = true; flushNow(); stale = open; turnDone = true; utt = null; talking = false; setState("listening");
        } else ptt = false;                                  // eliberarea contează și pe pauză: poarta nu rămâne deschisă
        syncGate(was);
      },
      end: () => finish("user", true)
    };
  }
  return { start };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Call;
