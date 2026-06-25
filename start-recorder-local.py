#!/usr/bin/env python3
"""Local dev launcher for Speak Lab.

Speak Lab is a Vite-powered app: `src/app.js` uses bare-specifier imports
(`from 'lamejs'`) and JSON imports, which a plain static file server cannot
resolve. This script installs dependencies if needed and starts the Vite
dev server on http://localhost:8080 — mic-safe (secure context) and with
hot reload.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_PORT = 8080

REQUIRED_PATHS = (
    "package.json",
    "vite.config.js",
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


def die(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    sys.exit(code)


def validate_project() -> None:
    missing = [p for p in REQUIRED_PATHS if not (ROOT / p).is_file()]
    if missing:
        print("Speak Lab project looks incomplete. Missing files:", file=sys.stderr)
        for path in missing:
            print(f"  - {path}", file=sys.stderr)
        sys.exit(1)


def pick_package_manager() -> list[str]:
    """Return the install command. Prefer npm (ships with Node)."""
    for pm, cmd in (
        ("npm", ["npm", "install"]),
        ("pnpm", ["pnpm", "install"]),
        ("bun", ["bun", "install"]),
        ("yarn", ["yarn", "install"]),
    ):
        if shutil.which(pm):
            return cmd
    die("Node.js is required. Install Node 18+ from https://nodejs.org and retry.")
    return []  # unreachable


def ensure_deps() -> None:
    if (ROOT / "node_modules").is_dir():
        return
    install_cmd = pick_package_manager()
    print(f"Installing dependencies: {' '.join(install_cmd)}")
    res = subprocess.run(install_cmd, cwd=ROOT)
    if res.returncode != 0:
        die("Dependency install failed. Run it manually and re-launch.")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Run Speak Lab locally via Vite.")
    p.add_argument("-p", "--port", type=int, default=DEFAULT_PORT,
                   help=f"Port to listen on (default: {DEFAULT_PORT})")
    p.add_argument("--host", default="localhost",
                   help="Bind address (default: localhost; pass 0.0.0.0 for LAN)")
    p.add_argument("--no-open", action="store_true",
                   help="Do not open a browser tab automatically")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    validate_project()
    ensure_deps()

    npx = shutil.which("npx") or shutil.which("npm")
    if not npx:
        die("npx/npm not found on PATH.")

    cmd = [npx, "vite", "--host", args.host, "--port", str(args.port)]
    url = f"http://localhost:{args.port}/"

    print()
    print("Speak Lab — Vite dev server")
    print(f"  Folder : {ROOT}")
    print(f"  Open   : {url}")
    print("  Mic requires a secure context — http://localhost is allowed.")
    print("  Stop: Ctrl+C")
    print()

    if not args.no_open and args.host in ("localhost", "127.0.0.1"):
        try:
            webbrowser.open(url)
        except OSError:
            pass

    try:
        os.chdir(ROOT)
        subprocess.run(cmd, check=False)
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
