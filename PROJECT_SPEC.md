# Registratiekassa — vaste projectspecificatie

Deze checklist bewaart de opdrachten uit de volledige chat. Flowchart wordt niet verwijderd of overschreven; het is uitsluitend geanalyseerd om de spraakwerking correct over te nemen.

## Vaste eisen van Amir

- Eerste scherm: Team-profielen zonder wachtwoord en een Baas-login met PIN `0607`.
- Exacte plattegrond met 33 tafels.
- T1–T8 liggen buiten het café op het terras en worden door een duidelijke gevel-/ingangslijn van binnen gescheiden.
- Tafels moeten overzichtelijk, gelijkmatig en volgens de oorspronkelijke foto staan; tafels 3–9 staan op één horizontale lijn.
- Tafelstatus: wit = vrij, blauw = open, roze = rekening gevraagd.
- Bij verplaatsen/samenvoegen moeten mogelijke doeltafels oranje knipperen.
- De volledige kaart met ongeveer 260 producten en gemakkelijk beheer van namen, categorieën en prijzen.
- Desktop/iPad: versleepbare scheiding plus knoppen voor Beide, Plattegrond en Bestellen.
- Telefoon: compacte plattegrond, verticale workflow en naar de bestelling scrollen na tafelkeuze.
- Volledige rekening verplaatsen en rekeningen samenvoegen.
- Eén productlijn of meerdere geselecteerde lijnen kunnen verplaatsen.
- Aantal kunnen wijzigen door op de hoeveelheid te drukken.
- Per productlijn naar links swipen voor Verplaats of Verwijder.
- Waarschuwing bij gelijktijdige bewerking door meerdere personen/apparaten.
- Baas-only auditlogboek met wie, wanneer en vanaf welk apparaat iets toevoegde of wijzigde.
- Offline-first met IndexedDB; bij herstel van verbinding alleen nog onbevestigde bewerkingen synchroniseren.
- Centrale server met SQLite in WAL-modus, append-only operation log, unieke operation-ID’s, ondertekende sessietokens, login-rate-limiting, security headers, apparaatregistratie en back-ups.
- Veilige Tailscale-link met naam Registratiekassa; gsm/iPad moeten de webapp op het beginscherm kunnen plaatsen.
- Live spraak: herkende producten tijdens het spreken tonen, elk met een kruisje; correcties zoals “nee, ik bedoel…” en verwijderen moeten werken.
- Externe AI-sleutels mogen nooit in GitHub Pages of browsercode staan.

## Geverifieerde Flowchart-spraakwerking

De nieuwste onderzochte versie gebruikt geen OpenAI-model, LLM of externe AI-API. Ze gebruikt:

1. `SpeechRecognition` of `webkitSpeechRecognition` van de browser met taal `nl-BE`.
2. Tussentijdse transcripties tijdens het spreken.
3. Een lokale tweede controle die tekst normaliseert, aantallen herkent en productnamen met de actuele kaart vergelijkt.
4. Een bevestigings-/verwijderlaag voordat herkende producten definitief worden toegevoegd.

De eerdere onbewezen claim dat Flowchart `gpt-5.2` gebruikte, is ingetrokken.

## In huidige GitHub-versie uitgevoerd

- Team-/medewerkerkeuze en Baas-login met PIN `0607`.
- 33 tafels, terras T1–T8, gevel-/ingangslijn en gelijke uitlijning van tafels 3–9.
- Drie weergaveknoppen en versleepbare desktopverdeling.
- Tablet- en telefoonlayout met verticale workflow.
- Tafelstatussen wit, blauw en roze voor vrij, open en rekening gevraagd.
- Oranje knipperende doeltafels tijdens het verplaatsen van een rekening of productlijnen.
- Producttegels, rekening, bestellen, betalen, volledige rekening verplaatsen en rekeningen samenvoegen.
- Eén of meerdere geselecteerde productlijnen verplaatsen of verwijderen.
- Hoeveelheid wijzigen door op het aantal te drukken.
- Naar links swipen per productlijn voor Verplaats of Verwijder.
- Basis-auditlogboek voor de baas met medewerker, tijdstip, apparaat-ID en actie.
- Lokale offline opslag en installeerbare PWA.
- Live Nederlandstalige browser-spraakherkenning met voorlopige productchips en kruisjes.
- Lokale parser voor aantallen, correcties en verwijderen.
- De geverifieerde lokale Flowchart-methode wordt vóór elke externe AI-aanroep uitgevoerd.
- Optionele veilige OpenAI-terugval wanneer de lokale parser niets betrouwbaar herkent.
- Node.js-backend voor de OpenAI Responses API; product-ID’s en aantallen worden server-side gevalideerd.
- Uitvoerbare `START.command` en `STOP.command` voor macOS en Tailscale Serve.
- Oude DLL Injector bewaard op branch `backup/dll-injector-original-2026-07-24`.

## Gebouwd maar nog niet op Amirs Mac geactiveerd

Deze onderdelen zijn alleen nodig voor de optionele extra AI, niet voor de gewone Flowchart-spraakwerking:

- De lokale uitbreidingsserver starten via `server/START.command`.
- Eén keer een OpenAI API-sleutel invoeren.
- Tailscale HTTPS/Serve zo nodig één keer toestaan.
- De gegenereerde Tailscale-serverlink op gsm en iPad laten opslaan.

## Nog niet volledig uitgevoerd

- Publieke GitHub Pages-link: repository staat nog privé en Pages is niet als publicatiesource bevestigd.
- Volledige kaart van ongeveer 260 producten en baas-interface voor kaart-/prijsbeheer verder controleren tegen de oorspronkelijke kaart.
- Multi-user conflictwaarschuwingen.
- Uitgebreid baasdashboard, centraal append-only auditlogboek, shifts, rapporten, dagafsluiting en uitgebreide deelbetalingen.
- IndexedDB-operatiewachtrij en echte realtime multi-device synchronisatie.
- Centrale SQLite/WAL-database, append-only log, sessietokens, device registration en automatische back-ups.
- Het lokale serverpakket werkelijk installeren en starten op Amirs Mac.
- Productievalidatie, Belgische fiscale/GKS-koppeling en betaalterminal.

## AI-status

De standaard spraakfunctie volgt nu de geverifieerde Flowchart-logica: browsertranscriptie, live lokale kaartcontrole en verwijderbare voorlopige resultaten. Dit werkt zonder API-sleutel en zonder Tailscale-server. Alleen wanneer lokaal niets betrouwbaar wordt gevonden én een serverlink is ingesteld, mag de optionele OpenAI-terugval worden gebruikt. De API-sleutel blijft uitsluitend op de Mac.
