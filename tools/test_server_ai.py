# AI through the server (platform ticket 06): with a server configured (URL + secret in localStorage), every AI request goes to the server only.
# A fake server answers on https://srv.test; Gemini and DeepSeek are spied on and must never be hit, even when their keys are stored.
# Covers: the settings card (validation, masking, no leak into state / export), "Întreabă", the skeleton check, the oral AI grade,
# the gaps (lesson, targeted question, grade), the test button, and every failure (401, daily cap, 502, network) leaving the no-AI path usable.
import asyncio, json, pathlib, re
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

SRV = "https://srv.test"
SECRET = "s3cret-for-tests-0123456789abcdef-xyz"
CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "POST,GET,OPTIONS"}
SKEL = "s-gil-bq"
CODE = "import threading\n\nclass BoundedQueue:\n    def __init__(self, cap):\n        self.cond = threading.Condition()\n"

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

def reply_for(body):
    """The fake server's model: the reply depends on which feature sent the prompt."""
    sysm, user = body.get("system", ""), body["user"]
    if body.get("max_tokens", 9999) <= 8: return "ok"                                               # the test button
    if "on_topic" in sysm: return json.dumps({"on_topic": True, "answer": "Răspuns de la server despre `GIL`."})
    if "verificator de cod" in sysm: return json.dumps({"covered": [0, 1], "errors": ["`wait()` e sub `if`."], "missing": []})
    if "Scrie o explicație scurtă" in user: return "Ideea: GIL-ul serializează bytecode-ul.\nUnde s-a rupt gândirea ta: ai crezut că threadurile rulează în paralel.\nSpune-l la interviu: Pentru CPU-bound folosesc procese."
    if "Pune O SINGURĂ întrebare nouă" in user: return "Ai un serviciu care redimensionează imagini: ce folosești și de ce?"
    if '{"covered":true,"feedback"' in user: return json.dumps({"covered": True, "feedback": "Corect: procese pentru CPU-bound."})
    n = len(re.findall(r"^\d+\. ", user, re.M))                                                       # the oral grade
    return json.dumps({"covered": [i % 2 == 0 for i in range(n)], "missing": ["costul proceselor"], "wrong": [], "feedback": "Ai acoperit mecanismul."})

async def new_page(b, scheme="light"):
    ctx = await b.new_context(viewport={"width": 360, "height": 780}, device_scale_factor=2, color_scheme=scheme)
    pg = await ctx.new_page(); pg.errs = []; pg.srv = []; pg.direct = []; pg.mode = {"v": "ok"}
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text and "ERR_FAILED" not in m.text and "net::" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())

    async def srv(route):
        req = route.request
        if req.method == "OPTIONS":
            await route.fulfill(status=204, headers=CORS); return
        body = json.loads(req.post_data)
        pg.srv.append({"url": req.url, "auth": req.headers.get("authorization"), "body": body})
        m = pg.mode["v"]
        if m == "net": await route.abort(); return
        if m == "401": await route.fulfill(status=401, headers=CORS, content_type="application/json", body='{"detail":"unauthorized"}'); return
        if m == "cap": await route.fulfill(status=429, headers=CORS, content_type="application/json", body='{"detail":"daily_cap"}'); return
        if m == "502": await route.fulfill(status=502, headers=CORS, content_type="application/json", body='{"detail":"ai_unavailable"}'); return
        await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"text": reply_for(body), "model": "gemini"}))
    async def spy(route):
        pg.direct.append(route.request.url); await route.abort()
    await pg.route(SRV + "/**", srv)
    await pg.route("https://generativelanguage.googleapis.com/**", spy)
    await pg.route("https://api.deepseek.com/**", spy)
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()")
    # Direct keys are stored on purpose: with the server configured they must stay unused.
    await pg.evaluate("localStorage.setItem('onapsis-gemini-v1', 'GKEY-must-stay-unused'); localStorage.setItem('onapsis-deepseek-v1', 'sk-must-stay-unused-0123456789')")
    await pg.reload(); await pg.wait_for_timeout(400)
    return ctx, pg

async def configure(pg):
    await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_selector('#srv-url')
    await pg.fill('#srv-url', SRV + "/"); await pg.fill('#srv-secret', SECRET); await pg.click('[data-a="srv-save"]'); await pg.wait_for_timeout(100)

async def mcq_open(pg, mod="gil"):
    await pg.click('.tab[data-tab="quiz"]'); await pg.click(f'[data-a="mcq-mod"][data-m="{mod}"]'); await pg.wait_for_selector('[data-a="ans"]')
    await pg.click('[data-a="ans"][data-pos="0"]'); await pg.wait_for_selector('#fb')

