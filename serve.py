#!/usr/bin/env python3
"""Local server for Cortex Rush.

Plain `python -m http.server` lets the browser cache js/ and css/ aggressively,
so edits appear not to take effect and you end up chasing bugs that were
already fixed. This serves the same files with caching switched off, which
matters while iterating and costs nothing at the booth: everything is local
and the whole game is well under a megabyte.

    python serve.py          # http://localhost:8000
    python serve.py 8080     # pick a different port
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Quiet by default; a request log per sprite is noise during a demo.
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(NoCacheHandler, directory=".")
    with ThreadingHTTPServer(("", port), handler) as httpd:
        print(f"Cortex Rush running at http://localhost:{port}  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
