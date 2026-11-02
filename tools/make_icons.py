"""Randează src/pwa/icon.svg în icon-192.png și icon-512.png (rulezi o singură dată; PNG-urile se comit). Folosește Chromium din Playwright."""
import pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
svg = (ROOT / "src/pwa/icon.svg").read_text(encoding="utf-8")
with sync_playwright() as p:
    b = p.chromium.launch()
    for size in (192, 512):
        pg = b.new_page(viewport={"width": size, "height": size})
        pg.set_content(f'<body style="margin:0">{svg.replace("<svg ", f"<svg width=%d height=%d " % (size, size), 1)}</body>')
        pg.screenshot(path=str(ROOT / f"src/pwa/icon-{size}.png"))
    b.close()
print("ok")
