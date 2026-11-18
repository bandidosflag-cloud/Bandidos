"""Servidor local para probar la app sin caché:  python scripts/servidor_dev.py  ->  http://localhost:5173"""
import functools
import http.server
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / "app"


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(SinCache, directory=str(RAIZ))
    print("Bandidos en http://localhost:5173")
    http.server.ThreadingHTTPServer(("", 5173), handler).serve_forever()
