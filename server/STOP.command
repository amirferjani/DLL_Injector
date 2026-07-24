#!/bin/zsh
set -u
cd "$(dirname "$0")"

# Stop eerst de watchdog, zodat hij de twee diensten niet opnieuw start terwijl
# we bewust afsluiten.
for PID_FILE in .watchdog.pid .transcriber.pid .server.pid; do
  if [[ -f "$PID_FILE" ]]; then
    PID="$(cat "$PID_FILE")"
    kill "$PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    sleep 0.3
  fi
done

if command -v tailscale >/dev/null 2>&1; then
  tailscale serve --https=443 off || true
  tailscale serve --https=8443 off || true
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale" serve --https=443 off || true
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale" serve --https=8443 off || true
fi

echo "Registratiekassa, Nederlandse transcriptieserver en watchdog gestopt."
read "?Druk Enter om te sluiten."
