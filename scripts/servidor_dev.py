"""Servidor local de desenvolvimento com recarregamento automático.

Uso:
    python scripts/servidor_dev.py

O servidor mantém o site estático como está e injeta um pequeno cliente de
recarregamento apenas nas páginas HTML servidas durante o desenvolvimento.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RELOAD_ENDPOINT = "/__bena_live_reload__"
IGNORED_DIRECTORIES = {".git", ".codex", ".agents", "node_modules"}
POLL_INTERVAL_MS = 500

RELOAD_SCRIPT = f"""<script>
(() => {{
  const endpoint = '{RELOAD_ENDPOINT}';
  let currentVersion = null;
  let timer = null;

  async function checkForChanges() {{
    try {{
      const response = await fetch(endpoint, {{ cache: 'no-store' }});
      if (!response.ok) throw new Error('reload check failed');
      const nextVersion = await response.text();
      if (currentVersion !== null && nextVersion !== currentVersion) {{
        window.location.reload();
        return;
      }}
      currentVersion = nextVersion;
    }} catch (_error) {{
      // The server may be restarting; try again on the next interval.
    }}
    timer = window.setTimeout(checkForChanges, {POLL_INTERVAL_MS});
  }}

  window.addEventListener('beforeunload', () => window.clearTimeout(timer), {{ once: true }});
  checkForChanges();
}})();
</script>""".encode("utf-8")


class ChangeTracker:
    """Detect file changes without adding a third-party dependency."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self._lock = threading.Lock()
        self._snapshot = self._take_snapshot()
        self._version = 0

    def _take_snapshot(self) -> dict[str, tuple[int, int]]:
        snapshot: dict[str, tuple[int, int]] = {}
        for directory, directory_names, file_names in os.walk(self.root):
            directory_names[:] = [
                name for name in directory_names if name not in IGNORED_DIRECTORIES
            ]
            directory_path = Path(directory)
            for name in file_names:
                path = directory_path / name
                try:
                    stat = path.stat()
                except OSError:
                    continue
                relative_path = path.relative_to(self.root).as_posix()
                snapshot[relative_path] = (stat.st_mtime_ns, stat.st_size)
        return snapshot

    def version(self) -> int:
        with self._lock:
            snapshot = self._take_snapshot()
            if snapshot != self._snapshot:
                self._snapshot = snapshot
                self._version += 1
            return self._version


class DevelopmentRequestHandler(SimpleHTTPRequestHandler):
    """Serve the project and inject the reload client into HTML responses."""

    tracker: ChangeTracker

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    def do_GET(self) -> None:  # noqa: N802 - name required by BaseHTTPRequestHandler
        request_path = urlsplit(self.path).path
        if request_path == RELOAD_ENDPOINT:
            self._send_reload_version()
            return
        super().do_GET()

    def send_head(self):
        request_path = urlsplit(self.path).path
        file_path = Path(self.translate_path(request_path))
        if file_path.is_dir() and (file_path / "index.html").is_file():
            file_path = file_path / "index.html"
        if file_path.is_file() and file_path.suffix.lower() == ".html":
            try:
                content = file_path.read_bytes()
            except OSError:
                self.send_error(404, "File not found")
                return None

            marker = b"<!-- BENA_LIVE_RELOAD -->"
            if marker not in content and b"</body>" in content.lower():
                content = content.replace(
                    b"</body>", marker + RELOAD_SCRIPT + b"</body>", 1
                )

            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return io.BytesIO(content)

        return super().send_head()

    def _send_reload_version(self) -> None:
        payload = json.dumps(self.tracker.version()).encode("ascii")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args) -> None:
        if urlsplit(self.path).path == RELOAD_ENDPOINT:
            return
        super().log_message(format, *args)


def main() -> None:
    parser = argparse.ArgumentParser(description="Servidor local Bena Studies com live reload")
    parser.add_argument("--host", default="127.0.0.1", help="endereço de escuta")
    parser.add_argument("--port", type=int, default=8765, help="porta de escuta")
    args = parser.parse_args()

    tracker = ChangeTracker(PROJECT_ROOT)
    handler = DevelopmentRequestHandler
    handler.tracker = tracker
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Bena Studies em http://localhost:{args.port}/")
    print("Atualização automática ativada. Pressione Ctrl+C para encerrar.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
