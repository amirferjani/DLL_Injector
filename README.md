# Registratiekassa · Café De Zoo

Webapp voor tafelbeheer, bestellingen, betalingen, baascontrole, live Nederlandstalige spraak en gedeelde kassadata via een lokale Mac/Tailscale-server.

## Openen

De gepubliceerde webapp staat op:

`https://amirferjani.github.io/DLL_Injector/`

Na een grote update open je één keer `reset-kassa.html`. Die verwijdert alleen oude websitecaches; bestellingen en loggegevens worden niet bewust gewist.

## Snelle bediening van een bestellingsregel

- **Dubbele tik of dubbele klik op de producttekst:** verhoogt het aantal exact met één.
- **Minteken `−`:** vermindert het aantal exact met één.
- **Kruis `×`:** verwijdert de volledige productregel.
- **Tik op het aantal:** opent de bestaande dialoog om een exact aantal in te vullen.
- **Als Baas één keer op de producttekst tikken:** opent nog steeds de productgeschiedenis. De app wacht heel kort om een enkele tik van een dubbele tik te onderscheiden.

Alle plus- en minhandelingen blijven zichtbaar in het append-only auditlog.

## Offline en verbinding

De bediening blokkeert niet wanneer wifi, internet, Tailscale of de Mac-server tijdelijk wegvalt.

- Iedere wijziging wordt eerst lokaal toegepast.
- De bestaande synchronisatiewachtrij blijft lokaal opgeslagen.
- Een extra IndexedDB-kopie beschermt de actuele kassastand tegen een ontbrekende of beschadigde `localStorage`-waarde.
- De serverknop toont **verbonden**, **synchroniseren**, **offline** of **conflict**.
- Serveraanvragen hebben een time-out en retries gebruiken exponentiële backoff met jitter.
- Bij netwerkherstel, terugkeer naar de app, focus of `pageshow` wordt onmiddellijk opnieuw gesynchroniseerd.
- De serviceworker bewaart ook de nieuwe bedienings- en verbindingsbestanden voor offline gebruik.

De centrale server gebruikt SQLite in WAL-modus, unieke operatie-ID’s, tabelrevisies en conflictdetectie. Een lokale wijziging wordt pas uit de wachtrij verwijderd nadat de server ze heeft bevestigd.

## Baasomgeving

Na aanmelden via **Baasomgeving openen** en PIN `0607`:

- druk op een productregel voor de volledige tijdlijn;
- bekijk per rekening wie hoeveel toevoegde, verwijderde of bestelde;
- gebruik filters op datum, medewerker, tafel, actie en apparaat;
- bekijk verwijderde regels, rekeningen, shifts, dagafsluiting en rapporten;
- exporteer een gefilterd logboek als CSV.

## Server starten

Download de repository als ZIP, open de map `server` en dubbelklik op `START.command`. De centrale server draait lokaal op de Mac en wordt privé via Tailscale Serve bereikbaar. Gebruik geen Tailscale Funnel voor deze kassa.

## Testbewijs v18

De mobiele E2E-test controleert onder meer:

- enkele tik versus dubbele tik;
- `−` naast `×`;
- auditregistratie van plus en min;
- lokale bediening tijdens een echte gesimuleerde serverstoring;
- blijvende synchronisatiewachtrij;
- backoff na een verbindingsfout;
- herstel uit IndexedDB na een offline reload;
- bevestiging en leegmaken van de wachtrij na verbindingsherstel;
- geen onverwachte JavaScript-fouten.

Zie `docs/TEST_RESULTS_V18.md` en `docs/OFFLINE_APP_PLAN.md`.

## Belangrijk

Dit blijft een test- en bedieningsprototype, geen gecertificeerd Belgisch GKS/fiscaal kassasysteem. Voor productiegebruik zijn fiscale/GKS-integratie, betaalterminalkoppeling, langdurige multi-iPad-tests, beveiligingsvalidatie en operationele procedures nodig.
