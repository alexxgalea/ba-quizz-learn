# Checks the DeepSeek verification on oral cards: key storage, verdict parsing, pre-ticked points, error fallback, dictation.
# DeepSeek is mocked at the network layer; nothing leaves the machine.
import asyncio, pathlib, json, re
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
KEY = "sk-test-0123456789abcdef"
CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "POST"}

# Fake Web Speech: start() delivers one phrase, stop() ends the session. "denied" mode fires a not-allowed error.
SPEECH = """
window.__speechMode = 'ok';
window.SpeechRecognition = window.webkitSpeechRecognition = class {   // Chromium ships a real unprefixed one: replace both
  start() {
    if (window.__speechMode === 'denied') { setTimeout(() => { this.onerror && this.onerror({ error: 'not-allowed' }); this.onend && this.onend(); }, 20); return; }
    setTimeout(() => this.onresult && this.onresult({ results: [[{ transcript: 'GIL-ul lasă un singur thread' }], [{ transcript: 'să ruleze bytecode odată' }]] }), 40);
  }
  stop() { setTimeout(() => this.onend && this.onend(), 10); }
};
"""

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2)
        await ctx.add_init_script(SPEECH)
        pg = await ctx.new_page()
        errs, reqs = [], []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
        await pg.route("**/fonts.*", lambda r: r.abort())

        mode = {"v": "ok"}
        async def ds(route):
            req = route.request
            if req.method == "OPTIONS":
                await route.fulfill(status=204, headers=CORS); return
            body = json.loads(req.post_data)
            reqs.append({"auth": req.headers.get("authorization"), "body": body})
            if mode["v"] == "401":
                await route.fulfill(status=401, headers=CORS, content_type="application/json", body='{"error":{"message":"bad key"}}'); return
            if mode["v"] == "garbage":
                await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"choices": [{"message": {"content": "nu e json"}}]})); return
            content = body["messages"][-1]["content"]
            n = len(re.findall(r"^\d+\. ", content, re.M))
            if body.get("max_tokens", 0) <= 8:   # connection test
                msg = "ok"
            else:
                cov = [i % 2 == 0 for i in range(n)]
                msg = json.dumps({"covered": cov, "missing": ["costul proceselor"], "wrong": ["GIL nu protejează invarianții"], "feedback": "Ai acoperit mecanismul, dar lipsește compromisul."})
            await route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps({"choices": [{"message": {"content": msg}}]}))
        await pg.route("https://api.deepseek.com/**", ds)

        await pg.goto(PAGE); await pg.wait_for_timeout(300)

        # 1) pure logic
        logic = await pg.evaluate("""() => {
          const T = window.__prep, o = {};
          o.ok = JSON.stringify(T.parseVerdict('{"covered":[true,false],"missing":["a"],"wrong":[],"feedback":"f"}', 2));
          o.fenced = !!T.parseVerdict('```json\\n{"covered":[true],"feedback":"f"}\\n```', 1);
          o.badLen = T.parseVerdict('{"covered":[true],"feedback":"f"}', 2);
          o.nonBool = T.parseVerdict('{"covered":["true","false"]}', 2);
          o.garbage = T.parseVerdict('nu e json', 2);
          o.empty = T.parseVerdict('', 2);
          o.capped = T.parseVerdict(JSON.stringify({covered:[true], missing: Array(20).fill("x".repeat(500))}), 1).missing.length;
          const body = T.dsBody({ q: "Q?", k: ["p1", "p2"], model: "M" }, "răspunsul meu");
          o.body = { model: body.model, fmt: body.response_format.type, think: body.thinking.type, stream: body.stream, hasPts: /1\\. p1\\n2\\. p2/.test(body.messages[1].content), hasAns: body.messages[1].content.includes("răspunsul meu"), sysJson: /JSON/.test(body.messages[0].content) };
          return o;
        }""")
        check("parseVerdict accepts a valid verdict", '"covered":[true,false]' in logic["ok"])
        check("parseVerdict accepts a fenced verdict", logic["fenced"])
        check("parseVerdict rejects wrong length / non-boolean / garbage / empty", logic["badLen"] is None and logic["nonBool"] is None and logic["garbage"] is None and logic["empty"] is None, logic)
        check("parseVerdict caps list length", logic["capped"] == 6, logic["capped"])
        check("request body: model, json mode, thinking off, points and answer", logic["body"] == {"model": "deepseek-flash", "fmt": "json_object", "think": "disabled", "stream": False, "hasPts": True, "hasAns": True, "sysJson": True}, logic["body"])

        # 2) no key: card shows the plain flow and a pointer to settings
        await pg.click('.tab[data-tab="oral"]')
        await pg.click('[data-a="oral"][data-f="smart"]'); await pg.wait_for_timeout(100)
        check("no key: no AI button, plain reveal stays primary", await pg.locator('[data-a="oral-ai"]').count() == 0 and await pg.locator('[data-a="oral-reveal"].primary').count() == 1)
        check("no key: pointer to Progres", await pg.locator('.card [data-a="tab"][data-tab="progress"]').count() == 1)
        check("answer box and mic button present", await pg.locator('#ans-t').count() == 1 and await pg.locator('#mic-b').count() == 1)

        # 3) key goes to settings; stays out of state, export and the progress key
        await pg.click('.tab[data-tab="progress"]'); await pg.wait_for_timeout(100)
        await pg.fill('#ds-key', "short"); await pg.click('[data-a="ds-save"]')
        check("short key rejected", await pg.evaluate("localStorage.getItem('onapsis-deepseek-v1')") is None)
        await pg.fill('#ds-key', KEY); await pg.click('[data-a="ds-save"]'); await pg.wait_for_timeout(100)
        check("key saved under its own localStorage key", await pg.evaluate("localStorage.getItem('onapsis-deepseek-v1')") == KEY)
        shown = await pg.inner_text('#ds-st')
        check("key is masked in settings", "cdef" in shown and KEY not in shown, shown)
        await pg.click('[data-a="ds-test"]'); await pg.wait_for_timeout(300)
        check("connection test reports success", "reușită" in await pg.inner_text('#ds-st'))
        await pg.screenshot(path=str(SHOTS / "ai1-settings.png"))
        await pg.click('[data-a="exp"]'); await pg.wait_for_timeout(100)
        exported = await pg.input_value('#exp-t')
        leaked = KEY in exported or KEY in json.dumps(await pg.evaluate("window.__prep.state()")) or KEY in (await pg.evaluate("localStorage.getItem('onapsis-prep-v1')") or "")
        check("key absent from state, export and progress storage", not leaked)

        # 4) with key: verify an answer, points get pre-ticked
        await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
        check("run survives tab switch", await pg.locator('#ans-t').count() == 1)
        check("with key: AI button is primary, reveal becomes secondary", await pg.locator('[data-a="oral-ai"].primary').count() == 1 and await pg.locator('[data-a="oral-reveal"].primary').count() == 0)
        await pg.fill('#ans-t', "scurt"); await pg.click('[data-a="oral-ai"]'); await pg.wait_for_timeout(150)
        check("too-short answer sends nothing", len(reqs) == 1)   # only the connection test so far
        answer = "GIL-ul lasă un singur thread să execute bytecode, deci pentru CPU-bound folosesc procese."
        await pg.fill('#ans-t', answer)
        await pg.screenshot(path=str(SHOTS / "ai2-ask.png"))
        await pg.click('[data-a="oral-ai"]'); await pg.wait_for_selector('.ai-v', timeout=5000)
        r = reqs[-1]
        check("request carries bearer key and the answer", r["auth"] == "Bearer " + KEY and answer in r["body"]["messages"][-1]["content"])
        n = await pg.locator('.kp-i').count()
        pressed = await pg.eval_on_selector_all('.kp-i', "els => els.map(e => e.getAttribute('aria-pressed') === 'true')")
        check("points pre-ticked from the verdict", pressed == [i % 2 == 0 for i in range(n)], pressed)
        vtxt = await pg.inner_text('.ai-v')
        check("verdict card shows feedback, missing and wrong", all(x in vtxt for x in ["compromisul", "costul proceselor", "GIL nu protejează"]), vtxt)
        check("own answer kept in a collapsed section", answer in (await pg.text_content('.ai-v details p') or ""))
        await pg.screenshot(path=str(SHOTS / "ai3-verdict.png"), full_page=True)
        await pg.click('.kp-i >> nth=1'); await pg.wait_for_timeout(50)
        ticked = sum(await pg.eval_on_selector_all('.kp-i', "els => els.map(e => e.getAttribute('aria-pressed') === 'true')"))
        expect_ticked = sum(1 for i in range(n) if i % 2 == 0) + 1
        check("manual override of a tick works", ticked == expect_ticked, (ticked, expect_ticked))
        await pg.click('[data-a="oral-save"]'); await pg.wait_for_timeout(100)
        saved = await pg.evaluate("Object.values(window.__prep.state().o)")
        check("score saved from ticks, no AI data in state", len(saved) == 1 and saved[0]["s"] == round(expect_ticked / n * 100) and set(saved[0]) <= {"b", "n", "s", "t"}, saved)
        if await pg.locator('#ans-t').count():
            check("next card starts with an empty answer", await pg.input_value('#ans-t') == "")

        # 5) errors keep the card usable
        mode["v"] = "401"
        await pg.fill('#ans-t', answer); await pg.click('[data-a="oral-ai"]'); await pg.wait_for_selector('.ai-err', timeout=5000)
        check("401: message shown, stays on ask phase, answer kept", "nu e validă" in await pg.inner_text('.ai-err') and await pg.input_value('#ans-t') == answer)
        await pg.screenshot(path=str(SHOTS / "ai4-error.png"))
        mode["v"] = "garbage"; n0 = len(reqs)
        await pg.click('[data-a="oral-ai"]'); await pg.wait_for_selector('.ai-err:has-text("formatul")', timeout=5000)
        check("garbage output: one automatic retry, then format error", len(reqs) - n0 == 2, len(reqs) - n0)
        await pg.click('[data-a="oral-reveal"]'); await pg.wait_for_timeout(100)
        check("fallback to manual ticking works", await pg.locator('.kp-i').count() > 0 and await pg.locator('.ai-v').count() == 0)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="close-result"]'); await pg.wait_for_timeout(100)    # the earlier saved card makes quit show a result

        # 6) dictation
        mode["v"] = "ok"
        await pg.click('[data-a="oral"][data-f="smart"]'); await pg.wait_for_timeout(100)
        await pg.click('#mic-b'); await pg.wait_for_timeout(200)
        txt = await pg.input_value('#ans-t')
        check("dictation fills the answer box", txt == "GIL-ul lasă un singur thread să ruleze bytecode odată", txt)
        check("mic button shows recording state", await pg.get_attribute('#mic-b', 'aria-pressed') == "true")
        await pg.click('#mic-b'); await pg.wait_for_timeout(100)
        check("mic stops", await pg.get_attribute('#mic-b', 'aria-pressed') == "false")
        await pg.evaluate("window.__speechMode = 'denied'")
        await pg.click('#mic-b'); await pg.wait_for_timeout(150)
        check("blocked mic: toast, answer box untouched", "blocat" in await pg.inner_text('#toast') and await pg.input_value('#ans-t') == txt)

        # 7) deleting the key restores the plain flow
        await pg.click('.tab[data-tab="progress"]'); await pg.click('[data-a="ds-del"]'); await pg.wait_for_timeout(100)
        check("key deleted", await pg.evaluate("localStorage.getItem('onapsis-deepseek-v1')") is None)

        # 8) dark theme shots
        await pg.emulate_media(color_scheme="dark")
        await pg.click('.tab[data-tab="oral"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(SHOTS / "ai5-dark.png"), full_page=True)

        check("no page errors", not errs, errs)
        await b.close()
    print("\nFAILED: " + ", ".join(fails) if fails else "\nALL OK")
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
