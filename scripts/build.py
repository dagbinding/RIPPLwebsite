#!/usr/bin/env python3
"""Build the public site into dist/.

Netlify used to publish the repo root, which exposed test pages, CLAUDE.md,
uploads/ and other working files. This copies only an allowlist, pulls in
any uploads/ files the published pages actually reference, then fails the
build if any local reference is missing.

Run locally:  python3 scripts/build.py
"""
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# Pages and root files served at ripplsurf.com.
PAGES = ["index.html", "Tester Signup.html"]
ROOT_FILES = ["robots.txt", "sitemap.xml"]
# Folders published whole.
DIRS = ["assets", "styles"]
# Folders whose files are published only when a page references them.
ON_DEMAND = ["uploads"]

REF = re.compile(r"""(?:src|href|poster)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)""")


def local_refs(text):
    for m in REF.finditer(text):
        ref = unquote((m.group(1) or m.group(2)).strip())
        parsed = urlparse(ref)
        if parsed.scheme or ref.startswith(("#", "//", "data:", "mailto:", "tel:")):
            continue
        if parsed.path:
            yield parsed.path


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    ignore = shutil.ignore_patterns(".DS_Store")
    for name in PAGES + ROOT_FILES:
        shutil.copy2(ROOT / name, DIST / name)
    for name in DIRS:
        shutil.copytree(ROOT / name, DIST / name, ignore=ignore)

    # Refs resolve against the file itself, except in scripts, which run on
    # (root-level) pages.
    scanned = [(DIST / p, DIST) for p in PAGES]
    scanned += [(f, f.parent) for f in (DIST / "styles").glob("*.css")]
    scanned += [(f, DIST) for f in (DIST / "assets").glob("*.js")]

    # Copy referenced on-demand files.
    for f, base in scanned:
        for ref in local_refs(f.read_text(encoding="utf-8")):
            rel = (base / ref).resolve().relative_to(DIST)
            if rel.parts and rel.parts[0] in ON_DEMAND:
                src = ROOT / rel
                if src.is_file():
                    (DIST / rel).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, DIST / rel)

    # Fail if the allowlist dropped a file a page needs. Refs that are
    # already broken in the repo are only warned about.
    dropped, broken = [], []
    for f, base in scanned:
        for ref in local_refs(f.read_text(encoding="utf-8")):
            target = (base / ref).resolve()
            if ref.endswith("/"):
                target = target / "index.html"
            if not target.exists():
                line = f"{f.relative_to(DIST)} -> {ref}"
                (dropped if (ROOT / target.relative_to(DIST)).exists() else broken).append(line)
    if broken:
        print(f"Warning: {len(broken)} references missing from the repo too (already broken):\n  " + "\n  ".join(broken))
    if dropped:
        print("Build failed, referenced files not published (add them to the allowlist):\n  " + "\n  ".join(dropped), file=sys.stderr)
        sys.exit(1)

    size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    count = sum(1 for p in DIST.rglob("*") if p.is_file())
    print(f"Built dist/: {count} files, {size / 1e6:.1f}MB")


if __name__ == "__main__":
    main()
