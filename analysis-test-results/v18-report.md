# Registratiekassa v18 — E2E-test

**Resultaat: GESLAAGD**

- ✅ Baaslogin werkt
- ✅ Testserver wordt als online weergegeven
- ✅ Product kan normaal toegevoegd worden
- ✅ Eén tik opent als Baas nog steeds productgeschiedenis
- ✅ Eén tik verhoogt het aantal niet
- ✅ Dubbele tik verhoogt exact met één
- ✅ Dubbele tik opent geen geschiedenis
- ✅ Minteken staat naast het kruis — ["−","×"]
- ✅ Minteken vermindert exact één
- ✅ Plus en min blijven in het append-only auditlog zichtbaar
- ✅ PWA-serviceworker bestuurt de pagina
- ✅ Bediening blijft offline lokaal werken
- ✅ Offline wijziging blijft in lokale synchronisatiewachtrij — queue=1
- ✅ Verbindingsfout krijgt backoff en blijft bewaard — {"lastError":"Failed to fetch","nextRetryAt":1784933535272,"failureCount":2}
- ✅ IndexedDB-veiligheidskopie herstelt bestelling bij offline reload
- ✅ Wachtrij wordt na verbindingsherstel bevestigd en geleegd
- ✅ Fake SQLite/Tailscale-server ontving mutaties — {"syncCalls":5,"acceptedMutations":3,"acceptedAudits":4,"acceptedPayments":0}
- ✅ Geen onverwachte JavaScript-paginafouten

Verwachte offline netwerkfouten: 3.

Fake server: `{"syncCalls":5,"acceptedMutations":3,"acceptedAudits":4,"acceptedPayments":0}`
