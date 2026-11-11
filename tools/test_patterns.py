# Checks Studiu › Pattern-uri: the segment, the "how to choose" table, every pattern with its fields (problem, why, when, when not,
# interview sentence) and code that fits 360 px, the confusions with bold names, the open state surviving a re-render,
# the practice button (5 oral cards o-pat-*, with the interviewer when `sample` exists) and the PWA link in the artifact.
import asyncio, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)
SAMPLE = "window.claude = { use: async name => (name === 'sample' ? (async () => ({ text: '{}' })) : null) };"

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ["light", "dark"]:
            ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, color_scheme=scheme)
            await ctx.add_init_script(SAMPLE)
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
            await pg.route("**/fonts.*", lambda r: r.abort())
            await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
            await pg.click('.tab[data-tab="study"]'); await pg.click('button[data-a="seg"][data-seg="patterns"]'); await pg.wait_for_timeout(100)
            if scheme == "light":
                D = await pg.evaluate("window.PREP.extra.patterns")
                n = len(D["items"])
                check("segment shows every pattern, collapsed", await pg.locator('details.pat').count() == n and n >= 12 and await pg.locator('details.pat[open]').count() == 0, n)
                check("how-to-choose table: one row per problem", await pg.locator('.pat-pick .pair').count() == len(D["pick"]))
                check("confusions rendered, names in bold, no stray asterisks", await pg.locator('.pat-conf').count() == len(D["conf"]) and await pg.locator('.pat-conf b').count() >= 8 and "**" not in await pg.inner_text('#main'))
                await pg.click('details.pat[data-k="pat:adapter"] > summary'); await pg.wait_for_timeout(80)
                body = await pg.inner_text('details.pat[data-k="pat:adapter"]')
                check("an open pattern has problem, why, when, when not, code, React/TS, link, interview", all(x in body.upper() for x in ["PROBLEMA", "DE CE", "CÂND", "CÂND NU", "ÎN REACT / TS", "LEGĂTURĂ", "LA INTERVIU"]) and await pg.locator('details.pat[data-k="pat:adapter"] pre.code').count() == 1, body[:200])
                wide = await pg.evaluate("[...document.querySelectorAll('details.pat pre.code')].filter(e => e.scrollWidth > e.clientWidth + 1).length")
                check("no code block scrolls sideways at 360 px", wide == 0, wide)
                await pg.evaluate("window.__prep.setState(window.__prep.state())"); await pg.click('.tab[data-tab="study"]'); await pg.wait_for_timeout(80)
                check("the open pattern stays open after a re-render", await pg.locator('details.pat[data-k="pat:adapter"][open]').count() == 1)
                await pg.screenshot(path=str(SHOTS / "pat1-adapter.png"), full_page=True)
                await pg.click('[data-a="pat-oral"] >> nth=0'); await pg.wait_for_timeout(100)
                run = await pg.evaluate("(() => { const s = window.__prep.state(); return null; })()")
                q = await pg.inner_text('.icard-q')
                ids = await pg.evaluate("window.PREP.oral.filter(c => c.id.startsWith('o-pat-')).map(c => c.q.replace(/`/g, ''))")
                check("practice: an oral run over the 5 pattern cards, interviewer offered", len(ids) == 5 and any(q.replace("\n", " ").strip() == x for x in ids) and "1/5" in await pg.inner_text('.eyebrow') and await pg.locator('[data-a="iv-start"]').count() == 1, q)
                await pg.click('.tab[data-tab="study"]'); await pg.wait_for_timeout(50)
                await pg.click('button[data-a="seg"][data-seg="sheets"]'); await pg.wait_for_timeout(50)
                await pg.click('details.sheet[data-m="asyncio"] > summary'); await pg.wait_for_timeout(100)
                href = await pg.get_attribute('#sheet-asyncio a[data-lesson-link]', "href")
                check("the PWA link points to the live address (/docs/app/)", href == "https://alexxgalea.github.io/ba-quizz-learn/docs/app/", href)
            else:
                await pg.click('details.pat[data-k="pat:strategy"] > summary'); await pg.wait_for_timeout(80)
                await pg.screenshot(path=str(SHOTS / "pat2-strategy-dark.png"), full_page=True)
            check("no console errors (" + scheme + ")", not errs, errs)
            await ctx.close()
        await b.close()
    print("\n" + ("OK" if not fails else "FAILED: " + ", ".join(fails)))
    if fails: raise SystemExit(1)

asyncio.run(main())
