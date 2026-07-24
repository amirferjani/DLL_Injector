# Registratiekassa-server voor macOS + Tailscale

Deze map bevat de centrale server voor Café De Zoo. Hij draait uitsluitend op de Mac via `127.0.0.1`; **Tailscale Serve** maakt hem via HTTPS bereikbaar voor toegelaten apparaten in hetzelfde tailnet.

## Wat deze server doet

- SQLite-database met WAL-modus;
- synchronisatie tussen kassa-apparaten;
- revisies per tafel en conflictmelding bij gelijktijdige wijzigingen;
- unieke operatie-ID’s, zodat dezelfde wijziging nooit dubbel wordt geboekt;
- ondertekende sessietokens voor Team en Baas;
- apparaatregistratie, auditlogboek en betalingen;
- handmatige en automatische SQLite-back-ups;
- beveiligingsheaders, CORS en rate limiting;
- optionele Nederlandse OpenAI-transcriptie voor moeilijke merknamen;
- een watchdog die de lokale diensten en Tailscale Serve-routes bewaakt.

De gewone live spraak werkt al zonder API-sleutel via browsertranscriptie en lokale productcontrole.

## Installeren en starten

1. Download de volledige repository als ZIP en pak hem uit.
2. Open de map `server`.
3. Dubbelklik op `START.command`.
4. Blokkeert macOS het bestand, gebruik rechtermuisklik → **Open**.
5. Kies één keer de Baas-PIN.
6. De nauwkeurige Nederlandse transcriptie en API-sleutel zijn optioneel.
7. Tailscale kan één keer vragen om HTTPS voor Serve toe te staan.

Het script:

1. bouwt `kassa_server.py` uit de compacte GitHub-delen;
2. start de SQLite-server;
3. start de Nederlandse transcriptieserver;
4. stelt Tailscale HTTPS 443 en 8443 in;
5. start `watchdog.py`;
6. opent de kassalink met de server vooraf ingesteld.

Er zijn geen npm-, pip- of andere pakketinstallaties nodig.

## Watchdog

`watchdog.py` controleert standaard iedere tien seconden de lokale health-endpoints. Na drie opeenvolgende fouten volgt een gecontroleerde herstart. Een cooldown voorkomt een oneindige crashlus. Iedere vijf minuten worden de private Tailscale Serve-routes opnieuw toegepast wanneer dat nodig is.

Lokale bestanden:

- `.watchdog.pid` — proces-ID;
- `watchdog.log` — watchdoggebeurtenissen;
- optionele instellingen in `.env`:
  - `WATCHDOG_INTERVAL=10`
  - `WATCHDOG_FAIL_THRESHOLD=3`
  - `WATCHDOG_RESTART_COOLDOWN=45`
  - `WATCHDOG_TAILSCALE_REFRESH=300`
  - `WATCHDOG_HEALTH_TIMEOUT=3.5`

De watchdog is aanvullend. Hij vervangt geen goede router-, Mac-, stroom- of back-upmonitoring.

## Stoppen

Dubbelklik op `STOP.command`. Dat stopt eerst de watchdog, daarna de transcriptie- en kassaserver en ten slotte de Tailscale Serve-routes.

## Lokale gegevens

Deze bestanden worden alleen op de Mac gemaakt en staan niet in GitHub:

- `.env` — PIN en eventuele API-instellingen;
- `.server-secret` — sleutel voor sessietokens;
- `registratiekassa.sqlite3` — centrale database;
- `backups/` — databaseback-ups;
- `server.log` — centrale serverlog;
- `transcriber.log` — transcriptieserverlog;
- `watchdog.log` — herstart- en routecontrolelog.

## Beveiliging

Tailscale Serve is privé binnen je tailnet; gebruik **geen Tailscale Funnel** voor deze kassa. De OpenAI-sleutel blijft, wanneer geconfigureerd, alleen in `.env` op de Mac en wordt nooit naar GitHub Pages gestuurd.
