# "Întreabă despre asta": open questions limited to the topic, under an MCQ explanation, in a sheet and at a gap.
# Three backends: Claude through `sample` (artifact), Gemini REST with the Jarvis key (PWA), DeepSeek (fallback). Models are simulated; the protocol/prompt logic is covered by tools/unit/ask.test.mjs and gemini_text.test.mjs.
import asyncio, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

# Scripted `sample`: records every prompt; an "ouă" question is off topic, "EROARE" fails, anything else gets an answer that echoes the question.
SAMPLE = """
window.__asks = [];
const sample = (prompt, opts) => new Promise((res, rej) => {
  window.__asks.push(prompt);
  const m = /<<<\\n([\\s\\S]*?)\\n>>>/.exec(prompt), q = m ? m[1] : '';
  if (/EROARE/.test(q)) { setTimeout(() => rej({ code: 'rate_limited' }), 20); return; }
  const reply = /ou[aă]/i.test(q) ? { on_topic: false, answer: 'Rețeta de ouă: fierbi 7 minute.' } : { on_topic: true, answer: 'Despre `' + q.slice(0, 24) + '`: răspuns scurt.' };
  setTimeout(() => res({ text: JSON.stringify(reply), truncated: false }), 20);
});
window.claude = { use: async name => (name === 'sample' ? sample : null) };
"""

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def new_page(b, scheme="light", init=None, seed=None):
    ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, color_scheme=scheme)
    if init: await ctx.add_init_script(init)
    pg = await ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()")
    if seed: await pg.evaluate(seed)
    await pg.reload(); await pg.wait_for_timeout(500)
    return ctx, pg

async def answered_mcq(pg, mod="gil"):
    await pg.click('.tab[data-tab="quiz"]'); await pg.click(f'[data-a="mcq-mod"][data-m="{mod}"]'); await pg.wait_for_selector('[data-a="ans"]')
    await pg.click('[data-a="ans"][data-pos="0"]'); await pg.wait_for_selector('#fb')

