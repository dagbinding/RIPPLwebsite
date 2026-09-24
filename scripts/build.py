#!/usr/bin/env python3
"""Build the public site into dist/.

Netlify used to publish the repo root, which exposed test pages, CLAUDE.md,
uploads/ and other working files. This copies only an allowlist, pulls in
any uploads/ files the published pages actually reference, then fails the
build if any local reference is missing.

Run locally:  python3 scripts/build.py
"""
import json
import re
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

# Pages and root files served at ripplsurf.com.
PAGES = ["index.html", "waitlist.html"]
ROOT_FILES = ["robots.txt", "sitemap.xml", "favicon.ico"]
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


FAQ_MARKER = "<!-- build:faq-jsonld -->"


class FaqParser(HTMLParser):
    """Collects (question, answer) text from <summary class="faq__q"> / <div class="faq__a">."""

    def __init__(self):
        super().__init__()
        self.items, self.mode, self.depth, self.buf = [], None, 0, []

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get("class") or ""
        if self.mode:
            self.depth += 1
            if tag == "p" and self.buf:
                self.buf.append(" ")
        elif "faq__q" in cls.split() or "faq__a" in cls.split():
            self.mode, self.depth, self.buf = ("q" if "faq__q" in cls else "a"), 1, []

    def handle_endtag(self, tag):
        if not self.mode:
            return
        self.depth -= 1
        if self.depth == 0:
            text = " ".join("".join(self.buf).split())
            if self.mode == "q":
                self.items.append([text, None])
            elif self.items:
                self.items[-1][1] = text
            self.mode = None

    def handle_data(self, data):
        if self.mode:
            self.buf.append(data)


def faq_jsonld(html):
    """FAQPage JSON-LD built from the visible FAQ, so the two never drift."""
    parser = FaqParser()
    parser.feed(html)
    items = [(q, a) for q, a in parser.items if q and a]
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in items
        ],
    }
    return '<script type="application/ld+json">\n' + json.dumps(data, indent=2, ensure_ascii=False) + "\n</script>", len(items)


def resolve(base, ref):
    """Root-relative refs ("/favicon.ico") resolve from the site root."""
    return ((DIST / ref.lstrip("/")) if ref.startswith("/") else (base / ref)).resolve()


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    ignore = shutil.ignore_patterns(".DS_Store")
    for name in PAGES + ROOT_FILES:
        shutil.copy2(ROOT / name, DIST / name)
    for name in PAGES:
        page = DIST / name
        html = page.read_text(encoding="utf-8")
        if FAQ_MARKER in html:
            tag, count = faq_jsonld(html)
            if not count:
                sys.exit(f"Build failed: {name} has a FAQ marker but no FAQ items")
            page.write_text(html.replace(FAQ_MARKER, tag), encoding="utf-8")
            print(f"{name}: FAQPage JSON-LD with {count} questions")
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
            rel = resolve(base, ref).relative_to(DIST)
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
            target = resolve(base, ref)
            if ref.endswith("/"):
                target = target / "index.html"
            elif not target.suffix and target.with_suffix(".html").exists():
                target = target.with_suffix(".html")  # clean URL, e.g. /waitlist
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
