# Registratiekassa — feature-audit en herstelregister

Laatste audit: 25 juli 2026

Dit document bestaat omdat kassafuncties nooit stilzwijgend mogen verdwijnen. Voor iedere grotere wijziging wordt eerst een back-upbranch gemaakt en daarna een echte browsertest uitgevoerd.

## Back-upbranches

- `backup/dll-injector-original-2026-07-24`
- `backup/pre-full-feature-audit-2026-07-24`
- `backup/pre-order-controls-offline-2026-07-25`
- `backup/pre-mobile-readability-v19-2026-07-25`

## Behouden en aanwezig

- Teamlogin en Baaslogin met PIN.
- 33 tafels, terras T1–T8 en de tafelstatussen vrij, open en rekening gevraagd.
- Beide / Plattegrond / Bestellen en versleepbare desktopverdeling.
- Mobiele, iPad- en Apple/PWA-weergave met safe-area-correcties.
- Kaart met 260 producten, categorieën, zoeken, favorieten en recente producten.
- Toevoegen, aantallen wijzigen, verwijderen, bestellen en betalen.
- Rekening gevraagd.
- Volledige rekening verplaatsen of samenvoegen.
- Eén of meerdere productlijnen selecteren, verplaatsen of verwijderen.
- Swipe-acties op productlijnen.
- Kaart- en prijsbeheer voor de Baas.
- Directe product- en rekeninghistoriek.
- Uitgebreid Baascentrum met filters, verwijderde regels, rekeningen, shifts, dagafsluiting, rapporten en CSV-export.
- Lokale offline opslag en PWA-installatie.
- Gedeelde Tailscale/SQLite-server, unieke operatie-ID’s, conflictdetectie en back-ups wanneer die op de Mac gestart is.
- Nederlandse spraak, kaartaliassen, huismerken, mixdranken en optionele nauwkeurige Nederlandse servertranscriptie.

## V18 toegevoegd zonder bestaande bediening te verwijderen

- Dubbele tik of dubbele klik op de producttekst verhoogt exact één.
- Een enkele tik blijft voor de Baas de productgeschiedenis openen.
- Een zichtbaar minteken staat rechtstreeks naast het kruis.
- Het minteken vermindert exact één.
- Het kruis blijft de volledige productregel verwijderen.
- De bestaande aantalknop en aantaldialoog blijven behouden.
- De plus- en minhandelingen blijven zichtbaar in het append-only auditlog.
- De serverknop toont lokaal, verbonden, synchroniseren, offline of conflict.
- Serveraanvragen hebben een time-out.
- Verbindingsfouten krijgen exponentiële backoff met jitter.
- Onmiddellijke retry bij netwerkherstel, focus, `pageshow` en terugkeer uit de achtergrond.
- De kassastand krijgt een aanvullende IndexedDB-veiligheidskopie.
- De synchronisatiewachtrij blijft ook bij een serverstoring lokaal bewaard.
- De serviceworker cachet alle nieuwe v18-bestanden.

## V19 toegevoegd zonder bestaande bediening te verwijderen

Na controle van de aangeleverde iPhone-schermafbeelding en de actieve CSS bleek dat de primaire producttekst slechts 10 px was, de prijs 9 px en de categorieën 8–9 px. De eerdere onmiddellijke suggestie om alles naar 16–18 px te vergroten en de plattegrond ongeveer 30% te verkleinen was te grof en is bewust niet uitgevoerd.

V19 doet doelgerichte aanpassingen:

