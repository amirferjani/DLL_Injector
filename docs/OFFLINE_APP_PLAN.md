# Offline- en synchronisatieplan voor de Registratiekassa en een latere iPad-app

Datum: 25 juli 2026

## Doel

Een medewerker moet op een iPad kunnen blijven werken wanneer wifi, internet, Tailscale of de Mac-server tijdelijk wegvalt. Geen bestelling, betaling of logregel mag stil verdwijnen, dubbel worden verwerkt of zonder waarschuwing door een ander toestel worden overschreven.

## Wat de huidige webapp al doet

### Lokaal eerst

Elke bediening wijzigt onmiddellijk de lokale kassastand. De gebruiker wacht niet op de server. De bestaande `_sync.queue` bewaart per gewijzigde tafel een unieke operatie-ID, de bekende basisrevisie, de volledige lokale rekening en het apparaat-ID.

### Duurzame lokale opslag

De primaire kassastand blijft in `localStorage` voor snelle compatibiliteit met de bestaande app. V18 schrijft daarnaast een gedebouncete kopie naar IndexedDB:

- database: `registratiekassa-durable-v1`;
- store: `snapshots`;
- sleutel: de bestaande kassastate-key;
- herstel alleen wanneer de primaire lokale waarde ontbreekt of ongeldig is.

Deze laag is aanvullend en wist de bestaande opslag niet.

### PWA-cache

De serviceworker bewaart de HTML, loader, gecomprimeerde kassakern, stijlen, Apple-fixes, spraakcode, auditcode, snelle aantalknoppen en verbindingsbeheer. Daardoor kan de beginscherm-app na een eerste geslaagde laadbeurt zonder netwerk openen.

### Herverbinding

- fetch-time-out voor serveraanvragen;
- exponentiële backoff met willekeurige jitter;
- maximaal één actieve client-sync tegelijk;
- onmiddellijke retry bij `online`, focus, `pageshow` en zichtbaarheid na hervatten;
- periodieke healthcheck;
- duidelijke status: lokaal, verbonden, synchroniseren, offline of conflict;
- de wachtrij wordt niet gewist wegens een mislukte aanvraag.

### Serverbevestiging

De SQLite-server gebruikt:

- WAL-modus;
- een unieke `op_id` in `operation_log`;
- tabelrevisies;
- optimistic concurrency;
- append-only operatie- en auditlogs;
- apparaatregistratie;
- databaseback-ups.

Komt dezelfde operatie na een time-out opnieuw binnen, dan kan de server ze aan de unieke operatie-ID herkennen en opnieuw bevestigen zonder ze dubbel toe te passen.

## Huidig operatieformaat

De bestaande webclient synchroniseert een veilige tafelsnapshot:

```json
{
  "id": "sync-uuid",
  "tableId": "T4",
  "baseRevision": 17,
  "order": {
    "id": "order-uuid",
    "items": []
  },
  "updatedAt": 1784990000000,
  "deviceId": "device-uuid"
}
```

Wanneer meerdere lokale wijzigingen op dezelfde tafel nog niet verzonden zijn, vervangt de client de wachtende snapshot door de nieuwste lokale stand, maar behoudt hij de oorspronkelijke operatie-ID en basisrevisie. Dit beperkt wachtrijgroei.

## Aanbevolen protocol voor de latere native app

Voor een volwaardige app is een append-only delta-operatiewachtrij nog sterker dan alleen tafelsnapshots.

```json
{
  "operationId": "uuid",
  "deviceId": "ipad-bar-01",
  "staffId": "amir",
  "createdAt": 1784990000000,
  "tableId": "T4",
  "orderId": "order-uuid",
  "baseRevision": 17,
  "type": "item_quantity_delta",
  "payload": {
    "productId": "p229",
    "delta": -1
  }
}
```

### Vaste verwerkingsvolgorde

1. Maak lokaal een unieke `operationId`.
2. Schrijf de operatie atomair naar IndexedDB of de native lokale database.
3. Pas de operatie onmiddellijk toe op de lokale projectie.
4. Voeg een append-only auditregel toe met medewerker, toestel en lokaal tijdstip.
5. Toon de wijziging in de interface.
6. Stuur onbevestigde operaties naar de server zodra verbinding beschikbaar is.
7. De server verwerkt dezelfde `operationId` maximaal één keer.
8. De server antwoordt met acknowledgement, servertijd en nieuwe revisie.
9. Markeer de lokale operatie pas dan als bevestigd.
10. Verwijder nooit een onbevestigde operatie alleen omdat een healthcheck groen is.

## Waarom delta-operaties nuttig zijn

