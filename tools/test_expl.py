# Checks the two-level explanation, glossary sheet, "Am ghicit" and the review screen at phone size.
import asyncio, pathlib, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

async def goto_q(pg, target, mod):
    await pg.click('.tab[data-tab="quiz"]')
    await pg.click(f'[data-a="mcq-mod"][data-m="{mod}"]'); await pg.wait_for_timeout(100)
    for _ in range(20):
        if (await pg.inner_text('.chip.acc')).strip() == target: return True
        await pg.click('[data-a="dunno"]'); await pg.click('[data-a="next"]'); await pg.wait_for_timeout(40)
    return False

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 360, "height": 760}, device_scale_factor=2)
        pg = await ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        await pg.route("**/fonts.*", lambda r: r.abort())
        await pg.goto(PAGE); await pg.wait_for_timeout(300)

        # 1) wrong answer on py-01 -> lead, scop, mecanism, "De ce nu", "Arată-mi concret"
        print("found PY-01:", await goto_q(pg, "PY-01", "python"))
        wrong_pos = await pg.evaluate("""() => { const q = window.PREP.mcq.find(x => x.id === 'py-01'); const btns = [...document.querySelectorAll('.opt')];
            return btns.findIndex(b => !b.textContent.includes(q.o[q.a])); }""")
        await pg.click(f'.opt >> nth={wrong_pos}'); await pg.wait_for_timeout(700)
        s1 = await pg.evaluate("""() => ({ lead: !!document.querySelector('.xp-lead'), heads: [...document.querySelectorAll('#fb .xp-h')].map(e => e.textContent),
            more: !!document.querySelector('[data-a=xp-more]'), terms: [...document.querySelectorAll('#fb .term')].map(e => e.textContent) })""")
        print("collapsed:", json.dumps(s1, ensure_ascii=False))
        await pg.screenshot(path=str(SHOTS / "x1-collapsed.png"))
        await pg.click('[data-a="xp-more"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-a="xp-intv"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="xp-ver"]'); await pg.wait_for_timeout(100)
        s2 = await pg.evaluate("""() => ({ heads: [...document.querySelectorAll('#fb .xp-h')].map(e => e.textContent), code: document.querySelectorAll('#fb pre.code').length,
            alts: document.querySelectorAll('#fb .xp-alt').length, verA: !!document.querySelector('.ver-a') })""")
        print("expanded:", json.dumps(s2, ensure_ascii=False))
        await pg.evaluate("document.querySelector('#fb').scrollIntoView()")
        await pg.screenshot(path=str(SHOTS / "x2-expanded.png"), full_page=True)

        # 2) glossary sheet from a term in the explanation; "Vezi și" chip; Escape closes
        t = await pg.query_selector('#fb .term')
        if t:
            name = await t.inner_text(); await t.click(); await pg.wait_for_timeout(250)
            sh = await pg.evaluate("""() => ({ open: !document.querySelector('.gsheet').hidden, title: document.querySelector('#gs-t') && document.querySelector('#gs-t').textContent,
                see: [...document.querySelectorAll('.gs-body button.chip')].map(e => e.textContent) })""")
            print("term", name, "->", json.dumps(sh, ensure_ascii=False))
            await pg.screenshot(path=str(SHOTS / "x3-term.png"))
            chip = await pg.query_selector('.gs-body button.chip')
            if chip: await chip.click(); await pg.wait_for_timeout(150); print("vezi și ->", await pg.inner_text('#gs-t'))
            await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
            print("closed with Escape:", await pg.evaluate("document.querySelector('.gsheet').hidden"))

        # 3) "Am ghicit" on a correct answer (py-02), then finish and look at the review
        await pg.click('[data-a="next"]'); await pg.wait_for_timeout(80)
        for _ in range(15):
            if (await pg.inner_text('.chip.acc')).strip() == "PY-02": break
            await pg.click('[data-a="dunno"]'); await pg.click('[data-a="next"]'); await pg.wait_for_timeout(40)
        right_pos = await pg.evaluate("""() => { const q = window.PREP.mcq.find(x => x.id === 'py-02'); const btns = [...document.querySelectorAll('.opt')];
            return btns.findIndex(b => b.textContent.includes(q.o[q.a])); }""")
        await pg.click(f'.opt >> nth={right_pos}'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="guess"]'); await pg.wait_for_timeout(150)
        st = await pg.evaluate("() => window.__prep.state().q['py-02']")
        print("after 'Am ghicit':", json.dumps(st), "| note:", await pg.inner_text('.fb-note'))
        await pg.click('[data-a="quit"]'); await pg.click('[data-a="quit"]'); await pg.wait_for_timeout(200)
        rv = await pg.evaluate("""() => ({ score: document.querySelector('.score h2').textContent, rev: [...document.querySelectorAll('details.rev .chip.bad')].map(e => e.textContent) })""")
        print("result:", json.dumps(rv))
        await pg.evaluate("""() => { const d = [...document.querySelectorAll('details.rev')].find(x => x.textContent.includes('PY-01')); if (d) d.open = true; }""")
        await pg.wait_for_timeout(100)
        await pg.screenshot(path=str(SHOTS / "x4-review.png"), full_page=True)

        # 4) glossary in Studiu
        await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="gloss"]'); await pg.wait_for_timeout(150)
        print("glossary rows:", await pg.evaluate("document.querySelectorAll('.glrow').length"))
        await pg.screenshot(path=str(SHOTS / "x5-gloss.png"))
        # 5) dark mode: open a term from the glossary
        await pg.emulate_media(color_scheme="dark")
        await pg.click('.glrow >> nth=3'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=str(SHOTS / "x6-term-dark.png"))
        await pg.keyboard.press("Escape")
        overflow = await pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        print("overflow:", overflow, "| errors:", errs)
        await b.close()
asyncio.run(main())
