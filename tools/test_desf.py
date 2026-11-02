# Studiu › Fișe: harta modulului și desfășurările punctelor ("Pe larg ›", "Deschide tot"), la 360 px, în light și dark.
# Datele reale sunt cele din src/desf/oop.md; un modul fără desfășurări (python) trebuie să arate ca înainte. Pentru C++ / TSX și termenii din glosar
# se injectează în pagină (window.PREP.desf, același obiect pe care îl citește aplicația) o desfășurare de probă la modulul frontend.
# "Întreabă despre asta" primește harta și desfășurările în context: modelul e un `sample` fals care reține cererile.
import asyncio, json, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "dist" / "pregatire-onapsis.html").as_uri()
SHOTS = ROOT / "shots"
SHOTS.mkdir(exist_ok=True)

SAMPLE = """
window.__asks = [];
const sample = (prompt, opts) => new Promise((res) => {
  window.__asks.push(prompt);
  setTimeout(() => res({ text: JSON.stringify({ on_topic: true, answer: 'Răspuns scurt.' }), truncated: false }), 20);
});
window.claude = { use: async name => (name === 'sample' ? sample : null) };
"""

# Desfășurare de probă pentru frontend: câte una pentru fiecare punct al fișei; prima are TSX și C++ (cuvinte-cheie Python în cod) și un termen din glosar.
FIXTURE = """() => {
  const n = window.PREP.sheets.frontend.points.length;
  const items = Array.from({ length: n }, (_, i) => ({ p: 'Problema ' + i, i: 'Ideea ' + i, an: 'Analogie ' + i }));
  items[0] = { p: 'Un GIL blochează aplicația.', i: 'Ideea unu.', ex: '```tsx\\nclass A { return x; }\\nconst f = (a: number) => a;\\n```',
    cpp: 'Cod C++:\\n```cpp\\nclass B { int f() { return 1; } };\\n```', nu: 'Nu ține peste tot.' };
  window.PREP.desf.frontend = { map: { p: 'Harta de probă.', g: [{ a: 1, b: n, t: 'toate' }] }, items };
  return n;
}"""

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

async def new_page(b, scheme="light", init=None):
    ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, color_scheme=scheme)
    if init: await ctx.add_init_script(init)
    pg = await ctx.new_page(); pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    pg.on("console", lambda m: pg.errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
    await pg.route("**/fonts.*", lambda r: r.abort())
    await pg.goto(PAGE); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)
    return ctx, pg

