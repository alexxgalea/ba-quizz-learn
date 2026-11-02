# PWA: the page served from dist/app is installable (manifest, icons), registers its service worker, works offline, and the artifact build stays free of PWA parts.
import asyncio, json, pathlib, subprocess, time, urllib.request
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "dist" / "app"
PORT = 8773
URL = f"http://localhost:{PORT}/"

fails = []
def check(name, ok, extra=""):
    print(("PASS " if ok else "FAIL ") + name + (" " + str(extra) if extra and not ok else ""))
    if not ok: fails.append(name)

def get(path):
    with urllib.request.urlopen(URL + path) as r: return r.status, r.headers.get("content-type", ""), r.read()

async def main():
    srv = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--directory", str(APP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        st, ct, body = get("")
        html = body.decode("utf-8")
        check("index.html is a full document in Romanian with a manifest link and a viewport", html.lstrip().lower().startswith("<!doctype html>") and 'lang="ro"' in html and 'rel="manifest"' in html and 'name="viewport"' in html)
        st, ct, body = get("manifest.webmanifest")
        m = json.loads(body)
        sizes = {i["sizes"] for i in m.get("icons", [])}
        check("the manifest names the app, opens standalone and has 192 and 512 icons", st == 200 and m["name"] and m["short_name"] and m["display"] == "standalone" and m["start_url"] == "./" and {"192x192", "512x512"} <= sizes and m["theme_color"] and m["lang"] == "ro", m)
        for icon in m["icons"]:
            st, ct, body = get(icon["src"])
            w = int.from_bytes(body[16:20], "big")
            check("icon " + icon["src"] + " is a PNG of " + icon["sizes"], st == 200 and body[:8] == b"\x89PNG\r\n\x1a\n" and f"{w}x{w}" == icon["sizes"], (st, w))
        st, ct, _ = get("sw.js")
        check("the service worker is served as JavaScript", st == 200 and "javascript" in ct, ct)

        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(viewport={"width": 360, "height": 740})
            pg = await ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "fonts" not in m.text and "Failed to load resource" not in m.text else None)
            await pg.route("**/fonts.*", lambda r: r.abort())
            await pg.goto(URL); await pg.evaluate("localStorage.clear()")
            ok = await pg.evaluate("navigator.serviceWorker.ready.then(r => !!r.active)")
            check("the service worker registers and becomes active", ok is True)
            await pg.reload(); await pg.wait_for_timeout(500)
            check("after a reload the page is controlled by it", await pg.evaluate("!!navigator.serviceWorker.controller"))
            await ctx.set_offline(True)
            await pg.reload(); await pg.wait_for_timeout(500)
            check("offline the app still opens", await pg.locator("#main").inner_text() != "" and await pg.locator(".tab").count() == 6)
            await pg.click('.tab[data-tab="jarvis"]'); await pg.wait_for_timeout(150)
            check("offline the Jarvis tab shows the key setup", await pg.locator("#jv-key").count() == 1)
            await ctx.set_offline(False)
            check("no page errors", not errs, errs)
            await b.close()

        art = (ROOT / "dist" / "pregatire-onapsis.html").read_text(encoding="utf-8")
        check("the artifact build has no manifest and no service worker", 'rel="manifest"' not in art and "serviceWorker.register" not in art)
    finally:
        srv.terminate()
    print("\nALL OK" if not fails else "\nFAILED: " + str(fails))
    raise SystemExit(1 if fails else 0)

asyncio.run(main())
