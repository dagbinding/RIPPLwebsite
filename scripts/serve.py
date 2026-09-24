#!/usr/bin/env python3
"""Build, then serve dist/ the way Netlify does: /waitlist -> waitlist.html.

    python3 scripts/serve.py [port]    (default 8733)
"""
import functools
import http.server
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


class Handler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path != "/" and not Path(path).suffix and (DIST / (path.lstrip("/") + ".html")).is_file():
            self.path = path + ".html" + self.path[len(path):]
        return super().send_head()

    def end_headers(self):
        # Always revalidate locally so rebuilds show up without a hard refresh.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8733
    subprocess.run([sys.executable, str(ROOT / "scripts" / "build.py")], check=True)
    handler = functools.partial(Handler, directory=str(DIST))
    print(f"Serving dist/ at http://localhost:{port}")
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()


if __name__ == "__main__":
    main()