async def open_sheet(pg, mod):
    await pg.click('.tab[data-tab="study"]'); await pg.click('[data-a="seg"][data-seg="sheets"]'); await pg.wait_for_timeout(100)
    if not await pg.evaluate(f"!!document.querySelector('#sheet-{mod}[open]')"):
        await pg.evaluate(f"document.querySelector('#sheet-{mod} summary').click()"); await pg.wait_for_timeout(250)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for scheme in ["light", "dark"]:
            tag = scheme + ": "
            ctx, pg = await new_page(b, scheme, SAMPLE)
            data = await pg.evaluate("window.PREP.desf.oop")
            npts = await pg.evaluate("window.PREP.sheets.oop.points.length")
            check(tag + "the build carries the map and one explanation per point, indexed like the points", data and len(data["items"]) == npts == 12 and data["map"]["p"] and len(data["map"]["g"]) == 5)
            await open_sheet(pg, "oop")
            S = "#sheet-oop "
            state0 = await pg.evaluate("JSON.stringify(window.__prep.state())")

            # ---- closed by default ----
            check(tag + "the map button sits under the lead and the map is closed", await pg.evaluate(f"""() => {{
                const lead = document.querySelector('{S}.lead'), btn = document.querySelector('{S}[data-a="dz-map"]');
                return !!btn && /Harta modulului/.test(btn.textContent) && !!(lead.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING) && btn.getAttribute('aria-expanded') === 'false' && !document.querySelector('{S}[data-dz-map]'); }}"""))
            check(tag + "every point has a visible number and a closed 'Pe larg ›'", await pg.evaluate(f"""() => {{
                const li = [...document.querySelectorAll('{S}ul.pts > li')];
                return li.length === 12 && li.every((e, i) => e.querySelector('.pn') && e.querySelector('.pn').textContent.trim() === String(i + 1) && /Pe larg/.test(e.querySelector('[data-a="dz"]').textContent) && e.querySelector('[data-a="dz"]').getAttribute('aria-expanded') === 'false'); }}"""))
            check(tag + "no explanation is open at first; the button says 'Deschide tot'", await pg.locator(S + "[data-dz]").count() == 0 and "Deschide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())

            # ---- one point ----
            await pg.click(S + '[data-a="dz"][data-i="2"]'); await pg.wait_for_timeout(100)
            txt = await pg.locator(S + '[data-dz="2"]').inner_text()
            first = data["items"][2]["p"].replace("`", "")[:30]
            check(tag + "'Pe larg' opens the explanation of exactly that point, under it", await pg.locator(S + "[data-dz]").count() == 1 and first in txt and await pg.evaluate(f"document.querySelector('{S}ul.pts > li:nth-child(3) [data-dz=\"2\"]') !== null"), txt[:120])
            low = txt.lower()   # etichetele sunt scrise cu majuscule din CSS
            check(tag + "the labels Problema and Ideea show; fields that are missing do not", "problema" in low and "ideea" in low and "analogie" not in low)
            check(tag + "a point with a C++ comparison shows 'În C++' with 'Unde nu ține' next to it", "în c++" in low and "unde nu ține" in low and await pg.evaluate(f"!!document.querySelector('{S}[data-dz=\"2\"] .dz-cpp .dz-nu')"))
            check(tag + "the opened button is marked expanded", await pg.get_attribute(S + '[data-a="dz"][data-i="2"]', "aria-expanded") == "true")
            await pg.click(S + '[data-a="dz"][data-i="5"]'); await pg.wait_for_timeout(100)
            t5 = (await pg.locator(S + '[data-dz="5"]').inner_text()).lower()
            check(tag + "opening another keeps the first one open; a point without C++ shows no C++ block", await pg.locator(S + "[data-dz]").count() == 2 and "în c++" not in t5 and "unde nu ține" not in t5 and "exemplu" in t5)
            await pg.click(S + '[data-a="dz"][data-i="2"]'); await pg.wait_for_timeout(100)
            check(tag + "a second tap closes it", await pg.locator(S + '[data-dz="2"]').count() == 0 and await pg.locator(S + '[data-dz="5"]').count() == 1)
            check(tag + "a partly open sheet still offers 'Deschide tot'", "Deschide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())
            ex = await pg.evaluate(f"document.querySelectorAll('{S}[data-dz=\"5\"] pre.code .tk-k').length")
            check(tag + "Python examples are colored", ex > 0)
            await pg.click(S + '[data-a="dz"][data-i="5"]')

            # ---- the map ----
            await pg.click(S + '[data-a="dz-map"]'); await pg.wait_for_timeout(100)
            mt = await pg.locator(S + "[data-dz-map]").inner_text()
            check(tag + "the map shows the module's problem and every group with its range", data["map"]["p"].replace("`", "")[:30] in mt and all((f"{g['a']}–{g['b']}" if g["a"] != g["b"] else str(g["a"])) in mt for g in data["map"]["g"]), mt[:200])
            await pg.click(S + '[data-a="dz-map"]'); await pg.wait_for_timeout(100)
            check(tag + "tapping the map button again closes it", await pg.locator(S + "[data-dz-map]").count() == 0)

            # ---- open all / close all ----
            await pg.click(S + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
            check(tag + "'Deschide tot' opens the map and all 12 explanations and becomes 'Închide tot'", await pg.locator(S + "[data-dz]").count() == 12 and await pg.locator(S + "[data-dz-map]").count() == 1 and "Închide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())
            check(tag + "no horizontal overflow with everything open at 360 px", await pg.evaluate("document.documentElement.scrollWidth <= 360"), await pg.evaluate("document.documentElement.scrollWidth"))
            check(tag + "no code block or table sticks out of the sheet", await pg.evaluate(f"""() => {{ const r = document.querySelector('{S}.sheet-b').getBoundingClientRect(); return [...document.querySelectorAll('{S}pre.code')].every(e => e.getBoundingClientRect().right <= r.right + 1); }}"""))
            await pg.screenshot(path=str(SHOTS / f"desf_oop_{scheme}.png"), full_page=True)
            await pg.click(S + '[data-a="dz-all"]'); await pg.wait_for_timeout(100)
            check(tag + "'Închide tot' closes the map and every explanation", await pg.locator(S + "[data-dz]").count() == 0 and await pg.locator(S + "[data-dz-map]").count() == 0 and "Deschide tot" in await pg.locator(S + '[data-a="dz-all"]').inner_text())

            # ---- state: only in ui ----
            check(tag + "opening and closing does not touch the saved progress", await pg.evaluate("JSON.stringify(window.__prep.state())") == state0)
            check(tag + "no console errors", not pg.errs, pg.errs)

            # ---- a module without explanations looks as before ----
            await pg.evaluate(f"document.querySelector('{S}summary').click()"); await pg.wait_for_timeout(150)
            await open_sheet(pg, "python")
            P = "#sheet-python "
            npy = await pg.evaluate("window.PREP.sheets.python.points.length")
            check(tag + "python has no explanations in the data", await pg.evaluate("!window.PREP.desf.python"))
            check(tag + "a module without explanations: no numbers, no buttons, plain list", await pg.locator(P + ".pn").count() == 0 and await pg.locator(P + "[data-a^='dz']").count() == 0 and await pg.locator(P + "ul.pts > li").count() == npy)
            await ctx.close()

        # ---------- TSX / C++ without Python coloring, glossary terms (fixture on frontend) ----------
        ctx, pg = await new_page(b, "light", SAMPLE)
        n = await pg.evaluate(FIXTURE)
        await open_sheet(pg, "frontend")
        F = "#sheet-frontend "
        await pg.click(F + '[data-a="dz-all"]'); await pg.wait_for_timeout(150)
        check("fixture: all explanations open on a second module", await pg.locator(F + "[data-dz]").count() == n)
        blocks = await pg.evaluate(f"[...document.querySelectorAll('{F}[data-dz=\"0\"] pre.code')].map(e => ({{ spans: e.querySelectorAll('[class^=tk-]').length, text: e.textContent }}))")
        check("TSX and C++ blocks are shown without Python coloring", len(blocks) == 2 and all(x["spans"] == 0 for x in blocks) and "class A" in blocks[0]["text"] and "class B" in blocks[1]["text"], blocks)
        check("glossary terms are tappable inside an explanation", await pg.locator(F + '[data-dz="0"] .term').count() >= 1 and await pg.evaluate(f"document.querySelector('{F}[data-dz=\"0\"] .term').textContent") == "GIL")
        await pg.click(F + '[data-dz="0"] .term'); await pg.wait_for_timeout(200)
        check("tapping a term opens its definition", await pg.evaluate("!document.querySelector('.gsheet').hidden"))
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(100)
        await ctx.close()

        # ---------- "Întreabă despre asta" ----------
        ctx, pg = await new_page(b, "light", SAMPLE)
        await open_sheet(pg, "oop")
        S = "#sheet-oop "
        await pg.click(S + '[data-a="dz"][data-i="6"]'); await pg.wait_for_timeout(100)
        await pg.click(S + ".ask-open"); await pg.wait_for_timeout(100)
        await pg.fill(S + "[data-ask]", "Mai explică o dată."); await pg.click(S + '[data-a="ask-send"]'); await pg.wait_for_timeout(300)
        asks = await pg.evaluate("window.__asks")
        data = await pg.evaluate("window.PREP.desf.oop")
        check("ask: the request carries the map and the explanations after the points", len(asks) == 1 and "Harta modulului" in asks[0] and data["map"]["p"].replace("`", "")[:40] in asks[0].replace("`", "") and asks[0].index("Puncte:") < asks[0].index("Harta modulului"), asks[0][:400] if asks else "")
        check("ask: every explanation is in the context, numbered like the points", all(f"Punctul {i + 1}:" in asks[0] for i in range(12)) and "Unde nu ține" in asks[0])
        check("ask: the answer shows and the open explanation stays open", "Răspuns scurt." in await pg.locator(S + ".ask").inner_text() and await pg.locator(S + '[data-dz="6"]').count() == 1)
        await pg.click(S + '[data-a="ask-close"]'); await pg.wait_for_timeout(100)
        await pg.evaluate(f"document.querySelector('{S}summary').click()"); await pg.wait_for_timeout(150)
        await open_sheet(pg, "python")
        await pg.click("#sheet-python .ask-open"); await pg.wait_for_timeout(100)
        await pg.fill("#sheet-python [data-ask]", "Ce e GIL?"); await pg.click('#sheet-python [data-a="ask-send"]'); await pg.wait_for_timeout(300)
        asks = await pg.evaluate("window.__asks")
        check("ask: a sheet without explanations sends the same context as before", len(asks) == 2 and "Puncte:" in asks[1] and "Harta modulului" not in asks[1] and "Punctul 1:" not in asks[1] and "Fișa „" in asks[1], asks[1][:300] if len(asks) > 1 else "")
        await ctx.close()
        await b.close()
    print("\n" + ("ALL PASS" if not fails else f"{len(fails)} FAILED: " + "; ".join(fails)))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
