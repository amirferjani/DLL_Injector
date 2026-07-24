(async()=>{
  const fetchText=async path=>{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(`Kon ${path} niet laden (${response.status})`);
    return (await response.text()).trim();
  };
  const unpack=async b64=>{
    const cleaned=String(b64||'').replace(/[^A-Za-z0-9+/=]/g,'');
    if(!cleaned||cleaned.length%4!==0) throw new Error('Ongeldig appbestand ontvangen. Vernieuw de pagina.');
    const binary=atob(cleaned);
    const bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index+=1) bytes[index]=binary.charCodeAt(index);
    if(!('DecompressionStream' in window)) throw new Error('Deze browser is te oud voor de kassaversie. Update Safari of Chrome.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  };
  const appParts=Array.from({length:7},(_,index)=>`assets/app.full.${String(index+1).padStart(2,'0')}.b64`);
  const [cssB64,jsParts]=await Promise.all([
    fetchText('assets/styles.css.gz.b64'),
    Promise.all(appParts.map(fetchText))
  ]);
  const [css,originalJs]=await Promise.all([unpack(cssB64),unpack(jsParts.join(''))]);
  let js=originalJs;

  const catalogMatch=js.match(/const PRODUCTS = (\[.*?\]);\n/s);
  if(catalogMatch){
    const products=JSON.parse(catalogMatch[1]);
    const byId=new Map(products.map(product=>[product.id,product]));
    const aliases={
      p12:['porn star martini','porno star martini','star martini','passion star martini','pornstar martinie','porn star','voor een star martini'],
      p157:['jack daniels','jack daniel','whisky','whiskey','huiswhisky','huis whisky'],
      p197:['gin','huisgin','huis gin','bombay gin','bombay safier','bombay saffier','bombay safire','bombay sapphire gin'],
      p208:['bacardi','witte bacardi','bacardi wit','witte rum','white rum','huisrum wit'],
      p212:['bruine bacardi','bacardi bruin','bruine rum','donkere rum','dark rum','huisrum bruin'],
      p229:['vodka','wodka','eristof','eristoff','eristov','aristof','aristoff','er is tof','er is toff','er is top','er is stop','risto','ristoff','eristoff white','huisvodka','huis vodka']
    };
    const gaugin=byId.get('p203');
    if(gaugin) gaugin.aliases=(gaugin.aliases||[]).filter(alias=>!['gin tonic','gin en tonic'].includes(String(alias).toLowerCase()));
    Object.entries(aliases).forEach(([id,extra])=>{
      const product=byId.get(id);
      if(!product) return;
      product.aliases=[...new Set([...(product.aliases||[]),...extra])];
    });
    js=js.replace(catalogMatch[1],JSON.stringify(products));
  }

  const helpers=`
  const voicePhraseCorrections = [
    [/\\b(?:porno|porn)\\s+star\\s+martini\\b/g, 'pornstar martini'],
    [/\\b(?:voor een )?star\\s+martini\\b/g, 'pornstar martini'],
    [/\\b(?:er\\s+is\\s+(?:tof|toff|top|stop)|aristof+|eristov|eristof+|ristof+)\\b/g, 'eristoff'],
    [/\\bbombay\\s+(?:safier|saffier|safire)\\b/g, 'bombay sapphire'],
    [/\\bjack\\s+daniel\\b/g, 'jack daniels'],
    [/\\bwodka\\b/g, 'vodka']
  ];
  function normalizeVoiceText(text) {
    let normalized = normalize(text);
    voicePhraseCorrections.forEach(([pattern,replacement]) => { normalized = normalized.replace(pattern,replacement); });
    return normalized;
  }
  function speechBiasPhrases() {
    const house = ['witte rum','witte bacardi','bruine rum','bruine bacardi','vodka','wodka','eristof','eristoff','whisky','jack daniels','gin','bombay sapphire','pornstar martini','star martini'];
    return [...new Set([...house,...allProducts().flatMap(product => [product.name,...(product.aliases||[])])])]
      .map(value => String(value||'').trim()).filter(value => value && value.length <= 80).slice(0,500);
  }
`;
  js=js.replace('  function escapeRegExp(value)',helpers+'\n  function escapeRegExp(value)');
  js=js.replace('    let text = normalize(rawText);','    let text = normalizeVoiceText(rawText);');
  js=js.replace("    const text = normalize(rawText);\n    if (!/(verwijder|haal|wis|geen|weg)/.test(text)) return [];","    const text = normalizeVoiceText(rawText);\n    if (!/(verwijder|haal|wis|geen|weg)/.test(text)) return [];");
  js=js.replace("    return [...quantities.entries()].map(([productId,qty]) => ({productId,qty}));",`    const parsed = [...quantities.entries()].map(([productId,qty]) => ({productId,qty}));
    const parsedById = new Map(parsed.map(item => [item.productId,item]));
    const amountPattern = '(?:een|één|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|\\d+)';
    const comboRules = [
      {spirit:'p208',mixer:'p44',pattern:new RegExp('\\b('+amountPattern+')\\s+(?:witte\\s+(?:rum|bacardi)|bacardi\\s+wit)\\s+(?:cola|coca\\s+cola)\\b')},
      {spirit:'p212',mixer:'p44',pattern:new RegExp('\\b('+amountPattern+')\\s+(?:bruine\\s+(?:rum|bacardi)|bacardi\\s+bruin)\\s+(?:cola|coca\\s+cola)\\b')},
      {spirit:'p229',mixer:'p44',pattern:new RegExp('\\b('+amountPattern+')\\s+(?:vodka|wodka|eristoff?)\\s+(?:cola|coca\\s+cola)\\b')},
      {spirit:'p157',mixer:'p44',pattern:new RegExp('\\b('+amountPattern+')\\s+(?:whisky|whiskey|jack\\s+daniels?)\\s+(?:cola|coca\\s+cola)\\b')},
      {spirit:'p197',mixer:'p55',pattern:new RegExp('\\b('+amountPattern+')\\s+(?:gin|bombay(?:\\s+sapphire)?)\\s+tonic\\b')}
    ];
    comboRules.forEach(rule => {
      const match = text.match(rule.pattern);
      if (!match) return;
      const qty = /^\\d+$/.test(match[1]) ? Number(match[1]) : (numberWords[match[1]] || 1);
      [rule.spirit,rule.mixer].forEach(productId => {
        const existing = parsedById.get(productId);
        if (existing) existing.qty = qty;
      });
    });
    return parsed;`);
  js=js.replace('    instance.maxAlternatives = 1;',`    instance.maxAlternatives = 5;
    try {
      const Phrase = window.SpeechRecognitionPhrase;
      if (Phrase && 'phrases' in instance) {
        const phraseObjects=speechBiasPhrases().map(phrase => new Phrase(phrase, phrase.toLowerCase().includes('erist') ? 8.0 : 5.0));
        try { instance.phrases = phraseObjects; }
        catch { phraseObjects.forEach(phrase => instance.phrases.push(phrase)); }
      }
    } catch (error) { console.info('Contextuele spraakbias niet beschikbaar.', error); }`);
  js=js.replace(`        const text = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) handleFinalVoiceTranscript(text);
        else interimText += \`${'${text}'} \`;`,`        const alternatives = Array.from(event.results[i]);
        const ranked = alternatives.map(alternative => {
          const corrected=normalizeVoiceText(alternative.transcript);
          const hits=parseVoiceProducts(corrected).reduce((total,item)=>total+item.qty,0);
          const eristoffBonus=/\\beristoff\\b/.test(corrected)?500:0;
          return {text:corrected,score:hits*1000+eristoffBonus+Number(alternative.confidence||0)};
        }).sort((a,b)=>b.score-a.score);
        const text = (ranked[0]?.text || alternatives[0]?.transcript || '').trim();
        if (event.results[i].isFinal) handleFinalVoiceTranscript(text);
        else interimText += \`${'${text}'} \`;`);

  const voiceApiExport=`
  window.__kassaVoiceApi = {
    handle: typeof handleFinalVoiceTranscript === 'function' ? handleFinalVoiceTranscript : null,
    parse: typeof parseVoiceProducts === 'function' ? parseVoiceProducts : null,
    preview: text => {
      if (typeof parseVoiceProducts !== 'function' || typeof renderVoiceDraft !== 'function') return;
      voiceInterim = parseVoiceProducts(text);
      renderVoiceDraft();
    },
    clearPreview: () => {
      if (typeof renderVoiceDraft !== 'function') return;
      voiceInterim = [];
      if (typeof voiceIgnored !== 'undefined' && voiceIgnored?.clear) voiceIgnored.clear();
      renderVoiceDraft();
    },
    phrases: typeof speechBiasPhrases === 'function' ? speechBiasPhrases : () => [],
    products: () => typeof allProducts === 'function' ? allProducts() : (typeof PRODUCTS !== 'undefined' ? PRODUCTS : []),
    serverUrl: () => {
      try {
        if (typeof getServerUrl === 'function') return getServerUrl() || '';
        if (typeof getAiServerUrl === 'function') return getAiServerUrl() || '';
      } catch {}
      return localStorage.getItem('registratiekassa-server-url') || localStorage.getItem('registratiekassa-ai-server-url') || '';
    }
  };
`;
  js=js.replace(/(\n\s*)function configureRecognition\(\)/,(match,indent)=>`${voiceApiExport}${indent}function configureRecognition()`);

  const [appleCss,voiceController]=await Promise.all([
    fetchText('apple-fixes.css'),
    fetchText('voice-controller.js')
  ]);
  const style=document.createElement('style');
  style.textContent=css+'\n'+appleCss;
  document.head.appendChild(style);
  (0,eval)(js);
  (0,eval)(voiceController);
})().catch(error=>{
  document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:\n${error.stack||error}</pre>`;
});
