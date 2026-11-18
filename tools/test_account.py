# Accounts (ADR 0006): the secret decides the account; GET /me gives its name, address and profile.
# A fake server on https://srv.test answers /me for two secrets (Alex, Ioana) and records the AI prompts.
# Covers: "Conectat ca" after saving, the cache surviving a reload, a new secret refreshing it, deleting the server clearing it,
# an old server without /me keeping Alex's prompts, and the prompts (interviewer, gaps, Întreabă, Jarvis summary) per account.
import asyncio, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()

SRV = "https://srv.test"
ALEX = "alex-secret-for-tests-0123456789abcdef-xyz"
IOANA = "ioana-secret-for-tests-0123456789abcdef-x"
ME = {
    ALEX: {"id": "alex", "name": "Alex", "address": "m", "profile": "dezvoltator cu experiență în Django/DRF, React, Elasticsearch, Docker Swarm, Keycloak, Celery și computer vision"},
    IOANA: {"id": "ioana", "name": "Ioana", "address": "f", "profile": ""},
}
CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "POST,GET,OPTIONS"}

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def new_page(b):
    ctx = await b.new_context(viewport={"width": 360, "height": 780})
    pg = await ctx.new_page(); pg.errs = []; pg.me = []; pg.ai = []; pg.old = {"v": False}
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text and "net::" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())

    async def srv(route):
        req = route.request
        if req.method == "OPTIONS":
            await route.fulfill(status=204, headers=CORS); return
        secret = (req.headers.get("authorization") or "").removeprefix("Bearer ")
        if req.url.endswith("/me"):
            pg.me.append(secret)
            if pg.old["v"]: await route.fulfill(status=404, headers=CORS, content_type="application/json", body='{"detail":"Not Found"}'); return
            if secret not in ME: await route.fulfill(status=401, headers=CORS, content_type="application/json", body='{"detail":"unauthorized"}'); return
            await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps(ME[secret])); return
        if req.url.endswith("/ai"):
            body = json.loads(req.post_data); pg.ai.append(body)
            await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"text": "ok", "model": "gemini"})); return
        await route.fulfill(status=404, headers=CORS, content_type="application/json", body='{"detail":"Not Found"}')
    await pg.route(SRV + "/**", srv)
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(300)
    return ctx, pg

async def save(pg, secret):
    await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_selector('#srv-url')
    await pg.fill('#srv-url', SRV); await pg.fill('#srv-secret', secret); await pg.click('[data-a="srv-save"]'); await pg.wait_for_timeout(250)

async def status(pg):
    await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_selector('#srv-st')
    return await pg.inner_text('#srv-st')

# The prompts that talk to the person, built by the app for a gil card (no network: the __prep builders).
PROMPTS = """() => {
  const p = window.__prep, c = window.PREP.oral.find(x => x.m === 'gil');
  const iv = { turns: [{ who: 'cand', text: 'Nu știu' }], fu: 0 };
  return { turn: p.ivTurnPrompt(c, iv, null), verdict: p.ivVerdictPrompt(c, iv), lesson: p.gapLessonPrompt(c, 0, { said: 'x', wrong: [] }), ask: p.gapAskPrompt(c, 0, { said: 'x', wrong: [] }), sum: window.PrepApp.summary() };
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # 1. Without a known account: Alex's prompts, exactly as before.
        ctx, pg = await new_page(b)
        before = await pg.evaluate(PROMPTS)
        check("no account: Alex's profile in the interviewer prompt", "Profilul candidatului: dezvoltator cu experiență în Django/DRF" in before["turn"])
        check("no account: no feminine note", "feminin" not in json.dumps(before, ensure_ascii=False))
        check("no account: Jarvis summary says Alex", before["sum"]["name"] == "Alex" and before["sum"]["address"] == "m")

        # 2. Alex's secret: same prompts, "Conectat ca: Alex".
        await save(pg, ALEX)
        check("Alex: /me asked with his secret", pg.me == [ALEX], pg.me)
        check("Alex: Conectat ca: Alex", "Conectat ca: Alex." in await status(pg), await status(pg))
        check("Alex: prompts unchanged", await pg.evaluate(PROMPTS) == before)

        # 3. Ioana's secret replaces it: her name, the feminine, no profile (no Celery), in every prompt.
        await save(pg, IOANA)
        st = await status(pg)
        check("Ioana: Conectat ca: Ioana", "Conectat ca: Ioana." in st, st)
        her = await pg.evaluate(PROMPTS)
        for k in ("turn", "verdict", "lesson", "ask"):
            check(f"Ioana: {k} prompt has the feminine note", "feminin" in her[k] and "Ioana" in her[k])
            check(f"Ioana: {k} prompt has no Alex profile", "Celery" not in her[k].split("Întrebarea")[0] and "Profilul candidatului" not in her[k])
        check("Ioana: lesson prompt has no 'experiența lui'", "experiența lui" not in her["lesson"])
        check("Ioana: Jarvis summary", her["sum"]["name"] == "Ioana" and her["sum"]["address"] == "f" and "feminin" in her["sum"]["addressLine"] and her["sum"]["profile"] == "")

        # 4. The cache survives a reload (no new /me needed) and stays out of the state and the export.
        n = len(pg.me)
        await pg.reload(); await pg.wait_for_timeout(300)
        check("reload: no new /me (cached)", len(pg.me) == n, pg.me)
        check("reload: still Ioana", (await pg.evaluate(PROMPTS))["sum"]["name"] == "Ioana")
        state = await pg.evaluate("JSON.stringify(window.__prep.state())")
        check("account not in S", "Ioana" not in state and "ioana" not in state)
        cache = await pg.evaluate("localStorage.getItem('onapsis-account-v1')")
        check("cache has no secret", cache and IOANA not in cache, cache)

        # 5. "Testează AI" refreshes and says who is connected.
        await status(pg); await pg.click('[data-a="srv-test"]'); await pg.wait_for_timeout(300)
        st = await pg.inner_text('#srv-st')
        check("test button: says Conectat ca: Ioana", "Conectat ca: Ioana." in st, st)

        # 6. Deleting the server forgets the account: back to Alex's defaults.
        await pg.click('[data-a="srv-del"]'); await pg.wait_for_timeout(200)
        check("delete: account forgotten", await pg.evaluate("localStorage.getItem('onapsis-account-v1')") is None)
        check("delete: prompts back to Alex", await pg.evaluate(PROMPTS) == before)

        # 7. An old server without /me: nothing breaks, Alex's prompts stay.
        pg.old["v"] = True
        await save(pg, IOANA)
        st = await status(pg)
        check("old server: no 'Conectat ca'", "Conectat ca" not in st, st)
        check("old server: prompts stay Alex's", await pg.evaluate(PROMPTS) == before)

        # 8. A wrong secret: /me says 401, nothing cached.
        pg.old["v"] = False
        await save(pg, "wrong-secret-for-tests-0123456789abcdef-x")
        check("wrong secret: nothing cached", await pg.evaluate("localStorage.getItem('onapsis-account-v1')") is None)

        check("no console errors", not pg.errs, pg.errs)
        await ctx.close(); await b.close()
    print("\n" + ("ALL PASS" if not fails else f"{len(fails)} FAIL: {fails}"))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
