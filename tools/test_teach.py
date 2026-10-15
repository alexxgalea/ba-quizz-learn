# Checks the guided flow: levels, context, "Nu știu încă", adaptive diagnostic, level-gated mix, mock without context.
import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2)
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(300)

        # 1) pure logic on a fresh state
        logic = await pg.evaluate("""() => {
          const T = window.__prep, out = {};
          const d = T.pickDiag();
          out.diagLen = d.length;
          out.round1AllL1 = d.filter(x => x.round === 1).every(x => x.q.lvl === 1);
          out.round1First = d.slice(0, d.filter(x => x.round === 1).length).every(x => x.round === 1);
          out.round2Count = d.filter(x => x.round === 2).length;
          out.round2Lvl2 = d.filter(x => x.round === 2).filter(x => x.q.lvl === 2).length;
          const sm = T.pickSmart(15); out.smartLvls = sm.map(q => q.lvl).join("");
          out.unlockedFresh = T.unlockedLvl("gil");
          // assisted cap
          const S = T.state();
          T.updQ("gil-01", true, true); out.capFrom0 = S.q["gil-01"].b;          // 2
          T.updQ("gil-01", true, true); out.capFrom2 = S.q["gil-01"].b;          // 2 (no promotion with context)
          T.updQ("gil-01", true, false); out.unassisted = S.q["gil-01"].b;       // 3
          T.updQ("gil-01", true, true); out.capKeeps3 = S.q["gil-01"].b;         // 3 (never drops)
          T.updQ("gil-01", false, false); out.wrongTo1 = S.q["gil-01"].b;        // 1
          delete S.q["gil-01"];
          return out;
        }""")
        print("LOGIC", json.dumps(logic))

        # 2) diagnostic UI: context visible, level chip, dunno flow, adaptive swap
        await pg.click('.tab[data-tab="quiz"]')
        await pg.click('[data-a="mcq"][data-mode="diag"]')
        await pg.wait_for_timeout(150)
        await pg.screenshot(path=str(SHOTS / "t1-diag-ctx.png"))
        first = await pg.evaluate("""() => ({ ctx: !!document.querySelector('.ctx'), lvl: document.querySelector('.chip.lvl').textContent, dunno: !!document.querySelector('[data-a=dunno]') })""")
        print("first question:", json.dumps(first, ensure_ascii=False))
        # find a P1 round-1 item to test the adaptive swap
        info = await pg.evaluate("""() => {
          const T = window.__prep; return null; }""")
        # answer "Nu știu" on questions until we hit a P1 module, then check its round-2 partner is level 1
        swapped = None
        for i in range(22):
            st = await pg.evaluate("""() => { const r = document.querySelector('.eyebrow').textContent; return r; }""")
            mod = await pg.evaluate("""() => document.querySelectorAll('.row .chip')[1] ? document.querySelectorAll('.row .chip')[1].textContent : ''""")
            await pg.click('[data-a="dunno"]'); await pg.wait_for_timeout(120)
            if i == 0:
                await pg.screenshot(path=str(SHOTS / "t2-dunno.png"))
            await pg.click('[data-a="next"]'); await pg.wait_for_timeout(80)
        # now we are in round 2: every item should be level 1 (all round-1 answers were "nu știu")
        r2 = []
        for i in range(8):
            lv = await pg.evaluate("""() => document.querySelector('.chip.lvl').dataset.l""")
            r2.append(lv)
            await pg.click('[data-a="dunno"]'); await pg.wait_for_timeout(80)
            await pg.click('[data-a="next"]'); await pg.wait_for_timeout(80)
        print("round-2 levels after all 'nu știu':", "".join(r2))
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(SHOTS / "t3-diag-result.png"), full_page=True)
        res = await pg.evaluate("""() => document.querySelector('.score') ? document.querySelector('.score').innerText : 'no result'""")
        print("result card:", res.replace("\\n", " | "))
        st = await pg.evaluate("""() => { const S = window.__prep.state(); const v = Object.values(S.q); return { n: v.length, allBox1: v.every(e => e.b === 1 && e.l === 0) }; }""")
        print("state after diag:", json.dumps(st))

        # 3) answer one question correctly with context, then see it collapsed in a module run
        await pg.click('[data-a="close-result"]')
        await pg.click('[data-a="mcq-mod"][data-m="redis"]'); await pg.wait_for_timeout(120)
        qid = await pg.evaluate("""() => document.querySelector('.chip.acc').textContent.toLowerCase()""")
        correct = await pg.evaluate("""(id) => { const T = window.__prep; return null; }""", qid)
        # pick the correct option by reading the data
        pos = await pg.evaluate("""(id) => { const q = window.PREP.mcq.find(x => x.id === id); const btns = [...document.querySelectorAll('.opt')]; return btns.findIndex(b => b.textContent.includes(q.o[q.a].replace(/`/g, '').slice(0, 20))); }""", qid)
        await pg.click(f'.opt >> nth={pos}'); await pg.wait_for_timeout(150)
        note = await pg.evaluate("""() => document.querySelector('.fb-note') ? document.querySelector('.fb-note').textContent : ''""")
        print("answered", qid, "note:", note)
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-a="close-result"]') if await pg.query_selector('[data-a="close-result"]') else None
        await pg.evaluate("""(id) => { /* start an 'ids' run with that question */ }""", qid)
        await pg.click('[data-a="mcq-mod"][data-m="redis"]'); await pg.wait_for_timeout(120)
        # walk to that question
        for i in range(12):
            cur = await pg.evaluate("""() => document.querySelector('.chip.acc').textContent.toLowerCase()""")
            if cur == qid: break
            await pg.click('[data-a="dunno"]'); await pg.click('[data-a="next"]'); await pg.wait_for_timeout(60)
        collapsed = await pg.evaluate("""() => ({ btn: !!document.querySelector('[data-a=ctx-open]'), panel: !!document.querySelector('.ctx') })""")
        print("same question later:", json.dumps(collapsed))
        await pg.screenshot(path=str(SHOTS / "t4-ctx-collapsed.png"))
        await pg.click('[data-a="ctx-open"]'); await pg.wait_for_timeout(100)
        opened = await pg.evaluate("""() => !!document.querySelector('.ctx')""")
        print("context opens on tap:", opened)

        # 4) mock: no context, no dunno
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(150)
        if await pg.query_selector('[data-a="close-result"]'): await pg.click('[data-a="close-result"]')
        await pg.click('[data-a="mcq"][data-mode="mock"]'); await pg.wait_for_timeout(120)
        mock = await pg.evaluate("""() => ({ ctx: !!document.querySelector('.ctx') || !!document.querySelector('[data-a=ctx-open]'), dunno: !!document.querySelector('[data-a=dunno]') })""")
        print("mock:", json.dumps(mock))

        # 5) dark mode look of the context panel
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(150)
        await pg.emulate_media(color_scheme="dark")
        await pg.click('[data-a="mcq-mod"][data-m="celery"]'); await pg.wait_for_timeout(150)
        await pg.screenshot(path=str(SHOTS / "t5-dark.png"))
        overflow = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        print("horizontal overflow px:", overflow, "| errors:", errs)
        await b.close()

asyncio.run(main())
