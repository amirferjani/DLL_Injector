# Registratiekassa v23 — mobiele layouttest

**Resultaat: MISLUKT**

- ✅ Telefoon krijgt de v23-layout — {"mobileVersion":"23","phoneClass":true,"columnAttribute":"4","columns":4,"tileHeight":88,"tileNameFont":"13px","tilePriceFont":"11.5px","categoryDisplay":"flex","categoryOverflowX":"auto","categoryFont":"11.5px","visibleActionButtons":["Plattegrond","Rekening gevraagd","Verplaats"],"visibleTabs":["Favorieten","Alle producten","Recent"],"voiceVisible":true,"documentWidth":402,"documentScrollWidth":402}
- ✅ Gangbare iPhone gebruikt vier compacte kolommen — kolommen=4
- ✅ Productkaart blijft compact en minstens 88px hoog — 88
- ✅ Productnaam blijft leesbaar zonder enorme kaart — 13px
- ✅ Prijs blijft leesbaar — 11.5px
- ✅ Categorieën zijn een horizontale schuifstrook — flex/auto
- ✅ Alle drie kaarttabbladen zijn tegelijk zichtbaar — ["Favorieten","Alle producten","Recent"]
- ✅ Microfoonknop blijft zichtbaar — voiceButton
- ✅ Rekeningacties staan naast elkaar en verdwijnen niet — ["Plattegrond","Rekening gevraagd","Verplaats"]
- ✅ Geen horizontale documentoverflow — 402/402
- ✅ Product kan toegevoegd worden zonder terug naar de plattegrond te springen — 632 -> 591
- ❌ Bestaande dubbele-tikfunctie blijft werken — 1× -> 1×

## Fout

```
Error: Bestaande dubbele-tikfunctie blijft werken: 1× -> 1×
    at check (file:///home/runner/work/DLL_Injector/DLL_Injector/tests/e2e-v23-mobile-layout.mjs:18:18)
    at file:///home/runner/work/DLL_Injector/DLL_Injector/tests/e2e-v23-mobile-layout.mjs:123:3
```