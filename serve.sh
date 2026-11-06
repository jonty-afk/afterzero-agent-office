#!/bin/sh
set -eu
cd "$(dirname "$0")"
PORT="${PORT:-8848}"
echo "Agent Office demo: http://127.0.0.1:${PORT}/"
echo "Reel Mode:       http://127.0.0.1:${PORT}/reel.html"
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory public
