#!/usr/bin/env python3
"""Convert the Inter OTFs the site uses into Latin-subset WOFF2 files.

Outputs sit next to the originals in styles/fonts/. Rerun after changing
a source font or if the copy starts using characters outside the ranges
below (anything missing falls back to the system font, glyph by glyph).

    pip install fonttools brotli
    python3 scripts/subset_fonts.py
"""
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "styles" / "fonts"

SOURCES = [
    "Inter-Light-BETA.otf",
    "Inter-Regular.otf",
    "Inter-Medium.otf",
    "Inter-SemiBold.otf",
    "Inter-Bold.otf",
    "Inter-Black.otf",
]

# Latin + Latin Extended-A + punctuation, arrows and the math signs the
# copy uses (≤, ×, −).
UNICODES = (
    "U+0000-00FF,U+0100-017F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,"
    "U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,"
    "U+2264-2265,U+FEFF,U+FFFD"
)


def main():
    for name in SOURCES:
        src = FONTS / name
        out = FONTS / (src.stem.replace("-BETA", "") + ".woff2")
        subset.main([
            str(src),
            f"--unicodes={UNICODES}",
            "--layout-features=*",
            "--flavor=woff2",
            f"--output-file={out}",
        ])
        print(f"{out.relative_to(ROOT)}  {src.stat().st_size // 1024}KB -> {out.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
