# The written interviewer, the simulated technical interview and Certificare on the server source (platform ticket 07).
# A fake server answers on https://srv.test; `window.claude` does not exist (PWA build) or is an empty shell (artifact build), so the server is the only source.
# Gemini and DeepSeek are spied on and must never be hit. Covers: a card with the interviewer end to end (requests, waiting state, follow-ups, verdict,
# scoring), stop, 502 and timeout through the retry path (`iv.final`: the verdict is retried, the question is not asked again), the no-AI path, the
# 7-card technical mock, and a whole certification (grile -> 6 oral cards -> 2 skeletons) with the result in the history, on both builds.
# The interview date is set from the state (Progres › Interviul does the same), so the test does not depend on P.cfg.
import asyncio, json, pathlib, re
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PWA = (ROOT / "dist" / "app" / "index.html").as_uri()                 # journal in IndexedDB
ART = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()             # artifact build: S in localStorage
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

SRV = "https://srv.test"
SECRET = "s3cret-for-tests-0123456789abcdef-xyz"
CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "POST,GET,OPTIONS"}
ANS = "GIL-ul lasă un singur thread să execute bytecode, deci pentru CPU-bound folosesc procese."
FU1 = "De ce nu ajută threadurile la un task CPU-bound?"
FU2 = "Și dacă taskul e I/O-bound?"
CODE = "import asyncio\n\nasync def main():\n    await asyncio.sleep(0)\n\nasyncio.run(main())\n"

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

def tj(**k): return json.dumps(k, ensure_ascii=False)

def kind_of(body):
    sysm, user = body.get("system", ""), body["user"]
    if '"act":"followup"' in user: return "turn"
    if '"spontan"' in user: return "verdict"
    if "verificator de cod" in sysm: return "skel"
    if "on_topic" in sysm: return "ask"
    return "grade"

def default_reply(kind, body):
    n = len(re.findall(r"^\d+\. ", body["user"], re.M))
    if kind == "turn": return tj(act="done")
    if kind == "verdict": return tj(covered=["spontan"] * n, missing=[], wrong=[], feedback="Complet.")
    if kind == "skel": return tj(covered=[0, 1], errors=[], missing=["restul"])
    if kind == "grade": return tj(covered=[True] * n, missing=[], wrong=[], feedback="ok")
    return tj(on_topic=True, answer="ok")

async def new_page(b, page_url, scheme="light"):
    ctx = await b.new_context(viewport={"width": 360, "height": 780}, device_scale_factor=2, color_scheme=scheme)
    pg = await ctx.new_page(); pg.errs = []; pg.log = []; pg.direct = []
    pg.q = {}                    # per kind: a list of replies: a string (200 + that text), {"status": N}, or {"hang": True}
    pg.delay = 0.0               # seconds before every answer
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text and "ERR_FAILED" not in m.text and "net::" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())

    async def srv(route):
        req = route.request
        if req.method == "OPTIONS":
            await route.fulfill(status=204, headers=CORS); return
        path = req.url[len(SRV):].split("?")[0]
        if path == "/events":    # the journal sync (ticket 05) shares the server: an empty, valid answer, not logged as an AI call
            if req.method == "GET":
                await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"events": [], "cursor": 0, "more": False})); return
            ids = [e["id"] for e in json.loads(req.post_data or "{}").get("events", [])]
            await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"accepted": ids, "duplicates": [], "cursor": len(ids)})); return
        body = json.loads(req.post_data); k = kind_of(body)
        pg.log.append({"kind": k, "body": body, "auth": req.headers.get("authorization")})
        item = pg.q[k].pop(0) if pg.q.get(k) else None
        if pg.delay: await asyncio.sleep(pg.delay)
        try:
            if isinstance(item, dict) and item.get("hang"): await asyncio.sleep(300); return
            if isinstance(item, dict) and item.get("status"):
                await route.fulfill(status=item["status"], headers=CORS, content_type="application/json", body='{"detail":"ai_unavailable"}'); return
            await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"text": item if isinstance(item, str) else default_reply(k, body), "model": "gemini"}))
        except Exception:
            pass                 # the page aborted the request (stop, timeout): nothing to answer
    async def spy(route):
        pg.direct.append(route.request.url); await route.abort()
    await pg.route(SRV + "/**", srv)
    await pg.route("https://generativelanguage.googleapis.com/**", spy)
    await pg.route("https://api.deepseek.com/**", spy)
    await pg.goto(page_url); await pg.evaluate("localStorage.clear()")
    await pg.evaluate("localStorage.setItem('onapsis-gemini-v1', 'GKEY-must-stay-unused'); localStorage.setItem('onapsis-deepseek-v1', 'sk-must-stay-unused-0123456789')")
    await pg.evaluate("localStorage.setItem('onapsis-server-v1', JSON.stringify({ url: %s, secret: %s }))" % (json.dumps(SRV), json.dumps(SECRET)))
    await pg.reload(); await pg.wait_for_timeout(500)
    # the interview date moves forward from the state, like Progres › Interviul
    await pg.evaluate("() => { const s = window.__prep.state(); s.c = { d: '2027-06-01', h: 2.5, t: Date.now() }; window.__prep.setState(s); }")
    return ctx, pg

