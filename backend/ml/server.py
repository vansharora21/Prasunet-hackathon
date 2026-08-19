"""GraphSentinel ML — HTTP server entry point."""

from __future__ import annotations

import json
import os
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

from .constants import utc_now
from .inference import infer_alerts
from .training import retrain

PORT = int(os.getenv("ML_PORT", "8790"))


class Handler(BaseHTTPRequestHandler):
    def _send(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self._send(204, {})

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path == "/health":
            self._send(200, {"ok": True, "service": "graphsentinel-ml", "timestamp": utc_now()})
            return
        self._send(404, {"error": "Not found"})

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            self._send(400, {"error": "Invalid JSON"})
            return

        try:
            if path == "/analyze":
                self._send(200, infer_alerts(body))
                return
            if path == "/retrain":
                self._send(200, retrain(body))
                return
            self._send(404, {"error": "Not found"})
        except Exception as exc:
            err_str = traceback.format_exc()
            self._send(500, {"error": err_str})


def main() -> None:
    server = HTTPServer(("127.0.0.1", PORT), Handler)
    print(f"GraphSentinel ML service listening on http://127.0.0.1:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
