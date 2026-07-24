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
- nauwkeurige **Nederlandse** transcriptie via `gpt-4o-transcribe`, met `language=nl` en een woordenlijst uit de actuele kaart;
- lokale browsertranscriptie als terugval wanneer geen API-sleutel is ingesteld.

De OpenAI-sleutel blijft uitsluitend in `.env` op de Mac. Audio gaat alleen via de private Tailscale-verbinding naar de Mac en wordt daar naar de transcriptie-API gestuurd.

## Installeren en starten

1. Download de volledige repository als ZIP en pak hem uit.
2. Open de map `server`.
3. Dubbelklik op `START.command`.
4. Blokkeert macOS het bestand, gebruik rechtermuisklik → **Open**.
5. Kies één keer de Baas-PIN.
6. Vul voor de nauwkeurige Nederlandse transcriptie één keer je OpenAI API-sleutel in. Je kunt dit overslaan; dan blijft de Apple/browserherkenning werken.
7. Tailscale kan één keer vragen om HTTPS voor Serve toe te staan.

Het script bouwt de centrale Python-server automatisch uit `kassa-core.01.b64`, `kassa-core.02.b64` en `kassa-core.03.b64`. Daarnaast start het `dutch_transcriber.py`. Er zijn geen npm-, pip- of andere pakketinstallaties nodig.

Tailscale gebruikt twee private HTTPS-poorten:

- `443` — synchronisatie, database en kassafuncties;
- `8443` — Nederlandse spraaktranscriptie.

## Stoppen

Dubbelklik op `STOP.command`.

## Lokale gegevens

Deze bestanden worden alleen op de Mac gemaakt en staan niet in GitHub:

- `.env` — PIN en eventuele API-instellingen;
- `.server-secret` — sleutel voor sessietokens;
- `registratiekassa.sqlite3` — centrale database;
- `backups/` — databaseback-ups;
- `server.log` en `transcriber.log` — technische logboeken.

## Beveiliging

Tailscale Serve is privé binnen je tailnet; gebruik **geen Tailscale Funnel** voor deze kassa. De webapp bevat nooit een API-sleutel.
