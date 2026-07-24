(async()=>{
  const durableStore=(()=>{
    const DB_NAME='registratiekassa-durable-v1';
    const STORE_NAME='snapshots';
    let dbPromise=null;
    const timers=new Map();

    const openDb=()=>{
      if(!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB niet beschikbaar'));
      if(dbPromise) return dbPromise;
      dbPromise=new Promise((resolve,reject)=>{
        const request=indexedDB.open(DB_NAME,1);
        request.onupgradeneeded=()=>{
          const db=request.result;
          if(!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME,{keyPath:'key'});
        };
        request.onsuccess=()=>resolve(request.result);
        request.onerror=()=>reject(request.error||new Error('IndexedDB kon niet openen'));
        request.onblocked=()=>reject(new Error('IndexedDB is geblokkeerd'));
      }).catch(error=>{dbPromise=null;throw error;});
      return dbPromise;
    };

    const read=async key=>{
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const request=db.transaction(STORE_NAME,'readonly').objectStore(STORE_NAME).get(key);
        request.onsuccess=()=>resolve(request.result||null);
        request.onerror=()=>reject(request.error||new Error('Duurzame back-up kon niet gelezen worden'));
      });
    };

    const write=async record=>{
      const db=await openDb();
      return new Promise((resolve,reject)=>{
        const transaction=db.transaction(STORE_NAME,'readwrite');
        transaction.objectStore(STORE_NAME).put(record);
        transaction.oncomplete=()=>resolve(true);
        transaction.onerror=()=>reject(transaction.error||new Error('Duurzame back-up kon niet opgeslagen worden'));
        transaction.onabort=()=>reject(transaction.error||new Error('Duurzame back-up werd afgebroken'));
      });
    };

    const clone=value=>{
      try{return structuredClone(value);}catch{}
      return JSON.parse(JSON.stringify(value));
    };

    return {
      async restore(key){
        try{
          const local=localStorage.getItem(key);
          if(local){
            const parsed=JSON.parse(local);
            if(parsed&&typeof parsed==='object') return false;
          }
        }catch{}
        try{
          const snapshot=await read(key);
          if(!snapshot?.state) return false;
          localStorage.setItem(key,JSON.stringify(snapshot.state));
          return true;
        }catch(error){
          console.info('Geen duurzame kassaback-up hersteld.',error);
          return false;
        }
      },
      persist(key,state){
        if(!key||!state) return Promise.resolve(false);
        let snapshot;
        try{snapshot=clone(state);}catch{return Promise.resolve(false);}
        clearTimeout(timers.get(key));
        return new Promise(resolve=>{
          const timer=setTimeout(async()=>{
            timers.delete(key);
            try{await write({key,state:snapshot,updatedAt:Date.now()});resolve(true);}
            catch(error){console.info('Duurzame kassaback-up uitgesteld.',error);resolve(false);}
          },120);
          timers.set(key,timer);
        });
      },
      read
    };
  })();
  window.__kassaDurableStore=durableStore;
  await durableStore.restore('registratiekassa-zoo-v1');

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

  const patch=(label,before,after)=>{
    if(!js.includes(before)){
      console.warn(`Kassapatch niet toegepast: ${label}`);
      return false;
    }
    js=js.replace(before,after);
    return true;
  };

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
  patch('spraakhelpers','  function escapeRegExp(value)',helpers+'\n  function escapeRegExp(value)');
  patch('spraaknormalisatie toevoegen','    let text = normalize(rawText);','    let text = normalizeVoiceText(rawText);');
  patch('spraaknormalisatie verwijderen',"    const text = normalize(rawText);\n    if (!/(verwijder|haal|wis|geen|weg)/.test(text)) return [];","    const text = normalizeVoiceText(rawText);\n    if (!/(verwijder|haal|wis|geen|weg)/.test(text)) return [];");
  patch('mixdrankaantallen',"    return [...quantities.entries()].map(([productId,qty]) => ({productId,qty}));",`    const parsed = [...quantities.entries()].map(([productId,qty]) => ({productId,qty}));
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
  patch('spraakalternatieven','    instance.maxAlternatives = 1;',`    instance.maxAlternatives = 5;
    try {
      const Phrase = window.SpeechRecognitionPhrase;
      if (Phrase && 'phrases' in instance) {
        const phraseObjects=speechBiasPhrases().map(phrase => new Phrase(phrase, phrase.toLowerCase().includes('erist') ? 8.0 : 5.0));
        try { instance.phrases = phraseObjects; }
        catch { phraseObjects.forEach(phrase => instance.phrases.push(phrase)); }
      }
    } catch (error) { console.info('Contextuele spraakbias niet beschikbaar.', error); }`);
  patch('spraakranking',`        const text = event.results[i][0].transcript.trim();
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

  patch('server-timeout',"    const response = await fetch(`${url}${path}`, {...options, headers});",`    const {timeoutMs = 12000, ...fetchOptions} = options;
    const controller = fetchOptions.signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    let response;
    try {
      response = await fetch(url + path, {...fetchOptions, headers, cache:'no-store', signal:fetchOptions.signal || controller.signal});
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Server reageerde niet op tijd.');
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }`);
  patch('sync-backoff-start',`  async function syncNow({initial = false, silent = false} = {}) {
    if (syncBusy || !getAiServerUrl() || !session || !navigator.onLine) return;`,`  async function syncNow({initial = false, silent = false, force = false} = {}) {
    const syncGate = ensureSyncState();
    if (syncBusy || !getAiServerUrl() || !session) return;
    if (!force && !initial && Number(syncGate.nextRetryAt || 0) > Date.now()) return;`);
  patch('sync-success-reset','        sync.lastSyncAt = Date.now();',`        sync.lastSyncAt = Date.now();
        sync.failureCount = 0;
        sync.nextRetryAt = 0;
        sync.lastError = '';
        sync.lastErrorAt = 0;`);
  patch('sync-error-backoff',`    } catch (error) {
      if (!silent) showToast(\`Synchronisatie uitgesteld: ${'${error.message}'}\`);
      refreshServerButton('Server offline');
    } finally {`,`    } catch (error) {
      const sync = ensureSyncState();
      sync.failureCount = Math.min(12, (Number(sync.failureCount) || 0) + 1);
      const baseDelay = Math.min(30000, 1000 * (2 ** Math.min(5, sync.failureCount - 1)));
      sync.nextRetryAt = Date.now() + baseDelay + Math.floor(Math.random() * 500);
      sync.lastError = String(error?.message || error || 'Onbekende verbindingsfout');
      sync.lastErrorAt = Date.now();
      storageSet('local', STORAGE_KEY, JSON.stringify(state));
      window.__kassaDurableStore?.persist(STORAGE_KEY,state).catch(()=>{});
      if (!silent) showToast(\`Synchronisatie uitgesteld: ${'${sync.lastError}'}\`);
      refreshServerButton('Server offline');
    } finally {`);
  patch('sync-planning',`    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncNow({silent:true}), 350);`,`    clearTimeout(syncTimer);
    const retryAt = Number(ensureSyncState().nextRetryAt || 0);
    const wait = Math.max(350, retryAt - Date.now());
    syncTimer = setTimeout(() => syncNow({silent:true}), Math.min(wait, 30000));`);
  patch('duurzame-state-save',`    storageSet('local', STORAGE_KEY, JSON.stringify(state));
    lastSavedOrders = clone(state.orders || {});
    scheduleServerSync();`,`    storageSet('local', STORAGE_KEY, JSON.stringify(state));
    window.__kassaDurableStore?.persist(STORAGE_KEY,state).catch(()=>{});
    lastSavedOrders = clone(state.orders || {});
    scheduleServerSync();`);
  patch('verbindings-events',`    window.addEventListener('online', () => syncNow({initial:true, silent:true}));
    window.addEventListener('offline', () => refreshServerButton('Server offline'));`,`    window.addEventListener('online', () => syncNow({initial:true, silent:true, force:true}));
    window.addEventListener('offline', () => refreshServerButton('Server offline'));
    window.addEventListener('focus', () => syncNow({initial:true, silent:true, force:true}));
    window.addEventListener('pageshow', () => syncNow({initial:true, silent:true, force:true}));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncNow({initial:true, silent:true, force:true});
    });`);
  patch('sync-interval',"    setInterval(() => syncNow({initial:true, silent:true}), 4000);","    setInterval(() => syncNow({initial:true, silent:true}), 5000);");

  const runtimeApiExport=`
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
  window.__kassaAppApi = {
    getState: () => typeof state !== 'undefined' ? state : null,
    getSession: () => typeof session !== 'undefined' ? session : null,
    getSelectedTableId: () => typeof selectedTableId !== 'undefined' ? selectedTableId : null,
    getProduct: id => typeof getProduct === 'function' ? getProduct(id) : null,
    getProducts: () => typeof allProducts === 'function' ? allProducts() : (typeof PRODUCTS !== 'undefined' ? PRODUCTS : []),
    getStaff: () => typeof STAFF !== 'undefined' ? STAFF : [],
    getTable: id => typeof tableDef === 'function' ? tableDef(id) : null,
    getOrder: id => typeof orderFor === 'function' ? orderFor(id) : null,
    getStorageKey: () => typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'registratiekassa-zoo-v1',
    getDeviceId: () => typeof deviceId !== 'undefined' ? deviceId : '',
    getServerUrl: () => typeof getAiServerUrl === 'function' ? getAiServerUrl() : '',
    getSyncState: () => typeof ensureSyncState === 'function' ? ensureSyncState() : (typeof state !== 'undefined' ? state?._sync : null),
    addProduct: (productId,qty=1,source='bediening') => { if (typeof addProduct === 'function') return addProduct(productId,qty,source); },
    changeQuantity: (productId,delta,source='bediening') => { if (typeof changeQuantity === 'function') return changeQuantity(productId,delta,source); },
    removeProduct: productId => { if (typeof removeProduct === 'function') return removeProduct(productId); },
    syncNow: options => typeof syncNow === 'function' ? syncNow(options||{}) : Promise.resolve(),
    save: () => { if (typeof saveState === 'function') saveState(); },
    render: () => { if (typeof renderAll === 'function') renderAll(); },
    toast: message => { if (typeof showToast === 'function') showToast(message); },
    persistNow: () => window.__kassaDurableStore?.persist(typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'registratiekassa-zoo-v1',typeof state !== 'undefined' ? state : null)
  };
`;
  const apiPatched=js.replace(/(\n\s*)function configureRecognition\(\)/,(match,indent)=>`${runtimeApiExport}${indent}function configureRecognition()`);
  if(apiPatched===js) console.warn('Runtime-API kon niet vóór configureRecognition worden toegevoegd.');
  else js=apiPatched;

  const [appleCss,voiceController,bossAuditCss,bossAudit,orderHistoryAddon,interactionCss,orderControls,connectionManager]=await Promise.all([
    fetchText('apple-fixes.css'),
    fetchText('voice-controller.js'),
    fetchText('boss-audit.css'),
    fetchText('boss-audit.js'),
    fetchText('order-history-addon.js'),
    fetchText('interaction-upgrades.css'),
    fetchText('order-controls.js'),
    fetchText('connection-manager.js')
  ]);
  const style=document.createElement('style');
  style.textContent=css+'\n'+appleCss+'\n'+bossAuditCss+'\n'+interactionCss;
  document.head.appendChild(style);
  (0,eval)(js);
  (0,eval)(voiceController);
  (0,eval)(bossAudit);
  (0,eval)(orderHistoryAddon);
  (0,eval)(orderControls);
  (0,eval)(connectionManager);
})().catch(error=>{
  document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:\n${error.stack||error}</pre>`;
});
