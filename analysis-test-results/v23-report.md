# Registratiekassa v23 — mobiele layouttest

**Resultaat: GESLAAGD**

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
- ✅ Product kan toegevoegd worden zonder terug naar de plattegrond te springen — 593 -> 591
- ✅ Bestaande dubbele-tikfunctie blijft werken — 1× -> 2×
- ✅ Bestaand minteken blijft exact één verminderen — 2× -> 1×
- ✅ Kleine iPhone gebruikt drie kolommen — {"columns":3,"width":350,"scrollWidth":350}
- ✅ Kleine iPhone heeft geen horizontale overflow — 350/350
- ✅ Desktop krijgt de telefoonlayout niet — {"phoneClass":false,"columns":5,"tileHeight":76}
- ✅ Desktopdichtheid blijft behouden — kolommen=5
- ✅ Geen onverwachte JavaScript-paginafouten

