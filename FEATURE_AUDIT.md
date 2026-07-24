# Registratiekassa — feature-audit en herstelregister

Datum audit: 24 juli 2026

Dit document bestaat omdat functies nooit meer stilzwijgend mogen verdwijnen. Voor grote wijzigingen wordt eerst een back-upbranch gemaakt. De toestand vóór dit herstel staat op:

`backup/pre-full-feature-audit-2026-07-24`

## Behouden en aanwezig

- Teamlogin en Baaslogin met PIN.
- 33 tafels, terras T1–T8 en de drie tafelstatussen.
- Beide / Plattegrond / Bestellen en versleepbare desktopverdeling.
- Mobiele en Apple/PWA-weergave.
- Kaart met 260 producten, categorieën, zoeken, favorieten en recente producten.
- Toevoegen, aantallen wijzigen, verwijderen, bestellen en betalen.
- Rekening gevraagd.
- Volledige rekening verplaatsen of samenvoegen.
- Eén of meerdere productlijnen selecteren, verplaatsen of verwijderen.
- Swipe-acties op productlijnen.
- Kaart- en prijsbeheer voor de baas.
- Lokale offline opslag en PWA-installatie.
- Gedeelde Tailscale/SQLite-server, conflictdetectie en back-ups wanneer die op de Mac gestart is.
- Nederlandse spraak, kaartaliassen en optionele nauwkeurige Nederlandse servertranscriptie.

## Functies die aantoonbaar waren teruggevallen of niet meer goed bereikbaar waren

- Het auditlogboek was teruggebracht tot één eenvoudige lijst zonder de oude filters.
- Er was geen directe geschiedenis meer door op een productregel in de bestelling te drukken.
- Toevoegingen en verwijderingen werden niet duidelijk per rekening en per medewerker opgeteld.
- Verwijderde regels waren niet gemakkelijk apart terug te vinden nadat ze uit de rekening verdwenen.
- De Baasomgeving bevatte geen geïntegreerde rekeninghistorie, shiftweergave, dagafsluiting en rapportoverzicht.
- Een lokaal log en een centraal log waren in de interface onvoldoende van elkaar te onderscheiden.

## In deze herstelronde teruggebracht

- Append-only lokaal auditlog dat verwijderingen niet weggooit.
- Import van bestaande audit-/operationlog-arrays wanneer die al in de kassastatus aanwezig zijn.
- Automatische registratie van:
  - rekening geopend, gesloten, verwijderd of verplaatst;
  - product toegevoegd, verwijderd, besteld of naar een andere tafel verplaatst;
  - rekening gevraagd of geannuleerd;
  - betalingen;
  - kaartwijzigingen;
  - shifts en dagafsluitingen.
- Volledige filters op datum, medewerker, tafel, actie, apparaat en vrije zoektekst.
- CSV-export van het gefilterde logboek.
- Aparte weergave voor verwijderde producten en rekeningen.
- Groepering per rekening met aantallen toegevoegd/verwijderd en omzet.
- Directe productgeschiedenis: als Baas op de producttekst of de geschiedenisknop van een bestellijn drukken.
- Detailtijdlijn per product of per rekening met medewerker, tijdstip, apparaat en bron.
- Baascentrum met rekeninghistorie, shifts, dagafsluiting en basisrapporten.

## Nog gedeeltelijk of afhankelijk van de Mac-server

- Een volledig centraal log over alle toestellen is alleen betrouwbaar wanneer de Tailscale/SQLite-server op de Mac draait en alle toestellen daarmee verbonden zijn.
- Gebeurtenissen van vóór deze herstelupdate kunnen alleen worden geïmporteerd wanneer ze nog in een bestaand lokaal of centraal log aanwezig zijn. Bestaande open regels zonder oud log krijgen een duidelijke beginsnapshot; ontbrekende historische handelingen worden niet verzonnen.
- Uitgebreide deelbetalingen, terugbetalingen en fiscale/GKS-koppeling vereisen nog afzonderlijke productievalidatie.

## Wijzigingsregel vanaf nu

1. Eerst een back-upbranch.
2. Daarna een featurevergelijking tegen dit bestand.
3. Geen bestaande bediening verwijderen zonder dat ze expliciet in dit register wordt vermeld.
4. Nieuwe interfacecode wordt zo veel mogelijk aanvullend geladen, zodat de kassakern niet opnieuw volledig wordt vervangen.
