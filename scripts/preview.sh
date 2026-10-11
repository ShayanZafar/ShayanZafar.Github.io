#!/usr/bin/env sh
# Previews the site at http://localhost:4173 and opens it in your browser: a plain web server
# (Python 3) serving this folder, which is all GitHub Pages does too. Ctrl+C stops it.
# On macOS, double-click scripts/preview.command instead; it runs this.
set -e
cd "$(dirname "$0")/.."
if command -v python3 >/dev/null 2>&1; then python=python3
elif command -v python >/dev/null 2>&1; then python=python
else
  echo "Python 3 isn't installed. Install it from https://www.python.org/downloads/ (macOS: brew install python), then try again."
  exit 1
fi
url=http://localhost:4173
if command -v open >/dev/null 2>&1; then (sleep 1 && open "$url") &
elif command -v xdg-open >/dev/null 2>&1; then (sleep 1 && xdg-open "$url" >/dev/null 2>&1) &
fi
echo "Previewing the site at $url (Ctrl+C stops it)"
exec "$python" -m http.server 4173 --bind 127.0.0.1
