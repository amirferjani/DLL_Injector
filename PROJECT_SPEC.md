# Registratiekassa — vaste projectspecificatie

Deze checklist bewaart de opdrachten uit de volledige chat. **Flowchart wordt niet verwijderd of overschreven.** Er is nog geen afzonderlijk, zeker geïdentificeerd Flowchart-bestand gevonden waaruit een specifieke AI-provider of modelnaam bewezen kan worden.

## Vaste eisen van Amir

- Eerste scherm: Team-profielen zonder wachtwoord en een Baas-login met PIN `0607`.
- Exacte plattegrond met 33 tafels.
- T1–T8 liggen buiten het café op het terras en worden door een duidelijke gevel-/ingangslijn van binnen gescheiden.
- Tafels moeten overzichtelijk, gelijkmatig en volgens de oorspronkelijke foto staan; tafels 3–9 staan op één horizontale lijn.
- Tafelstatus: wit = vrij, blauw = open, roze = rekening gevraagd.
- Bij verplaatsen/samenvoegen moeten mogelijke doeltafels oranje knipperen.
- De volledige kaart met 260 producten en gemakkelijk beheer van namen, categorieën en prijzen.
- Desktop/iPad: versleepbare scheiding plus knoppen voor Beide, Plattegrond en Bestellen.
- Telefoon: compacte plattegrond, verticale workflow en naar de bestelling scrollen na tafelkeuze.
- Volledige rekening verplaatsen en rekeningen samenvoegen.
- Eén productlijn of meerdere geselecteerde lijnen kunnen verplaatsen.
- Aantal kunnen wijzigen door op de hoeveelheid te drukken.
- Per productlijn naar links swipen voor Verplaats of Verwijder.
- Waarschuwing bij gelijktijdige bewerking door meerdere personen/apparaten.
- Baas-only audit met medewerker, tijdstip, apparaat, tafel, rekening, product en actie.
- De Baas moet rechtstreeks op een productregel kunnen drukken om te zien wie het toevoegde, bestelde, verplaatste of verwijderde.
- Het auditlogboek moet filters behouden voor datum, medewerker, tafel, actie, apparaat en zoektekst, plus groepering per rekening en CSV-export.
- Verwijderingen moeten append-only zichtbaar blijven nadat het product of de rekening uit de actuele kassa verdwenen is.
- Offline-first; bij herstel van verbinding alleen nog onbevestigde bewerkingen synchroniseren.
- Centrale server met SQLite in WAL-modus, append-only operation log, unieke operation-ID’s, ondertekende sessietokens, login-rate-limiting, security headers, apparaatregistratie en back-ups.
- Veilige Tailscale-link; gsm/iPad moeten de webapp op het beginscherm kunnen plaatsen.
- Live spraak: herkende producten tijdens het spreken tonen, elk met een kruisje; correcties zoals “nee, ik bedoel…” en verwijderen moeten werken.
- Externe AI-sleutels mogen nooit in GitHub Pages of browsercode staan.

## Wat zeker uit de teruggevonden kassacode blijkt

De teruggevonden POS/Benchmark-spraakcode gebruikt standaard:

1. `SpeechRecognition` of `webkitSpeechRecognition` met taal `nl-BE`;
2. tussentijdse transcripties tijdens het spreken;
3. lokale tekstnormalisatie, aantallen en vergelijking met de actuele productkaart;
4. verwijderbare voorlopige resultaten en correcties vóór definitieve toevoeging.

Dat bewijst **niet** dat een ander project met de naam Flowchart geen extern AI-model gebruikt. De eerdere onbewezen claim over `gpt-5.2` is daarom ingetrokken.

## In de huidige GitHub-versie uitgevoerd