def count(pg, kind): return sum(1 for x in pg.log if x["kind"] == kind)
async def ui(pg, expr): return await pg.evaluate("(() => { const ui = window.__prep.ui(); return " + expr + "; })()")

async def start_gil(pg):
    await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
    await pg.click('[data-a="oral-mod"][data-m="gil"]'); await pg.wait_for_selector('#ans-t', timeout=3000)
    return await pg.evaluate("""() => {
      const q = document.querySelector('.icard-q').textContent.replace(/\\s+/g, ' ').trim();
      const c = window.PREP.oral.find(c => c.m === 'gil' && c.q.replace(/`/g, '').replace(/\\s+/g, ' ').trim() === q);
      return { id: c.id, k: c.k, n: c.k.length };
    }""")

async def go_iv(pg, text=ANS):
    await pg.fill('#ans-t', text); await pg.click('[data-a="iv-start"]')

async def leave_card(pg):
    await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
    if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')

async def card_saved(pg):
    await pg.fill('#ans-t', ANS); await pg.click('[data-a="iv-start"]'); await pg.wait_for_selector('.ai-v', timeout=5000)
    await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)

async def answer_mcq(pg, n_right):
    total = await ui(pg, "ui.run.items.length")
    for i in range(total):
        pos = await pg.evaluate("""(right) => {
          const run = window.__prep.ui().run, it = run.items[run.i], q = window.PREP.mcq.find(x => x.id === it.id);
          const ok = it.ord.indexOf(q.a); return right ? ok : (ok + 1) % it.ord.length;
        }""", i < n_right)
        await pg.click('[data-a="ans"][data-pos="%d"]' % pos)
        if i < total - 1: await pg.click('[data-a="next"]')
    await pg.click('[data-a="submit"]'); await pg.wait_for_timeout(100)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ================= the interviewer on a card, PWA build =================
        ctx, pg = await new_page(b, PWA)
        check("PWA build: the journal is on and window.claude is absent (the server is the only source)", await pg.evaluate("typeof window.claude === 'undefined' && !!window.__prep.journal()"))
        card = await start_gil(pg)
        check("oral: the interviewer button is offered with a server and no sample", await pg.locator('[data-a="iv-start"]').count() == 1 and "AI" in await pg.inner_text('[data-a="oral-ai"]'))
        n = card["n"]
        pg.q["turn"] = [tj(act="followup", say=FU1), tj(act="followup", say=FU2)]
        pg.q["verdict"] = [tj(covered=["spontan", "dupa"] + ["nu"] * (n - 2), missing=["costul proceselor"], wrong=[], feedback="Ai acoperit mecanismul.")]
        pg.delay = 0.7
        await go_iv(pg)
        await pg.wait_for_selector('.iv-wait', timeout=2000)
        check("waiting: while the server is slow the dialog shows 'Se gândește…' and a stop button", await pg.locator('.iv-wait').inner_text() == "Se gândește…" and await pg.locator('[data-a="iv-stop"]').count() == 1)
        await pg.screenshot(path=str(SHOTS / "iv_srv1_wait.png"))
        await pg.wait_for_selector('.iv-m.int', timeout=4000)
        r = pg.log[0]
        check("turn: the first request is a quick, JSON-mode request to /ai with the bearer secret, carrying the card and the answer", r["kind"] == "turn" and r["body"]["kind"] == "quick" and r["body"]["json_mode"] is True and r["auth"] == "Bearer " + SECRET and ANS in r["body"]["user"] and card["k"][0] in r["body"]["user"], r["body"]["user"][:100])
        check("turn: the follow-up question is shown, 1/2", FU1 in await pg.inner_text('.iv-m.int') and "1/2" in await pg.inner_text('.iv .chip'))
        await pg.fill('#iv-t', "Pentru că GIL-ul blochează execuția paralelă."); await pg.click('[data-a="iv-send"]')
        await pg.wait_for_function("document.querySelectorAll('.iv-m.int').length === 2", timeout=4000)
        check("turn: the second follow-up comes, 2/2, and the dialog so far is in the prompt", FU2 in await pg.inner_text('.iv') and "2/2" in await pg.inner_text('.iv .chip') and "Pentru că GIL-ul blochează" in pg.log[1]["body"]["user"])
        await pg.fill('#iv-t', "Atunci threadurile merg bine, fiindcă GIL-ul se eliberează la I/O."); await pg.click('[data-a="iv-send"]')
        await pg.wait_for_selector('.ai-v', timeout=4000)
        check("cap: after two questions the next request is the verdict (no third question)", count(pg, "turn") == 2 and count(pg, "verdict") == 1 and pg.log[-1]["body"]["kind"] == "default" and pg.log[-1]["body"]["json_mode"] is True)
        check("verdict: signed AI, with the missing point", "Verdict AI" in await pg.inner_text('.ai-v h3') and "costul proceselor" in await pg.inner_text('.ai-v'))
        pressed = await pg.eval_on_selector_all('.kp-i', "els => els.map(e => e.getAttribute('aria-pressed') === 'true')")
        check("verdict: spontan and dupa pre-ticked, nu not", pressed == [True, True] + [False] * (n - 2), pressed)
        await pg.screenshot(path=str(SHOTS / "iv_srv2_verdict.png"), full_page=True)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        e = await pg.evaluate("([id]) => window.__prep.state().o[id]", [card["id"]])
        check("score: spontan 1 + dupa 0.5 from the ticks, as with sample", e and e["n"] == 1 and e["s"] == round(150 / n), e)
        check("memory: the points not covered spontaneously are stored after the dialog (as with sample)", e and e.get("m") == list(range(1, n)) and e.get("mc") == {str(i): 1 for i in range(1, n)}, e)
        await leave_card(pg)

        # stop: the in-flight request is aborted, the dialog survives and goes on
        card = await start_gil(pg); pg.log.clear()
        pg.q["turn"] = [{"hang": True}, tj(act="followup", say=FU1)]; pg.delay = 0
        await go_iv(pg); await pg.wait_for_selector('.iv-wait', timeout=2000)
        await pg.click('[data-a="iv-stop"]'); await pg.wait_for_timeout(100)
        check("stop: the cancelled message shows (not a timeout) and the dialog can continue", "oprit" in await pg.inner_text('.iv .ai-err') and await pg.locator('[data-a="iv-retry"]').count() == 1)
        await pg.click('[data-a="iv-retry"]'); await pg.wait_for_selector('.iv-m.int', timeout=3000)
        check("stop: Continuă asks again and the follow-up arrives", FU1 in await pg.inner_text('.iv-m.int'))
        await leave_card(pg)

        # 502 on the verdict: the retry skips the question (iv.final)
        card = await start_gil(pg); pg.log.clear()
        pg.q["turn"] = [tj(act="done")]; pg.q["verdict"] = [{"status": 502}]
        await go_iv(pg); await pg.wait_for_selector('.iv .ai-err', timeout=4000)
        check("502: every model failing is a message in Romanian with a retry, not a block", "Niciun model" in await pg.inner_text('.iv .ai-err') and await pg.locator('[data-a="iv-retry"]').count() == 1 and await pg.locator('[data-a="iv-manual"]').count() == 1)
        check("502: the run is in the final state", await ui(pg, "ui.run.iv.final") is True and count(pg, "turn") == 1 and count(pg, "verdict") == 1)
        await pg.click('[data-a="iv-retry"]'); await pg.wait_for_selector('.ai-v', timeout=4000)
        check("502: the retry asks only for the verdict (no new question) and reaches the review", count(pg, "turn") == 1 and count(pg, "verdict") == 2 and await pg.locator('.kp-i').count() == n)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)
        await leave_card(pg)

        # 502 on the question, then no AI: manual ticks, the card saves like any card
        card = await start_gil(pg); pg.log.clear()
        pg.q["turn"] = [{"status": 502}]
        await go_iv(pg); await pg.wait_for_selector('.iv .ai-err', timeout=4000)
        check("502 on the question: retry and no-AI are offered", await pg.locator('[data-a="iv-retry"]').count() == 1 and await pg.locator('[data-a="iv-manual"]').count() == 1)
        await pg.click('[data-a="iv-manual"]'); await pg.wait_for_selector('.kp-i', timeout=3000)
        check("no-AI: key points to tick, nothing pre-ticked, no verdict", await pg.locator('.ai-v').count() == 0 and await pg.locator('.kp-i[aria-pressed="true"]').count() == 0)
        await pg.click('.kp-i >> nth=0'); await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        e = await pg.evaluate("([id]) => window.__prep.state().o[id]", [card["id"]])
        check("no-AI: the manual tick is scored", e and e["s"] == round(100 / n), e)
        await leave_card(pg)

        # 401: the message points to the cause, then no-AI
        card = await start_gil(pg); pg.log.clear()
        pg.q["turn"] = [{"status": 401}]
        await go_iv(pg); await pg.wait_for_selector('.iv .ai-err', timeout=4000)
        msg = await pg.inner_text('.iv .ai-err')
        check("401: the refused secret points to settings", "secretul" in msg.lower() and "Progres" in msg, msg)
        await pg.click('[data-a="iv-manual"]'); await pg.wait_for_selector('.kp-i', timeout=3000)
        await leave_card(pg)

        # timeout: the client gives up at 50 s (page clock); the message and the retry path hold
        card = await start_gil(pg); pg.log.clear()
        await pg.clock.install()
        pg.q["turn"] = [tj(act="done")]; pg.q["verdict"] = [{"hang": True}, None]
        await go_iv(pg); await pg.wait_for_selector('.iv-wait', timeout=3000)
        await pg.wait_for_timeout(200)
        check("timeout: the verdict request is out and the dialog is waiting", count(pg, "verdict") == 1 and await pg.locator('.iv-wait').count() == 1)
        await pg.clock.run_for(49000); await pg.wait_for_timeout(100)
        check("timeout: still waiting at 49 s (the client limit is 50 s)", await pg.locator('.iv-wait').count() == 1)
        await pg.clock.run_for(2000); await pg.wait_for_selector('.iv .ai-err', timeout=3000)
        check("timeout: after 50 s the message says it took too long, and retry / no-AI are offered", "întârziat" in await pg.inner_text('.iv .ai-err') and await pg.locator('[data-a="iv-retry"]').count() == 1 and await pg.locator('[data-a="iv-manual"]').count() == 1)
        await pg.click('[data-a="iv-retry"]'); await pg.wait_for_selector('.ai-v', timeout=4000)
        check("timeout: the retry goes straight to the verdict, no new question", count(pg, "turn") == 1 and count(pg, "verdict") == 2)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)
        await leave_card(pg)
        check("PWA: no page errors so far", not pg.errs, pg.errs)

        # ================= rewrite and the technical mock =================
        pg.log.clear(); pg.q = {}
        await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
        check("mock: the technical interview is offered with the server", await pg.locator('[data-a="iv-mock"]').count() == 1)
        await pg.click('[data-a="iv-mock"]'); await pg.wait_for_selector('#ans-t', timeout=3000)
        total = await ui(pg, "ui.run.items.length")
        check("mock: 7 cards, mock mode", total == 7 and await ui(pg, "ui.run.mock") is True and await pg.locator('[data-a="oral-ai"], [data-a="oral-reveal"]').count() == 0)
        for i in range(total):
            await pg.fill('#ans-t', ANS); await pg.click('[data-a="iv-start"]'); await pg.wait_for_selector('.ai-v', timeout=4000)
            await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)
        check("mock: all 7 cards went through the server and the result is in the history", count(pg, "verdict") == 7 and any(h["kind"] == "oral" and h["title"] == "Interviu tehnic simulat" for h in await pg.evaluate("window.__prep.state().h")))
        if await pg.locator('[data-a="close-result"]').count(): await pg.click('[data-a="close-result"]')

        # the rewrite (after a dialog, not in a mock) goes through the server too
        card = await start_gil(pg); pg.log.clear()
        await go_iv(pg); await pg.wait_for_selector('.ai-v', timeout=4000)
        await pg.click('[data-a="rw-open"]'); await pg.fill('#rw-t', "GIL-ul serializează bytecode-ul, deci pentru CPU-bound folosesc procese și pentru I/O threaduri sau asyncio.")
        await pg.click('[data-a="rw-check"]'); await pg.wait_for_selector('.rw .chip, .rw-res', timeout=4000)
        check("rewrite: checked through the server (grade request, JSON mode)", count(pg, "grade") == 1 and pg.log[-1]["body"]["json_mode"] is True)
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)
        await leave_card(pg)

        check("no request went straight to Gemini or DeepSeek, although both keys were stored", pg.direct == [], pg.direct)
        check("PWA interviewer: no page errors", not pg.errs, pg.errs)
        await ctx.close()

        # ================= Certificare end to end, on both builds =================
        for tag, url in [("PWA", PWA), ("artifact build", ART)]:
            ctx, pg = await new_page(b, url)
            await pg.click('.tab[data-tab="plan"]'); await pg.wait_for_timeout(100)
            check(tag + ": the certification card is on the plan", await pg.locator('.cert-card [data-a="cert"]').count() == 1)
            await pg.click('.cert-card [data-a="cert"]'); await pg.wait_for_timeout(100)
            check(tag + ": it starts with a server and no sample", await ui(pg, "!!ui.cert && ui.cert.step") == "q")
            await pg.click('[data-a="cert-go"]'); await pg.wait_for_timeout(100)
            await answer_mcq(pg, 17)
            check(tag + ": grile done, the oral section is next", await ui(pg, "ui.cert.step") == "o")
            await pg.click('[data-a="cert-go"]'); await pg.wait_for_timeout(100)
            o = await ui(pg, "({ items: ui.run.items, want: ui.cert.ids.o })")
            check(tag + ": the 6 oral cards open with the interviewer only", o["items"] == o["want"] and len(o["items"]) == 6 and await pg.locator('[data-a="iv-start"]').count() == 1 and await pg.locator('[data-a="oral-ai"]').count() == 0)
            pg.log.clear()
            # card 1 fails once on the verdict (502), the retry works; card 2 goes through the no-AI path; cards 3-6 are plain
            pg.q["turn"] = [tj(act="done")]; pg.q["verdict"] = [{"status": 502}]
            await pg.fill('#ans-t', ANS); await pg.click('[data-a="iv-start"]'); await pg.wait_for_selector('.iv .ai-err', timeout=4000)
            await pg.click('[data-a="iv-retry"]'); await pg.wait_for_selector('.ai-v', timeout=4000)
            await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)
            pg.q["turn"] = [{"status": 502}]
            await pg.fill('#ans-t', ANS); await pg.click('[data-a="iv-start"]'); await pg.wait_for_selector('.iv .ai-err', timeout=4000)
            await pg.click('[data-a="iv-manual"]'); await pg.wait_for_selector('.kp-i', timeout=3000)
            await pg.click('.kp-i >> nth=0'); await pg.click('.kp-i >> nth=1'); await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(80)
            for _ in range(4): await card_saved(pg)
            check(tag + ": after the oral section the certification asks for the skeletons", await ui(pg, "ui.tab") == "cert" and await ui(pg, "ui.cert.res.o.length") == 6 and await ui(pg, "ui.cert.step") == "s", await ui(pg, "ui.cert.step"))
            await pg.click('[data-a="cert-go"]'); await pg.wait_for_timeout(100)
            sids = await ui(pg, "ui.cert.ids.s")
            await pg.fill('[data-skel-code]', CODE); await pg.click('[data-a="skel-ai"]'); await pg.wait_for_selector('.skel-ai h3', timeout=4000)
            check(tag + ": the skeleton check goes through the server", count(pg, "skel") == 1)
            await pg.click('[data-a="skel-save"]'); await pg.wait_for_timeout(100)
            await pg.click('[data-a="skel-peek"]'); await pg.click('[data-a="skel-save"]'); await pg.wait_for_timeout(150)
            check(tag + ": the certification is done and the certificate shows", await ui(pg, "ui.cert.step") == "done" and await pg.locator('.cert-total').count() == 1)
            exp = await pg.evaluate("window.__prep.certScore(window.__prep.ui().cert.res)")
            st = await pg.evaluate("window.__prep.state()")
            ce = [h for h in st["h"] if h["kind"] == "cert"]
            check(tag + ": the result is in S.h as kind cert, with the scores and no duration", len(ce) == 1 and abs(ce[0]["cert"]["tot"] - exp["tot"]) < 1e-9 and not ce[0].get("dur"), ce)
            check(tag + ": the oral section scored 5 full cards and 1 with 2 ticks (the manual one)", abs(exp["o"] - (5 + 2 / (await pg.evaluate("id => window.PREP.oral.find(c => c.id === id).k.length", o["items"][1]))) / 6) < 1e-9, exp["o"])
            await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_timeout(100)
            check(tag + ": the history labels the certification", "certificare" in await pg.inner_text('.hist'))
            if tag == "PWA":
                await pg.reload(); await pg.wait_for_timeout(500)
                st2 = await pg.evaluate("window.__prep.state()")
                check("PWA: after a reload the certification is still in the journal's projection", any(h["kind"] == "cert" for h in st2["h"]))
            await pg.screenshot(path=str(SHOTS / ("iv_srv3_cert_%s.png" % tag.split()[0].lower())), full_page=True)
            check(tag + ": nothing went straight to Gemini or DeepSeek", pg.direct == [], pg.direct)
            check(tag + ": every server request carried the secret as a bearer, never in the URL or body", all(x["auth"] == "Bearer " + SECRET and SECRET not in json.dumps(x["body"]) for x in pg.log))
            check(tag + ": no page errors", not pg.errs, pg.errs)
            await ctx.close()

        # ================= no server, no sample: the old message, nothing starts =================
        ctx = await b.new_context(viewport={"width": 360, "height": 780})
        pg = await ctx.new_page(); await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PWA); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
        await pg.evaluate("() => { const s = window.__prep.state(); s.c = { d: '2027-06-01', h: 2.5, t: Date.now() }; window.__prep.setState(s); }")
        await pg.click('.tab[data-tab="plan"]'); await pg.click('.cert-card [data-a="cert"]'); await pg.wait_for_timeout(100)
        check("no server: certification does not start and the message names the server", await ui(pg, "ui.cert") is None and "serverul" in (await pg.text_content('#toast') or ""))
        await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
        check("no server: no interviewer and no simulated interview", await pg.locator('[data-a="iv-mock"]').count() == 0)
        await ctx.close()

        await b.close()
    print("\n" + ("ALL PASS" if not fails else "FAILED: " + str(len(fails))))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
