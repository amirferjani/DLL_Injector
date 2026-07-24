# Registratiekassa · Café De Zoo

Webapp voor tafelbeheer, bestellingen, betalingen en live Nederlandstalige spraakinvoer.

## Openen

Na GitHub Pages-deployment staat de app normaal op:

`https://amirferjani.github.io/DLL_Injector/`

## Werking

- Kies bij het starten wie werkt.
- Wissel bovenaan tussen **Beide**, **Plattegrond** en **Bestellen**.
- Op desktop kan de scheiding tussen tafelplan en bestelmenu versleept worden.
- Op telefoon staan de delen onder elkaar en springt de app na tafelkeuze naar de bestelling.
- Spraak gebruikt standaard dezelfde geverifieerde aanpak als de onderzochte Flowchart-versie: browsertranscriptie plus lokale controle tegen de productkaart.
- Voorlopig herkende producten verschijnen live met een kruisje om ze weg te laten.
- Een externe OpenAI/Tailscale-server is alleen een optionele terugval wanneer de lokale herkenning niets betrouwbaar vindt.
- Bestellingen worden lokaal op het apparaat bewaard en blijven offline beschikbaar.

## Belangrijk

Dit is een test- en bedieningsprototype, geen gecertificeerd Belgisch GKS/fiscaal kassasysteem. GitHub Pages levert alleen statische hosting; meerdere apparaten synchroniseren niet automatisch met elkaar zonder aparte server/database.
