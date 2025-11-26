"""Simple dev server that serves the frontend and LinusService API."""

from __future__ import annotations

import json
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Any

from linus_app import LinusService
import os

ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
API_PREFIX = "/api"

service = LinusService()


class LinusHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        if self.path.startswith(f"{API_PREFIX}/grids"):
            self._handle_grids_get()
            return
        if self.path.startswith(f"{API_PREFIX}/segments/") and self.path.endswith("/log"):
            segment_id = self.path.split("/")[-2]
            payload = service.get_segment_log(segment_id)
            self._send_json(payload)
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        if self.path == f"{API_PREFIX}/segments":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            payload = json.loads(body or "{}")
            response = service.post_segments(payload)
            self._send_json(response)
            return
        super().do_POST()

    def _handle_grids_get(self) -> None:
        parts = self.path.split("/")
        if len(parts) == 4 and parts[-1].isdigit():
            grid_id = int(parts[-1])
            try:
                payload = service.get_grid(grid_id)
            except KeyError:
                self._send_json({"error": "grid not found"}, status=404)
                return
        else:
            payload = service.get_all_grids()
        self._send_json(payload)

    def _send_json(self, payload: Any, status: int = 200) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def run(host: str = "0.0.0.0", port: int | None = None) -> None:
    actual_port = port or int(os.getenv("PORT", "8000"))
    httpd = ThreadingHTTPServer((host, actual_port), LinusHandler)
    print(f"Serving frontend + API on http://{host}:{actual_port}")
    httpd.serve_forever()


if __name__ == "__main__":
    run()
