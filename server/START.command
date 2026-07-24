#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8765}"
TS=""
PY=""

if command -v tailscale >/dev/null 2>&1; then
  TS="$(command -v tailscale)"
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  TS="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
else
  echo "Tailscale werd niet gevonden. Open Tailscale één keer en installeer de CLI-koppeling indien gevraagd."
  read "?Druk Enter om te sluiten."
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3)"
elif [[ -x "/usr/bin/python3" ]]; then
  PY="/usr/bin/python3"
else
  echo "Python 3 werd niet gevonden. Installeer Python 3 en start dit bestand opnieuw."
  open "https://www.python.org/downloads/macos/"
  read "?Druk Enter om te sluiten."
  exit 1
fi

# Bouw de servercode uit de compacte GitHub-delen. Zo zijn geen npm- of
# externe Python-pakketten nodig.
"$PY" - <<'PY'
from pathlib import Path
import base64, gzip
parts = sorted(Path('.').glob('backend.*.b64'))
if not parts:
    raise SystemExit('De backend-delen ontbreken. Download de volledige GitHub-ZIP opnieuw.')
encoded = ''.join(path.read_text('utf-8').strip() for path in parts)
Path('kassa_server.py').write_bytes(gzip.decompress(base64.b64decode(encoded)))
PY
chmod 700 kassa_server.py

if [[ ! -f .env ]]; then
  echo "Eerste configuratie van Registratiekassa."
  read "PIN?Baas-PIN [0607]: "
  PIN="${PIN:-0607}"
  read "ENABLE_AI?Optionele extra AI instellen? De gewone live spraak werkt zonder. [j/N]: "
  ENABLE_AI="${ENABLE_AI:l}"
  OPENAI_KEY=""
  MODEL="disabled"
  if [[ "$ENABLE_AI" == "j" || "$ENABLE_AI" == "ja" || "$ENABLE_AI" == "y" || "$ENABLE_AI" == "yes" ]]; then
    read -s "OPENAI_KEY?OpenAI API-sleutel (alleen lokaal bewaard): "
    echo
    read "MODEL?Exact OpenAI-model dat je bewust wilt gebruiken: "
    if [[ -z "$OPENAI_KEY" || -z "$MODEL" ]]; then
      echo "Sleutel of model ontbreekt; extra AI wordt uitgeschakeld."
      OPENAI_KEY=""
      MODEL="disabled"
    fi
  fi
  cat > .env <<ENV
BOSS_PIN=$PIN
OPENAI_API_KEY=$OPENAI_KEY
OPENAI_MODEL=$MODEL
PORT=$PORT
ALLOWED_ORIGINS=https://amirferjani.github.io,http://127.0.0.1:$PORT,http://localhost:$PORT
ENV
  chmod 600 .env
fi

if [[ -f .server.pid ]] && kill -0 "$(cat .server.pid)" 2>/dev/null; then
  echo "De Registratiekassa-server draait al met PID $(cat .server.pid)."
else
  nohup "$PY" kassa_server.py >> server.log 2>&1 &
  echo $! > .server.pid
  sleep 1
fi

if ! curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null; then
  echo "De server startte niet correct. Bekijk server.log."
  tail -60 server.log || true
  read "?Druk Enter om te sluiten."
  exit 1
fi

echo "Tailscale Serve wordt privé binnen je tailnet via HTTPS ingesteld…"
"$TS" serve --bg --https=443 "127.0.0.1:$PORT"

echo
"$TS" serve status || true

DNS_NAME="$("$TS" status --json 2>/dev/null | "$PY" -c 'import json,sys; print(json.load(sys.stdin).get("Self",{}).get("DNSName","").rstrip("."))' 2>/dev/null || true)"
if [[ -n "$DNS_NAME" ]]; then
  SERVER_URL="https://$DNS_NAME"
  ENCODED="$(SERVER_URL="$SERVER_URL" "$PY" -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["SERVER_URL"], safe=""))')"
  APP_URL="https://amirferjani.github.io/DLL_Injector/?server=$ENCODED"
  echo
  echo "Registratiekassa-server: $SERVER_URL"
  echo "Kassa: $APP_URL"
  echo "Database: $(pwd)/registratiekassa.sqlite3"
  echo "De server is alleen bereikbaar voor toegelaten apparaten in je Tailscale-netwerk."
  open "$APP_URL"
else
  echo "Open de HTTPS-URL uit Tailscale Serve en vul die in via de knop AI-server."
fi

echo
read "?Alles draait. Druk Enter om dit venster te sluiten; de server blijft actief."
