"""
ローカルで動作確認するための簡易サーバー。
本番（GitHub Pages）と同じく http://localhost:8080/kokorotype/ の下でアプリを配信し、
ファイル名の大文字・小文字も区別します（Windows のままだと区別されず、公開後に初めて404になるのを防ぐため）。

使い方（リポジトリのルートで実行）:
    python tools/serve.py            → http://localhost:8080/kokorotype/ を開く
    python tools/serve.py 8000       → ポート番号を指定
    python tools/serve.py --pages    → GitHub Pages と同じキャッシュ設定（10分）で配信（更新の確認用）
停止: Ctrl + C
"""
import functools
import http.server
import os
import pathlib
import sys
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
PREFIX = "/kokorotype/"

TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".md": "text/plain; charset=utf-8",
}


def exists_exact(rel):
    """大文字・小文字まで一致するファイル／フォルダがあるか（隠しフォルダは公開しない）。"""
    d = ROOT
    for part in [p for p in rel.split("/") if p]:
        if part in (".", "..") or (part.startswith(".") and part != ".nojekyll"):
            return False
        try:
            names = os.listdir(d)
        except OSError:
            return False
        if part not in names:
            return False
        d = d / part
    return True


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **TYPES}
    cache_control = "no-cache"

    def _route(self):
        """/kokorotype/ 以外への案内と、見つからないファイルの404。処理したら True を返す。"""
        path = urllib.parse.urlsplit(self.path).path
        if path in ("", "/"):
            return self._redirect(PREFIX, 302)
        if path == PREFIX.rstrip("/"):
            return self._redirect(PREFIX, 301)  # GitHub Pages と同じく /kokorotype → /kokorotype/
        if not path.startswith(PREFIX) or not exists_exact(urllib.parse.unquote(path[len(PREFIX):])):
            self.send_error(404, "File not found")
            return True
        return False

    def _redirect(self, location, code):
        self.send_response(code)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()
        return True

    def do_GET(self):
        if not self._route():
            super().do_GET()

    def do_HEAD(self):
        if not self._route():
            super().do_HEAD()

    def translate_path(self, path):
        path = urllib.parse.urlsplit(path).path
        rel = urllib.parse.unquote(path[len(PREFIX):]) if path.startswith(PREFIX) else ""
        return str(ROOT.joinpath(*[p for p in rel.split("/") if p not in ("", ".", "..")]))

    def list_directory(self, path):
        # GitHub Pages と同じく、フォルダの中身の一覧は出さない
        self.send_error(404, "File not found")
        return None

    def end_headers(self):
        self.send_header("Cache-Control", self.cache_control)
        super().end_headers()


def main():
    args = sys.argv[1:]
    port = next((int(a) for a in args if a.isdigit()), 8080)
    if "--pages" in args:
        Handler.cache_control = "max-age=600"
    handler = functools.partial(Handler, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"http://localhost:{port}{PREFIX} で配信中です（停止は Ctrl + C）", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