async def send(pg, text):
    await pg.fill('[data-ask]', text); await pg.click('[data-a="ask-send"]'); await pg.wait_for_timeout(200)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ---------- artifact: Claude through sample ----------
        for scheme in ["light", "dark"]:
            tag = scheme + ": "
            ctx, pg = await new_page(b, scheme, SAMPLE)
            await answered_mcq(pg)
            check(tag + "under the explanation there is an Ask button, closed at first", await pg.locator('.ask-open').count() == 1 and await pg.locator('[data-ask]').count() == 0)
            await pg.click('.ask-open'); await pg.wait_for_timeout(100)
            check(tag + "opening it shows the topic, the counter and the quick questions", "Întreabă despre" in await pg.locator('.ask').inner_text() and "0/6" in await pg.locator('.ask').inner_text() and await pg.locator('.ask-sug button').count() == 4)
            await send(pg, "De ce nu merge cu threaduri?")
            asks = await pg.evaluate("window.__asks")
            check(tag + "the answer appears under the question", "De ce nu merge cu threaduri?" in await pg.locator('.ask').inner_text() and "răspuns scurt" in await pg.locator('.ask').inner_text() and "1/6" in await pg.locator('.ask').inner_text())
            check(tag + "the prompt carries the explanation, the options and the topic", len(asks) == 1 and "Răspunsul corect:" in asks[0] and "Pe scurt:" in asks[0] and "Variante greșite:" in asks[0] and "Răspunzi NUMAI la întrebări despre tema" in asks[0], asks[0][:300] if asks else "")
            await pg.click('.ask-sug button >> nth=1'); await pg.wait_for_timeout(250)
            asks = await pg.evaluate("window.__asks")
            check(tag + "a quick question is sent as typed, with the earlier exchange as data", len(asks) == 2 and "Dă-mi un exemplu" in asks[1] and "Schimburile de până acum" in asks[1])
            await send(pg, "Cum fac ouă fierte?")
            txt = await pg.locator('.ask').inner_text()
            check(tag + "an off-topic question gets the fixed refusal, never the model's text", "în afara temei" in txt.lower() and "Aici răspund doar despre" in txt and "Rețeta" not in txt and "fierbi" not in txt, txt)
            await pg.screenshot(path=str(SHOTS / f"ask_mcq_{scheme}.png"))
            await send(pg, "EROARE")
            check(tag + "a model error is explained and the question stays in the box", "Prea multe cereri" in await pg.locator('.ask .ai-err').inner_text() and await pg.input_value('[data-ask]') == "EROARE")
            await pg.fill('[data-ask]', ""); await pg.click('[data-a="ask-send"]'); await pg.wait_for_timeout(100)
            check(tag + "an empty question is refused locally", "Scrie o întrebare" in await pg.locator('.ask .ai-err').inner_text() and len(await pg.evaluate("window.__asks")) == 4)
            await send(pg, "A treia întrebare reală"); await send(pg, "A patra întrebare reală"); await send(pg, "A cincea întrebare reală")
            txt = await pg.locator('.ask').inner_text()
            check(tag + "after six exchanges the box closes with the limit message", "6/6" in txt and "limita de 6" in txt and await pg.locator('[data-ask]').count() == 0, txt[-200:])
            await pg.click('[data-a="ask-new"]'); await pg.wait_for_timeout(100)
            check(tag + "a new question resets the thread", "0/6" in await pg.locator('.ask').inner_text() and await pg.locator('[data-ask]').count() == 1)
            await pg.click('[data-a="ask-close"]'); await pg.wait_for_timeout(100)
            check(tag + "the conversation is not part of the saved progress", "ouă" not in await pg.evaluate("JSON.stringify(window.__prep.state()) + JSON.stringify(localStorage)"))
            check(tag + "no page errors (mcq)", not pg.errs, pg.errs)
            if scheme == "light":
                # a sheet
                await pg.click('.tab[data-tab="study"]'); await pg.click('#sheet-gil summary'); await pg.wait_for_timeout(150)
                await pg.click('#sheet-gil .ask-open'); await send(pg, "Explică-mi fișa pe scurt")
                asks = await pg.evaluate("window.__asks")
                check("a sheet gets its own Ask, with the sheet points as material", "răspuns scurt" in await pg.locator('#sheet-gil .ask').inner_text() and "Puncte:" in asks[-1] and "Fișa „" in asks[-1], asks[-1][:200])
                # a gap
                await pg.evaluate("""() => { const T = window.__prep, s = T.state(); const c = window.PREP.oral.find(c => c.m === 'gil'); s.o[c.id] = { b: 1, n: 1, s: 0, t: Date.now(), mc: { 0: 2 }, m: [0], w: ['a zis că GIL e în Java'] }; T.setState(s); window.__gapCard = c.id; }""")
                await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="gaps"]'); await pg.click('details.gap >> summary'); await pg.wait_for_timeout(150)
                await pg.click('details.gap .ask-open'); await send(pg, "De ce l-am ratat?")
                asks = await pg.evaluate("window.__asks")
                check("a gap gets an Ask with the missed point, the model answer and the wrong claims", "răspuns scurt" in await pg.locator('details.gap .ask').inner_text() and "Punctul pe care candidatul l-a ratat:" in asks[-1] and "Răspunsul model:" in asks[-1] and "GIL e în Java" in asks[-1], asks[-1][:300])
                await pg.screenshot(path=str(SHOTS / "ask_gap_light.png"))
            await ctx.close()

        # ---------- PWA: Gemini REST with the Jarvis key ----------
        ctx, pg = await new_page(b, "light", None, "localStorage.setItem('onapsis-gemini-v1', 'GKEY123')")
        calls = []
        async def gemini(route):
            req = route.request; calls.append((req.url, json.loads(req.post_data)))
            await route.fulfill(status=200, content_type="application/json", body=json.dumps({"candidates": [{"content": {"parts": [{"text": json.dumps({"on_topic": True, "answer": "Răspuns de la Gemini."})}]}}]}))
        await pg.route("https://generativelanguage.googleapis.com/**", gemini)
        await answered_mcq(pg); await pg.click('.ask-open'); await send(pg, "Explică mai simplu")
        check("in the PWA the question goes to Gemini with the Jarvis key", len(calls) == 1 and "models/gemini-3.5-flash-lite:generateContent" in calls[0][0] and "key=GKEY123" in calls[0][0] and "Răspuns de la Gemini." in await pg.locator('.ask').inner_text(), calls[:1])
        check("the topic rules travel as the system instruction, the question as data", "Răspunzi NUMAI" in calls[0][1]["systemInstruction"]["parts"][0]["text"] and "<<<\nExplică mai simplu\n>>>" in calls[0][1]["contents"][0]["parts"][0]["text"])
        # a rejected key
        async def refuse(route): await route.fulfill(status=400, content_type="application/json", body=json.dumps({"error": {"status": "INVALID_ARGUMENT", "message": "API key not valid. Please pass a valid API key."}}))
        await pg.unroute("https://generativelanguage.googleapis.com/**"); await pg.route("https://generativelanguage.googleapis.com/**", refuse)
        await send(pg, "încă una")
        check("a rejected key is explained, with the server's detail", "Cheia nu e validă" in await pg.locator('.ask .ai-err').inner_text() and "HTTP 400" in await pg.locator('.ask-detail').inner_text())
        check("no page errors (pwa)", not pg.errs, pg.errs)
        await ctx.close()

        # ---------- fallback: DeepSeek ----------
        ctx, pg = await new_page(b, "light", None, "localStorage.setItem('onapsis-deepseek-v1', 'DSKEY99')")
        ds = []
        async def deepseek(route):
            ds.append(json.loads(route.request.post_data))
            await route.fulfill(status=200, content_type="application/json", body=json.dumps({"choices": [{"message": {"content": json.dumps({"on_topic": True, "answer": "Răspuns de la DeepSeek."})}}]}))
        await pg.route("https://api.deepseek.com/**", deepseek)
        await answered_mcq(pg); await pg.click('.ask-open'); await send(pg, "Explică mai simplu")
        check("with only a DeepSeek key the question goes to DeepSeek, rules as the system message", len(ds) == 1 and ds[0]["messages"][0]["role"] == "system" and "Răspunzi NUMAI" in ds[0]["messages"][0]["content"] and "Răspuns de la DeepSeek." in await pg.locator('.ask').inner_text())
        await ctx.close()

        # ---------- no backend ----------
        ctx, pg = await new_page(b, "light")
        await answered_mcq(pg)
        check("without any key the block explains what to add and offers no input", await pg.locator('.ask-open').count() == 0 and "cheie Gemini" in await pg.locator('.ask-hint').inner_text())
        check("no page errors (no backend)", not pg.errs, pg.errs)
        await ctx.close(); await b.close()
    print("\nALL OK" if not fails else "\nFAILED: " + str(fails))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
