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
- Baas-only auditlogboek met wie, wanneer en vanaf welk apparaat iets toevoegde of wijzigde.
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

## In huidige GitHub-versie uitgevoerd

- Team-/medewerkerkeuze en Baas-login met PIN `0607`.
- 33 tafels, terras T1–T8, gevel-/ingangslijn en gelijke uitlijning van tafels 3–9.
- Drie weergaveknoppen en versleepbare desktopverdeling.
- Tablet- en telefoonlayout met verticale workflow.
- Tafelstatussen wit, blauw en roze.
- Oranje knipperende doeltafels bij verplaatsen.
- Volledige kaart met **260 echte producten en prijzen**, verdeeld over 24 categorieën.
- Zoeken, favorieten, recente producten en spraakaliassen zoals “pintje”, “cola zero” en “bruiswater”.
- Producttegels, rekening, bestellen, betalen, volledige rekening verplaatsen en rekeningen samenvoegen.
- Eén of meerdere geselecteerde productlijnen verplaatsen of verwijderen.
- Hoeveelheid wijzigen door op het aantal te drukken.
- Naar links swipen per productlijn voor Verplaats of Verwijder.
- Basis-auditlogboek voor de baas met medewerker, tijdstip, apparaat-ID en actie.
- Lokale offline opslag en installeerbare PWA.
- Live Nederlandstalige browser-spraakherkenning met voorlopige productchips en kruisjes.
- Lokale parser voor aantallen, correcties en verwijderen.
- Optionele veilige OpenAI-terugval wanneer lokaal niets betrouwbaar wordt herkend; het model wordt niet verzonnen maar expliciet door de eigenaar gekozen.
- Centrale stdlib-Pythonserver met SQLite WAL, tabelrevisies, conflictdetectie, unieke operatie-ID’s, signed sessions, apparaten, audit, betalingen, rate limiting en back-ups.
- Uitvoerbare `START.command` en `STOP.command` voor macOS en Tailscale Serve.
- Zelfinstallerende backend uit drie compacte GitHub-delen; geen npm of externe Python-pakketten nodig.
- Integratietest geslaagd voor synchronisatie tussen twee apparaten, idempotentie, stale-revision-conflict, baasrechten en databaseback-up.
- Oude DLL Injector bewaard op branch `backup/dll-injector-original-2026-07-24`.

## Gebouwd maar nog niet op Amirs Mac geactiveerd

- De lokale centrale server starten via `server/START.command`.
- Eén keer een Baas-PIN kiezen.
- Tailscale HTTPS/Serve zo nodig één keer toestaan.
- De gegenereerde serverlink op gsm en iPad openen.
- Eventueel bewust een OpenAI-sleutel en exacte modelnaam invoeren; dit is niet nodig voor gewone live spraak.

## Nog niet volledig uitgevoerd

- Publieke GitHub Pages-link: de repository staat nog privé en Pages is niet als publicatiesource bevestigd.
- Baas-interface om de 260 productnamen, categorieën, prijzen en zichtbaarheid rechtstreeks te wijzigen.
- Gebruiksvriendelijke keuze om serverconflicten per tafel op te lossen; detectie en waarschuwing bestaan al.
- Uitgebreid baasdashboard met shifts, rapporten, dagafsluiting en uitgebreide deelbetalingen.
- Productkaartwijzigingen centraal tussen alle apparaten synchroniseren.
- Het serverpakket werkelijk downloaden en starten op Amirs Mac.
- Het echte afzonderlijke Flowchart-bestand lokaliseren en analyseren, wanneer dat beschikbaar is.
- Productievalidatie, Belgische fiscale/GKS-koppeling en betaalterminal.

## AI-status

De standaard spraakfunctie werkt zonder API-sleutel en zonder server via browsertranscriptie en lokale kaartcontrole. Alleen wanneer lokaal niets betrouwbaar wordt gevonden én een serverlink is ingesteld, kan de optionele OpenAI-terugval worden gebruikt. De API-sleutel blijft uitsluitend op de Mac.