- Publieke GitHub Pages-app op `https://amirferjani.github.io/DLL_Injector/`.
- Team-/medewerkerkeuze en Baas-login met PIN `0607`.
- 33 tafels, terras T1–T8, gevel-/ingangslijn en gelijke uitlijning van tafels 3–9.
- Drie weergaveknoppen en versleepbare desktopverdeling.
- Tablet-, iPhone- en beginscherm/PWA-layout met Apple safe areas en compacte rekeningsectie.
- Tafelstatussen wit, blauw en roze.
- Oranje knipperende doeltafels bij verplaatsen.
- Volledige kaart met **260 producten en prijzen**, verdeeld over 24 categorieën.
- Zoeken, favorieten, recente producten, kaart-/prijsbeheer en uitgebreide spraakaliassen.
- Producttegels, rekening, bestellen, betalen, volledige rekening verplaatsen en rekeningen samenvoegen.
- Eén of meerdere geselecteerde productlijnen verplaatsen of verwijderen.
- Hoeveelheid wijzigen door op het aantal te drukken.
- Naar links swipen per productlijn voor Verplaats of Verwijder.
- Hersteld Baascentrum met Activiteit, Verwijderd, Rekeningen, Shifts, Dagafsluiting en Rapporten.
- Herstelde auditfilters voor datum, medewerker, tafel, actie, apparaat en vrije zoektekst.
- Append-only lokaal auditlog met aantallen toegevoegd/verwijderd, groepering per rekening en CSV-export.
- Directe itemgeschiedenis: als Baas op een productregel of de knop Geschiedenis drukken.
- Tijdlijn per product/rekening met medewerker, tijdstip, apparaat, bron, aantallen en verwijderingen.
- Import van oudere audit-/operationlog-arrays wanneer die nog in de kassastatus aanwezig zijn.
- Bestaande open bestellingen zonder oud log krijgen een eerlijke beginsnapshot; ontbrekende geschiedenis wordt niet verzonnen.
- Lokale offline opslag en installeerbare PWA.
- Live Nederlandstalige browser-spraakherkenning met voorlopige productchips en kruisjes.
- Lokale parser voor aantallen, correcties, huismerken en mixdranken.
- Optionele private Nederlandse transcriptieserver met taal `nl`, kaartwoorden en horecaprompt.
- Centrale stdlib-Pythonserver met SQLite WAL, tabelrevisies, conflictdetectie, unieke operatie-ID’s, signed sessions, apparaten, audit, betalingen, rate limiting en back-ups.
- Uitvoerbare `START.command` en `STOP.command` voor macOS en Tailscale Serve.
- Zelfinstallerende backend zonder npm- of externe Python-pakketten.
- Back-upbranches:
  - `backup/dll-injector-original-2026-07-24`
  - `backup/pre-full-feature-audit-2026-07-24`
- Een apart herstelregister staat in `FEATURE_AUDIT.md`.

## Gecontroleerde auditwerking

Een lokale browser-smoketest is uitgevoerd met een bestaande bestellijn, twee snelle toevoegingen en één verwijdering. De test bevestigde:

- beide snelle toevoegingen werden apart geteld;
- de verwijdering bleef in het append-only log staan;
- bestaande historische regel werd aan de oorspronkelijke medewerker gekoppeld;
- nieuwe handelingen werden aan de actuele Baassessie gekoppeld;
- het Baascentrum, rekeninggroepering en directe producttijdlijn openden zonder JavaScript-fouten.

## Gebouwd maar nog niet op Amirs Mac geactiveerd

- De centrale server starten via `server/START.command`.
- Eén keer een Baas-PIN kiezen.
- Tailscale HTTPS/Serve zo nodig één keer toestaan.
- De gegenereerde serverlink op gsm en iPad openen.
- Voor nauwkeurigere Nederlandse transcriptie één keer een OpenAI API-sleutel lokaal op de Mac invoeren.

## Nog niet volledig uitgevoerd

- Volledig centraal auditoverzicht over **alle** apparaten is pas betrouwbaar wanneer de Mac/Tailscale/SQLite-server draait en ieder toestel ermee verbonden is.
- Handelingen van vóór het herstelde logboek kunnen alleen worden teruggebracht wanneer ze nog in een bestaand lokaal of centraal audit-/operationlog staan.
- Productkaartwijzigingen centraal tussen alle apparaten synchroniseren moet verder operationeel worden gevalideerd.
- Uitgebreide deelbetalingen, terugbetalingen en fiscale correcties.
- Het echte afzonderlijke Flowchart-bestand lokaliseren en analyseren, wanneer dat beschikbaar is.
- Productievalidatie, Belgische fiscale/GKS-koppeling en betaalterminal.

## AI-status

De standaard spraakfunctie werkt zonder API-sleutel via browsertranscriptie en lokale kaartcontrole. Voor moeilijke merknamen kan de private Mac/Tailscale-transcriptieserver `gpt-4o-transcribe` met taal `nl` en de actuele kaart als context gebruiken. De API-sleutel blijft uitsluitend op de Mac.