async def ask(pg, text):
    await pg.fill('[data-ask]', text); await pg.click('[data-a="ask-send"]'); await pg.wait_for_timeout(250)

async def start_gil(pg):
    await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
    await pg.click('[data-a="oral-mod"][data-m="gil"]'); await pg.wait_for_selector('#ans-t', timeout=3000)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ["light", "dark"]:
            tag = scheme + ": "
            ctx, pg = await new_page(b, scheme)

            # ---------- 1) settings ----------
            await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_selector('#srv-url')
            check(tag + "settings: a server card with address and secret fields, not configured yet", "Neconfigurat" in await pg.inner_text('#srv-st') and await pg.locator('#srv-secret').count() == 1 and await pg.locator('[data-a="srv-test"]').count() == 0)
            await pg.fill('#srv-url', "http://evil.test"); await pg.fill('#srv-secret', SECRET); await pg.click('[data-a="srv-save"]')
            check(tag + "settings: a non-https address is refused and nothing is stored", await pg.evaluate("localStorage.getItem('onapsis-server-v1')") is None)
            await pg.fill('#srv-url', SRV); await pg.fill('#srv-secret', ""); await pg.click('[data-a="srv-save"]')
            check(tag + "settings: an empty secret is refused", await pg.evaluate("localStorage.getItem('onapsis-server-v1')") is None)
            await configure(pg)
            stored = json.loads(await pg.evaluate("localStorage.getItem('onapsis-server-v1')"))
            check(tag + "settings: saved under its own key, address normalised, secret kept", stored == {"url": SRV, "secret": SECRET}, stored)
            shown = await pg.inner_text('#srv-st')
            check(tag + "settings: the secret is masked in the card", "srv.test" in shown and SECRET not in shown and SECRET[-4:] in shown, shown)
            await pg.screenshot(path=str(SHOTS / f"srv1_settings_{scheme}.png"), full_page=True)
            check(tag + "settings: no horizontal overflow", await pg.evaluate("document.documentElement.scrollWidth <= 360"))
            await pg.click('[data-a="srv-test"]'); await pg.wait_for_timeout(300)
            check(tag + "settings: the test button reaches the server with the bearer secret and reports success", "reușită" in await pg.inner_text('#srv-st') and pg.srv[-1]["auth"] == "Bearer " + SECRET and pg.srv[-1]["body"]["kind"] == "quick")
            await pg.click('[data-a="exp"]'); await pg.wait_for_timeout(100)
            exported = await pg.input_value('#exp-t')
            leaked = SECRET in exported or SECRET in json.dumps(await pg.evaluate("window.__prep.state()")) or SECRET in (await pg.evaluate("localStorage.getItem('onapsis-prep-v1')") or "")
            check(tag + "settings: the secret is absent from state, export and progress storage", not leaked)
            check(tag + "settings: with a server the DeepSeek card has no key field and says the key is not used", "nu se mai folosește" in await pg.inner_text('main') and await pg.locator('#ds-key').count() == 0)

            # ---------- 2) Întreabă ----------
            n0 = len(pg.srv)
            await mcq_open(pg)
            await pg.click('.ask-open'); await ask(pg, "De ce nu merge cu threaduri?")
            r = pg.srv[-1] if len(pg.srv) > n0 else None
            check(tag + "ask: one request to the server's /ai with the bearer secret", r is not None and len(pg.srv) == n0 + 1 and r["url"] == SRV + "/ai" and r["auth"] == "Bearer " + SECRET, r)
            check(tag + "ask: the ready-made prompt (system + question as data), JSON mode on", r and "Răspunzi NUMAI" in r["body"]["system"] and "De ce nu merge cu threaduri?" in r["body"]["user"] and r["body"]["json_mode"] is True and r["body"]["kind"] == "default", r and r["body"])
            txt = await pg.locator('.ask').inner_text()
            check(tag + "ask: the server's answer is shown, signed as AI", "Răspuns de la server" in txt and "AI" in txt and "1/6" in txt, txt)
            await pg.screenshot(path=str(SHOTS / f"srv2_ask_{scheme}.png"))
            pg.mode["v"] = "cap"; await ask(pg, "A doua întrebare")
            check(tag + "ask: the daily cap is explained and the question stays", "plafonul zilnic" in await pg.locator('.ask .ai-err').inner_text() and await pg.input_value('[data-ask]') == "A doua întrebare")
            pg.mode["v"] = "401"; await pg.click('[data-a="ask-send"]'); await pg.wait_for_timeout(250)
            check(tag + "ask: a refused secret points to settings", "secretul" in (await pg.locator('.ask .ai-err').inner_text()).lower() and "Progres" in await pg.locator('.ask .ai-err').inner_text())
            pg.mode["v"] = "502"; await pg.click('[data-a="ask-send"]'); await pg.wait_for_timeout(250)
            check(tag + "ask: every model failing is a message, not a block", "Niciun model" in await pg.locator('.ask .ai-err').inner_text() and await pg.locator('[data-a="ask-send"]').is_enabled())
            pg.mode["v"] = "net"; await pg.click('[data-a="ask-send"]'); await pg.wait_for_timeout(250)
            check(tag + "ask: a dead network is a message too", "serverul AI" in await pg.locator('.ask .ai-err').inner_text())
            pg.mode["v"] = "ok"; await pg.click('[data-a="ask-send"]'); await pg.wait_for_timeout(250)
            check(tag + "ask: retrying after the failures works", "Răspuns de la server" in await pg.locator('.ask').inner_text() and not await pg.locator('.ask .ai-err').count())

            # ---------- 3) skeleton check ----------
            n0 = len(pg.srv)
            await pg.click('nav button[data-tab="study"]'); await pg.click('button[data-a="seg"][data-seg="skel"]'); await pg.click(f'button[data-a="skel"][data-k="{SKEL}"]')
            await pg.fill('textarea[data-skel-code]', CODE); await pg.click('button[data-a="skel-ai"]'); await pg.wait_for_timeout(300)
            r = pg.srv[-1] if len(pg.srv) > n0 else None
            check(tag + "skeleton: the check goes to the server with the code as data", r is not None and len(pg.srv) == n0 + 1 and "BoundedQueue" in r["body"]["user"] and "verificator de cod" in r["body"]["system"] and r["body"]["json_mode"] is True)
            ticks = await pg.eval_on_selector_all('button[data-a="skel-tick"]', "bs => bs.map(b => b.getAttribute('aria-pressed') === 'true')")
            check(tag + "skeleton: points pre-ticked from the verdict, errors shown, chip says AI", ticks[:2] == [True, True] and not any(ticks[2:]) and "wait()" in await pg.locator('.skel-ai').text_content() and (await pg.locator('.skel-ai .chip').text_content()) == "AI", ticks)
            pg.mode["v"] = "502"
            await pg.click('button[data-a="skel-ai"]'); await pg.wait_for_timeout(300)
            check(tag + "skeleton: on failure the message shows and the manual ticking still works", "Niciun model" in await pg.locator('.skel-ai').text_content() and await pg.locator('button[data-a="skel-save"]').count() == 1)
            pg.mode["v"] = "ok"

            # ---------- 4) oral AI grade ----------
            await start_gil(pg)
            check(tag + "oral: the direct AI check is offered, named AI, next to the interviewer (the server is a source for both; test_iv_server.py covers the dialog)", "AI" in await pg.inner_text('[data-a="oral-ai"]') and await pg.locator('[data-a="iv-start"]').count() == 1)
            answer = "GIL-ul lasă un singur thread să execute bytecode, deci pentru CPU-bound folosesc procese."
            n0 = len(pg.srv)
            await pg.fill('#ans-t', answer); await pg.click('[data-a="oral-ai"]'); await pg.wait_for_selector('.ai-v', timeout=5000)
            r = pg.srv[-1] if len(pg.srv) > n0 else None
            check(tag + "oral: one request to the server with the examiner prompt and the answer as data", r is not None and len(pg.srv) == n0 + 1 and "examinator" in r["body"]["system"] and answer in r["body"]["user"] and r["body"]["json_mode"] is True)
            n = await pg.locator('.kp-i').count()
            pressed = await pg.eval_on_selector_all('.kp-i', "els => els.map(e => e.getAttribute('aria-pressed') === 'true')")
            check(tag + "oral: points pre-ticked from the server's verdict; it only pre-ticks", pressed == [i % 2 == 0 for i in range(n)], pressed)
            await pg.screenshot(path=str(SHOTS / f"srv3_verdict_{scheme}.png"), full_page=True)
            await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)

            # failure: the no-AI path stays usable
            if await pg.locator('#ans-t').count() == 0: await start_gil(pg)
            pg.mode["v"] = "502"
            await pg.fill('#ans-t', answer); await pg.click('[data-a="oral-ai"]'); await pg.wait_for_selector('.ai-err', timeout=3000)
            check(tag + "oral: when the server's models all fail a message shows on the card, in Romanian", "Niciun model" in await pg.inner_text('.ai-err'))
            await pg.click('[data-a="oral-reveal"]'); await pg.wait_for_selector('.kp-i', timeout=3000)
            check(tag + "oral: 'Fără AI' still reveals the key points for self-grading", await pg.locator('.kp-i').count() > 0)
            pg.mode["v"] = "ok"
            await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)

            # ---------- 5) gaps ----------
            A = await pg.evaluate("(() => { const c = window.PREP.oral.find(c => c.m === 'gil'); return { id: c.id, k: c.k }; })()")
            await pg.evaluate("([id]) => { const s = window.__prep.state(); s.o = {}; s.o[id] = { b: 2, n: 3, s: 60, t: 5000, mc: { 2: 2 }, m: [2], w: ['Cred că GIL-ul face codul thread-safe.'] }; window.__prep.setState(s); }", [A["id"]])
            await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="gaps"]'); await pg.click('details.gap >> summary'); await pg.wait_for_timeout(100)
            check(tag + "gaps: with a server the lesson and targeted-question buttons exist (no sample needed)", await pg.locator('[data-a="th-explain"]').count() == 1 and await pg.locator('[data-a="th-test"]').count() == 1)
            n0 = len(pg.srv)
            await pg.click('[data-a="th-explain"]'); await pg.wait_for_selector('.gap-les', timeout=3000)
            r = pg.srv[-1]
            check(tag + "gaps: the lesson goes to the server as plain text (no JSON mode)", len(pg.srv) == n0 + 1 and A["k"][2] in r["body"]["user"] and r["body"]["json_mode"] is False and r["body"]["kind"] == "default", r["body"]["user"][:120])
            await pg.click('[data-a="th-test"]'); await pg.wait_for_selector('textarea[data-chk]', timeout=3000)
            check(tag + "gaps: the targeted question is a quick, plain-text request", pg.srv[-1]["body"]["kind"] == "quick" and pg.srv[-1]["body"]["json_mode"] is False and "redimensionează imagini" in await pg.inner_text('.gap .iv-m.int'))
            await pg.fill('textarea[data-chk]', "Procese, fiindcă task-ul e CPU-bound și GIL-ul blochează threadurile."); await pg.click('[data-a="th-send"]'); await pg.wait_for_selector('.gap-ok', timeout=3000)
            check(tag + "gaps: the grade is a JSON-mode request and repairs the point", pg.srv[-1]["body"]["json_mode"] is True and "Reparat" in await pg.inner_text('.gap-ok'))
            await pg.screenshot(path=str(SHOTS / f"srv4_gaps_{scheme}.png"), full_page=True)

            # ---------- 6) nothing went straight to Gemini or DeepSeek ----------
            check(tag + "no request went straight to Gemini or DeepSeek, although both keys were stored", pg.direct == [], pg.direct)
            check(tag + "every server request carried the secret as a bearer and never in the URL or body", all(x["auth"] == "Bearer " + SECRET and SECRET not in x["url"] and SECRET not in json.dumps(x["body"]) for x in pg.srv))
            check(tag + "no page errors", not pg.errs, pg.errs)
            await ctx.close()

        # ---------- 7) deleting the server: settings go back, and the old keys work again ----------
        ctx, pg = await new_page(b)
        await configure(pg)
        await pg.click('[data-a="srv-del"]'); await pg.wait_for_timeout(100)
        check("delete: the card is empty again and the storage key is gone", "Neconfigurat" in await pg.inner_text('#srv-st') and await pg.evaluate("localStorage.getItem('onapsis-server-v1')") is None)
        await mcq_open(pg)
        await pg.click('.ask-open'); await ask(pg, "Întrebare fără server")
        check("delete: without a server nothing goes to it (the old chain applies)", pg.srv == [])
        await ctx.close()

        # ---------- 8) the secret kept when only the address changes ----------
        ctx, pg = await new_page(b)
        await configure(pg)
        await pg.fill('#srv-url', "https://other.test"); await pg.fill('#srv-secret', ""); await pg.click('[data-a="srv-save"]'); await pg.wait_for_timeout(100)
        stored = json.loads(await pg.evaluate("localStorage.getItem('onapsis-server-v1')"))
        check("changing only the address keeps the stored secret", stored == {"url": "https://other.test", "secret": SECRET}, stored)
        await ctx.close()
        await b.close()
    print("\n" + ("ALL PASS" if not fails else "FAILED: " + str(len(fails))))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