- iPhones worden via toestelkenmerken herkend, ook wanneer Safari een onverwacht brede layoutviewport gebruikt.
- Een normale iPhone gebruikt 3 productkolommen; een brede iPhone-layout gebruikt maximaal 4 en nooit meer 6.
- Productnamen worden 13,5 px, prijzen 12 px en tegels minimaal 94 px hoog.
- Categorieën worden horizontale knoppen van 12 px, zodat zij niet langer een smalle verticale kolom naast de producten vormen.
- Zoeken en de drie hoofdweergaven krijgen 13 px tekst.
- De belangrijkste rekeningacties krijgen een 2×2-indeling met aanraakhoogte van minimaal 44 px.
- `Verplaats` blijft op de telefoon zichtbaar; de functie wordt niet langer door de oude mobiele CSS verborgen.
- Bestellingsregels krijgen 14 px hoofdtekst, 10,5 px status en grotere aantal-/min-/verwijderbediening.
- Bestellen en betalen krijgen duidelijkere primaire tekst.
- Kleine decoratieve labels, legenda en kaartdecoratie blijven compact; er is geen globale vergrotingsfactor toegepast.
- De plattegrond is niet agressief verkleind, omdat 33 tafels anders te dicht op elkaar zouden komen.
- Desktop behoudt zijn bestaande dichte productweergave.

## Functies verwijderd in v18 of v19

**Geen.**

De nieuwe code wordt aanvullend geladen bovenop de bestaande kassakern. De gecomprimeerde productkaart, tafelplan, betaalfuncties, verplaatsfuncties, spraak, Baascentrum en serverkern zijn niet vervangen.

## Gecontroleerde v18-werking

Een echte mobiele Chromium/Playwright-test op de volledige webapp bevestigde:

- Baaslogin en serververbinding;
- normale producttoevoeging;
- enkele tik opent geschiedenis en verhoogt niet;
- dubbele tik verhoogt exact één en opent geen geschiedenis;
- `−` staat naast `×`;
- `−` vermindert exact één;
- plus en min blijven in het auditlog;
- PWA-serviceworker bestuurt de pagina;
- bediening blijft werken terwijl de server hard onbereikbaar is;
- de offline wijziging blijft in de wachtrij;
- backoff wordt opgeslagen;
- IndexedDB herstelt de rekening na een offline reload;
- de wachtrij wordt na herstel door de testserver bevestigd en geleegd;
- geen onverwachte JavaScript-paginafouten.

Zie `docs/TEST_RESULTS_V18.md`.

## Gecontroleerde v19-werking

Een echte browsertest op de volledige webapp bevestigde:

- een iPhone van 390 px krijgt 3 productkolommen;
- een brede iPhone-layout van 708 px krijgt 4 productkolommen en niet 6;
- primaire product-, categorie-, zoek-, rekening- en checkouttekst haalt de vastgelegde minimumgroottes;
- aanraakknoppen blijven minimaal 40–44 px;
- er is geen horizontale documentoverflow;
- desktop blijft 5 kolommen gebruiken en wordt niet globaal vergroot;
- geen onverwachte JavaScript-paginafouten.

Zie `docs/TEST_RESULTS_V19.md`.

## Grenzen en nog te valideren

- Volledig centraal auditoverzicht over alle toestellen vereist dat de Mac/Tailscale/SQLite-server draait en ieder toestel daarmee verbonden is.
- De huidige clientwachtrij coalesceert wijzigingen per tafel als een veilige tafelsnapshot. Voor een latere native app is een fijnmazige append-only delta-operatiewachtrij aanbevolen.
- iOS kan achtergrondwerk beperken; daarom synchroniseert de app onmiddellijk bij hervatten en openen.
- Langdurige tests met meerdere echte iPads, stroomuitval, routerwissels en Tailscale-herauthenticatie blijven nodig.
- Uitgebreide deelbetalingen, terugbetalingen, fiscale correcties, GKS en betaalterminal blijven productieonderwerpen.

## Wijzigingsregel vanaf nu

1. Eerst een back-upbranch.
2. Vergelijk de wijziging met dit register en de projectspecificatie.
3. Verwijder geen bestaande bediening zonder expliciete vermelding en toestemming.
4. Test zowel de nieuwe functie als de oude functies die ermee overlappen.
5. Publiceer pas na een geslaagde browsertest.
6. Bewaar testbewijs en documenteer resterende beperkingen.
