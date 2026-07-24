# Registratiekassa-server voor macOS + Tailscale

Deze map bevat de centrale server voor Café De Zoo. Hij draait uitsluitend op de Mac via `127.0.0.1`; **Tailscale Serve** maakt hem via HTTPS bereikbaar voor toegelaten apparaten in hetzelfde tailnet.

## Wat deze server doet

- SQLite-database met WAL-modus;
- synchronisatie tussen kassa-apparaten;
- revisies per tafel en conflictmelding bij gelijktijdige wijzigingen;
- unieke operatie-ID's, zodat dezelfde wijziging nooit dubbel wordt geboekt;
- ondertekende sessietokens voor Team en Baas;
- apparaatregistratie, auditlogboek en betalingen;
- handmatige en automatische SQLite-back-ups;
- beveiligingsheaders, CORS en rate limiting;
- optionele OpenAI-terugval voor moeilijke spraakopdrachten.

De gewone live spraak werkt al zonder API-sleutel via browsertranscriptie en lokale productcontrole.

## Installeren en starten

1. Download de volledige repository als ZIP en pak hem uit.
2. Open de map `server`.
3. Dubbelklik op `START.command`.
4. Blokkeert macOS het bestand, gebruik rechtermuisklik → **Open**.
5. Kies één keer de Baas-PIN. Extra AI mag je overslaan.
6. Tailscale kan één keer vragen om HTTPS voor Serve toe te staan.

Het script bouwt de Python-server automatisch uit `kassa-core.01.b64`, `kassa-core.02.b64` en `kassa-core.03.b64`, start SQLite en opent daarna de kassalink met de server al ingesteld. Er zijn geen npm-, pip- of andere pakketinstallaties nodig.

## Stoppen

Dubbelklik op `STOP.command`.

## Lokale gegevens

Deze bestanden worden alleen op de Mac gemaakt en staan niet in GitHub:

- `.env` — PIN en eventuele API-instellingen;
- `.server-secret` — sleutel voor sessietokens;
- `registratiekassa.sqlite3` — centrale database;
- `backups/` — databaseback-ups;
- `server.log` — technisch logboek.

## Beveiliging

Tailscale Serve is privé binnen je tailnet; gebruik **geen Tailscale Funnel** voor deze kassa. De OpenAI-sleutel blijft, wanneer geconfigureerd, alleen in `.env` op de Mac en wordt nooit naar GitHub Pages gestuurd.
