#!/bin/zsh
set -u
cd "$(dirname "$0")"
for PID_FILE in .server.pid .transcriber.pid; do
  if [[ -f "$PID_FILE" ]]; then
    PID="$(cat "$PID_FILE")"
    kill "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
done
if command -v tailscale >/dev/null 2>&1; then
  tailscale serve --https=443 off || true
  tailscale serve --https=8443 off || true
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale" serve --https=443 off || true
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale" serve --https=8443 off || true
fi
echo "Registratiekassa en Nederlandse transcriptieserver gestopt."
read "?Druk Enter om te sluiten."
