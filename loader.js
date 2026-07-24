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
      p229:['vodka','wodka','eristof','eristoff','eristoff white','huisvodka','huis vodka']
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
    [/\\beristof\\b/g, 'eristoff'],
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
    const house = ['witte rum','witte bacardi','bruine rum','bruine bacardi','vodka','eristoff','whisky','jack daniels','gin','bombay sapphire','pornstar martini'];
    return [...new Set([...house,...allProducts().flatMap(product => [product.name,...(product.aliases||[])])])]
      .map(value => String(value||'').trim()).filter(value => value && value.length <= 80).slice(0,500);
  }
`;
  js=js.replace('  function escapeRegExp(value)',helpers+'\n  function escapeRegExp(value)');
  js=js.replace('    let text = normalize(rawText);','    let text = normalizeVoiceText(rawText);');
  js=js.replace("    const text = normalize(rawText);\n    if (!/(verwijder|haal|wis|geen|weg)/.test(text)) return [];","    const text = normalizeVoiceText(rawText);\n    if (!/(verwijder|haal|wis|geen|weg)/.test(text)) return [];");
  js=js.replace('    instance.maxAlternatives = 1;',`    instance.maxAlternatives = 3;
    try {
      const Phrase = window.SpeechRecognitionPhrase;
      if (Phrase && 'phrases' in instance) speechBiasPhrases().forEach(phrase => instance.phrases.push(new Phrase(phrase, 5.0)));
    } catch (error) { console.info('Contextuele spraakbias niet beschikbaar.', error); }`);
  js=js.replace(`        const text = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) handleFinalVoiceTranscript(text);
        else interimText += \`${'${text}'} \`;`,`        const alternatives = Array.from(event.results[i]);
        const ranked = alternatives.map(alternative => ({text:alternative.transcript.trim(),score:parseVoiceProducts(alternative.transcript).length*100+Number(alternative.confidence||0)})).sort((a,b)=>b.score-a.score);
        const text = (ranked[0]?.text || alternatives[0]?.transcript || '').trim();
        if (event.results[i].isFinal) handleFinalVoiceTranscript(text);
        else interimText += \`${'${text}'} \`;`);

  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);
  (0,eval)(js);
})().catch(error=>{
  document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:\n${error.stack||error}</pre>`;
});
