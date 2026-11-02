# Jarvis screen (spec §6): tab, key setup, modes, orb and states, card without key points, transcript, controls, warnings, errors, results, settings.
# Live and Audio are replaced by tools/jarvis_fakes.js; the real protocol and audio are covered by tools/unit/*.test.mjs and tools/test_audio.py.
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
FAKES = str(ROOT / "tools" / "jarvis_fakes.js")

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def fresh(pg):
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)

CTL = "window.__jarvisFakes.ctl"
async def ev(pg, js, arg=None): return await pg.evaluate(js, arg) if arg is not None else await pg.evaluate(js)
async def emit(pg, e): await pg.evaluate(f"e => {CTL}.emit(e)", e); await pg.wait_for_timeout(60)
async def text(pg, sel): return await pg.locator(sel).inner_text()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ["light", "dark"]:
            ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, color_scheme=scheme)
            await ctx.add_init_script(path=FAKES)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
            await pg.route("**/fonts.*", lambda r: r.abort())
            await fresh(pg)
            tag = scheme + ": "

            # --- tab and key
            check(tag + "the tab bar has six tabs, Jarvis among them", await pg.locator(".tab").count() == 6 and await pg.locator('.tab[data-tab="jarvis"]').count() == 1)
            await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
            check(tag + "without a key the modes are off and the key card asks for it", await pg.locator("#jv-key").count() == 1 and await pg.locator('[data-a="jv-start"][disabled]').count() >= 2)
            await pg.screenshot(path=str(SHOTS / f"jv_idle_nokey_{scheme}.png"))
            await pg.fill("#jv-key", "TESTKEY1234"); await pg.click('[data-a="jv-key-save"]'); await pg.wait_for_timeout(150)
            check(tag + "saving the key stores it in the browser only", await ev(pg, "localStorage.getItem('onapsis-gemini-v1')") == "TESTKEY1234" and "TESTKEY1234" not in await ev(pg, "JSON.stringify(window.__prep.state())") and await pg.locator('[data-a="jv-start"][disabled]').count() == 0)
            check(tag + "the saved key is shown masked", "1234" in await text(pg, "#jv-keyinfo") and "TESTKEY" not in await pg.locator("main").inner_text())

            # --- training session
            await pg.click('[data-a="jv-start"][data-mode="train"]'); await pg.wait_for_timeout(200)
            cfg = await ev(pg, f"({{ key: {CTL}.live.cfg.key, voice: {CTL}.live.cfg.voice, tools: {CTL}.live.cfg.tools.length }})")
            check(tag + "starting connects with the key, the default voice and the seven functions", cfg == {"key": "TESTKEY1234", "voice": "Charon", "tools": 7}, cfg)
            check(tag + "the orb shows the thinking state while waiting for the greeting", await pg.locator("#jv-orb.thinking").count() == 1 and "gândește" in await text(pg, "#jv-state"))
            await emit(pg, {"type": "audio", "pcm": [1, 2]})
            check(tag + "audio from the model shows speaking", await pg.locator("#jv-orb.speaking").count() == 1 and "vorbește" in await text(pg, "#jv-state"))
            await emit(pg, {"type": "turnComplete"}); await ev(pg, f"{CTL}.drain()"); await pg.wait_for_timeout(80)
            check(tag + "back to listening when the playback is over", await pg.locator("#jv-orb.listening").count() == 1 and "ascult" in await text(pg, "#jv-state"))

            # --- card without key points
            card = await ev(pg, f"{CTL}.tool('next_card').then(r => ({{ id: r.card_id, q: r.question, k: r.key_points, m: r.model_answer }}))")
            await pg.wait_for_timeout(120)
            shown = await pg.locator("main").inner_text()
            leaked = [x for x in card["k"] + [card["m"]] if x.replace("`", "")[:40] in shown]
            check(tag + "the card shows the question and never the key points or the model answer", card["q"].replace("`", "")[:40] in shown and not leaked, leaked)

            # --- transcript
            await emit(pg, {"type": "transcript", "id": 1, "who": "me", "text": "Bună seara"})
            await ev(pg, f"{CTL}.emit({{ type: 'transcript', who: 'me', text: 'Bună seara' }})")
            await ev(pg, f"{CTL}.emit({{ type: 'transcript', who: 'model', text: 'Bună, Alex.' }})"); await pg.wait_for_timeout(80)
            tr = await text(pg, "#jv-tr")
            check(tag + "the transcript shows both sides", "Bună seara" in tr and "Bună, Alex." in tr and "jarvis" in tr.lower(), tr)

            # --- verdict through the model's function
            n = len(card["k"])
            r = await ev(pg, f"{CTL}.tool('record_result', {{ card_id: '{card['id']}', points: Array({n}).fill('spontan') }})")
            await pg.wait_for_timeout(120)
            check(tag + "record_result saves through the app and the result appears on screen", r["ok"] and (await ev(pg, f"window.__prep.state().o['{card['id']}'].b")) == 2 and "100%" in await pg.locator("main").inner_text(), r)

            # --- controls
            await pg.click('[data-a="jv-stai"]'); await pg.wait_for_timeout(80)
            check(tag + "Stai tells the model to stop", {"text": "Stai."} in await ev(pg, f"{CTL}.live.sent"))
            await pg.click('[data-a="jv-pause"]'); await pg.wait_for_timeout(80)
            check(tag + "Pauză shows paused and offers Reia", "Pauză" in await text(pg, "#jv-state") and await pg.locator('[data-a="jv-resume"]').count() == 1)
            await pg.click('[data-a="jv-resume"]'); await pg.wait_for_timeout(80)
            check(tag + "Reia goes back to listening", "ascult" in await text(pg, "#jv-state"))
            await pg.click('[data-a="jv-type"]'); await pg.fill("#jv-t", "Folosesc procese."); await pg.click('[data-a="jv-send"]'); await pg.wait_for_timeout(80)
            check(tag + "typing instead of speaking sends the text", {"text": "Folosesc procese."} in await ev(pg, f"{CTL}.live.sent") and await pg.locator("#jv-t").count() == 0)

            # --- dead microphone warning (only while it waits for the answer)
            await emit(pg, {"type": "audio", "pcm": [1]}); await emit(pg, {"type": "turnComplete"}); await ev(pg, f"{CTL}.drain()"); await pg.wait_for_timeout(80)
            await ev(pg, f"{CTL}.advance(5000)"); await ev(pg, f"{CTL}.level(0)"); await pg.wait_for_timeout(100)
            check(tag + "a dead microphone shows the warning", "Nu te aud" in await text(pg, ".jv-warn"))
            await pg.screenshot(path=str(SHOTS / f"jv_active_{scheme}.png"))

            # --- stop and results
            await pg.click('[data-a="jv-stop"]'); await pg.wait_for_timeout(200)
            check(tag + "stop shows the results and logs one Jarvis row", await pg.locator(".jv-res").count() == 1 and (await ev(pg, "window.__prep.state().h.slice(-1)[0].kind")) == "jarvis", await text(pg, "main"))
            await pg.screenshot(path=str(SHOTS / f"jv_ended_{scheme}.png"))
            await pg.click('[data-a="jv-again"]'); await pg.wait_for_timeout(100)
            check(tag + "Din nou goes back to the modes", await pg.locator('[data-a="jv-start"][data-mode="mock"]').count() == 1)

            # --- errors
            await ev(pg, f"{CTL}.live.failOpen = 'auth'")
            await pg.click('[data-a="jv-start"][data-mode="mock"]'); await pg.wait_for_timeout(200)
            check(tag + "a refused key is explained", "Cheia" in await text(pg, ".jv-err"))
            await ev(pg, f"{CTL}.live.failOpen = null; {CTL}.audio.failStart = 'denied'")
            await pg.click('[data-a="jv-start"][data-mode="mock"]'); await pg.wait_for_timeout(200)
            check(tag + "a refused microphone is explained", "icrofon" in await text(pg, ".jv-err"))
            await ev(pg, f"{CTL}.audio.failStart = null")

            # --- settings
            await pg.select_option('[data-jv="voice"]', "Orus"); await pg.select_option('[data-jv="patience"]', "long"); await pg.check('[data-jv="halfDuplex"]')
            saved = await ev(pg, "JSON.parse(localStorage.getItem('onapsis-jarvis-v1'))")
            check(tag + "settings are saved without the key", saved == {"voice": "Orus", "patience": "long", "halfDuplex": True, "micId": "", "muted": False}, saved)
            await pg.click('[data-a="jv-start"][data-mode="mock"]'); await pg.wait_for_timeout(200)
            cfg = await ev(pg, f"({{ voice: {CTL}.live.cfg.voice, ms: {CTL}.live.cfg.silenceMs }})")
            check(tag + "the next session uses them", cfg == {"voice": "Orus", "ms": 2000}, cfg)
            check(tag + "the simulated interview names itself", "simulat" in (await text(pg, "main")).lower())
            await pg.click('[data-a="jv-stop"]'); await pg.wait_for_timeout(100)
            check(tag + "no page errors", not errs, errs)
            await ctx.close()

        # --- in the artifact there is no microphone: the tab points to the app
        ctx = await b.new_context(viewport={"width": 360, "height": 740})
        await ctx.add_init_script("window.claude = { use: async () => null };")
        await ctx.add_init_script(path=FAKES)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await fresh(pg)
        await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
        check("in the artifact the tab points to the phone app and has no start buttons", "aplicația" in await text(pg, "main") and await pg.locator('[data-a="jv-start"]').count() == 0 and not errs, errs)
        await ctx.close(); await b.close()
    print("\nALL OK" if not fails else "\nFAILED: " + str(fails))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
