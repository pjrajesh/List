"""Render Listorix App Store screenshots at iPhone 6.9" (1290×2796).

Outputs PNGs to /app/screenshots/ — five marketing slides for App Store / Play Store.

Run: python3 /app/render_screenshots.py
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

OUT_DIR = Path("/app/screenshots")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TEMPLATE = "file:///app/screenshots_template.html"

# (slug, viewport_w, viewport_h) — 6.9" iPhone
SIZES = {
    "iphone_6_9":     (1290, 2796),  # iPhone 16/15/14 Pro Max — required for App Store
    "ipad_13":        (2064, 2752),  # iPad Pro M4 13" — required for App Store iPad listings
    "android_phone":  (1080, 2340),  # Google Play 9.5:19.5 phone aspect (works for most devices)
}

SLIDES = ["1", "2", "3", "4", "5"]
SLIDE_NAMES = {
    "1": "01_hero_family_list",
    "2": "02_voice_input",
    "3": "03_receipt_scan",
    "4": "04_smart_suggestions",
    "5": "05_monthly_wrap",
}


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for size_name, (w, h) in SIZES.items():
            ctx = await browser.new_context(
                viewport={"width": w, "height": h},
                device_scale_factor=1,
            )
            page = await ctx.new_page()
            await page.goto(TEMPLATE, wait_until="networkidle")
            for slide_id in SLIDES:
                # Show only the target slide
                await page.evaluate(
                    """(id) => {
                        document.querySelectorAll('.frame[data-id]').forEach(el => {
                            el.removeAttribute('data-active');
                        });
                        const tgt = document.querySelector('.frame[data-id=\"' + id + '\"]');
                        if (tgt) tgt.setAttribute('data-active', '');
                        window.scrollTo(0, 0);
                    }""",
                    slide_id,
                )
                await page.wait_for_timeout(300)
                out = OUT_DIR / f"{size_name}_{SLIDE_NAMES[slide_id]}.png"
                await page.screenshot(path=str(out), full_page=False)
                print(f"  wrote {out}  ({w}x{h})")
            await ctx.close()
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
