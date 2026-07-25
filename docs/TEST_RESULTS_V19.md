# Registratiekassa v19 — mobiele leesbaarheid

**Resultaat: GESLAAGD**

De volledige webapp is in Chromium/Playwright getest met een iPhone-user-agent op twee layoutviewports en daarnaast op desktop.

## iPhone 390 px

- Toestelclassificatie: `phone`.
- Productkolommen: 3.
- Productnaam: 13,5 px.
- Productprijs: 12 px.
- Producttegel: 94 px hoog.
- Categorieën: horizontaal scrollbare knoppen van 12 px.
- Zoekveld: 13 px.
- Beide / Plattegrond / Bestellen: 13 px.
- Rekeningacties: 12,5 px.
- Bestellingsregel: 14 px hoofdtekst en 10,5 px statustekst.
- Minbediening: 42 × 42 px.
- Bestelknop: 17 px.
- Geen horizontale documentoverflow.

## Brede iPhone-layout van 708 px

Deze test bootst het probleem uit de aangeleverde schermafbeelding na: Safari kan soms een onverwacht brede layoutviewport gebruiken terwijl het toestel nog steeds een iPhone is.

- Toestel blijft correct als `phone` geclassificeerd.
- Productgrid gebruikt 4 kolommen, nooit 6.
- Productnaam blijft 13,5 px.
- Geen horizontale documentoverflow.

## Desktop 1440 px

- Toestelclassificatie: `desktop`.
- Bestaande dichte desktopweergave blijft 5 productkolommen gebruiken.
- De telefoonvergroting wordt niet globaal op desktop toegepast.

## JavaScript

Geen onverwachte paginafouten tijdens de drie tests.

Testbestanden:

- `tests/e2e-v19-readability.mjs`
- `analysis-test-results/v19-report.json`
- `analysis-test-results/v19-iphone-390.png`
- `analysis-test-results/v19-iphone-708.png`
