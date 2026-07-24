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
- Veilige optionele AI-koppeling vanuit de webapp, met automatische terugval naar de lokale parser.
- Lokale Node.js-AI-server die de OpenAI Responses API gebruikt en de API-sleutel uitsluitend op de Mac bewaart.
- `START.command` en `STOP.command` voor de server en Tailscale Serve.
- Het gebruikte AI-model is via `OPENAI_MODEL` configureerbaar en wordt niet onbewezen vastgelegd als het Flowchart-model.
- Oude DLL Injector bewaard op branch `backup/dll-injector-original-2026-07-24`.

## Gebouwd maar nog niet op Amirs Mac geactiveerd

- De lokale AI-server starten via `server/START.command`.
- Eén keer de OpenAI API-sleutel invoeren.
- Tailscale HTTPS/Serve zo nodig één keer toestaan.
- De gegenereerde Tailscale-serverlink op gsm en iPad laten opslaan.

## Nog te voltooien / verder samenvoegen

- Publieke GitHub Pages-link definitief controleren; de repository is momenteel privé.
- Alle geavanceerde functies uit de volledige Benchmark Edition opnieuw samenvoegen, waaronder uitgebreid kaartbeheer, baasdashboard, auditlogboek, shifts, dagafsluiting, uitgebreide deelbetalingen en conflictbeheer.
- Echte gedeelde multi-device database en realtime synchronisatie voor alle rekeningen en tafels.
- De server uitbreiden van AI-orderparser naar centrale kassadatabase/syncserver.
- Flowchart uitsluitend analyseren om de echte AI-provider, het model, de promptstructuur en uitvoerwijze te bevestigen; Flowchart zelf blijft onaangeraakt.
- Productievalidatie, Belgische fiscale/GKS-koppeling en betaalterminal vallen buiten het huidige prototype.

## AI-status

De live spraakfunctie werkt zonder externe AI via browser-spraakherkenning en een lokale productparser. Wanneer de Tailscale-server is ingesteld, stuurt de app alleen het uiteindelijke transcript en de toegestane productcatalogus naar de lokale server. De server roept de OpenAI Responses API aan, valideert de teruggegeven product-ID's en aantallen, en geeft uitsluitend veilige toevoeg-/verwijderacties terug. De API-sleutel staat nooit in GitHub Pages.
