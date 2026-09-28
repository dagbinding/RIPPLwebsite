#!/usr/bin/env python3
"""Local preview server that behaves like Netlify.

    python3 scripts/serve.py [port]            build, then serve dist/ (default 8733)
    python3 scripts/serve.py [port] --source   serve the repo as-is, no build

- Clean URLs: /waitlist -> waitlist.html
- Range requests (HTTP 206), which browsers need to seek within video.
  Python's built-in server ignores them, so video scrubbing stalls locally.
"""
import functools
import http.server
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
RANGE = re.compile(r"bytes=(\d*)-(\d*)$")


class Handler(http.server.SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        root = Path(self.directory)
        if path != "/" and not Path(path).suffix and (root / (path.lstrip("/") + ".html")).is_file():
            self.path = path + ".html" + self.path[len(path):]

        self._range = None
        match = RANGE.match(self.headers.get("Range", "").strip())
        fs_path = self.translate_path(self.path)
        if not match or not os.path.isfile(fs_path):
            return super().send_head()

        size = os.path.getsize(fs_path)
        start, end = match.groups()
        if start == "":  # suffix range: last N bytes
            start, end = max(0, size - int(end)), size - 1
        else:
            start, end = int(start), min(int(end) if end else size - 1, size - 1)
        if start >= size or start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        f = open(fs_path, "rb")
        f.seek(start)
        self._range = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(fs_path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self._range))
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        if self._range is None:
            return super().copyfile(source, outputfile)
        remaining = self._range
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        # Always revalidate locally so rebuilds show up without a hard refresh.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    source = "--source" in sys.argv
    port = int(args[0]) if args else 8733
    if source:
        directory = ROOT
    else:
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build.py")], check=True)
        directory = DIST
    handler = functools.partial(Handler, directory=str(directory))
    print(f"Serving {'repo' if source else 'dist/'} at http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()


if __name__ == "__main__":
    main()