Twee iPads kunnen onafhankelijk `+1` op hetzelfde drankje uitvoeren. Twee delta’s kunnen vaak veilig worden samengevoegd. Een opdracht “zet het aantal op 4” kan daarentegen stil de wijziging van een ander toestel overschrijven.

Niet alle acties zijn combineerbaar. Twee gelijktijdige tafelverplaatsingen of betalingen vereisen een conflictbeslissing.

## Conflicten

Elke tafel heeft een oplopende revisie.

- **Zelfde basisrevisie:** operatie wordt toegepast en revisie stijgt.
- **Herhaalde operation-ID:** server geeft dezelfde bevestiging terug.
- **Combineerbare delta:** server kan gecontroleerd samenvoegen.
- **Niet combineerbaar:** server maakt een conflictobject met lokale en serverversie.
- **Baasbeslissing:** behoud lokaal, behoud server of maak een gecontroleerde samenvoeging.

Een conflict mag nooit stil leiden tot “laatste schrijver wint”.

## Logs bij offline gebruik

Iedere logregel hoort minimaal te bevatten:

- lokale gebeurtenis-ID;
- operation-ID;
- medewerker-ID en naam;
- apparaat-ID;
- lokaal tijdstip;
- later toegevoegde servertijd;
- tafel en rekening;
- product;
- oud en nieuw aantal;
- bron: tik, dubbele tik, spraak, synchronisatie of beheer;
- status: lokaal, wachtend, bevestigd of conflict;
- serverrevisie na bevestiging.

Verwijderde regels blijven in het auditlog staan.

## iOS- en appgedrag

iOS kan achtergrondprocessen en netwerktoegang pauzeren. Daarom mag correcte werking niet afhankelijk zijn van een permanente achtergrondverbinding.

De latere app moet altijd synchroniseren bij:

- appstart;
- terugkeer uit de achtergrond;
- netwerkherstel;
- wijziging van wifi of Tailscale-pad;
- handmatige herlaadactie;
- vlak vóór en na een betaling, voor zover verbinding beschikbaar is.

Een native app-shell kan later betere microfoontoegang, beveiligde opslag, toestelregistratie, biometrische baascontrole en beperkte achtergrondtaken toevoegen. De synchronisatie-engine hoort los van de schermcode te blijven, zodat web, iPad, iPhone en desktop hetzelfde protocol gebruiken.

## Verbindingsstatus voor de gebruiker

- **Server verbonden:** geen lokale wachtrij en recente healthcheck.
- **Synchroniseren · N:** lokale mutaties, logs of betalingen wachten op bevestiging.
- **Offline · N wachtend:** server niet bereikbaar; bediening blijft lokaal werken.
- **Conflict (N):** menselijke controle vereist.
- **Server instellen:** alleen lokale werking; geen synchronisatie tussen toestellen.

## Testmatrix vóór productie

1. Wifi uit tijdens twintig opeenvolgende bestellingen.
2. App volledig afsluiten met een wachtende wachtrij.
3. iPad herstarten zonder netwerk en opnieuw bestellen.
4. Netwerk herstellen en controleren dat iedere operation-ID eenmaal is verwerkt.
5. Twee iPads tegelijk `+1` en `−1` op dezelfde rekening.
6. Twee gelijktijdige tafelverplaatsingen.
7. Betaling tijdens een netwerkonderbreking.
8. Mac-server herstarten midden in een sync.
9. Routerwissel en nieuw IP-pad terwijl Tailscale actief blijft.
10. Tailscale-login verlopen.
11. SQLite-back-up en herstel uitvoeren.
12. Zeven dagen log- en wachtrijgroei meten.
13. Batterij- en geheugengebruik op oudere iPads testen.
14. Safari en beginscherm-app apart testen.

## Wat v18 aantoonbaar heeft getest

De automatische mobiele E2E-test simuleerde een harde serverstoring. Tijdens die storing bleef een producttoevoeging lokaal zichtbaar, bleef één mutatie in de wachtrij staan, werd backoff opgeslagen en kon de rekening na een offline reload uit IndexedDB worden hersteld. Na herstel bevestigde de testserver de mutaties en werd de wachtrij geleegd.

## Wat nog niet als productiegarantie wordt geclaimd

- onbeperkte offline duur;
- gegarandeerde iOS-achtergrondsync;
- automatische merge van alle conflictsoorten;
- fiscale/GKS-conformiteit;
- betaalterminaltransacties;
- terugbetalingen en uitgebreide deelbetalingen;
- operationele beschikbaarheid zonder monitoring van de Mac-server;
- bescherming tegen verlies van het volledige toestel zonder serverback-up.
