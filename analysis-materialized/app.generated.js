(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('nl-BE', {style:'currency', currency:'EUR'}).format(value || 0);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const clone = (value) => JSON.parse(JSON.stringify(value));

  const memoryStorage = new Map();
  function browserStorage(kind) {
    try { return kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage; }
    catch { return null; }
  }
  function storageGet(kind, key) {
    const storage = browserStorage(kind);
    try { return storage?.getItem(key) ?? memoryStorage.get(`${kind}:${key}`) ?? null; }
    catch { return memoryStorage.get(`${kind}:${key}`) ?? null; }
  }
  function storageSet(kind, key, value) {
    const text = String(value);
    const storage = browserStorage(kind);
    try { if (storage) storage.setItem(key, text); else memoryStorage.set(`${kind}:${key}`, text); }
    catch { memoryStorage.set(`${kind}:${key}`, text); }
  }
  function storageRemove(kind, key) {
    const storage = browserStorage(kind);
    try { storage?.removeItem(key); }
    catch {}
    memoryStorage.delete(`${kind}:${key}`);
  }

  const STAFF = [
    {id:'amir', name:'Amir', color:'#6389ff'},
    {id:'montassar', name:'Montassar', color:'#e48c55'},
    {id:'team-1', name:'Medewerker 1', color:'#6bbf8f'},
    {id:'team-2', name:'Medewerker 2', color:'#d17bb1'},
    {id:'bar', name:'Bar', color:'#b18ae5'}
  ];

  const CATEGORY_COLORS = {"Favorieten":"#ffd56c","Spritz cocktails":"#ff9b66","Sour cocktails":"#f4cc58","Vodka cocktails":"#91b6ff","Tequila cocktails":"#f0a14a","Cocktails van de chef":"#ff6cae","Mocktails & alcoholvrij":"#6ad5bd","Frisdranken":"#61a2ff","Koffie & thee":"#a77b5f","Fruitsappen":"#f5a85d","Bieren van ’t vat":"#e8b64f","Bieren op fles":"#c99546","Wijnen":"#d77891","Tapas":"#82bd65","Apero’s":"#f17f8f","Whiskeys":"#c4844c","Malt whiskeys":"#b67a50","Digestieven":"#9a7bd3","Gin":"#7fcab2","Rum":"#d78a55","Vodka":"#8aa8e8","Agave":"#d2b34c","Jenevers":"#80a0c9","Rum cocktails":"#e97083"};

  const LEGACY_PRODUCTS = [
    {id:'cola',name:'Coca-Cola',price:3.2,category:'Frisdranken',favorite:true,aliases:['cola','coca cola','coke']},
    {id:'cola-zero',name:'Coca-Cola Zero',price:3.2,category:'Frisdranken',favorite:true,aliases:['cola zero','coca cola zero','zero cola']},
    {id:'water-plat',name:'Eaulala Plat',price:3.2,category:'Frisdranken',favorite:true,aliases:['water','plat water','water plat','plat']},
    {id:'water-bruis',name:'Eaulala Bruis',price:3.2,category:'Frisdranken',favorite:true,aliases:['bruiswater','bruis water','spuitwater','water bruis','bruis']},
    {id:'fanta',name:'Fanta Orange',price:3.2,category:'Frisdranken',favorite:false,aliases:['fanta','fanta orange']},
    {id:'sprite',name:'Sprite',price:3.2,category:'Frisdranken',favorite:false,aliases:['sprite']},
    {id:'tonic',name:'Tonic',price:3.2,category:'Frisdranken',favorite:false,aliases:['tonic']},
    {id:'ice-tea',name:'Ice Tea',price:3.4,category:'Frisdranken',favorite:false,aliases:['ice tea','ijsthee']},

    {id:'pils',name:'Pils',price:3.2,category:'Bieren',favorite:true,aliases:['pils','pintje','pint','stella']},
    {id:'duvel',name:'Duvel',price:4.8,category:'Bieren',favorite:true,aliases:['duvel']},
    {id:'karmeliet',name:'Tripel Karmeliet',price:4.9,category:'Bieren',favorite:true,aliases:['karmeliet','tripel karmeliet']},
    {id:'leffe',name:'Leffe Blond',price:4.5,category:'Bieren',favorite:false,aliases:['leffe','leffe blond']},
    {id:'kriek',name:'Kriek',price:4.2,category:'Bieren',favorite:false,aliases:['kriek']},
    {id:'hoegaarden',name:'Hoegaarden',price:4.2,category:'Bieren',favorite:false,aliases:['hoegaarden','witbier']},
    {id:'orval',name:'Orval',price:5.0,category:'Bieren',favorite:false,aliases:['orval']},
    {id:'carlsberg-0',name:'Carlsberg 0.0',price:3.8,category:'Bieren',favorite:false,aliases:['alcoholvrij bier','carlsberg zero','carlsberg nul']},

    {id:'white-wine',name:'Witte wijn',price:5.5,category:'Wijnen',favorite:true,aliases:['witte wijn','wit wijntje','glas wit']},
    {id:'red-wine',name:'Rode wijn',price:5.5,category:'Wijnen',favorite:true,aliases:['rode wijn','rood wijntje','glas rood']},
    {id:'rose-wine',name:'Rosé',price:5.5,category:'Wijnen',favorite:false,aliases:['rose','rosé','rose wijn']},
    {id:'cava',name:'Cava',price:6.5,category:'Wijnen',favorite:false,aliases:['cava','glas cava']},

    {id:'coffee',name:'Koffie',price:3.2,category:'Koffie & thee',favorite:true,aliases:['koffie','coffee']},
    {id:'espresso',name:'Espresso',price:3.0,category:'Koffie & thee',favorite:false,aliases:['espresso']},
    {id:'cappuccino',name:'Cappuccino',price:3.8,category:'Koffie & thee',favorite:false,aliases:['cappuccino']},
    {id:'latte',name:'Latte',price:4.0,category:'Koffie & thee',favorite:false,aliases:['latte','latte macchiato']},
    {id:'tea',name:'Thee',price:3.2,category:'Koffie & thee',favorite:false,aliases:['thee','tea']},

    {id:'aperol',name:'Aperol Spritz',price:11,category:'Cocktails',favorite:true,aliases:['aperol','aperol spritz']},
    {id:'pornstar',name:'Pornstar Martini',price:13,category:'Cocktails',favorite:true,aliases:['pornstar','pornstar martini']},
    {id:'mojito',name:'Mojito',price:12,category:'Cocktails',favorite:true,aliases:['mojito']},
    {id:'espresso-martini',name:'Espresso Martini',price:13,category:'Cocktails',favorite:false,aliases:['espresso martini']},
    {id:'moscow-mule',name:'Moscow Mule',price:12,category:'Cocktails',favorite:false,aliases:['moscow mule','mule']},
    {id:'gin-tonic',name:'Gin-tonic',price:11.5,category:'Cocktails',favorite:true,aliases:['gin tonic','gin en tonic']},
    {id:'negroni',name:'Negroni',price:13,category:'Cocktails',favorite:false,aliases:['negroni']},
    {id:'margarita',name:'Margarita',price:12,category:'Cocktails',favorite:false,aliases:['margarita']},

    {id:'virgin-mojito',name:'Virgin Mojito',price:8.5,category:'Mocktails',favorite:true,aliases:['virgin mojito','alcoholvrije mojito']},
    {id:'virgin-spritz',name:'Virgin Spritz',price:8.5,category:'Mocktails',favorite:false,aliases:['virgin spritz','alcoholvrije spritz']},
    {id:'bissaap',name:'Bissaap Ginger',price:8.5,category:'Mocktails',favorite:false,aliases:['bissaap','bissap','bissaap ginger']},

    {id:'shot-tequila',name:'Shot tequila',price:4.5,category:'Shots',favorite:false,aliases:['tequila shot','shot tequila','tequila']},
    {id:'shot-jager',name:'Jägermeister',price:4.5,category:'Shots',favorite:false,aliases:['jager','jäger','jagermeister','jägermeister']},
    {id:'shot-sambuca',name:'Sambuca',price:4.5,category:'Shots',favorite:false,aliases:['sambuca']},

    {id:'chips',name:'Chips',price:2.5,category:'Snacks',favorite:false,aliases:['chips','zakje chips']},
    {id:'olives',name:'Olijven',price:4.5,category:'Snacks',favorite:false,aliases:['olijven']},
    {id:'nuts',name:'Notenmix',price:4.5,category:'Snacks',favorite:false,aliases:['noten','notenmix']}
  ];

  const PRODUCTS = [{"id":"p1","name":"Aperol Spritz","price":11.0,"category":"Spritz cocktails","favorite":true,"aliases":["Aperol Spritz","aperol","aperol spritz"]},{"id":"p2","name":"Campari Spritz","price":11.0,"category":"Spritz cocktails","favorite":false,"aliases":["Campari Spritz"]},{"id":"p3","name":"Limoncello Spritz","price":11.0,"category":"Spritz cocktails","favorite":false,"aliases":["Limoncello Spritz"]},{"id":"p4","name":"Martini Spritz","price":11.0,"category":"Spritz cocktails","favorite":false,"aliases":["Martini Spritz"]},{"id":"p5","name":"Lillet Spritz","price":11.0,"category":"Spritz cocktails","favorite":false,"aliases":["Lillet Spritz"]},{"id":"p6","name":"Aperitivo Spritz 0%","price":8.0,"category":"Spritz cocktails","favorite":false,"aliases":["Aperitivo Spritz 0%"]},{"id":"p7","name":"Gin Fizz","price":12.5,"category":"Sour cocktails","favorite":false,"aliases":["Gin Fizz","gin fizz"]},{"id":"p8","name":"Pisco Sour","price":14.5,"category":"Sour cocktails","favorite":false,"aliases":["Pisco Sour"]},{"id":"p9","name":"Amaretto Sour","price":14.5,"category":"Sour cocktails","favorite":false,"aliases":["Amaretto Sour"]},{"id":"p10","name":"Whiskey Sour","price":14.5,"category":"Sour cocktails","favorite":false,"aliases":["Whiskey Sour"]},{"id":"p11","name":"Cosmopolitan","price":12.0,"category":"Vodka cocktails","favorite":false,"aliases":["Cosmopolitan"]},{"id":"p12","name":"Pornstar Martini","price":13.0,"category":"Vodka cocktails","favorite":true,"aliases":["Pornstar Martini","pornstar","pornstar martini"]},{"id":"p13","name":"Moscow Mule","price":12.0,"category":"Vodka cocktails","favorite":false,"aliases":["Moscow Mule","moscow mule","mule"]},{"id":"p14","name":"Bloody Mary","price":12.0,"category":"Vodka cocktails","favorite":false,"aliases":["Bloody Mary"]},{"id":"p15","name":"Skinny Bitch","price":12.0,"category":"Vodka cocktails","favorite":false,"aliases":["Skinny Bitch"]},{"id":"p16","name":"Espresso Martini","price":13.0,"category":"Vodka cocktails","favorite":true,"aliases":["Espresso Martini","espresso martini"]},{"id":"p17","name":"Lazy Red Cheeks","price":13.0,"category":"Vodka cocktails","favorite":false,"aliases":["Lazy Red Cheeks"]},{"id":"p18","name":"Classic Margarita","price":12.0,"category":"Tequila cocktails","favorite":true,"aliases":["Classic Margarita","margarita","classic margarita"]},{"id":"p19","name":"Frozen Margarita","price":12.0,"category":"Tequila cocktails","favorite":false,"aliases":["Frozen Margarita"]},{"id":"p20","name":"Strawberry Margarita","price":13.0,"category":"Tequila cocktails","favorite":false,"aliases":["Strawberry Margarita"]},{"id":"p21","name":"Mexican Mule","price":13.0,"category":"Tequila cocktails","favorite":false,"aliases":["Mexican Mule"]},{"id":"p22","name":"Passion d’Amour","price":13.0,"category":"Cocktails van de chef","favorite":false,"aliases":["Passion d’Amour"]},{"id":"p23","name":"Le Formidable","price":12.0,"category":"Cocktails van de chef","favorite":false,"aliases":["Le Formidable"]},{"id":"p24","name":"Yéké Yéké","price":12.0,"category":"Cocktails van de chef","favorite":false,"aliases":["Yéké Yéké"]},{"id":"p25","name":"Bush Baby","price":12.0,"category":"Cocktails van de chef","favorite":false,"aliases":["Bush Baby"]},{"id":"p26","name":"Zebra","price":13.0,"category":"Cocktails van de chef","favorite":false,"aliases":["Zebra"]},{"id":"p27","name":"Negroni","price":13.0,"category":"Cocktails van de chef","favorite":true,"aliases":["Negroni","negroni"]},{"id":"p28","name":"Floral Heaven","price":14.5,"category":"Cocktails van de chef","favorite":false,"aliases":["Floral Heaven"]},{"id":"p29","name":"Nuit à Saint-Tropez","price":14.5,"category":"Cocktails van de chef","favorite":false,"aliases":["Nuit à Saint-Tropez"]},{"id":"p30","name":"Cucumber Southside","price":14.5,"category":"Cocktails van de chef","favorite":false,"aliases":["Cucumber Southside"]},{"id":"p31","name":"Anaconda","price":14.5,"category":"Cocktails van de chef","favorite":false,"aliases":["Anaconda"]},{"id":"p32","name":"Jungle Fever","price":14.5,"category":"Cocktails van de chef","favorite":false,"aliases":["Jungle Fever"]},{"id":"p33","name":"Go Leila","price":14.5,"category":"Cocktails van de chef","favorite":false,"aliases":["Go Leila"]},{"id":"p34","name":"Moussa’s Bissaap Ginger Feve","price":8.5,"category":"Mocktails & alcoholvrij","favorite":false,"aliases":["Moussa’s Bissaap Ginger Feve","bissaap","bissap","bissaap ginger","moussa bissaap"]},{"id":"p35","name":"Virgin Mojito","price":8.5,"category":"Mocktails & alcoholvrij","favorite":true,"aliases":["Virgin Mojito","virgin mojito","alcoholvrije mojito"]},{"id":"p36","name":"Luna de Sangre","price":8.5,"category":"Mocktails & alcoholvrij","favorite":false,"aliases":["Luna de Sangre"]},{"id":"p37","name":"Martini Vibrante & Tonic","price":8.5,"category":"Mocktails & alcoholvrij","favorite":false,"aliases":["Martini Vibrante & Tonic"]},{"id":"p38","name":"Martini Floreale & Tonic","price":8.5,"category":"Mocktails & alcoholvrij","favorite":false,"aliases":["Martini Floreale & Tonic"]},{"id":"p39","name":"Virgin Aperol Spritz","price":8.5,"category":"Mocktails & alcoholvrij","favorite":false,"aliases":["Virgin Aperol Spritz","virgin spritz","alcoholvrije spritz","virgin aperol"]},{"id":"p40","name":"Alcoholvrije Negroni","price":8.5,"category":"Mocktails & alcoholvrij","favorite":false,"aliases":["Alcoholvrije Negroni"]},{"id":"p41","name":"Tanqueray 0.0 & tonic","price":9.5,"category":"Mocktails & alcoholvrij","favorite":false,"aliases":["Tanqueray 0.0 & tonic"]},{"id":"p42","name":"Eaulala Plat","price":3.2,"category":"Frisdranken","favorite":true,"aliases":["Eaulala Plat","water","plat water","water plat","plat"]},{"id":"p43","name":"Eaulala Bruis","price":3.2,"category":"Frisdranken","favorite":true,"aliases":["Eaulala Bruis","bruiswater","bruis water","spuitwater","water bruis","bruis"]},{"id":"p44","name":"Coca-Cola","price":3.2,"category":"Frisdranken","favorite":true,"aliases":["Coca-Cola","cola","coca cola","coke"]},{"id":"p45","name":"Coca-Cola Zero","price":3.2,"category":"Frisdranken","favorite":true,"aliases":["Coca-Cola Zero","cola zero","coca cola zero","zero cola","cola light"]},{"id":"p46","name":"Fanta Orange","price":3.2,"category":"Frisdranken","favorite":true,"aliases":["Fanta Orange","fanta","fanta orange"]},{"id":"p47","name":"Sprite","price":3.2,"category":"Frisdranken","favorite":false,"aliases":["Sprite","sprite"]},{"id":"p48","name":"Gini Bitter Lemon","price":3.2,"category":"Frisdranken","favorite":false,"aliases":["Gini Bitter Lemon"]},{"id":"p49","name":"Lipton Ice Tea Regular","price":3.5,"category":"Frisdranken","favorite":true,"aliases":["Lipton Ice Tea Regular","ice tea","ijsthee","lipton ice tea"]},{"id":"p50","name":"Fuze Tea Peach","price":3.5,"category":"Frisdranken","favorite":true,"aliases":["Fuze Tea Peach","fuze tea","ice tea peach","perzik ice tea"]},{"id":"p51","name":"Bionina Pomegranate & Cranberry","price":4.5,"category":"Frisdranken","favorite":false,"aliases":["Bionina Pomegranate & Cranberry"]},{"id":"p52","name":"Bionina Blood Orange","price":4.5,"category":"Frisdranken","favorite":false,"aliases":["Bionina Blood Orange"]},{"id":"p53","name":"Bionina Ginger Beer","price":4.5,"category":"Frisdranken","favorite":false,"aliases":["Bionina Ginger Beer"]},{"id":"p54","name":"Bionina Mister Lemon","price":4.5,"category":"Frisdranken","favorite":false,"aliases":["Bionina Mister Lemon"]},{"id":"p55","name":"Schweppes Indian Tonic","price":3.2,"category":"Frisdranken","favorite":true,"aliases":["Schweppes Indian Tonic","tonic","schweppes tonic"]},{"id":"p56","name":"Red Bull","price":4.0,"category":"Frisdranken","favorite":true,"aliases":["Red Bull","red bull"]},{"id":"p57","name":"Fever-Tree Original","price":4.5,"category":"Frisdranken","favorite":false,"aliases":["Fever-Tree Original"]},{"id":"p58","name":"Fever-Tree Mediterranean","price":4.5,"category":"Frisdranken","favorite":false,"aliases":["Fever-Tree Mediterranean"]},{"id":"p59","name":"Espresso","price":3.4,"category":"Koffie & thee","favorite":true,"aliases":["Espresso","espresso"]},{"id":"p60","name":"Mokka","price":3.4,"category":"Koffie & thee","favorite":false,"aliases":["Mokka","koffie","mokka","coffee"]},{"id":"p61","name":"Decafeïné","price":3.4,"category":"Koffie & thee","favorite":false,"aliases":["Decafeïné"]},{"id":"p62","name":"Cappuccino","price":4.0,"category":"Koffie & thee","favorite":true,"aliases":["Cappuccino","cappuccino"]},{"id":"p63","name":"Thee groen","price":3.5,"category":"Koffie & thee","favorite":false,"aliases":["Thee groen","thee","tea","groene thee"]},{"id":"p64","name":"Thee zwart","price":3.5,"category":"Koffie & thee","favorite":false,"aliases":["Thee zwart","zwarte thee"]},{"id":"p65","name":"Thee munt","price":3.5,"category":"Koffie & thee","favorite":false,"aliases":["Thee munt","muntthee","thee munt"]},{"id":"p66","name":"Thee fruit","price":3.5,"category":"Koffie & thee","favorite":false,"aliases":["Thee fruit"]},{"id":"p67","name":"Verse muntthee","price":4.0,"category":"Koffie & thee","favorite":true,"aliases":["Verse muntthee","verse munt","verse muntthee"]},{"id":"p68","name":"Irish Coffee","price":9.0,"category":"Koffie & thee","favorite":false,"aliases":["Irish Coffee"]},{"id":"p69","name":"French Coffee","price":9.0,"category":"Koffie & thee","favorite":false,"aliases":["French Coffee"]},{"id":"p70","name":"Hasseltse koffie","price":9.0,"category":"Koffie & thee","favorite":false,"aliases":["Hasseltse koffie"]},{"id":"p71","name":"Italian Coffee","price":9.0,"category":"Koffie & thee","favorite":false,"aliases":["Italian Coffee"]},{"id":"p72","name":"Baileys Coffee","price":9.0,"category":"Koffie & thee","favorite":false,"aliases":["Baileys Coffee"]},{"id":"p73","name":"Mexican Coffee","price":9.0,"category":"Koffie & thee","favorite":false,"aliases":["Mexican Coffee"]},{"id":"p74","name":"Big Tom Spiced Tomato Juice","price":5.5,"category":"Fruitsappen","favorite":false,"aliases":["Big Tom Spiced Tomato Juice"]},{"id":"p75","name":"Looza sinaasappel","price":3.2,"category":"Fruitsappen","favorite":false,"aliases":["Looza sinaasappel","sinaasappelsap","looza sinaasappel"]},{"id":"p76","name":"Looza ananas","price":3.2,"category":"Fruitsappen","favorite":false,"aliases":["Looza ananas"]},{"id":"p77","name":"Looza appel","price":3.2,"category":"Fruitsappen","favorite":false,"aliases":["Looza appel"]},{"id":"p78","name":"Looza appel-kers","price":3.2,"category":"Fruitsappen","favorite":false,"aliases":["Looza appel-kers"]},{"id":"p79","name":"Looza ACE","price":3.2,"category":"Fruitsappen","favorite":false,"aliases":["Looza ACE"]},{"id":"p80","name":"Looza passievrucht","price":3.2,"category":"Fruitsappen","favorite":false,"aliases":["Looza passievrucht"]},{"id":"p81","name":"Vers geperst sinaas","price":6.0,"category":"Fruitsappen","favorite":false,"aliases":["Vers geperst sinaas","vers sinaasappelsap","verse sinaas"]},{"id":"p82","name":"Vers geperst citroen","price":6.0,"category":"Fruitsappen","favorite":false,"aliases":["Vers geperst citroen"]},{"id":"p83","name":"Vers geperst pompelmoes","price":6.0,"category":"Fruitsappen","favorite":false,"aliases":["Vers geperst pompelmoes"]},{"id":"p84","name":"St. Hubertus Blond","price":5.0,"category":"Bieren van ’t vat","favorite":false,"aliases":["St. Hubertus Blond"]},{"id":"p85","name":"Tuborg Pils 25cl","price":3.2,"category":"Bieren van ’t vat","favorite":true,"aliases":["Tuborg Pils 25cl","pils","pintje","pint","tuborg","tuborg pils"]},{"id":"p86","name":"Karmeliet Tripel Blond","price":5.5,"category":"Bieren van ’t vat","favorite":true,"aliases":["Karmeliet Tripel Blond","karmeliet","tripel karmeliet","karmeliet tripel"]},{"id":"p87","name":"Carlsberg Green Label","price":3.2,"category":"Bieren op fles","favorite":true,"aliases":["Carlsberg Green Label","carlsberg","carlsberg green"]},{"id":"p88","name":"Carlsberg 0.0","price":3.2,"category":"Bieren op fles","favorite":true,"aliases":["Carlsberg 0.0","alcoholvrij bier","carlsberg zero","carlsberg nul"]},{"id":"p89","name":"Somersby","price":5.0,"category":"Bieren op fles","favorite":false,"aliases":["Somersby"]},{"id":"p90","name":"Vedett Extra Blond","price":3.5,"category":"Bieren op fles","favorite":false,"aliases":["Vedett Extra Blond"]},{"id":"p91","name":"Hoegaarden","price":3.4,"category":"Bieren op fles","favorite":true,"aliases":["Hoegaarden","hoegaarden","witbier"]},{"id":"p92","name":"Duvel","price":5.5,"category":"Bieren op fles","favorite":true,"aliases":["Duvel","duvel"]},{"id":"p93","name":"La Chouffe","price":5.5,"category":"Bieren op fles","favorite":false,"aliases":["La Chouffe","chouffe","la chouffe"]},{"id":"p94","name":"Omer","price":6.5,"category":"Bieren op fles","favorite":false,"aliases":["Omer"]},{"id":"p95","name":"Orval","price":6.5,"category":"Bieren op fles","favorite":true,"aliases":["Orval","orval"]},{"id":"p96","name":"Desperados","price":5.0,"category":"Bieren op fles","favorite":false,"aliases":["Desperados"]},{"id":"p97","name":"Liefmans Fruitesse On The Rocks","price":3.4,"category":"Bieren op fles","favorite":false,"aliases":["Liefmans Fruitesse On The Rocks","kriek","liefmans","liefmans fruitesse"]},{"id":"p98","name":"Gentse Strop","price":6.0,"category":"Bieren op fles","favorite":false,"aliases":["Gentse Strop"]},{"id":"p99","name":"Chimay Blauw","price":5.0,"category":"Bieren op fles","favorite":false,"aliases":["Chimay Blauw"]},{"id":"p100","name":"Gulden Draak","price":4.5,"category":"Bieren op fles","favorite":false,"aliases":["Gulden Draak"]},{"id":"p101","name":"Westmalle Dubbel","price":5.5,"category":"Bieren op fles","favorite":false,"aliases":["Westmalle Dubbel"]},{"id":"p102","name":"Westmalle Tripel","price":5.5,"category":"Bieren op fles","favorite":false,"aliases":["Westmalle Tripel"]},{"id":"p103","name":"Fourchette","price":6.5,"category":"Bieren op fles","favorite":false,"aliases":["Fourchette"]},{"id":"p104","name":"Gentse Gruut Blond","price":5.5,"category":"Bieren op fles","favorite":false,"aliases":["Gentse Gruut Blond"]},{"id":"p105","name":"Kasteelbier Rouge","price":6.0,"category":"Bieren op fles","favorite":false,"aliases":["Kasteelbier Rouge"]},{"id":"p106","name":"Kasteelbier Tropical","price":6.0,"category":"Bieren op fles","favorite":false,"aliases":["Kasteelbier Tropical"]},{"id":"p107","name":"Kasteelbier Rouge 0.0","price":5.0,"category":"Bieren op fles","favorite":false,"aliases":["Kasteelbier Rouge 0.0"]},{"id":"p108","name":"Huiswijn Bellevie - glas","price":6.5,"category":"Wijnen","favorite":true,"aliases":["Huiswijn Bellevie - glas","witte wijn","wit wijntje","glas wit","huiswijn wit"]},{"id":"p109","name":"Huiswijn Bellevie - fles","price":29.0,"category":"Wijnen","favorite":false,"aliases":["Huiswijn Bellevie - fles"]},{"id":"p110","name":"Gris Blanc bio Rosé - glas","price":7.5,"category":"Wijnen","favorite":true,"aliases":["Gris Blanc bio Rosé - glas","rose","rosé","rose wijn","glas rose"]},{"id":"p111","name":"Gris Blanc bio Rosé - fles","price":35.0,"category":"Wijnen","favorite":false,"aliases":["Gris Blanc bio Rosé - fles"]},{"id":"p112","name":"Enate Chardonnay 234 - glas","price":7.5,"category":"Wijnen","favorite":false,"aliases":["Enate Chardonnay 234 - glas"]},{"id":"p113","name":"Enate Chardonnay 234 - fles","price":35.0,"category":"Wijnen","favorite":false,"aliases":["Enate Chardonnay 234 - fles"]},{"id":"p114","name":"Terra di nostri wit - glas","price":7.0,"category":"Wijnen","favorite":false,"aliases":["Terra di nostri wit - glas"]},{"id":"p115","name":"Terra di nostri wit - fles","price":33.0,"category":"Wijnen","favorite":false,"aliases":["Terra di nostri wit - fles"]},{"id":"p116","name":"Terra di nostri rood - glas","price":7.0,"category":"Wijnen","favorite":true,"aliases":["Terra di nostri rood - glas","rode wijn","rood wijntje","glas rood","huiswijn rood"]},{"id":"p117","name":"Terra di nostri rood - fles","price":33.0,"category":"Wijnen","favorite":false,"aliases":["Terra di nostri rood - fles"]},{"id":"p118","name":"Prosecco / Rosé - glas","price":7.5,"category":"Wijnen","favorite":true,"aliases":["Prosecco / Rosé - glas","cava","prosecco","glas cava","glas prosecco"]},{"id":"p119","name":"Prosecco / Rosé - fles","price":35.0,"category":"Wijnen","favorite":false,"aliases":["Prosecco / Rosé - fles"]},{"id":"p120","name":"Champagne Haton blanc de noirs - glas","price":11.0,"category":"Wijnen","favorite":false,"aliases":["Champagne Haton blanc de noirs - glas"]},{"id":"p121","name":"Champagne Haton blanc de noirs - fles","price":60.0,"category":"Wijnen","favorite":false,"aliases":["Champagne Haton blanc de noirs - fles"]},{"id":"p122","name":"Champagne Lallier Brut - fles","price":95.0,"category":"Wijnen","favorite":false,"aliases":["Champagne Lallier Brut - fles"]},{"id":"p123","name":"Tortilla chips","price":6.0,"category":"Tapas","favorite":true,"aliases":["Tortilla chips","chips","tortilla chips","zakje chips"]},{"id":"p124","name":"Extra saus","price":0.5,"category":"Tapas","favorite":false,"aliases":["Extra saus"]},{"id":"p125","name":"Bordje kaas","price":6.0,"category":"Tapas","favorite":false,"aliases":["Bordje kaas"]},{"id":"p126","name":"Bordje salami","price":6.0,"category":"Tapas","favorite":false,"aliases":["Bordje salami"]},{"id":"p127","name":"Bordje ham","price":6.0,"category":"Tapas","favorite":false,"aliases":["Bordje ham"]},{"id":"p128","name":"Bordje olijven","price":6.0,"category":"Tapas","favorite":true,"aliases":["Bordje olijven","olijven","bordje olijven"]},{"id":"p129","name":"Apero-plank","price":15.5,"category":"Tapas","favorite":false,"aliases":["Apero-plank"]},{"id":"p130","name":"Suggestie van de week","price":0.0,"category":"Tapas","favorite":false,"aliases":["Suggestie van de week"]},{"id":"p131","name":"Martini Bellini","price":8.0,"category":"Apero’s","favorite":false,"aliases":["Martini Bellini"]},{"id":"p132","name":"Martini Bianco","price":6.5,"category":"Apero’s","favorite":false,"aliases":["Martini Bianco"]},{"id":"p133","name":"Martini Rosso","price":6.5,"category":"Apero’s","favorite":false,"aliases":["Martini Rosso"]},{"id":"p134","name":"Martini Fiero","price":6.5,"category":"Apero’s","favorite":false,"aliases":["Martini Fiero"]},{"id":"p135","name":"Kir","price":8.0,"category":"Apero’s","favorite":false,"aliases":["Kir"]},{"id":"p136","name":"Kir Royal","price":9.5,"category":"Apero’s","favorite":false,"aliases":["Kir Royal"]},{"id":"p137","name":"Coupe de Fleurs","price":9.0,"category":"Apero’s","favorite":false,"aliases":["Coupe de Fleurs"]},{"id":"p138","name":"Picon Vin Blanc","price":10.5,"category":"Apero’s","favorite":false,"aliases":["Picon Vin Blanc"]},{"id":"p139","name":"Ricard 3,5 cl","price":5.5,"category":"Apero’s","favorite":false,"aliases":["Ricard 3,5 cl"]},{"id":"p140","name":"Ricard 5 cl","price":6.5,"category":"Apero’s","favorite":false,"aliases":["Ricard 5 cl"]},{"id":"p141","name":"Roomer","price":6.0,"category":"Apero’s","favorite":false,"aliases":["Roomer"]},{"id":"p142","name":"Vermouth Rosso","price":7.5,"category":"Apero’s","favorite":false,"aliases":["Vermouth Rosso"]},{"id":"p143","name":"Vermouth Bianco","price":7.5,"category":"Apero’s","favorite":false,"aliases":["Vermouth Bianco"]},{"id":"p144","name":"Passoã","price":7.5,"category":"Apero’s","favorite":false,"aliases":["Passoã"]},{"id":"p145","name":"Pisang Ambon","price":7.5,"category":"Apero’s","favorite":false,"aliases":["Pisang Ambon"]},{"id":"p146","name":"Safari","price":7.5,"category":"Apero’s","favorite":false,"aliases":["Safari"]},{"id":"p147","name":"Malibu","price":7.5,"category":"Apero’s","favorite":false,"aliases":["Malibu"]},{"id":"p148","name":"Campari","price":8.5,"category":"Apero’s","favorite":false,"aliases":["Campari"]},{"id":"p149","name":"Lillet Blanc","price":7.0,"category":"Apero’s","favorite":false,"aliases":["Lillet Blanc"]},{"id":"p150","name":"Lillet Rosé","price":7.0,"category":"Apero’s","favorite":false,"aliases":["Lillet Rosé"]},{"id":"p151","name":"Picon Bière","price":8.5,"category":"Apero’s","favorite":false,"aliases":["Picon Bière"]},{"id":"p152","name":"Supplement frisdrank","price":2.8,"category":"Apero’s","favorite":false,"aliases":["Supplement frisdrank"]},{"id":"p153","name":"Supplement Red Bull","price":3.5,"category":"Apero’s","favorite":false,"aliases":["Supplement Red Bull"]},{"id":"p154","name":"Shot Tequila","price":4.0,"category":"Apero’s","favorite":true,"aliases":["Shot Tequila","tequila shot","shot tequila","tequila"]},{"id":"p155","name":"Shot bruine rum","price":4.5,"category":"Apero’s","favorite":false,"aliases":["Shot bruine rum"]},{"id":"p156","name":"Johnnie Walker Red Label","price":8.5,"category":"Whiskeys","favorite":false,"aliases":["Johnnie Walker Red Label"]},{"id":"p157","name":"Jack Daniel’s","price":8.5,"category":"Whiskeys","favorite":false,"aliases":["Jack Daniel’s"]},{"id":"p158","name":"Jack Daniel’s Tennessee Honey","price":8.0,"category":"Whiskeys","favorite":false,"aliases":["Jack Daniel’s Tennessee Honey"]},{"id":"p159","name":"Chivas Regal 12Y","price":8.5,"category":"Whiskeys","favorite":false,"aliases":["Chivas Regal 12Y"]},{"id":"p160","name":"William Lawson’s","price":7.5,"category":"Whiskeys","favorite":false,"aliases":["William Lawson’s"]},{"id":"p161","name":"Jameson","price":7.5,"category":"Whiskeys","favorite":false,"aliases":["Jameson"]},{"id":"p162","name":"The Famous Grouse","price":7.5,"category":"Whiskeys","favorite":false,"aliases":["The Famous Grouse"]},{"id":"p163","name":"Southern Comfort","price":7.5,"category":"Whiskeys","favorite":false,"aliases":["Southern Comfort"]},{"id":"p164","name":"Four Roses Bourbon","price":7.5,"category":"Whiskeys","favorite":false,"aliases":["Four Roses Bourbon"]},{"id":"p165","name":"Dewar’s 12Y","price":8.0,"category":"Whiskeys","favorite":false,"aliases":["Dewar’s 12Y"]},{"id":"p166","name":"Johnnie Walker Black Label","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Johnnie Walker Black Label"]},{"id":"p167","name":"Aberfeldy 12Y","price":10.0,"category":"Malt whiskeys","favorite":false,"aliases":["Aberfeldy 12Y"]},{"id":"p168","name":"Aberfeldy 16Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Aberfeldy 16Y"]},{"id":"p169","name":"Dalwhinnie 15Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Dalwhinnie 15Y"]},{"id":"p170","name":"Glenfiddich 12Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Glenfiddich 12Y"]},{"id":"p171","name":"Glenkinchie 12Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Glenkinchie 12Y"]},{"id":"p172","name":"Cragganmore 12Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Cragganmore 12Y"]},{"id":"p173","name":"Talisker 10Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Talisker 10Y"]},{"id":"p174","name":"Monkey Shoulder","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Monkey Shoulder"]},{"id":"p175","name":"Lagavulin 16Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Lagavulin 16Y"]},{"id":"p176","name":"Oban 14Y","price":12.5,"category":"Malt whiskeys","favorite":false,"aliases":["Oban 14Y"]},{"id":"p177","name":"Nikka From The Barrel","price":13.0,"category":"Malt whiskeys","favorite":false,"aliases":["Nikka From The Barrel"]},{"id":"p178","name":"Baileys","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Baileys"]},{"id":"p179","name":"Liqueur St-Germain","price":8.0,"category":"Digestieven","favorite":false,"aliases":["Liqueur St-Germain"]},{"id":"p180","name":"Amaretto Disaronno","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Amaretto Disaronno"]},{"id":"p181","name":"Cointreau","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Cointreau"]},{"id":"p182","name":"Grand Marnier","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Grand Marnier"]},{"id":"p183","name":"Licor 43","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Licor 43"]},{"id":"p184","name":"Limoncello","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Limoncello"]},{"id":"p185","name":"Grappa","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Grappa"]},{"id":"p186","name":"Jägermeister","price":5.0,"category":"Digestieven","favorite":true,"aliases":["Jägermeister","jager","jäger","jagermeister","jägermeister"]},{"id":"p187","name":"Cognac","price":6.0,"category":"Digestieven","favorite":false,"aliases":["Cognac"]},{"id":"p188","name":"Rémy Martin VSOP","price":8.0,"category":"Digestieven","favorite":false,"aliases":["Rémy Martin VSOP"]},{"id":"p189","name":"Sambuca","price":7.0,"category":"Digestieven","favorite":true,"aliases":["Sambuca","sambuca","shot sambuca"]},{"id":"p190","name":"Drambuie","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Drambuie"]},{"id":"p191","name":"Southern Comfort","price":8.0,"category":"Digestieven","favorite":false,"aliases":["Southern Comfort"]},{"id":"p192","name":"Shanky’s Whip","price":7.0,"category":"Digestieven","favorite":false,"aliases":["Shanky’s Whip"]},{"id":"p193","name":"Tanqueray","price":7.5,"category":"Gin","favorite":false,"aliases":["Tanqueray","tanqueray","gin tanqueray"]},{"id":"p194","name":"Tanqueray Flor de Sevilla","price":9.0,"category":"Gin","favorite":false,"aliases":["Tanqueray Flor de Sevilla"]},{"id":"p195","name":"Gordon’s","price":6.0,"category":"Gin","favorite":false,"aliases":["Gordon’s"]},{"id":"p196","name":"Gordon’s - fles 1L","price":90.0,"category":"Gin","favorite":false,"aliases":["Gordon’s - fles 1L"]},{"id":"p197","name":"Bombay Sapphire","price":8.0,"category":"Gin","favorite":false,"aliases":["Bombay Sapphire","bombay sapphire","bombay"]},{"id":"p198","name":"Bombay Sapphire - fles 1L","price":90.0,"category":"Gin","favorite":false,"aliases":["Bombay Sapphire - fles 1L"]},{"id":"p199","name":"Beefeater","price":7.5,"category":"Gin","favorite":false,"aliases":["Beefeater"]},{"id":"p200","name":"Hendrick’s","price":9.0,"category":"Gin","favorite":false,"aliases":["Hendrick’s","hendricks","hendrick gin"]},{"id":"p201","name":"No.3 London","price":9.0,"category":"Gin","favorite":false,"aliases":["No.3 London"]},{"id":"p202","name":"Monkey 47","price":12.0,"category":"Gin","favorite":false,"aliases":["Monkey 47"]},{"id":"p203","name":"Gaugin Classic + tonic","price":14.0,"category":"Gin","favorite":false,"aliases":["Gaugin Classic + tonic","gin tonic","gin en tonic","gaugin tonic"]},{"id":"p204","name":"Gaugin Mountain + tonic","price":14.0,"category":"Gin","favorite":false,"aliases":["Gaugin Mountain + tonic"]},{"id":"p205","name":"Gaugin Beach + tonic","price":14.0,"category":"Gin","favorite":false,"aliases":["Gaugin Beach + tonic"]},{"id":"p206","name":"Gin Mare","price":11.0,"category":"Gin","favorite":false,"aliases":["Gin Mare"]},{"id":"p207","name":"Tanqueray 0.0","price":6.5,"category":"Gin","favorite":false,"aliases":["Tanqueray 0.0"]},{"id":"p208","name":"Bacardí Carta Blanca","price":7.5,"category":"Rum","favorite":false,"aliases":["Bacardí Carta Blanca","bacardi wit","witte rum","bacardi carta blanca"]},{"id":"p209","name":"Bacardí Carta Blanca - fles 1L","price":90.0,"category":"Rum","favorite":false,"aliases":["Bacardí Carta Blanca - fles 1L"]},{"id":"p210","name":"Bacardí Spiced","price":7.5,"category":"Rum","favorite":false,"aliases":["Bacardí Spiced"]},{"id":"p211","name":"Bacardí Spiced - fles 1L","price":90.0,"category":"Rum","favorite":false,"aliases":["Bacardí Spiced - fles 1L"]},{"id":"p212","name":"Bacardí Carta Negra","price":8.5,"category":"Rum","favorite":false,"aliases":["Bacardí Carta Negra"]},{"id":"p213","name":"Bacardí Carta Negra - fles 1L","price":90.0,"category":"Rum","favorite":false,"aliases":["Bacardí Carta Negra - fles 1L"]},{"id":"p214","name":"Bacardí Añejo Cuatro","price":9.5,"category":"Rum","favorite":false,"aliases":["Bacardí Añejo Cuatro"]},{"id":"p215","name":"Bacardí Añejo Cuatro - fles 1L","price":130.0,"category":"Rum","favorite":false,"aliases":["Bacardí Añejo Cuatro - fles 1L"]},{"id":"p216","name":"Bacardí Caribbean Spiced","price":9.5,"category":"Rum","favorite":false,"aliases":["Bacardí Caribbean Spiced"]},{"id":"p217","name":"Bacardí Reserva Ocho","price":10.0,"category":"Rum","favorite":false,"aliases":["Bacardí Reserva Ocho"]},{"id":"p218","name":"Bacardí Gran Reserva Diez","price":10.0,"category":"Rum","favorite":false,"aliases":["Bacardí Gran Reserva Diez"]},{"id":"p219","name":"Pampero Especial","price":8.5,"category":"Rum","favorite":false,"aliases":["Pampero Especial"]},{"id":"p220","name":"Brugal Añejo 5Y","price":8.5,"category":"Rum","favorite":false,"aliases":["Brugal Añejo 5Y"]},{"id":"p221","name":"Havana Especial","price":8.5,"category":"Rum","favorite":false,"aliases":["Havana Especial"]},{"id":"p222","name":"Havana Especial - fles 1L","price":130.0,"category":"Rum","favorite":false,"aliases":["Havana Especial - fles 1L"]},{"id":"p223","name":"Havana Club 7 años","price":9.5,"category":"Rum","favorite":false,"aliases":["Havana Club 7 años"]},{"id":"p224","name":"Diplomático Reserva Exclusiva","price":10.0,"category":"Rum","favorite":false,"aliases":["Diplomático Reserva Exclusiva"]},{"id":"p225","name":"The Kraken Black Spiced","price":8.0,"category":"Rum","favorite":false,"aliases":["The Kraken Black Spiced"]},{"id":"p226","name":"Don Papa","price":10.0,"category":"Rum","favorite":false,"aliases":["Don Papa"]},{"id":"p227","name":"Santa Teresa 1796","price":10.0,"category":"Rum","favorite":false,"aliases":["Santa Teresa 1796"]},{"id":"p228","name":"Zacapa Solera Guatemala","price":13.0,"category":"Rum","favorite":false,"aliases":["Zacapa Solera Guatemala"]},{"id":"p229","name":"Eristoff White","price":7.5,"category":"Vodka","favorite":false,"aliases":["Eristoff White","eristoff","vodka eristoff"]},{"id":"p230","name":"Eristoff Red","price":7.5,"category":"Vodka","favorite":false,"aliases":["Eristoff Red"]},{"id":"p231","name":"Eristoff - fles 1L","price":90.0,"category":"Vodka","favorite":false,"aliases":["Eristoff - fles 1L"]},{"id":"p232","name":"Ketel One","price":8.5,"category":"Vodka","favorite":false,"aliases":["Ketel One"]},{"id":"p233","name":"Ketel One - fles 1L","price":100.0,"category":"Vodka","favorite":false,"aliases":["Ketel One - fles 1L"]},{"id":"p234","name":"Zubrówka","price":7.0,"category":"Vodka","favorite":false,"aliases":["Zubrówka"]},{"id":"p235","name":"Grey Goose","price":9.5,"category":"Vodka","favorite":false,"aliases":["Grey Goose"]},{"id":"p236","name":"Grey Goose - fles 70cl","price":130.0,"category":"Vodka","favorite":false,"aliases":["Grey Goose - fles 70cl"]},{"id":"p237","name":"Cazadores Blanco","price":7.0,"category":"Agave","favorite":false,"aliases":["Cazadores Blanco","tequila cazadores","cazadores blanco"]},{"id":"p238","name":"Cazadores Reposado","price":7.0,"category":"Agave","favorite":false,"aliases":["Cazadores Reposado"]},{"id":"p239","name":"Jose Cuervo Especial Reposado","price":6.5,"category":"Agave","favorite":false,"aliases":["Jose Cuervo Especial Reposado"]},{"id":"p240","name":"Jose Cuervo Silver","price":6.5,"category":"Agave","favorite":false,"aliases":["Jose Cuervo Silver"]},{"id":"p241","name":"Patrón Silver","price":8.5,"category":"Agave","favorite":false,"aliases":["Patrón Silver"]},{"id":"p242","name":"Mezcal Benevá con Gusano","price":6.0,"category":"Agave","favorite":false,"aliases":["Mezcal Benevá con Gusano"]},{"id":"p243","name":"Southern Comfort","price":4.5,"category":"Agave","favorite":false,"aliases":["Southern Comfort"]},{"id":"p244","name":"Braeckman Oude","price":4.5,"category":"Jenevers","favorite":false,"aliases":["Braeckman Oude"]},{"id":"p245","name":"Braeckman Citroen","price":4.5,"category":"Jenevers","favorite":false,"aliases":["Braeckman Citroen"]},{"id":"p246","name":"Braeckman Appel","price":4.5,"category":"Jenevers","favorite":false,"aliases":["Braeckman Appel"]},{"id":"p247","name":"Oude Balegemse","price":4.5,"category":"Jenevers","favorite":false,"aliases":["Oude Balegemse"]},{"id":"p248","name":"Oude Hertekamp","price":4.5,"category":"Jenevers","favorite":false,"aliases":["Oude Hertekamp"]},{"id":"p249","name":"Mojito","price":12.0,"category":"Rum cocktails","favorite":true,"aliases":["Mojito","mojito"]},{"id":"p250","name":"Passion Mojito","price":12.5,"category":"Rum cocktails","favorite":false,"aliases":["Passion Mojito","passion mojito","passie mojito"]},{"id":"p251","name":"Strawberry Mojito","price":12.5,"category":"Rum cocktails","favorite":false,"aliases":["Strawberry Mojito","strawberry mojito","aardbei mojito"]},{"id":"p252","name":"Cuba Libre","price":12.0,"category":"Rum cocktails","favorite":false,"aliases":["Cuba Libre","cuba libre"]},{"id":"p253","name":"Piña Colada","price":12.0,"category":"Rum cocktails","favorite":true,"aliases":["Piña Colada","pina colada","piña colada"]},{"id":"p254","name":"Strawberry Daiquiri","price":12.5,"category":"Rum cocktails","favorite":false,"aliases":["Strawberry Daiquiri","strawberry daiquiri","aardbei daiquiri"]},{"id":"p255","name":"Passion Daiquiri","price":12.5,"category":"Rum cocktails","favorite":false,"aliases":["Passion Daiquiri","passion daiquiri","passie daiquiri"]},{"id":"p256","name":"Caipirinha","price":12.0,"category":"Rum cocktails","favorite":false,"aliases":["Caipirinha","caipirinha"]},{"id":"p257","name":"Mai Tai","price":12.5,"category":"Rum cocktails","favorite":false,"aliases":["Mai Tai","mai tai"]},{"id":"p258","name":"Old Fashioned","price":13.0,"category":"Rum cocktails","favorite":false,"aliases":["Old Fashioned","old fashioned"]},{"id":"p259","name":"Dark ’n Stormy","price":13.0,"category":"Rum cocktails","favorite":false,"aliases":["Dark ’n Stormy","dark and stormy","dark n stormy"]},{"id":"p260","name":"Long Island Iced Tea","price":14.5,"category":"Rum cocktails","favorite":false,"aliases":["Long Island Iced Tea","long island","long island iced tea"]}];

  const TABLES = [
    // Terras: netjes uitgelijnd buiten de gevel.
    {id:'T1',label:'T1',shape:'round',x:7,y:20,zone:'terrace'},
    {id:'T2',label:'T2',shape:'round',x:16,y:20,zone:'terrace'},
    {id:'T3',label:'T3',shape:'round',x:7,y:34,zone:'terrace'},
    {id:'T4',label:'T4',shape:'round',x:16,y:34,zone:'terrace'},
    {id:'T5',label:'T5',shape:'round',x:7,y:48,zone:'terrace'},
    {id:'T6',label:'T6',shape:'round',x:16,y:48,zone:'terrace'},
    {id:'T7',label:'T7',shape:'round',x:7,y:62,zone:'terrace'},
    {id:'T8',label:'T8',shape:'round',x:16,y:62,zone:'terrace'},

    {id:'1',label:'1',shape:'round',x:31,y:28,zone:'inside'},
    {id:'1-extra',label:'1 extra',shape:'round',x:31,y:42,zone:'inside'},
    {id:'2',label:'2',shape:'round',x:31,y:62,zone:'inside'},
    {id:'2-extra',label:'2 extra',shape:'round',x:31,y:76,zone:'inside'},

    {id:'K12',label:'K12',shape:'square',x:41,y:39,zone:'inside'},
    {id:'K11',label:'K11',shape:'square',x:48,y:39,zone:'inside'},
    {id:'K10',label:'K10',shape:'square',x:55,y:39,zone:'inside'},
    {id:'K9',label:'K9',shape:'square',x:62,y:39,zone:'inside'},
    {id:'K8',label:'K8',shape:'square',x:69,y:39,zone:'inside'},
    {id:'K7',label:'K7',shape:'square',x:76,y:39,zone:'inside'},
    {id:'K6',label:'K6',shape:'square',x:83,y:39,zone:'inside'},
    {id:'K5',label:'K5',shape:'square',x:90,y:39,zone:'inside'},
    {id:'K4',label:'K4',shape:'square',x:48,y:54,zone:'inside'},
    {id:'K3',label:'K3',shape:'square',x:58,y:54,zone:'inside'},
    {id:'K2',label:'K2',shape:'square',x:68,y:54,zone:'inside'},
    {id:'K1',label:'K1',shape:'square',x:88,y:22,zone:'inside'},

    // Tafel 3 t.e.m. 9 staan exact op dezelfde horizontale lijn.
    {id:'3',label:'3',shape:'round',x:40,y:82,zone:'inside'},
    {id:'4',label:'4',shape:'round',x:48,y:82,zone:'inside'},
    {id:'5',label:'5',shape:'round',x:56,y:82,zone:'inside'},
    {id:'6',label:'6',shape:'round',x:64,y:82,zone:'inside'},
    {id:'7',label:'7',shape:'round',x:72,y:82,zone:'inside'},
    {id:'8',label:'8',shape:'round',x:80,y:82,zone:'inside'},
    {id:'9',label:'9',shape:'round',x:88,y:82,zone:'inside'},
    {id:'11',label:'11',shape:'rect',x:94,y:49,zone:'inside'},
    {id:'10',label:'10',shape:'rect',x:94,y:68,zone:'inside'}
  ];

  const STORAGE_KEY = 'registratiekassa-zoo-v1';
  const DEVICE_KEY = 'registratiekassa-device-id';
  const defaultState = {orders:{}, payments:[], recent:[], layout:'split', audit:[], _sync:{cursor:0,revisions:{},queue:[],conflicts:[],initialized:false,lastSyncAt:null}};
  let state = loadState();
  let session = null;
  let selectedTableId = null;
  let catalogMode = 'favorites';
  let selectedCategory = 'Alles';
  let deferredInstallPrompt = null;
  let recognition = null;
  let voiceActive = false;
  let voiceInterim = [];
  let voiceIgnored = new Set();
  let restartVoiceTimer = null;
  let selectionMode = false;
  let selectedLineIds = new Set();
  let moveContext = null;
  let quantityProductId = null;
  let lastSavedOrders = {};
  let applyingRemoteState = false;
  let syncBusy = false;
  let syncTimer = null;
  const AI_SERVER_KEY = 'registratiekassa-ai-server-url';
  const SERVER_TOKEN_KEY = 'registratiekassa-server-token';
  const deviceId = (() => {
    const existing = storageGet('local', DEVICE_KEY);
    if (existing) return existing;
    const created = `device-${uid()}`;
    storageSet('local', DEVICE_KEY, created);
    return created;
  })();

  function ensureSyncState() {
    state._sync = state._sync && typeof state._sync === 'object' ? state._sync : {};
    state._sync.cursor = Math.max(0, Number(state._sync.cursor) || 0);
    state._sync.revisions = state._sync.revisions && typeof state._sync.revisions === 'object' ? state._sync.revisions : {};
    state._sync.queue = Array.isArray(state._sync.queue) ? state._sync.queue : [];
    state._sync.conflicts = Array.isArray(state._sync.conflicts) ? state._sync.conflicts : [];
    state._sync.initialized = Boolean(state._sync.initialized);
    return state._sync;
  }

  function loadState() {
    try {
      const stored = JSON.parse(storageGet('local', STORAGE_KEY) || 'null');
      const loaded = stored && typeof stored === 'object' ? {...clone(defaultState), ...stored} : clone(defaultState);
      loaded._sync = {...clone(defaultState._sync), ...(loaded._sync || {})};
      return loaded;
    } catch {
      return clone(defaultState);
    }
  }

  function queueChangedTables() {
    if (applyingRemoteState) return;
    const sync = ensureSyncState();
    const tableIds = new Set([...Object.keys(lastSavedOrders || {}), ...Object.keys(state.orders || {})]);
    const changedAt = Date.now();
    tableIds.forEach(tableId => {
      const before = lastSavedOrders?.[tableId] ?? null;
      const after = state.orders?.[tableId] ?? null;
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      const existing = sync.queue.find(operation => operation.tableId === tableId);
      if (existing) {
        existing.order = after ? clone(after) : null;
        existing.updatedAt = changedAt;
      } else {
        sync.queue.push({
          id:`sync-${uid()}`,
          tableId,
          baseRevision:Math.max(0, Number(sync.revisions[tableId]) || 0),
          order:after ? clone(after) : null,
          updatedAt:changedAt,
          deviceId
        });
      }
    });
  }

  function saveState() {
    ensureSyncState();
    queueChangedTables();
    storageSet('local', STORAGE_KEY, JSON.stringify(state));
    lastSavedOrders = clone(state.orders || {});
    scheduleServerSync();
  }

  function logAudit(action, details = {}) {
    state.audit = Array.isArray(state.audit) ? state.audit : [];
    state.audit.unshift({
      id: uid(),
      at: Date.now(),
      action,
      details,
      staffId: session?.id || 'unknown',
      staffName: session?.name || 'Onbekend',
      deviceId,
      syncStatus:'pending'
    });
    state.audit = state.audit.slice(0, 500);
  }

  function getProduct(id) { return PRODUCTS.find(p => p.id === id) || LEGACY_PRODUCTS.find(p => p.id === id); }
  function tableDef(id) { return TABLES.find(t => t.id === id); }
  function orderFor(id, create = false) {
    if (!state.orders[id] && create) {
      state.orders[id] = {id:uid(), tableId:id, openedAt:Date.now(), staffId:session?.id || 'unknown', requestedBill:false, items:[]};
    }
    return state.orders[id] || null;
  }

  function activeItems(order) { return order ? order.items.filter(item => item.qty > 0) : []; }
  function orderTotal(order) { return activeItems(order).reduce((sum,item) => sum + (getProduct(item.productId)?.price || 0) * item.qty, 0); }
  function tableStatus(id) {
    const order = orderFor(id);
    if (!order || !activeItems(order).length) return 'free';
    return order.requestedBill ? 'requested' : 'active';
  }

  function showToast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.classList.remove('show'), 2300);
  }

  function renderLogin() {
    $('staffGrid').innerHTML = STAFF.map(person => `
      <button class="staff-card" data-staff="${person.id}" style="--staff:${person.color}">
        <span class="staff-avatar">${person.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}</span>
        <strong>${person.name}</strong><small>Start bediening</small>
      </button>`).join('');
    document.querySelectorAll('[data-staff]').forEach(button => {
      button.addEventListener('click', () => startSession(STAFF.find(p => p.id === button.dataset.staff)));
    });
  }

  function startSession(person, role = 'team', bossPin = '') {
    session = {...person, role};
    storageSet('session', 'registratiekassa-session', JSON.stringify(session));
    $('loginGate').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('userName').textContent = person.name;
    $('userInitial').textContent = person.name.slice(0,1).toUpperCase();
    $('userInitial').style.background = person.color || '#6389ff';
    $('auditButton')?.classList.toggle('hidden', role !== 'boss');
    applyLayout(state.layout || 'split');
    renderAll();
    if (getAiServerUrl()) connectServerSession(bossPin).then(() => syncNow({initial:true, silent:true})).catch(() => refreshServerButton());
  }

  function restoreSession() {
    try {
      const saved = JSON.parse(storageGet('session', 'registratiekassa-session') || 'null');
      if (saved?.id) startSession(saved, saved.role || 'team');
    } catch {}
  }

  function renderFloor() {
    const floor = $('floor');
    floor.querySelectorAll('.table-button').forEach(node => node.remove());
    TABLES.forEach(table => {
      const order = orderFor(table.id);
      const total = orderTotal(order);
      const button = document.createElement('button');
      const isMoveCandidate = Boolean(moveContext && moveContext.sourceId !== table.id);
      button.className = `table-button ${table.shape}${selectedTableId === table.id ? ' selected' : ''}${isMoveCandidate ? ' move-candidate' : ''}`;
      button.dataset.status = tableStatus(table.id);
      button.style.left = `${table.x}%`;
      button.style.top = `${table.y}%`;
      button.innerHTML = `<span>${table.label}</span>${total ? `<small>${money(total)}</small>` : ''}`;
      button.title = `${table.zone === 'terrace' ? 'Terras' : 'Binnen'} · Tafel ${table.label}`;
      button.addEventListener('click', () => {
        if (moveContext && moveContext.sourceId !== table.id) return performMoveTarget(table.id);
        selectTable(table.id);
      });
      floor.appendChild(button);
    });
  }

  function selectTable(id) {
    selectedTableId = id;
    orderFor(id, true);
    saveState();
    renderAll();
    if (window.innerWidth <= 1120) {
      if ($('workspace').classList.contains('layout-floor')) applyLayout('split');
      setTimeout(() => $('orderPanel').scrollIntoView({behavior:'smooth', block:'start'}), 50);
    }
  }

  function renderOrder() {
    const order = selectedTableId ? orderFor(selectedTableId) : null;
    const hasTable = Boolean(order);
    $('noTable').classList.toggle('hidden', hasTable);
    $('orderContent').classList.toggle('hidden', !hasTable);
    if (!hasTable) return;

    const table = tableDef(selectedTableId);
    $('selectedTableTitle').textContent = `${table?.zone === 'terrace' ? 'Terras' : 'Tafel'} ${table?.label || selectedTableId}`;
    const staff = STAFF.find(p => p.id === order.staffId)?.name || session?.name || 'Team';
    const mins = Math.max(0, Math.floor((Date.now() - order.openedAt) / 60000));
    $('orderMeta').textContent = `${staff} · ${mins ? `${mins} min open` : 'net geopend'}`;
    const requestButton = $('requestBillButton');
    requestButton.classList.toggle('active', Boolean(order.requestedBill));
    requestButton.textContent = order.requestedBill ? 'Rekening gevraagd ✓' : 'Rekening gevraagd';
    renderCatalog();
    renderTicket();
  }

  function categoriesForCurrentMode() {
    const visibleProducts = currentProductSet(false);
    return ['Alles', ...new Set(visibleProducts.map(p => p.category))];
  }

  function currentProductSet(applyCategory = true) {
    let products = PRODUCTS.slice();
    if (catalogMode === 'favorites') products = products.filter(p => p.favorite);
    if (catalogMode === 'recent') {
      products = state.recent.map(id => getProduct(id)).filter(Boolean);
    }
    const query = $('productSearch')?.value.trim().toLocaleLowerCase('nl-BE') || '';
    if (query) products = products.filter(p => `${p.name} ${p.category}`.toLocaleLowerCase('nl-BE').includes(query));
    if (applyCategory && selectedCategory !== 'Alles') products = products.filter(p => p.category === selectedCategory);
    return products;
  }

  function renderCatalog() {
    const categories = categoriesForCurrentMode();
    if (!categories.includes(selectedCategory)) selectedCategory = 'Alles';
    $('categoryRail').innerHTML = categories.map(category => `
      <button class="category-button${selectedCategory === category ? ' active' : ''}" data-category="${category}" style="--category-color:${CATEGORY_COLORS[category] || '#7286a8'}">${category}</button>
    `).join('');
    document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
      selectedCategory = button.dataset.category;
      renderCatalog();
    }));

    const products = currentProductSet(true);
    $('productGrid').innerHTML = products.length ? products.map(product => `
      <button class="product-tile" data-product="${product.id}" style="--tile:${CATEGORY_COLORS[product.category] || '#6389ff'}">
        ${product.favorite ? '<i>★</i>' : ''}<strong>${product.name}</strong><span>${money(product.price)}</span>
      </button>`).join('') : '<div class="ticket-empty">Geen producten gevonden.</div>';
    document.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => addProduct(button.dataset.product, 1)));
  }

  function addProduct(productId, qty = 1, source = 'touch') {
    if (!selectedTableId) return showToast('Selecteer eerst een tafel.');
    const order = orderFor(selectedTableId, true);
    let item = order.items.find(row => row.productId === productId);
    if (!item) {
      item = {productId, qty:0, sentQty:0, addedAt:Date.now()};
      order.items.push(item);
    }
    item.qty += Math.max(1, qty);
    item.lastSource = source;
    if (order.requestedBill) order.requestedBill = false;
    logAudit('product.add', {tableId:selectedTableId, productId, qty:Math.max(1, qty), source});
    state.recent = [productId, ...state.recent.filter(id => id !== productId)].slice(0,18);
    saveState();
    renderAll();
  }

  function changeQuantity(productId, delta) {
    const order = orderFor(selectedTableId);
    if (!order) return;
    const item = order.items.find(row => row.productId === productId);
    if (!item) return;
    const previousQty = item.qty;
    item.qty += delta;
    if (item.qty <= 0) order.items = order.items.filter(row => row !== item);
    else item.sentQty = Math.min(item.sentQty || 0, item.qty);
    logAudit('product.quantity', {tableId:selectedTableId, productId, from:previousQty, to:Math.max(0,item.qty)});
    cleanupEmptyOrder(selectedTableId);
    saveState();
    renderAll();
  }

  function removeProduct(productId) {
    const order = orderFor(selectedTableId);
    if (!order) return;
    order.items = order.items.filter(item => item.productId !== productId);
    selectedLineIds.delete(productId);
    logAudit('product.remove', {tableId:selectedTableId, productId});
    cleanupEmptyOrder(selectedTableId);
    saveState();
    renderAll();
  }

  function cleanupEmptyOrder(tableId) {
    const order = orderFor(tableId);
    if (order && !activeItems(order).length) delete state.orders[tableId];
  }

  function renderTicket() {
    const order = orderFor(selectedTableId);
    const items = activeItems(order);
    const count = items.reduce((sum,item) => sum + item.qty, 0);
    const total = orderTotal(order);
    $('ticketCount').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    $('ticketTotal').textContent = money(total);
    $('payTotal').textContent = money(total);
    $('sendButton').disabled = !items.some(item => (item.sentQty || 0) < item.qty);
    $('payButton').disabled = !items.length;
    $('selectionToggle').textContent = selectionMode ? 'Klaar' : 'Selecteer';
    $('selectionBar').classList.toggle('hidden', !selectionMode);

    if (!items.length) {
      selectionMode = false;
      selectedLineIds.clear();
      $('selectionBar').classList.add('hidden');
      $('ticketList').innerHTML = '<div class="ticket-empty">Nog niets toegevoegd.<br>Gebruik producttegels of de microfoon.</div>';
      return;
    }
    selectedLineIds = new Set([...selectedLineIds].filter(id => items.some(item => item.productId === id)));
    $('selectedLineCount').textContent = `${selectedLineIds.size} geselecteerd`;
    $('moveSelectedButton').disabled = !selectedLineIds.size;
    $('deleteSelectedButton').disabled = !selectedLineIds.size;
    $('ticketList').innerHTML = items.map(item => {
      const product = getProduct(item.productId);
      const sent = Math.min(item.sentQty || 0, item.qty);
      const status = sent >= item.qty ? 'Besteld' : sent ? `${sent} besteld · ${item.qty-sent} nieuw` : 'Nieuw';
      const selected = selectedLineIds.has(item.productId);
      return `<div class="ticket-item${selected ? ' selected' : ''}" data-ticket-item="${item.productId}">
        <div class="ticket-actions" aria-hidden="true">
          <button class="swipe-move" data-swipe-move="${item.productId}">Verplaats</button>
          <button class="swipe-delete" data-swipe-delete="${item.productId}">Verwijder</button>
        </div>
        <div class="ticket-row" data-ticket-row="${item.productId}">
          <button class="select-line${selectionMode ? '' : ' hidden'}${selected ? ' active' : ''}" data-select-line="${item.productId}" aria-label="Selecteer ${product?.name || ''}">${selected ? '✓' : ''}</button>
          <button class="qty-button" data-quantity="${item.productId}" aria-label="Aantal wijzigen">${item.qty}×</button>
          <div><strong>${product?.name || item.productId}</strong><small>${status} · ${money(product?.price || 0)} per stuk</small></div>
          <span class="ticket-price">${money((product?.price || 0) * item.qty)}</span>
          <button class="remove-item" data-remove="${item.productId}" aria-label="Verwijder ${product?.name || ''}">×</button>
        </div>
      </div>`;
    }).join('');
    document.querySelectorAll('[data-quantity]').forEach(button => button.addEventListener('click', () => openQuantityDialog(button.dataset.quantity)));
    document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => removeProduct(button.dataset.remove)));
    document.querySelectorAll('[data-select-line]').forEach(button => button.addEventListener('click', () => toggleLineSelection(button.dataset.selectLine)));
    document.querySelectorAll('[data-swipe-move]').forEach(button => button.addEventListener('click', () => openMoveDialog('lines', [button.dataset.swipeMove])));
    document.querySelectorAll('[data-swipe-delete]').forEach(button => button.addEventListener('click', () => removeProduct(button.dataset.swipeDelete)));
    bindTicketSwipe();
  }

  function toggleSelectionMode(force) {
    selectionMode = typeof force === 'boolean' ? force : !selectionMode;
    if (!selectionMode) selectedLineIds.clear();
    renderTicket();
  }

  function toggleLineSelection(productId) {
    if (selectedLineIds.has(productId)) selectedLineIds.delete(productId);
    else selectedLineIds.add(productId);
    renderTicket();
  }

  function openQuantityDialog(productId) {
    const item = orderFor(selectedTableId)?.items.find(row => row.productId === productId);
    if (!item) return;
    quantityProductId = productId;
    $('quantityProductName').textContent = getProduct(productId)?.name || productId;
    $('quantityInput').value = String(item.qty);
    $('quantityDialog').showModal();
    setTimeout(() => $('quantityInput').select(), 50);
  }

  function saveQuantityFromDialog() {
    const order = orderFor(selectedTableId);
    const item = order?.items.find(row => row.productId === quantityProductId);
    if (!item) return $('quantityDialog').close();
    const next = Math.max(1, Math.min(99, Number.parseInt($('quantityInput').value, 10) || 1));
    const previous = item.qty;
    item.qty = next;
    item.sentQty = Math.min(item.sentQty || 0, next);
    logAudit('product.quantity', {tableId:selectedTableId, productId:quantityProductId, from:previous, to:next});
    saveState();
    $('quantityDialog').close();
    renderAll();
  }

  function bindTicketSwipe() {
    document.querySelectorAll('[data-ticket-row]').forEach(row => {
      let startX = 0;
      let startY = 0;
      row.addEventListener('pointerdown', event => {
        startX = event.clientX;
        startY = event.clientY;
      });
      row.addEventListener('pointerup', event => {
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 30) return;
        const item = row.closest('.ticket-item');
        document.querySelectorAll('.ticket-item.swiped').forEach(node => { if (node !== item) node.classList.remove('swiped'); });
        if (dx < -45) item?.classList.add('swiped');
        if (dx > 30) item?.classList.remove('swiped');
      });
    });
  }

  function sendOrder() {
    const order = orderFor(selectedTableId);
    if (!order) return;
    let changed = 0;
    order.items.forEach(item => {
      if ((item.sentQty || 0) < item.qty) changed += item.qty - (item.sentQty || 0);
      item.sentQty = item.qty;
    });
    logAudit('order.send', {tableId:selectedTableId, qty:changed});
    saveState();
    renderAll();
    showToast(`${changed} nieuwe ${changed === 1 ? 'drank' : 'items'} besteld.`);
  }

  function openPayment() {
    const order = orderFor(selectedTableId);
    if (!order || !activeItems(order).length) return;
    $('paymentTitle').textContent = `Tafel ${tableDef(selectedTableId)?.label || selectedTableId}`;
    $('paymentAmount').textContent = money(orderTotal(order));
    $('paymentDialog').showModal();
  }

  function completePayment(method) {
    const order = orderFor(selectedTableId);
    if (!order) return;
    const amount = orderTotal(order);
    state.payments.unshift({id:uid(), tableId:selectedTableId, staffId:session.id, method, amount, items:clone(activeItems(order)), paidAt:Date.now(), syncStatus:'pending'});
    logAudit('payment.complete', {tableId:selectedTableId, method, amount});
    delete state.orders[selectedTableId];
    saveState();
    $('paymentDialog').close();
    showToast(`Betaling via ${method} geregistreerd.`);
    renderAll();
  }

  function openMoveDialog(kind = 'order', productIds = []) {
    const sourceOrder = orderFor(selectedTableId);
    if (!sourceOrder || !activeItems(sourceOrder).length) return;
    const ids = kind === 'lines' ? productIds.filter(id => sourceOrder.items.some(item => item.productId === id)) : [];
    if (kind === 'lines' && !ids.length) return;
    moveContext = {kind, productIds:ids, sourceId:selectedTableId};
    $('moveDialogEyebrow').textContent = kind === 'lines' ? 'PRODUCTEN VERPLAATSEN' : 'TAFEL VERPLAATSEN';
    $('moveDialogTitle').textContent = kind === 'lines' ? `${ids.length} ${ids.length === 1 ? 'lijn' : 'lijnen'} naar…` : 'Kies een doeltafel';
    $('moveTargets').innerHTML = TABLES.map(table => {
      const occupied = Boolean(orderFor(table.id) && activeItems(orderFor(table.id)).length);
      return `<button type="button" class="move-target candidate" data-move-target="${table.id}" ${table.id === selectedTableId ? 'disabled' : ''}>${table.zone === 'terrace' ? 'Terras ' : 'Tafel '}${table.label}${occupied ? '<br><small>wordt samengevoegd</small>' : ''}</button>`;
    }).join('');
    document.querySelectorAll('[data-move-target]').forEach(button => button.addEventListener('click', () => performMoveTarget(button.dataset.moveTarget)));
    renderFloor();
    $('moveDialog').showModal();
  }

  function performMoveTarget(targetId) {
    if (!moveContext || moveContext.sourceId === targetId) return;
    if (moveContext.kind === 'lines') moveLines(targetId, moveContext.productIds);
    else moveOrder(targetId);
  }

  function mergeItemInto(target, sourceItem) {
    const match = target.items.find(item => item.productId === sourceItem.productId);
    if (match) {
      match.qty += sourceItem.qty;
      match.sentQty = Math.min(match.qty, (match.sentQty || 0) + (sourceItem.sentQty || 0));
    } else target.items.push(clone(sourceItem));
  }

  function moveOrder(targetId) {
    const sourceId = moveContext?.sourceId || selectedTableId;
    const source = orderFor(sourceId);
    if (!source || sourceId === targetId) return;
    const target = orderFor(targetId, true);
    source.items.forEach(sourceItem => mergeItemInto(target, sourceItem));
    target.openedAt = Math.min(target.openedAt, source.openedAt);
    target.requestedBill = Boolean(target.requestedBill || source.requestedBill);
    delete state.orders[sourceId];
    selectedTableId = targetId;
    logAudit('order.move', {from:sourceId, to:targetId, merged:Boolean(activeItems(target).length)});
    finishMove(`Rekening verplaatst naar ${tableDef(targetId)?.label || targetId}.`);
  }

  function moveLines(targetId, productIds) {
    const sourceId = moveContext?.sourceId || selectedTableId;
    const source = orderFor(sourceId);
    if (!source || sourceId === targetId) return;
    const moving = source.items.filter(item => productIds.includes(item.productId));
    if (!moving.length) return;
    const target = orderFor(targetId, true);
    const movingWholeOrder = moving.length === activeItems(source).length;
    moving.forEach(item => mergeItemInto(target, item));
    source.items = source.items.filter(item => !productIds.includes(item.productId));
    if (movingWholeOrder && source.requestedBill) target.requestedBill = true;
    cleanupEmptyOrder(sourceId);
    if (!state.orders[sourceId]) selectedTableId = targetId;
    selectedLineIds.clear();
    selectionMode = false;
    logAudit('items.move', {from:sourceId, to:targetId, productIds});
    finishMove(`${moving.length} ${moving.length === 1 ? 'lijn' : 'lijnen'} verplaatst.`);
  }

  function finishMove(message) {
    saveState();
    if ($('moveDialog').open) $('moveDialog').close();
    moveContext = null;
    renderAll();
    showToast(message);
  }

  function cancelMoveMode() {
    moveContext = null;
    renderFloor();
  }

  function toggleRequestedBill() {
    const order = orderFor(selectedTableId);
    if (!order || !activeItems(order).length) return showToast('Voeg eerst iets toe aan de rekening.');
    order.requestedBill = !order.requestedBill;
    logAudit('bill.requested', {tableId:selectedTableId, requested:order.requestedBill});
    saveState();
    renderAll();
    showToast(order.requestedBill ? 'Tafel staat roze: rekening gevraagd.' : 'Rekeningstatus verwijderd.');
  }

  function renderAudit() {
    if (session?.role !== 'boss') return;
    const entries = Array.isArray(state.audit) ? state.audit : [];
    $('auditList').innerHTML = entries.length ? entries.map(entry => {
      const date = new Date(entry.at).toLocaleString('nl-BE');
      const detail = Object.entries(entry.details || {}).map(([key,value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' · ');
      return `<article class="audit-entry"><strong>${entry.action}</strong><span>${entry.staffName} · ${date}</span><small>${detail || 'Geen details'} · ${entry.deviceId}</small></article>`;
    }).join('') : '<div class="ticket-empty">Nog geen acties geregistreerd.</div>';
    $('auditDialog').showModal();
  }

  function applyLayout(layout) {
    const allowed = ['split','floor','order'];
    if (!allowed.includes(layout)) layout = 'split';
    state.layout = layout;
    saveState();
    $('workspace').classList.remove('layout-split','layout-floor','layout-order');
    $('workspace').classList.add(`layout-${layout}`);
    document.querySelectorAll('[data-layout]').forEach(button => button.classList.toggle('active', button.dataset.layout === layout));
    if (layout === 'order' && !selectedTableId) showToast('Kies eerst een tafel op de plattegrond.');
  }

  function initSplitter() {
    const splitter = $('splitter');
    let dragging = false;
    const stored = Number(storageGet('local', 'registratiekassa-floor-width'));
    if (stored >= 28 && stored <= 72) document.documentElement.style.setProperty('--floor-width', `${stored}%`);
    splitter.addEventListener('pointerdown', event => {
      if (window.innerWidth <= 1120) return;
      dragging = true;
      splitter.classList.add('dragging');
      splitter.setPointerCapture(event.pointerId);
    });
    splitter.addEventListener('pointermove', event => {
      if (!dragging) return;
      const rect = $('workspace').getBoundingClientRect();
      const percent = Math.max(28, Math.min(72, ((event.clientX - rect.left) / rect.width) * 100));
      document.documentElement.style.setProperty('--floor-width', `${percent}%`);
      storageSet('local', 'registratiekassa-floor-width', String(percent));
    });
    const stop = () => { dragging = false; splitter.classList.remove('dragging'); };
    splitter.addEventListener('pointerup', stop);
    splitter.addEventListener('pointercancel', stop);
    splitter.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const current = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--floor-width')) || 48;
      const next = Math.max(28, Math.min(72, current + (event.key === 'ArrowRight' ? 3 : -3)));
      document.documentElement.style.setProperty('--floor-width', `${next}%`);
      storageSet('local', 'registratiekassa-floor-width', String(next));
    });
  }

  const numberWords = {een:1,'één':1,twee:2,drie:3,vier:4,vijf:5,zes:6,zeven:7,acht:8,negen:9,tien:10};
  const aliasIndex = PRODUCTS.flatMap(product => product.aliases.map(alias => ({productId:product.id, alias:normalize(alias)}))).sort((a,b) => b.alias.length - a.alias.length);

  function normalize(text) {
    return String(text || '').toLocaleLowerCase('nl-BE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  }

  function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function quantityBefore(text, start) {
    const before = text.slice(0,start).trim().split(/\s+/).slice(-2);
    const last = before[before.length-1] || '';
    const previous = before[before.length-2] || '';
    if (/^\d+$/.test(last)) return Math.max(1, Math.min(25, Number(last)));
    if (numberWords[last]) return numberWords[last];
    if ((last === 'keer' || last === 'maal') && (/^\d+$/.test(previous) || numberWords[previous])) return Number(previous) || numberWords[previous];
    return 1;
  }

  function parseVoiceProducts(rawText) {
    let text = normalize(rawText);
    const correction = text.match(/(?:ik )?bedoel\s+(.+)$/);
    if (correction) text = correction[1];
    const occupied = [];
    const quantities = new Map();
    aliasIndex.forEach(entry => {
      const pattern = new RegExp(`\\b${escapeRegExp(entry.alias).replace(/\\ /g,'\\s+')}\\b`, 'g');
      let match;
      while ((match = pattern.exec(text))) {
        const start = match.index, end = start + match[0].length;
        if (occupied.some(span => start < span.end && end > span.start)) continue;
        occupied.push({start,end});
        quantities.set(entry.productId, (quantities.get(entry.productId) || 0) + quantityBefore(text,start));
      }
    });
    return [...quantities.entries()].map(([productId,qty]) => ({productId,qty}));
  }

  function parseRemoval(rawText) {
    const text = normalize(rawText);
    if (!/(verwijder|haal|wis|geen|weg)/.test(text)) return [];
    return parseVoiceProducts(text).map(item => item.productId);
  }

  function normalizeServerUrl(value) {
    const text = String(value || '').trim().replace(/\/+$/, '');
    if (!text) return '';
    try {
      const url = new URL(text);
      return url.protocol === 'https:' || url.hostname === '127.0.0.1' || url.hostname === 'localhost' ? url.origin : '';
    } catch { return ''; }
  }

  function getAiServerUrl() {
    return normalizeServerUrl(storageGet('local', AI_SERVER_KEY));
  }

  function refreshServerButton(status = '') {
    const button = $('serverButton');
    if (!button) return;
    const connected = Boolean(getAiServerUrl());
    const conflicts = ensureSyncState().conflicts.filter(conflict => !conflict.resolvedAt).length;
    button.textContent = conflicts ? `Conflict (${conflicts})` : connected ? (status || 'Server verbonden') : 'Server instellen';
    button.classList.toggle('connected', connected && !conflicts);
    button.classList.toggle('warning', Boolean(conflicts));
    button.title = connected ? 'Gedeelde kassadata via Tailscale; extra AI is optioneel' : 'Tailscale-server instellen';
  }

  async function rawServerFetch(path, options = {}, token = '') {
    const url = getAiServerUrl();
    if (!url) throw new Error('SERVER_NOT_CONFIGURED');
    const headers = {'Content-Type':'application/json', Accept:'application/json', ...(options.headers || {})};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${url}${path}`, {...options, headers});
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  async function connectServerSession(bossPin = '') {
    if (!getAiServerUrl() || !session) return '';
    let token = storageGet('local', SERVER_TOKEN_KEY) || '';
    if (token) return token;
    const isBoss = session.role === 'boss' && bossPin;
    const path = isBoss ? '/api/session/boss' : '/api/session/team';
    const body = isBoss
      ? {pin:bossPin, deviceId, deviceName:navigator.platform || 'Webapp'}
      : {staffId:session.id, staffName:session.name, deviceId, deviceName:navigator.platform || 'Webapp'};
    const result = await rawServerFetch(path, {method:'POST', body:JSON.stringify(body)});
    token = result.token || '';
    if (token) storageSet('local', SERVER_TOKEN_KEY, token);
    return token;
  }

  async function serverFetch(path, options = {}) {
    let token = storageGet('local', SERVER_TOKEN_KEY) || '';
    if (!token) token = await connectServerSession();
    try {
      return await rawServerFetch(path, options, token);
    } catch (error) {
      if (error.status !== 401) throw error;
      storageRemove('local', SERVER_TOKEN_KEY);
      token = await connectServerSession();
      return rawServerFetch(path, options, token);
    }
  }

  function queueAllLocalOrders() {
    const sync = ensureSyncState();
    Object.entries(state.orders || {}).forEach(([tableId, order]) => {
      if (sync.queue.some(operation => operation.tableId === tableId)) return;
      sync.queue.push({id:`sync-${uid()}`, tableId, baseRevision:0, order:clone(order), updatedAt:Date.now(), deviceId});
    });
  }

  function applyServerTable(table) {
    const sync = ensureSyncState();
    const tableId = table.tableId;
    const pending = sync.queue.find(operation => operation.tableId === tableId);
    const local = state.orders?.[tableId] ?? null;
    const remote = table.order ?? null;
    if (pending && JSON.stringify(local) !== JSON.stringify(remote)) {
      const id = `client-conflict-${tableId}-${table.revision}`;
      if (!sync.conflicts.some(conflict => conflict.id === id)) {
        sync.conflicts.push({id, tableId, localOrder:clone(local), serverOrder:clone(remote), serverRevision:table.revision, at:Date.now()});
      }
      return;
    }
    if (remote) state.orders[tableId] = clone(remote);
    else delete state.orders[tableId];
    sync.revisions[tableId] = Math.max(Number(sync.revisions[tableId]) || 0, Number(table.revision) || 0);
  }

  async function initialServerSnapshot() {
    const sync = ensureSyncState();
    if (sync.initialized) return;
    const localBefore = clone(state.orders || {});
    const snapshot = await serverFetch('/api/snapshot');
    const remoteIds = new Set((snapshot.tables || []).map(table => table.tableId));
    applyingRemoteState = true;
    try {
      for (const table of snapshot.tables || []) {
        const local = localBefore[table.tableId] ?? null;
        const remote = table.order ?? null;
        if (local && JSON.stringify(local) !== JSON.stringify(remote)) {
          sync.conflicts.push({id:`initial-${table.tableId}-${table.revision}`, tableId:table.tableId, localOrder:local, serverOrder:clone(remote), serverRevision:table.revision, at:Date.now()});
        }
        applyServerTable(table);
      }
      sync.cursor = Math.max(sync.cursor, Number(snapshot.cursor) || 0);
      sync.initialized = true;
      storageSet('local', STORAGE_KEY, JSON.stringify(state));
      lastSavedOrders = clone(state.orders || {});
    } finally {
      applyingRemoteState = false;
    }
    Object.entries(localBefore).forEach(([tableId, order]) => {
      if (remoteIds.has(tableId)) return;
      if (!sync.queue.some(operation => operation.tableId === tableId)) {
        sync.queue.push({id:`sync-${uid()}`, tableId, baseRevision:0, order:clone(order), updatedAt:Date.now(), deviceId});
      }
    });
  }

  async function syncNow({initial = false, silent = false} = {}) {
    if (syncBusy || !getAiServerUrl() || !session || !navigator.onLine) return;
    syncBusy = true;
    try {
      if (initial) await initialServerSnapshot();
      const sync = ensureSyncState();
      const pendingAudits = (state.audit || []).filter(entry => entry.syncStatus !== 'synced').slice(-500);
      const pendingPayments = (state.payments || []).filter(payment => payment.syncStatus !== 'synced').slice(-200);
      const result = await serverFetch('/api/sync', {
        method:'POST',
        body:JSON.stringify({
          cursor:sync.cursor,
          deviceId,
          deviceName:navigator.platform || 'Webapp',
          mutations:sync.queue.slice(0,200),
          audits:pendingAudits,
          payments:pendingPayments
        })
      });
      const acceptedIds = new Set((result.accepted || []).map(item => item.id));
      for (const accepted of result.accepted || []) sync.revisions[accepted.tableId] = Number(accepted.revision) || sync.revisions[accepted.tableId] || 0;
      sync.queue = sync.queue.filter(operation => !acceptedIds.has(operation.id));
      const acceptedAudits = new Set(result.acceptedAudits || []);
      (state.audit || []).forEach(entry => { if (acceptedAudits.has(entry.id)) entry.syncStatus = 'synced'; });
      const acceptedPayments = new Set(result.acceptedPayments || []);
      (state.payments || []).forEach(payment => { if (acceptedPayments.has(payment.id)) payment.syncStatus = 'synced'; });

      applyingRemoteState = true;
      try {
        for (const operation of result.operations || []) {
          sync.cursor = Math.max(sync.cursor, Number(operation.seq) || 0);
          if (operation.deviceId === deviceId) {
            sync.revisions[operation.tableId] = Math.max(Number(sync.revisions[operation.tableId]) || 0, Number(operation.revision) || 0);
            continue;
          }
          applyServerTable(operation);
        }
        for (const conflict of result.conflicts || []) {
          if (!sync.conflicts.some(existing => existing.id === conflict.id)) sync.conflicts.push({...conflict, at:Date.now()});
        }
        sync.lastSyncAt = Date.now();
        storageSet('local', STORAGE_KEY, JSON.stringify(state));
        lastSavedOrders = clone(state.orders || {});
      } finally {
        applyingRemoteState = false;
      }
      renderAll();
      refreshServerButton();
      if ((result.conflicts || []).length && !silent) showToast('Er is een gelijktijdige wijziging gevonden. Open de serverknop voor controle.');
      else if (!silent) showToast('Kassa gesynchroniseerd.');
    } catch (error) {
      if (!silent) showToast(`Synchronisatie uitgesteld: ${error.message}`);
      refreshServerButton('Server offline');
    } finally {
      syncBusy = false;
    }
  }

  function scheduleServerSync() {
    if (!getAiServerUrl() || !session || syncBusy) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow({silent:true}), 350);
  }

  async function configureAiServer() {
    const current = getAiServerUrl();
    const entered = prompt('Plak de Tailscale HTTPS-link van de Registratiekassa-server. Laat leeg om alleen lokaal te werken.', current);
    if (entered === null) return;
    if (!entered.trim()) {
      storageRemove('local', AI_SERVER_KEY);
      storageRemove('local', SERVER_TOKEN_KEY);
      refreshServerButton();
      showToast('Server verwijderd; deze kassa blijft lokaal werken.');
      return;
    }
    const url = normalizeServerUrl(entered);
    if (!url) return showToast('Gebruik een geldige HTTPS-link van Tailscale.');
    try {
      const response = await fetch(`${url}/health`, {headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const health = await response.json();
      if (!health.ok) throw new Error('server niet klaar');
      storageSet('local', AI_SERVER_KEY, url);
      storageRemove('local', SERVER_TOKEN_KEY);
      ensureSyncState().initialized = false;
      await connectServerSession();
      await syncNow({initial:true, silent:true});
      refreshServerButton();
      showToast(`Registratiekassa-server verbonden · ${health.database || 'online'}.`);
    } catch (error) {
      showToast(`Server niet bereikbaar: ${error.message}`);
    }
  }

  async function requestAiActions(transcript) {
    if (!getAiServerUrl()) return [];
    const data = await serverFetch('/api/voice/parse', {
      method:'POST',
      body:JSON.stringify({transcript, products:PRODUCTS.map(({id,name,aliases}) => ({id,name,aliases}))})
    });
    return Array.isArray(data.actions) ? data.actions : [];
  }

  function applyAiActions(actions) {
    let changed = 0;
    actions.forEach(action => {
      const product = getProduct(action.productId);
      const qty = Math.max(1, Math.min(25, Number(action.qty) || 1));
      if (!product || voiceIgnored.has(product.id)) return;
      if (action.type === 'remove') {
        for (let i = 0; i < qty; i++) removeOneVoiceProduct(product.id);
      } else {
        addProduct(product.id, qty, 'ai-voice');
      }
      changed += qty;
    });
    return changed;
  }

  async function handleFinalVoiceTranscript(transcript) {
    $('voiceTranscript').textContent = transcript;
    const removals = parseRemoval(transcript);
    if (removals.length) {
      removals.forEach(productId => removeOneVoiceProduct(productId));
      voiceInterim = [];
      voiceIgnored.clear();
      renderVoiceDraft();
      return;
    }
    const parsed = parseVoiceProducts(transcript).filter(item => !voiceIgnored.has(item.productId));
    if (parsed.length) {
      parsed.forEach(item => addProduct(item.productId, item.qty, 'voice'));
      showToast(`${parsed.reduce((n,item)=>n+item.qty,0)} item(s) via lokale spraakcontrole toegevoegd.`);
      voiceInterim = [];
      voiceIgnored.clear();
      renderVoiceDraft();
      return;
    }
    if (getAiServerUrl()) {
      try {
        const actions = await requestAiActions(transcript);
        if (actions.length) {
          const changed = applyAiActions(actions);
          if (changed) showToast(`${changed} item(s) door de optionele AI-terugval verwerkt.`);
          voiceInterim = [];
          voiceIgnored.clear();
          renderVoiceDraft();
          return;
        }
      } catch {
        showToast('Optionele AI niet bereikbaar; lokale spraak blijft actief.');
      }
    }
    voiceInterim = [];
    voiceIgnored.clear();
    renderVoiceDraft();
    showToast('Geen betrouwbaar product gevonden. Probeer de productnaam opnieuw.');
  }

  function removeOneVoiceProduct(productId) {
    const order = orderFor(selectedTableId);
    const item = order?.items.find(row => row.productId === productId);
    if (!item) return showToast(`${getProduct(productId)?.name || 'Product'} stond niet op de rekening.`);
    item.qty -= 1;
    if (item.qty <= 0) order.items = order.items.filter(row => row !== item);
    else item.sentQty = Math.min(item.sentQty || 0, item.qty);
    cleanupEmptyOrder(selectedTableId);
    saveState();
    renderAll();
    showToast(`${getProduct(productId)?.name} verwijderd.`);
  }

  function renderVoiceDraft() {
    const visible = voiceInterim.filter(item => !voiceIgnored.has(item.productId));
    $('voiceDraft').classList.toggle('hidden', !visible.length);
    $('voiceDraft').innerHTML = visible.map(item => `<span class="voice-draft-item">${item.qty} × ${getProduct(item.productId)?.name}<button data-ignore-voice="${item.productId}" aria-label="Niet toevoegen">×</button></span>`).join('');
    document.querySelectorAll('[data-ignore-voice]').forEach(button => button.addEventListener('click', () => {
      voiceIgnored.add(button.dataset.ignoreVoice);
      renderVoiceDraft();
    }));
  }

  function configureRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const instance = new SpeechRecognition();
    instance.lang = 'nl-BE';
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    instance.onstart = () => updateVoiceUi(true, 'Ik luister…');
    instance.onresult = event => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) handleFinalVoiceTranscript(text);
        else interimText += `${text} `;
      }
      if (interimText.trim()) {
        $('voiceTranscript').textContent = interimText.trim();
        voiceInterim = parseVoiceProducts(interimText);
        renderVoiceDraft();
      }
    };
    instance.onerror = event => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        voiceActive = false;
        updateVoiceUi(false, 'Microfoon geweigerd');
        showToast('Geef de website microfoontoegang in Safari of Chrome.');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        showToast(`Spraakfout: ${event.error}`);
      }
    };
    instance.onend = () => {
      clearTimeout(restartVoiceTimer);
      if (voiceActive) {
        restartVoiceTimer = setTimeout(() => {
          try { instance.start(); } catch {}
        }, 250);
      } else updateVoiceUi(false, 'Spraak uit');
    };
    return instance;
  }

  function updateVoiceUi(listening, label) {
    $('voiceButton').textContent = listening ? 'Stop microfoon' : 'Start microfoon';
    $('voiceStateText').textContent = label;
    $('voiceTopButton').classList.toggle('listening', listening);
    $('voiceTopButton').setAttribute('aria-pressed', String(listening));
    document.querySelector('.voice-live-bar')?.classList.toggle('listening', listening);
  }

  function toggleVoice() {
    if (!selectedTableId) {
      applyLayout('floor');
      return showToast('Kies eerst een tafel.');
    }
    if (!recognition) recognition = configureRecognition();
    if (!recognition) return showToast('Deze browser ondersteunt geen live spraakherkenning. Gebruik Safari of Chrome met HTTPS.');
    voiceActive = !voiceActive;
    if (voiceActive) {
      voiceIgnored.clear();
      try { recognition.start(); } catch {}
    } else {
      clearTimeout(restartVoiceTimer);
      try { recognition.stop(); } catch {}
      voiceInterim = [];
      voiceIgnored.clear();
      renderVoiceDraft();
      updateVoiceUi(false, 'Spraak uit');
    }
  }

  function renderAll() {
    renderFloor();
    renderOrder();
  }

  function bindEvents() {
    $('bossLoginButton').addEventListener('click', () => $('bossPinWrap').classList.toggle('hidden'));
    $('bossPinSubmit').addEventListener('click', () => {
      if ($('bossPin').value === '0607') startSession({id:'boss',name:'Baas',color:'#ff5aa5'}, 'boss', $('bossPin').value);
      else $('loginError').textContent = 'Verkeerde PIN.';
    });
    $('bossPin').addEventListener('keydown', event => { if (event.key === 'Enter') $('bossPinSubmit').click(); });
    $('userButton').addEventListener('click', () => {
      if (!confirm('Afmelden en een andere medewerker kiezen?')) return;
      storageRemove('session', 'registratiekassa-session');
      location.reload();
    });
    document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => applyLayout(button.dataset.layout)));
    document.querySelectorAll('[data-catalog]').forEach(button => button.addEventListener('click', () => {
      catalogMode = button.dataset.catalog;
      selectedCategory = 'Alles';
      document.querySelectorAll('[data-catalog]').forEach(x => x.classList.toggle('active', x === button));
      renderCatalog();
    }));
    $('productSearch').addEventListener('input', renderCatalog);
    $('sendButton').addEventListener('click', sendOrder);
    $('payButton').addEventListener('click', openPayment);
    $('backFloorButton').addEventListener('click', () => applyLayout('floor'));
    $('moveTableButton').addEventListener('click', () => openMoveDialog('order'));
    $('requestBillButton').addEventListener('click', toggleRequestedBill);
    $('selectionToggle').addEventListener('click', () => toggleSelectionMode());
    $('cancelSelectionButton').addEventListener('click', () => toggleSelectionMode(false));
    $('moveSelectedButton').addEventListener('click', () => openMoveDialog('lines', [...selectedLineIds]));
    $('deleteSelectedButton').addEventListener('click', () => {
      if (!selectedLineIds.size || !confirm(`${selectedLineIds.size} geselecteerde lijn(en) verwijderen?`)) return;
      [...selectedLineIds].forEach(removeProduct);
      toggleSelectionMode(false);
    });
    $('quantitySaveButton').addEventListener('click', saveQuantityFromDialog);
    $('quantityInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); saveQuantityFromDialog(); } });
    $('moveDialog').addEventListener('close', cancelMoveMode);
    $('auditButton').addEventListener('click', renderAudit);
    $('voiceButton').addEventListener('click', toggleVoice);
    $('voiceTopButton').addEventListener('click', toggleVoice);
    $('serverButton').addEventListener('click', configureAiServer);
    document.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      completePayment(button.dataset.method);
    }));
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      $('installButton').classList.remove('hidden');
    });
    $('installButton').addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $('installButton').classList.add('hidden');
    });
    window.addEventListener('resize', () => renderFloor());
    window.addEventListener('online', () => syncNow({initial:true, silent:true}));
    window.addEventListener('offline', () => refreshServerButton('Server offline'));
  }

  function init() {
    ensureSyncState();
    lastSavedOrders = clone(state.orders || {});
    const queryServer = normalizeServerUrl(new URLSearchParams(location.search).get('server'));
    if (queryServer) {
      storageSet('local', AI_SERVER_KEY, queryServer);
      ensureSyncState().initialized = false;
    }
    renderLogin();
    bindEvents();
    initSplitter();
    restoreSession();
    refreshServerButton();
    setInterval(() => syncNow({initial:true, silent:true}), 4000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  init();
})();
