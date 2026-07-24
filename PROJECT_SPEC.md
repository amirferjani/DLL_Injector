# Registratiekassa — vaste projectspecificatie

Laatste update: 25 juli 2026

Deze checklist bewaart de opdrachten uit de volledige chat. **Flowchart wordt niet verwijderd of overschreven.** Er is nog geen afzonderlijk, zeker geïdentificeerd Flowchart-bestand gevonden waaruit een specifieke AI-provider of modelnaam bewezen kan worden.

## Vaste eisen van Amir

- Eerste scherm: Team-profielen zonder wachtwoord en een Baas-login met PIN `0607`.
- Exacte plattegrond met 33 tafels.
- T1–T8 liggen buiten het café op het terras en worden door een duidelijke gevel-/ingangslijn van binnen gescheiden.
- Tafels moeten overzichtelijk, gelijkmatig en volgens de oorspronkelijke foto staan; tafels 3–9 staan op één horizontale lijn.
- Tafelstatus: wit = vrij, blauw = open, roze = rekening gevraagd.
- Bij verplaatsen/samenvoegen moeten mogelijke doeltafels oranje knipperen.
- Volledige kaart met 260 producten en beheer van namen, categorieën en prijzen.
- Desktop/iPad: versleepbare scheiding plus knoppen voor Beide, Plattegrond en Bestellen.
- Telefoon: compacte plattegrond, verticale workflow en naar de bestelling scrollen na tafelkeuze.
- Volledige rekening verplaatsen en rekeningen samenvoegen.
- Eén productlijn of meerdere geselecteerde lijnen kunnen verplaatsen.
- Aantal kunnen wijzigen via de hoeveelheid.
- Dubbele tik op een bestellingsregel verhoogt exact één.
- Minteken naast het kruis vermindert exact één; kruis verwijdert de hele regel.
- Per productlijn naar links swipen voor Verplaats of Verwijder.
- Waarschuwing bij gelijktijdige bewerking door meerdere personen/apparaten.
- Baas-only auditlogboek met wie, wanneer en vanaf welk apparaat iets toevoegde of wijzigde.
- Directe product- en rekeninghistoriek zonder eerst naar het algemene logboek te gaan.
- Offline-first; bij herstel van verbinding alleen nog onbevestigde bewerkingen synchroniseren.
- Centrale server met SQLite in WAL-modus, append-only operation log, unieke operation-ID’s, ondertekende sessietokens, rate limiting, security headers, apparaatregistratie en back-ups.
- Veilige Tailscale-link; gsm/iPad moeten de webapp op het beginscherm kunnen plaatsen.
- Live spraak: herkende producten tijdens het spreken tonen, elk met een kruisje; correcties en verwijderen moeten werken.
- Externe AI-sleutels mogen nooit in GitHub Pages of browsercode staan.
- Bestaande functies mogen niet stilzwijgend verdwijnen; voor grote updates eerst back-up en feature-audit.

## Wat zeker uit de teruggevonden kassacode blijkt

De teruggevonden POS/Benchmark-spraakcode gebruikt standaard:

1. `SpeechRecognition` of `webkitSpeechRecognition` met taal `nl-BE`;
2. tussentijdse transcripties tijdens het spreken;
3. lokale tekstnormalisatie, aantallen en vergelijking met de actuele productkaart;
4. verwijderbare voorlopige resultaten en correcties vóór definitieve toevoeging.

Dat bewijst niet dat een ander project met de naam Flowchart geen extern AI-model gebruikt. De eerdere onbewezen claim over `gpt-5.2` is ingetrokken.

## In huidige GitHub-versie uitgevoerd

