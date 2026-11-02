"""BrowserAudio într-un browser real, cu microfon fals (Chromium): cadre, nivel, redare, flush, lista de microfoane, stop, erori.
Partea pură (Pcm) e acoperită de tools/unit/audio.test.mjs; aici verificăm lipiciul cu API-urile browserului."""
import subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PORT = 8771
URL = f"http://localhost:{PORT}/tools/audio_harness.html"
fails = []

def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + ((" :: " + str(extra)) if extra and not cond else ""))
    if not cond: fails.append(name)

START = """async () => {
  window.frames = []; window.levels = []; window.playing = [];
  window.A = BrowserAudio.create();
  const r = await window.A.start({ onFrame: f => window.frames.push([f.length, f instanceof Int16Array]), onLevel: l => window.levels.push(l), onPlaying: v => window.playing.push(v) });
  return r;
}"""
SINE = """() => { const n = 7200, p = new Int16Array(n); for (let i = 0; i < n; i++) p[i] = Math.round(8000 * Math.sin(2 * Math.PI * 440 * i / 24000)); window.A.play(p); }"""   # 0,3 s

srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--directory", str(ROOT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"])
        ctx = b.new_context(permissions=["microphone"])
        page = ctx.new_page(); errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.goto(URL)
        info = page.evaluate(START)
        check("start dă numele microfonului", isinstance(info, dict) and bool(info.get("label")), info)
        page.wait_for_timeout(1500)
        # cadrele și nivelurile se citesc în același evaluate: între două apeluri mai sosesc cadre
        snap = page.evaluate("({ frames: window.frames.slice(), levels: window.levels.slice() })")
        frames, levels = snap["frames"], snap["levels"]
        check("cadre de 640 de eșantioane Int16, ~25 pe secundă", len(frames) >= 25 and all(f == [640, True] for f in frames), len(frames))
        check("nivelul vine odată cu cadrele", len(levels) == len(frames) and max(levels) > 0, (len(levels), len(frames)))
        mics = page.evaluate("window.A.mics()")
        check("lista de microfoane are id și nume", len(mics) >= 1 and all(m["id"] is not None and "label" in m for m in mics), mics)
        page.evaluate(SINE)
        page.wait_for_timeout(100)
        check("redarea raportă onPlaying(true)", page.evaluate("window.playing") == [True], page.evaluate("window.playing"))
        page.wait_for_timeout(900)
        check("după ce se termină raportă onPlaying(false)", page.evaluate("window.playing") == [True, False], page.evaluate("window.playing"))
        page.evaluate(SINE)
        page.wait_for_timeout(100)
        page.evaluate("window.A.flush()")
        page.wait_for_timeout(100)
        check("flush oprește redarea imediat", page.evaluate("window.playing") == [True, False, True, False], page.evaluate("window.playing"))
        # lecția: pauza păstrează coada (contextul îngheață), resume o duce până la capăt, beep nu atinge „se redă”
        page.evaluate("window.playing.length = 0")
        page.evaluate(SINE)
        page.wait_for_timeout(100)
        page.evaluate("window.A.pause()")
        page.wait_for_timeout(700)
        check("pause îngheață redarea: nu raportă sfârșitul cât durează pauza", page.evaluate("window.playing") == [True], page.evaluate("window.playing"))
        page.evaluate("window.A.resume()")
        page.wait_for_timeout(600)
        check("resume duce redarea păstrată până la capăt", page.evaluate("window.playing") == [True, False], page.evaluate("window.playing"))
        page.evaluate("window.playing.length = 0")
        page.evaluate("window.A.beep('window'); window.A.beep('warn')")
        page.wait_for_timeout(500)
        check("beep nu schimbă „se redă” și nu dă erori", page.evaluate("window.playing") == [] and not errs, [page.evaluate("window.playing"), errs])
        page.evaluate(SINE)
        page.wait_for_timeout(100)
        page.evaluate("window.A.pause()")
        page.evaluate("window.A.flush()")
        page.wait_for_timeout(100)
        page.evaluate(SINE)
        page.wait_for_timeout(100)
        check("flush în pauză golește coada și contextul pornește din nou", page.evaluate("window.playing") == [True, False, True], page.evaluate("window.playing"))
        page.evaluate("window.A.stop()")
        n = page.evaluate("window.frames.length")
        page.wait_for_timeout(500)
        check("după stop nu mai vin cadre", page.evaluate("window.frames.length") == n)
        check("stop a doua oară nu strică", page.evaluate("(() => { window.A.stop(); return true; })()") is True)
        check("fără erori în consolă", not errs, errs)
        # erorile microfonului, cu getUserMedia înlocuit (headless nu poate refuza real: întoarce NotSupportedError)
        for name, want in [("NotAllowedError", "denied"), ("NotFoundError", "no-mic"), ("AbortError", "failed")]:
            r = page.evaluate("""async name => {
              const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
              navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("x", name));
              try { await BrowserAudio.create().start({ onFrame() {}, onLevel() {}, onPlaying() {} }); return "ok"; }
              catch (e) { return e.reason || String(e); }
              finally { navigator.mediaDevices.getUserMedia = real; }
            }""", name)
            check(f"{name} → reason „{want}”", r == want, r)
        b.close()
finally:
    srv.terminate()
print("\nEșecuri:", fails if fails else "niciunul")
sys.exit(1 if fails else 0)
