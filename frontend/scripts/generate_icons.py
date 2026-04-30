#!/usr/bin/env python3
"""
Generate Listorix app icon PNGs from the SVG logo.

Outputs:
  - assets/images/icon.png              1024x1024 iOS app icon (opaque, rounded shape baked in)
  - assets/images/adaptive-icon.png     1024x1024 Android adaptive foreground (transparent bg,
                                        mark centered at ~70% of canvas so Android's safe zone is respected)
  - assets/images/favicon.png           512x512 web favicon
  - assets/images/splash-image.png      1242x2688 iPhone-sized splash (bg sapphire, mark centered)
"""
import os
from io import BytesIO

import cairosvg
from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "images")
os.makedirs(OUT_DIR, exist_ok=True)

# Colors
SAPPHIRE_FROM = "#1E3A8A"
SAPPHIRE_TO   = "#3B5BBA"
GOLD          = "#B98C32"

def mark_svg(size: int, *, rounded: bool = True, background: bool = True) -> str:
    """Return an SVG string rendering the brand mark.
    Uses viewBox only (no width/height attrs) so cairosvg's output_width wins.
    """
    # viewBox coordinate space is a fixed 1024×1024 unit box; caller scales via PNG output.
    S = 1024
    r = round(S * 0.22) if rounded else 0
    stroke = max(round(S * 0.10), 3)
    # Check path in 1024x1024
    x1, y1 = 26 * (S/100), 52 * (S/100)
    x2, y2 = 46 * (S/100), 72 * (S/100)
    x3, y3 = 78 * (S/100), 34 * (S/100)
    dot_r = S * 0.048

    bg = f"""
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="{SAPPHIRE_FROM}"/>
          <stop offset="100%" stop-color="{SAPPHIRE_TO}"/>
        </linearGradient>
        <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="rgba(255,255,255,0.28)"/>
          <stop offset="60%" stop-color="rgba(255,255,255,0)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="{S}" height="{S}" rx="{r}" ry="{r}" fill="url(#bg)"/>
      <rect x="0" y="0" width="{S}" height="{S * 0.5}" rx="{r}" ry="{r}" fill="url(#glow)"/>
    """ if background else ""

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">
  {bg}
  <path d="M {x1:.2f} {y1:.2f} L {x2:.2f} {y2:.2f} L {x3:.2f} {y3:.2f}"
        stroke="#ffffff" stroke-width="{stroke}"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="{x3:.2f}" cy="{y3:.2f}" r="{dot_r:.2f}" fill="{GOLD}"/>
</svg>"""


def svg_to_png(svg: str, w: int, h: int = None) -> Image.Image:
    h = h or w
    buf = BytesIO()
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=buf,
                     output_width=w, output_height=h, dpi=96)
    buf.seek(0)
    img = Image.open(buf).convert("RGBA")
    if img.size != (w, h):
        img = img.resize((w, h), Image.LANCZOS)
    return img


# ----------------------------------------------------------------------------
# 1) iOS app icon  (1024x1024, opaque, no transparent corners — iOS handles the mask)
# ----------------------------------------------------------------------------
icon_1024 = svg_to_png(mark_svg(1024, rounded=False, background=True), 1024)
# Flatten onto a pure sapphire background so iOS mask produces clean edges
final = Image.new("RGBA", (1024, 1024), SAPPHIRE_FROM)
final.alpha_composite(icon_1024)
final.convert("RGB").save(os.path.join(OUT_DIR, "icon.png"), "PNG", optimize=True)
print(f"wrote icon.png (1024x1024)")

# ----------------------------------------------------------------------------
# 2) Android adaptive-icon foreground (1024x1024, transparent bg,
#    mark at ~60% so it fits the device circular/squircle mask with safe padding)
# ----------------------------------------------------------------------------
adaptive = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
mark_only = svg_to_png(mark_svg(612, rounded=True, background=True), 612)
# center it
adaptive.alpha_composite(mark_only, ((1024 - 612) // 2, (1024 - 612) // 2))
adaptive.save(os.path.join(OUT_DIR, "adaptive-icon.png"), "PNG", optimize=True)
print(f"wrote adaptive-icon.png (1024x1024, foreground)")

# ----------------------------------------------------------------------------
# 3) Web favicon (512x512 with rounded corners for browsers that honor PNG alpha)
# ----------------------------------------------------------------------------
favicon = svg_to_png(mark_svg(512, rounded=True, background=True), 512)
favicon.save(os.path.join(OUT_DIR, "favicon.png"), "PNG", optimize=True)
print(f"wrote favicon.png (512x512)")

# ----------------------------------------------------------------------------
# 4) Splash screen icon  (512x512 transparent PNG, used by expo-splash-screen
#    plugin with resizeMode: contain at imageWidth ~ 200 )
# ----------------------------------------------------------------------------
splash_icon = svg_to_png(mark_svg(512, rounded=True, background=True), 512)
splash_icon.save(os.path.join(OUT_DIR, "splash-icon.png"), "PNG", optimize=True)
print(f"wrote splash-icon.png (512x512)")

# ----------------------------------------------------------------------------
# 5) Full splash image — sapphire background with mark centered (optional)
# ----------------------------------------------------------------------------
SPLASH_W, SPLASH_H = 1242, 2688
splash = Image.new("RGB", (SPLASH_W, SPLASH_H), SAPPHIRE_FROM)
mark_size = 380
mark_with_bg = svg_to_png(mark_svg(mark_size, rounded=True, background=True), mark_size)
splash_rgba = splash.convert("RGBA")
splash_rgba.alpha_composite(mark_with_bg, ((SPLASH_W - mark_size) // 2, (SPLASH_H - mark_size) // 2 - 120))
splash_rgba.convert("RGB").save(os.path.join(OUT_DIR, "splash-image.png"), "PNG", optimize=True)
print(f"wrote splash-image.png ({SPLASH_W}x{SPLASH_H})")

print("\nAll icons generated.")
