#!/usr/bin/env python3
"""Generate web-sized images into assets/img/ from the full-res originals.

The originals stay untouched (they're the design masters). Pages reference
the outputs. When you swap a photo, update SOURCES and rerun:

    python3 scripts/optimize_images.py

Needs Pillow (pip install Pillow). Outputs are committed, so Netlify
doesn't need to run this.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img"

# source -> (output stem, widths, format, quality)
# Widths come from measured render sizes: full-bleed photos fill up to
# ~2000 CSS px on desktop and, on portrait phones, the full screen height
# (so they need ~2400px of width to stay sharp at 2x).
SOURCES = {
    "assets/follow_hd_corrected.jpg": ("hero", [2400, 3200], "webp", 78),
    "uploads/IMG_7307.jpeg":          ("social-1", [1600, 2400], "webp", 78),
    "uploads/P1040672_dg.jpeg":       ("social-2", [1600, 2400, 3200], "webp", 78),
    "assets/photo-sunset-lineup.jpg": ("cta-sunset", [1536], "webp", 74),
    "assets/photo-waxing-board.jpg":  ("signup-waxing", [1536], "webp", 68),  # shown at 45% opacity
    "assets/sensor-board-tail.png":   ("sensor-board-tail", [768], "webp", 82),
    "assets/watch-app.png":           ("watch-app", [600], "webp", 85),
    "assets/logo-wordmark-white.png": ("logo-wordmark-white", [1280], "png", None),
    "assets/loader-loop.png":         ("loader-loop", [320], "png", None),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for src, (stem, widths, fmt, quality) in SOURCES.items():
        im = Image.open(ROOT / src)
        im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        for w in widths:
            w = min(w, im.width)
            h = round(im.height * w / im.width)
            out = OUT / f"{stem}-{w}.{fmt}"
            resized = im.resize((w, h), Image.LANCZOS)
            if fmt == "webp":
                resized.save(out, "WEBP", quality=quality, method=6)
            else:
                resized.save(out, "PNG", optimize=True)
            print(f"{out.relative_to(ROOT)}  {w}x{h}  {out.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
