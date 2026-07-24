# Beveiligde AI-server via Tailscale

Deze server houdt de OpenAI API-sleutel op de Mac. De openbare GitHub Pages-app krijgt de sleutel nooit te zien.

## Starten op macOS

1. Download of clone deze repository.
2. Open de map `server`.
3. Dubbelklik op `START.command`.
4. macOS kan de eerste keer vragen om het bestand via rechtermuisklik → Open te starten.
5. Vul één keer de OpenAI API-sleutel in.
6. Tailscale kan één keer een toestemmingspagina openen om HTTPS voor Serve te activeren.

Daarna opent het script de kassa met de Tailscale-serverlink al ingesteld. De server luistert alleen op `127.0.0.1` en Tailscale Serve verzorgt HTTPS en tailnet-toegang.

## Stoppen

Dubbelklik op `STOP.command`.

## Model

Het model staat in `.env` als `OPENAI_MODEL`. Zodra het echte Flowchart-model bewezen is, kan die waarde worden aangepast zonder de appcode te wijzigen.
