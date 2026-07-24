# Registratiekassa v18 — wijzigingen

Datum: 25 juli 2026

## Bestellingsregels

- Dubbele tik of dubbele klik op de producttekst verhoogt het aantal exact met één.
- Het bestaande gedrag voor de Baas blijft behouden: één tik opent de productgeschiedenis.
- De app wacht ongeveer 0,34 seconde om een enkele tik van een dubbele tik te onderscheiden.
- Een nieuw minteken staat rechtstreeks naast het bestaande kruis.
- Het minteken vermindert exact één.
- Het kruis verwijdert nog steeds de volledige regel.
- De aantalknop en de dialoog voor een exact aantal blijven bestaan.
- Productregels krijgen korte visuele feedback bij `+1` en `−1`.
- Plus en min lopen via de bestaande kassafuncties, zodat opslag, synchronisatie en audit blijven werken.

## Offline opslag

- De bestaande lokale kassastand blijft de primaire snelle opslag.
- Een aanvullende IndexedDB-kopie wordt na wijzigingen bijgewerkt.
- Bij een ontbrekende of onleesbare primaire waarde herstelt de loader de laatste IndexedDB-kopie vóór de kassakern start.
- Deze herstelwerking is getest tijdens een offline reload.

## Synchronisatie en verbinding

- Serverfetches hebben standaard een time-out van twaalf seconden.
- De harde afhankelijkheid van alleen `navigator.onLine` is verwijderd; een echte fetch bepaalt of de server bereikbaar is.
- Mislukte synchronisatie wordt opgeslagen met fouttekst, fouttijdstip, aantal mislukkingen en volgende retrytijd.
- Retry gebruikt exponentiële backoff met jitter.
- Een succesvolle synchronisatie wist de fout- en backoffstatus.
- Onmiddellijke retry bij netwerkherstel, focus, `pageshow` en terugkeer naar een zichtbaar tabblad.
- De serverknop toont lokaal, verbonden, synchroniseren, offline of conflict.
- Een periodieke healthcheck controleert de echte server.
- De PWA-serviceworker cachet alle nieuwe v18-bestanden.

## Beveiliging tegen regressies

- Back-upbranch: `backup/pre-order-controls-offline-2026-07-25`.
- De kassakern, productkaart, tafelplan, betalingen, verplaatsen, spraak en Baascentrum zijn niet vervangen.
- De nieuwe bediening en verbinding zijn aanvullende bestanden die via de loader worden geladen.
- Het feature-register is bijgewerkt.

## Test

De volledige webapp is met Playwright in een mobiel venster getest tegen een nagebootste SQLite/Tailscale-server. De test controleerde online gebruik, enkele tik, dubbele tik, min, auditlog, serviceworker, harde serveruitval, lokale wachtrij, backoff, IndexedDB-herstel en synchronisatie na herstel.

Resultaat: **geslaagd**, zonder onverwachte JavaScript-paginafouten.

Zie `TEST_RESULTS_V18.md`.
