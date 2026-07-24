# Registratiekassa · Café De Zoo

Webapp voor tafelbeheer, bestellingen, betalingen, baascontrole, live Nederlandstalige spraakinvoer en gedeelde kassadata via een lokale Mac/Tailscale-server.

## Openen

De publieke app staat op:

`https://amirferjani.github.io/DLL_Injector/`

Na een grote update of oude Safari/PWA-cache open je één keer:

`https://amirferjani.github.io/DLL_Injector/reset-kassa.html`

## Werking

- Kies bij het starten wie werkt, of open de Baasomgeving met PIN `0607`.
- Wissel bovenaan tussen **Beide**, **Plattegrond** en **Bestellen**.
- Op desktop kan de scheiding tussen tafelplan en bestelmenu versleept worden.
- Op telefoon staan de delen onder elkaar en springt de app na tafelkeuze naar de bestelling.
- Spraak gebruikt Nederlandse browsertranscriptie plus lokale controle tegen de productkaart.
- Voorlopig herkende producten verschijnen live met een kruisje om ze weg te laten.
- Bestellingen blijven lokaal/offline bruikbaar.
- Met `server/START.command` worden tafels en rekeningen via SQLite/WAL en Tailscale tussen Mac, gsm en iPad gesynchroniseerd.
- Gelijktijdige verouderde wijzigingen worden als conflict gemeld in plaats van stil te worden overschreven.

## Baascentrum en geschiedenis

Als Baas verschijnt bovenaan **Baascentrum**. Daar staan:

- activiteit en verwijderde regels;
- filters op datum, medewerker, tafel, actie, apparaat en zoektekst;
- groepering en aantallen per rekening;
- CSV-export;
- rekeninghistorie, shifts, dagafsluiting en basisrapporten.

Als Baas kan je bovendien rechtstreeks op de producttekst of **Geschiedenis** bij een bestellijn drukken. Dan zie je wie het product wanneer toevoegde, bestelde, verplaatste of verwijderde. Het lokale log is append-only. Voor één centraal overzicht over alle toestellen moet de Mac/Tailscale-server draaien.

Het gecontroleerde herstelregister staat in `FEATURE_AUDIT.md`.

## Server starten

Download de repository als ZIP, open de map `server` en dubbelklik op `START.command`. Het script gebruikt Python 3 en Tailscale; externe Python- of Node-pakketten zijn niet nodig. De optionele nauwkeurige Nederlandse transcriptie gebruikt een API-sleutel die uitsluitend lokaal op de Mac wordt bewaard.

## Belangrijk

Dit is een test- en bedieningsprototype, geen gecertificeerd Belgisch GKS/fiscaal kassasysteem. Voor productiegebruik zijn verdere controles, fiscale/GKS-integratie en operationele beveiligingsvalidatie nodig.