- Publieke GitHub Pages-webapp.
- Team-/medewerkerkeuze en Baas-login met PIN `0607`.
- 33 tafels, terras T1–T8, gevel-/ingangslijn en gelijke uitlijning van tafels 3–9.
- Drie weergaveknoppen en versleepbare desktopverdeling.
- Tablet-, telefoon- en Apple/PWA-layout met safe areas en aangepaste scrollgebieden.
- Tafelstatussen wit, blauw en roze.
- Oranje knipperende doeltafels bij verplaatsen.
- Volledige kaart met 260 producten en prijzen, verdeeld over categorieën.
- Zoeken, favorieten, recente producten, kaartbeheer en spraakaliassen.
- Producttegels, rekening, bestellen, betalen, volledige rekening verplaatsen en rekeningen samenvoegen.
- Eén of meerdere geselecteerde productlijnen verplaatsen of verwijderen.
- Hoeveelheid wijzigen via aantaldialoog.
- Dubbele tik `+1`, minteken `−1` en kruis voor volledige regelverwijdering.
- Naar links swipen per productlijn voor Verplaats of Verwijder.
- Directe product- en rekeninghistoriek.
- Baascentrum met filters, verwijderde regels, rekeninghistorie, shifts, dagafsluiting, rapporten en CSV-export.
- Append-only lokaal auditlog met medewerker, tijdstip, apparaat en bron.
- Lokale offline opslag, IndexedDB-veiligheidskopie en installeerbare PWA.
- Lokale synchronisatiewachtrij, fetch-time-outs, retry/backoff, healthchecks en verbindingsstatus.
- Live Nederlandstalige browser-spraakherkenning met voorlopige productchips en kruisjes.
- Lokale parser voor aantallen, correcties, huismerken en mixdranken.
- Optionele private Nederlandse transcriptieserver met taal `nl`, kaartwoorden en horecaprompt.
- Centrale stdlib-Pythonserver met SQLite WAL, tabelrevisies, conflictdetectie, unieke operatie-ID’s, signed sessions, apparaten, audit, betalingen, rate limiting en back-ups.
- Uitvoerbare `START.command` en `STOP.command` voor macOS en Tailscale Serve.
- Zelfinstallerende backend zonder npm- of externe Python-pakketten.
- Back-upbranches en permanent `FEATURE_AUDIT.md`.

## Gecontroleerde v18-werking

De mobiele browsertest bevestigde dubbele tik, min naast kruis, behoud van Baasgeschiedenis, auditregistratie, offline bediening, blijvende wachtrij, backoff, IndexedDB-herstel, serverbevestiging na herstel en geen onverwachte JavaScript-fouten.

## Gebouwd maar nog niet op Amirs Mac geactiveerd

- De lokale centrale server starten via `server/START.command`.
- Eén keer een Baas-PIN kiezen.
- Tailscale HTTPS/Serve zo nodig één keer toestaan.
- De gegenereerde serverlink op gsm en iPad openen.
- Voor nauwkeurigere Nederlandse transcriptie één keer een OpenAI API-sleutel lokaal op de Mac invoeren.

## Nog niet volledig uitgevoerd of productiegevalideerd

- Langdurige multi-iPad-test met echte wifi- en Tailscale-onderbrekingen.
- Fijnmazige delta-operaties voor iedere afzonderlijke handeling in plaats van alleen veilige tafelsnapshots.
- Automatische oplossing van alle conflictsoorten.
- Productkaartwijzigingen centraal tussen alle apparaten synchroniseren verder operationeel valideren.
- Uitgebreide deelbetalingen, terugbetalingen en fiscale correcties.
- Het echte afzonderlijke Flowchart-bestand lokaliseren en analyseren wanneer dat beschikbaar is.
- Productievalidatie, Belgische fiscale/GKS-koppeling en betaalterminal.
- App Store-verpakking, native beveiligde opslag en productiebeheer van toestellen.

## AI-status

De standaard spraakfunctie werkt zonder API-sleutel via browsertranscriptie en lokale kaartcontrole. Voor moeilijke merknamen kan de private Mac/Tailscale-transcriptieserver een Nederlands transcriptiemodel met taal `nl` en de actuele kaart als context gebruiken. De API-sleutel blijft uitsluitend op de Mac.
