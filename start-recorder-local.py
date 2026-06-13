#!/usr/bin/env python3
"""Local dev server for Speak Lab.

Serves the static site from the repo root so the microphone works
(secure context: http://localhost or http://127.0.0.1 — not file://).
"""

from __future__ import annotations

import argparse
import socket
import sys
import webbrowser
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000

REQUIRED_PATHS = (
    "index.html",
    "src/app.js",
    "src/recorder.js",
    "src/vault.js",
    "src/styles.css",
    "src/data/jam.json",
    "src/data/tongue-twisters.json",
    "src/data/impromptu.json",
    "src/data/interview.json",
)


class ReuseHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


class SpeakLabHandler(SimpleHTTPRequestHandler):
    """Static file handler tuned for local Speak Lab development."""

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.endswith((".js", ".css", ".json", ".html")) or path in ("", "/"):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        if self.command == "GET" and str(args[1]) == "200":
            return
        super().log_message(format, *args)


def validate_project() -> None:
    missing = [p for p in REQUIRED_PATHS if not (ROOT / p).is_file()]
    if missing:
        print("Speak Lab project looks incomplete. Missing files:", file=sys.stderr)
        for path in missing:
            print(f"  - {path}", file=sys.stderr)
        sys.exit(1)


def find_free_port(host: str, start: int, attempts: int = 50) -> int:
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
            except OSError:
                continue
            return port
    raise SystemExit(f"No free port found in range {start}-{start + attempts - 1}")


def local_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Speak Lab locally (JAM, Tongue, Impromptu, Interview, Free).",
    )
    parser.add_argument(
        "-p", "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Port to listen on (default: {DEFAULT_PORT})",
    )
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"Bind address (default: {DEFAULT_HOST}; use 0.0.0.0 for LAN)",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not open a browser tab automatically",
    )
    parser.add_argument(
        "--find-port",
        action="store_true",
        help="Pick the next free port if the requested one is busy",
    )
    return parser.parse_args()


def start_server(host: str, port: int) -> ReuseHTTPServer:
    handler = partial(SpeakLabHandler, directory=str(ROOT))
    try:
        return ReuseHTTPServer((host, port), handler)
    except OSError as exc:
        raise SystemExit(f"Cannot bind {host}:{port} — {exc}") from exc


def main() -> None:
    args = parse_args()
    validate_project()

    host = args.host
    port = args.port

    try:
        httpd = start_server(host, port)
    except SystemExit:
        if not args.find_port:
            print("Tip: rerun with --find-port to use the next available port.", file=sys.stderr)
            raise
        port = find_free_port(host, port)
        httpd = start_server(host, port)

    local_url = f"http://127.0.0.1:{port}/"

    print()
    print("Speak Lab — local server")
    print(f"  Folder : {ROOT}")
    print(f"  Open   : {local_url}")
    if host == "0.0.0.0":
        ip = local_ip()
        if ip:
            print(f"  LAN    : http://{ip}:{port}/")
            print("           (mic over LAN may need HTTPS on some phones)")

    print()
    print("  Mic works on http://localhost:8000/ and http://127.0.0.1:8000/ only.")
    print("  Do not open index.html via file://")
    print("  MP3 encoding loads lamejs from the CDN — internet needed once.")
    print("  Edit src/data/*.json then refresh the page to see changes.")
    print("  Stop: Ctrl+C")
    print()

    if not args.no_open and host in ("127.0.0.1", "localhost"):
        try:
            webbrowser.open(local_url)
        except OSError:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        httpd.shutdown()


if __name__ == "__main__":
    main()
