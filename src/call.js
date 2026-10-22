// Call: apelul vocal peste Live și Audio (spec §4.3). Leagă microfonul de server și serverul de difuzor,
// ține stările și asamblează transcrierea. Fără importuri: Live, Audio și ceasul se primesc ca parametri.
// În pagină e o declarație globală, în Node un modul.
const Call = (() => {
  const LEVEL_MS = 100;                    // cel mult zece niveluri pe secundă către ecran
  const VOICE = 0.03, THINK_MS = 400;     // vocea lui Alex: peste prag; după 400 ms sub prag a terminat de vorbit
  const DEAD = 0.0005, DEAD_MS = 4000;     // microfon mut: nivel practic zero timp de 4 s cât se așteaptă răspunsul

  async function start(o) {
    let session = null, state = null, playing = false, turnDone = true, ended = false, paused = false;
    let utt = null, uttId = 0, lastLevelAt = -Infinity, lastAlive = o.clock.now(), talking = false, talkedAt = 0, warn = null;
    const flags = { reconnecting: false, mic: false };
    const emit = e => { if (!ended) o.onEvent(e); };
    const setState = st => { if (st !== state) { state = st; emit({ type: "state", state: st }); } };
    const refreshWarn = () => {
      const code = flags.reconnecting ? "reconnecting" : flags.mic ? "mic-silent" : null;
      if (code !== warn) { warn = code; emit({ type: "warn", code }); }
    };
    // Vorbește cât se redă audio; revine la ascultare când redarea s-a golit și tura modelului s-a încheiat.
    const settleSpeaking = () => { if (state === "speaking" && !playing && turnDone) setState("listening"); };
    const stopSpeaking = () => { o.audio.flush(); turnDone = true; utt = null; setState("listening"); };

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
      if (e.type === "closed") { finish(e.reason, false); return; }
      if (e.type === "reconnecting") { flags.reconnecting = true; refreshWarn(); return; }
      if (e.type === "live") { flags.reconnecting = false; refreshWarn(); return; }
      if (e.type === "tool") { emit(e); return; }
      if (paused) return;                                  // în pauză, ce mai vine de la model se aruncă
      if (e.type === "audio") { turnDone = false; talking = false; o.audio.play(e.pcm); }
      else if (e.type === "turnComplete") { turnDone = true; utt = null; settleSpeaking(); }
      else if (e.type === "interrupted") stopSpeaking();
      else if (e.type === "transcript") onTranscript(e);
    };
    const onLevel = v => {
      if (ended) return;
      const now = o.clock.now();
      if (now - lastLevelAt >= LEVEL_MS) { lastLevelAt = now; emit({ type: "level", v }); }
      // Cât timp te așteaptă, vocea ta (peste prag) îl face să asculte; după o pauză de THINK_MS se gândește.
      if (v > VOICE && (state === "listening" || state === "thinking")) { talking = true; talkedAt = now; if (state === "thinking") setState("listening"); }
      else if (talking && state === "listening" && now - talkedAt >= THINK_MS) { talking = false; setState("thinking"); }
      if (v >= DEAD) { lastAlive = now; flags.mic = false; refreshWarn(); }
      else if (state === "listening" && now - lastAlive >= DEAD_MS) { flags.mic = true; refreshWarn(); }
    };
    const onPlaying = v => { if (ended) return; playing = v; if (v) setState("speaking"); else settleSpeaking(); };
    // Cu `halfDuplex`, microfonul tace cât se redă audio (pentru un difuzor care face ecou).
    const onFrame = pcm => { if (session && !ended && !paused && !(o.halfDuplex && playing)) session.audio(pcm); };

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
      interrupt() { stopSpeaking(); session.text("Stai."); },
      say(text) { session.text(text); talking = false; setState("thinking"); },
      pause() { paused = true; o.audio.flush(); setState("paused"); },
      resume() { paused = false; setState("listening"); },
      end: () => finish("user", true)
    };
  }
  return { start };
})();
if (typeof module !== "undefined" && module.exports) module.exports = Call;
