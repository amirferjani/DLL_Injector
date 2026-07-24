#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8765}"
TS=""
if command -v tailscale >/dev/null 2>&1; then
  TS="$(command -v tailscale)"
elif [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
  TS="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
else
  echo "Tailscale werd niet gevonden. Open Tailscale één keer en installeer de CLI-koppeling indien gevraagd."
  read "?Druk Enter om te sluiten."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js ontbreekt. Installeer Node.js 20 of nieuwer en start dit bestand opnieuw."
  open "https://nodejs.org/"
  read "?Druk Enter om te sluiten."
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 20 )); then
  echo "Node.js 20 of nieuwer is nodig. Je hebt versie $(node -v)."
  read "?Druk Enter om te sluiten."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Eerste configuratie van de optionele extra AI."
  echo "De normale Flowchart-spraakwerking heeft geen API-sleutel of model nodig."
  read "ENABLE_AI?Wil je de optionele extra AI instellen? [j/N]: "
  ENABLE_AI="${ENABLE_AI:l}"
  OPENAI_KEY=""
  MODEL="disabled"
  if [[ "$ENABLE_AI" == "j" || "$ENABLE_AI" == "ja" || "$ENABLE_AI" == "y" || "$ENABLE_AI" == "yes" ]]; then
    read -s "OPENAI_KEY?OpenAI API-sleutel (wordt alleen lokaal in .env bewaard): "
    echo
    read "MODEL?Exact OpenAI-model dat je bewust wilt gebruiken: "
    if [[ -z "$OPENAI_KEY" || -z "$MODEL" ]]; then
      echo "Sleutel of model ontbreekt; extra AI wordt uitgeschakeld. Lokale spraak blijft werken."
      OPENAI_KEY=""
      MODEL="disabled"
    fi
  fi
  cat > .env <<ENV
OPENAI_API_KEY=$OPENAI_KEY
OPENAI_MODEL=$MODEL
PORT=$PORT
ALLOWED_ORIGINS=https://amirferjani.github.io,http://127.0.0.1:$PORT,http://localhost:$PORT
ENV
  chmod 600 .env
fi

if [[ -f .server.pid ]] && kill -0 "$(cat .server.pid)" 2>/dev/null; then
  echo "De lokale server draait al met PID $(cat .server.pid)."
else
  nohup node server.mjs >> server.log 2>&1 &
  echo $! > .server.pid
  sleep 1
fi

if ! curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null; then
  echo "De server startte niet correct. Bekijk server.log."
  tail -40 server.log || true
  read "?Druk Enter om te sluiten."
  exit 1
fi

echo "Tailscale Serve wordt beveiligd via HTTPS ingesteld…"
"$TS" serve --bg --https=443 "127.0.0.1:$PORT"

echo
"$TS" serve status || true

DNS_NAME="$("$TS" status --json 2>/dev/null | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin).get("Self",{}).get("DNSName","").rstrip("."))' 2>/dev/null || true)"
if [[ -n "$DNS_NAME" ]]; then
  SERVER_URL="https://$DNS_NAME"
  ENCODED="$(SERVER_URL="$SERVER_URL" /usr/bin/python3 -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["SERVER_URL"], safe=""))')"
  APP_URL="https://amirferjani.github.io/DLL_Injector/?server=$ENCODED"
  echo
  echo "Optionele uitbreidingsserver: $SERVER_URL"
  echo "Kassa: $APP_URL"
  open "$APP_URL"
else
  echo "Open de URL die hierboven bij Tailscale Serve staat en vul die in via de knop Extra AI."
fi

echo
read "?Alles draait. Druk Enter om dit venster te sluiten; de server blijft actief."
