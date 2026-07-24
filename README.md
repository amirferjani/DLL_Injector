# Registratiekassa · Café De Zoo

Webapp voor tafelbeheer, bestellingen, betalingen, live Nederlandstalige spraakinvoer en gedeelde kassadata via een lokale Mac/Tailscale-server.

## Openen

Na GitHub Pages-deployment staat de app normaal op:

`https://amirferjani.github.io/DLL_Injector/`

De repository is momenteel nog privé; de publieke Pages-link werkt pas nadat GitHub Pages voor de repository is geactiveerd en het gekozen GitHub-abonnement private Pages ondersteunt, of nadat de repository openbaar is gemaakt.

## Werking

- Kies bij het starten wie werkt.
- Wissel bovenaan tussen **Beide**, **Plattegrond** en **Bestellen**.
- Op desktop kan de scheiding tussen tafelplan en bestelmenu versleept worden.
- Op telefoon staan de delen onder elkaar en springt de app na tafelkeuze naar de bestelling.
- Spraak gebruikt standaard dezelfde geverifieerde aanpak als de onderzochte Flowchart-versie: browsertranscriptie plus lokale controle tegen de productkaart.
- Voorlopig herkende producten verschijnen live met een kruisje om ze weg te laten.
- Bestellingen blijven lokaal/offline bruikbaar.
- Met `server/START.command` worden tafels en rekeningen via SQLite/WAL en Tailscale tussen Mac, gsm en iPad gesynchroniseerd.
- Gelijktijdige verouderde wijzigingen worden als conflict gemeld in plaats van stil te worden overschreven.
- OpenAI is alleen een optionele terugval wanneer de lokale spraakcontrole niets betrouwbaar herkent.

## Server starten

Download de repository als ZIP, open de map `server` en dubbelklik op `START.command`. Het script gebruikt alleen Python 3 en Tailscale; externe Python- of Node-pakketten zijn niet nodig.

## Belangrijk

Dit is een test- en bedieningsprototype, geen gecertificeerd Belgisch GKS/fiscaal kassasysteem. Voor productiegebruik zijn verdere controles, fiscale/GKS-integratie en operationele beveiligingsvalidatie nodig.
