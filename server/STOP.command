#!/bin/zsh
set -u
cd "$(dirname "$0")"
if [[ -f .server.pid ]]; then
  PID="$(cat .server.pid)"
  kill "$PID" 2>/dev/null || true
  rm -f .server.pid
fi
if command -v tailscale >/dev/null 2>&1; then
  tailscale serve --https=443 off || true
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale" serve --https=443 off || true
fi
echo "Registratiekassa-server gestopt."
read "?Druk Enter om te sluiten."
