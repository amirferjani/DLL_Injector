#!/bin/zsh
set -euo pipefail
cd "$(dirname "$0")"

PORT="${PORT:-8765}"
TRANSCRIBE_PORT="${TRANSCRIBE_PORT:-8766}"
TS=""
PY=""
TRANSCRIBER_RESTART=0

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

# Bouw de centrale servercode uit compacte delen. Er zijn geen npm- of externe
# Python-pakketten nodig.
"$PY" - <<'PY'
from pathlib import Path
import base64, gzip
parts = sorted(Path('.').glob('kassa-core.*.b64'))
if not parts:
    raise SystemExit('De serverdelen ontbreken. Download de volledige GitHub-ZIP opnieuw.')
encoded = ''.join(path.read_text('utf-8').strip() for path in parts)
Path('kassa_server.py').write_bytes(gzip.decompress(base64.b64decode(encoded)))
PY
chmod 700 kassa_server.py dutch_transcriber.py watchdog.py

if [[ ! -f .env ]]; then
  echo "Eerste configuratie van Registratiekassa."
  read "PIN?Baas-PIN [0607]: "
  PIN="${PIN:-0607}"
  echo
  echo "Voor betrouwbare Nederlandse spraak kan de Mac-server GPT-4o Transcribe gebruiken."
  echo "De API-sleutel blijft alleen in deze map en komt nooit in GitHub of de browser."
  read "ENABLE_TRANSCRIBE?Nauwkeurige Nederlandse transcriptie instellen? [j/N]: "
  ENABLE_TRANSCRIBE="${ENABLE_TRANSCRIBE:l}"
  OPENAI_KEY=""
  if [[ "$ENABLE_TRANSCRIBE" == "j" || "$ENABLE_TRANSCRIBE" == "ja" || "$ENABLE_TRANSCRIBE" == "y" || "$ENABLE_TRANSCRIBE" == "yes" ]]; then
    read -s "OPENAI_KEY?OpenAI API-sleutel (alleen lokaal bewaard): "
    echo
  fi
  cat > .env <<ENV
BOSS_PIN=$PIN
OPENAI_API_KEY=$OPENAI_KEY
OPENAI_MODEL=disabled
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe
OPENAI_TRANSCRIBE_LANGUAGE=nl
PORT=$PORT
TRANSCRIBE_PORT=$TRANSCRIBE_PORT
ALLOWED_ORIGINS=https://amirferjani.github.io,http://127.0.0.1:$PORT,http://localhost:$PORT
ENV
  chmod 600 .env
  [[ -n "$OPENAI_KEY" ]] && TRANSCRIBER_RESTART=1
else
  grep -q '^OPENAI_TRANSCRIBE_MODEL=' .env || echo 'OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe' >> .env
  grep -q '^OPENAI_TRANSCRIBE_LANGUAGE=' .env || echo 'OPENAI_TRANSCRIBE_LANGUAGE=nl' >> .env
  grep -q '^TRANSCRIBE_PORT=' .env || echo "TRANSCRIBE_PORT=$TRANSCRIBE_PORT" >> .env
  CURRENT_KEY="$(sed -n 's/^OPENAI_API_KEY=//p' .env | tail -1)"
  if [[ -z "$CURRENT_KEY" ]]; then
    echo
    echo "De nauwkeurige Nederlandse transcriptie is nog niet geactiveerd."
    read "ENABLE_TRANSCRIBE?Nu een OpenAI API-sleutel toevoegen? [j/N]: "
    ENABLE_TRANSCRIBE="${ENABLE_TRANSCRIBE:l}"
    if [[ "$ENABLE_TRANSCRIBE" == "j" || "$ENABLE_TRANSCRIBE" == "ja" || "$ENABLE_TRANSCRIBE" == "y" || "$ENABLE_TRANSCRIBE" == "yes" ]]; then
      read -s "OPENAI_KEY?OpenAI API-sleutel (alleen lokaal bewaard): "
      echo
      if [[ -n "$OPENAI_KEY" ]]; then
        OPENAI_KEY="$OPENAI_KEY" "$PY" - <<'PY'
