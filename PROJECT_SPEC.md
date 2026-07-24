# Registratiekassa — vaste projectspecificatie

Deze checklist bewaart de opdrachten uit de chat. Flowchart wordt niet verwijderd of overschreven.

## In huidige GitHub-versie uitgevoerd

- Medewerker kiezen bij het starten.
- Drie weergaveknoppen: Beide, Plattegrond en Bestellen.
- Versleepbare scheiding tussen plattegrond en bestelling op desktop.
- Tablet- en telefoonlay-out met verticale workflow en springen naar de bestelling na tafelkeuze.
- Terras T1–T8 zichtbaar buiten het café, met duidelijke gevel-/ingangslijn.
- Terrastafels ordelijk uitgelijnd.
- Tafels 3 tot en met 9 op exact dezelfde horizontale lijn.
- Producttegels, categorieën, rekening, bestellen en betalen.
- Rekening verplaatsen of samenvoegen met een andere tafel.
- Lokale offline opslag op het toestel.
- Installeerbare PWA voor beginscherm.
- Live Nederlandstalige spraakherkenning in ondersteunde browsers.
- Tijdens het spreken worden herkende producten als voorlopige chips getoond.
- Elke voorlopige herkenning heeft een kruisje om ze niet toe te voegen.
- Gesproken correcties en opdrachten zoals verwijderen/weg worden verwerkt.
- Oude DLL Injector bewaard op branch `backup/dll-injector-original-2026-07-24`.

## Nog te voltooien / verder samenvoegen

- Publieke GitHub Pages-link definitief controleren.
- Alle geavanceerde functies uit de volledige Benchmark Edition opnieuw samenvoegen, waaronder uitgebreid kaartbeheer, baasdashboard, auditlogboek, shifts, dagafsluiting, uitgebreide deelbetalingen en conflictbeheer.
- Echte gedeelde multi-device database en realtime synchronisatie.
- Lokale Mac-server en Tailscale-startscript.
- Veilige URL/toegangscontrole voor de server.
- Externe AI-integratie achter een beveiligde serverendpoint.
- Flowchart uitsluitend analyseren om de echte AI-provider, het model, de promptstructuur en uitvoerwijze over te nemen; Flowchart zelf blijft onaangeraakt.
- Productievalidatie, Belgische fiscale/GKS-koppeling en betaalterminal vallen buiten het huidige prototype.

## AI-status

De huidige live spraakfunctie gebruikt de browser-spraakherkenning plus een lokale productparser. Er is nog geen bewezen Flowchart-model geïntegreerd. Een OpenAI- of andere AI-sleutel mag niet in GitHub Pages worden geplaatst, omdat bezoekers die sleutel dan kunnen uitlezen. Een echte AI-koppeling moet daarom via de beveiligde lokale/Tailscale-server lopen.
