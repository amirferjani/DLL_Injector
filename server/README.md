# Optionele extra AI via Tailscale

De geverifieerde Flowchart-spraakwerking heeft deze server niet nodig: browsertranscriptie en lokale productcontrole werken rechtstreeks in de webapp.

Deze server is alleen een extra terugval voor zinnen die de lokale parser niet betrouwbaar begrijpt. De OpenAI API-sleutel blijft op de Mac en wordt nooit naar GitHub Pages gestuurd.

## Starten op macOS

1. Download of clone deze repository.
2. Open de map `server`.
3. Dubbelklik op `START.command`.
4. macOS kan de eerste keer vragen om het bestand via rechtermuisklik → Open te starten.
5. Vul één keer de OpenAI API-sleutel in.
6. Tailscale kan één keer een toestemmingspagina openen om HTTPS voor Serve te activeren.

Daarna opent het script de kassa met de optionele Tailscale-serverlink ingesteld. De server luistert alleen op `127.0.0.1`; Tailscale Serve verzorgt HTTPS en toegang binnen het tailnet.

## Stoppen

Dubbelklik op `STOP.command`.

## Model

Het uitbreidingsmodel staat in `.env` als `OPENAI_MODEL`. Dit is geen Flowchart-model: de onderzochte Flowchart-versie gebruikt helemaal geen extern AI-model. Het model kan later bewust worden gekozen voor de optionele terugval zonder de standaard lokale spraakwerking te veranderen.