from pathlib import Path
import os
path = Path('.env')
lines = path.read_text('utf-8').splitlines()
key = os.environ['OPENAI_KEY']
found = False
result = []
for line in lines:
    if line.startswith('OPENAI_API_KEY='):
        result.append('OPENAI_API_KEY=' + key)
        found = True
    else:
        result.append(line)
if not found:
    result.append('OPENAI_API_KEY=' + key)
path.write_text('\n'.join(result) + '\n', encoding='utf-8')
PY
        chmod 600 .env
        TRANSCRIBER_RESTART=1
      fi
    fi
  fi
fi

if [[ -f .server.pid ]] && kill -0 "$(cat .server.pid)" 2>/dev/null; then
  echo "De Registratiekassa-server draait al met PID $(cat .server.pid)."
else
  nohup "$PY" kassa_server.py >> server.log 2>&1 &
  echo $! > .server.pid
  sleep 1
fi

if (( TRANSCRIBER_RESTART )) && [[ -f .transcriber.pid ]]; then
  kill "$(cat .transcriber.pid)" 2>/dev/null || true
  rm -f .transcriber.pid
  sleep 1
fi
if [[ -f .transcriber.pid ]] && kill -0 "$(cat .transcriber.pid)" 2>/dev/null; then
  echo "De Nederlandse transcriptieserver draait al met PID $(cat .transcriber.pid)."
else
  nohup "$PY" dutch_transcriber.py >> transcriber.log 2>&1 &
  echo $! > .transcriber.pid
  sleep 1
fi

if ! curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null; then
  echo "De centrale server startte niet correct. Bekijk server.log."
  tail -60 server.log || true
  read "?Druk Enter om te sluiten."
  exit 1
fi

if ! curl -fsS "http://127.0.0.1:$TRANSCRIBE_PORT/health" >/dev/null; then
  echo "De Nederlandse transcriptieserver startte niet correct. Bekijk transcriber.log."
  tail -60 transcriber.log || true
  read "?Druk Enter om te sluiten."
  exit 1
fi

echo "Tailscale Serve wordt privé binnen je tailnet via HTTPS ingesteld…"
"$TS" serve --bg --https=443 "127.0.0.1:$PORT"
"$TS" serve --bg --https=8443 "127.0.0.1:$TRANSCRIBE_PORT"

if [[ -f .watchdog.pid ]] && kill -0 "$(cat .watchdog.pid)" 2>/dev/null; then
  echo "De verbindingswatchdog draait al met PID $(cat .watchdog.pid)."
else
  nohup "$PY" watchdog.py >> watchdog.log 2>&1 &
  echo $! > .watchdog.pid
  sleep 1
  echo "De verbindingswatchdog is gestart met PID $(cat .watchdog.pid)."
fi

echo
"$TS" serve status || true

DNS_NAME="$("$TS" status --json 2>/dev/null | "$PY" -c 'import json,sys; print(json.load(sys.stdin).get("Self",{}).get("DNSName","").rstrip("."))' 2>/dev/null || true)"
if [[ -n "$DNS_NAME" ]]; then
  SERVER_URL="https://$DNS_NAME"
  ENCODED="$(SERVER_URL="$SERVER_URL" "$PY" -c 'import os,urllib.parse; print(urllib.parse.quote(os.environ["SERVER_URL"], safe=""))')"
  APP_URL="https://amirferjani.github.io/DLL_Injector/?server=$ENCODED"
  echo
  echo "Registratiekassa-server: $SERVER_URL"
  echo "Nederlandse transcriptie: https://$DNS_NAME:8443"
  echo "Kassa: $APP_URL"
  echo "Database: $(pwd)/registratiekassa.sqlite3"
  echo "Watchdoglog: $(pwd)/watchdog.log"
  echo "De servers zijn alleen bereikbaar voor toegelaten apparaten in je Tailscale-netwerk."
  open "$APP_URL"
else
  echo "Open de HTTPS-URL uit Tailscale Serve en vul die in via de knop Server instellen."
fi

echo
read "?Alles draait. Druk Enter om dit venster te sluiten; servers en watchdog blijven actief."
