(()=>{
  'use strict';

  function classifyDevice(){
    const root=document.documentElement;
    const ua=String(navigator.userAgent||'');
    const touchPoints=Number(navigator.maxTouchPoints||0);
    const isIPhone=/iPhone|iPod/i.test(ua);
    const isIPad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&touchPoints>1);
    const coarse=Boolean(window.matchMedia?.('(pointer: coarse)').matches);
    const screenWidth=Number(window.screen?.width)||window.innerWidth||1024;
    const screenHeight=Number(window.screen?.height)||window.innerHeight||1024;
    const shortSide=Math.min(screenWidth,screenHeight);
    const phone=isIPhone||(!isIPad&&coarse&&shortSide<=600);
    const tablet=isIPad||(!phone&&coarse&&shortSide<=1180);
    root.classList.toggle('rk-phone',phone);
    root.classList.toggle('rk-tablet',tablet);
    root.classList.toggle('rk-desktop',!phone&&!tablet);
    root.dataset.rkDevice=phone?'phone':tablet?'tablet':'desktop';
    const visualWidth=Math.round(window.visualViewport?.width||window.innerWidth||screenWidth);
    root.style.setProperty('--rk-visual-width',`${visualWidth}px`);
  }

  classifyDevice();
  window.addEventListener('orientationchange',()=>setTimeout(classifyDevice,120),{passive:true});
  window.visualViewport?.addEventListener('resize',classifyDevice,{passive:true});

  const api=window.__kassaAppApi;
  if(!api) {
    console.warn('Verbindingsbeheer kon niet starten: app-koppeling ontbreekt.');
    return;
  }

  const button=()=>document.getElementById('serverButton');
  let lastHealthOkAt=0;
  let lastHealthError='';
  let heartbeatBusy=false;
  let lastSnapshot='';
  let lastQueueSignature='';

  const syncState=()=>api.getSyncState?.()||api.getState?.()?._sync||{};
  const pendingCounts=()=>{
    const state=api.getState?.()||{};
    const sync=syncState();
    const mutations=Array.isArray(sync.queue)?sync.queue.length:0;
    const audits=Array.isArray(state.audit)?state.audit.filter(entry=>entry?.syncStatus!=='synced').length:0;
    const payments=Array.isArray(state.payments)?state.payments.filter(entry=>entry?.syncStatus!=='synced').length:0;
    return {mutations,audits,payments,total:mutations+audits+payments};
  };

  function renderStatus(){
    const node=button();
    if(!node) return;
    const server=api.getServerUrl?.()||'';
    const sync=syncState();
    const pending=pendingCounts();
    const conflicts=(sync.conflicts||[]).filter(conflict=>!conflict?.resolvedAt).length;
    const errorRecent=Boolean(sync.lastError)&&Date.now()-Number(sync.lastErrorAt||0)<120000;
    const healthRecent=lastHealthOkAt&&Date.now()-lastHealthOkAt<45000;

    node.classList.remove('rk-connection-local','rk-connection-online','rk-connection-pending','rk-connection-offline','rk-connection-conflict');
    if(!server){
      node.dataset.connectionState='local';
      node.classList.add('rk-connection-local');
      node.textContent='Server instellen';
      node.title='De kassa werkt lokaal en offline. Stel Tailscale in voor synchronisatie tussen apparaten.';
      return;
    }
    if(conflicts){
      node.dataset.connectionState='conflict';
      node.classList.add('rk-connection-conflict');
      node.textContent=`Conflict (${conflicts})`;
      node.title='Er zijn gelijktijdige wijzigingen die gecontroleerd moeten worden.';
      return;
    }
    if(errorRecent&&!healthRecent){
      node.dataset.connectionState='offline';
      node.classList.add('rk-connection-offline');
      node.textContent=pending.total?`Offline · ${pending.total} wachtend`:'Server offline';
      node.title=`Alles blijft lokaal bewaard. Automatische nieuwe poging volgt${sync.nextRetryAt?` rond ${new Date(sync.nextRetryAt).toLocaleTimeString('nl-BE')}`:''}. ${sync.lastError||lastHealthError}`;
      return;
    }
    if(pending.total){
      node.dataset.connectionState='pending';
      node.classList.add('rk-connection-pending');
      node.textContent=`Synchroniseren · ${pending.total}`;
      node.title=`Wachtend: ${pending.mutations} tafelwijzigingen, ${pending.audits} logregels en ${pending.payments} betalingen.`;
      return;
    }
    node.dataset.connectionState='online';
    node.classList.add('rk-connection-online');
    node.textContent='Server verbonden';
    node.title=sync.lastSyncAt?`Laatste synchronisatie: ${new Date(sync.lastSyncAt).toLocaleString('nl-BE')}`:'Server bereikbaar.';
  }

  async function healthCheck(){
    const server=api.getServerUrl?.();
    if(!server||heartbeatBusy||document.visibilityState==='hidden') return false;
    heartbeatBusy=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6500);
    try{
      const response=await fetch(`${server}/health`,{cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!data?.ok) throw new Error('Server niet klaar');
      lastHealthOkAt=Date.now();
      lastHealthError='';
      const sync=syncState();
      if(sync.lastError&&Date.now()-Number(sync.lastErrorAt||0)>15000){
        sync.lastError='';
        sync.lastErrorAt=0;
      }
      return true;
    }catch(error){
      lastHealthError=error?.name==='AbortError'?'Healthcheck time-out':String(error?.message||error);
      return false;
    }finally{
      clearTimeout(timer);
      heartbeatBusy=false;
      renderStatus();
    }
  }

  async function wakeSync(reason='handmatig'){
    const server=api.getServerUrl?.();
    if(!server) return;
    try{
      await api.syncNow?.({initial:true,silent:true,force:true,reason});
    }catch(error){
      console.warn('Synchronisatiepoging mislukt.',error);
    }
    await healthCheck();
    renderStatus();
  }

  async function persistSnapshotIfChanged(){
    const state=api.getState?.();
    if(!state) return;
    let serialized='';
    try{serialized=JSON.stringify(state);}catch{return;}
    const signature=`${serialized.length}:${serialized.slice(0,80)}:${serialized.slice(-80)}`;
    if(signature===lastSnapshot) return;
    lastSnapshot=signature;
    try{await window.__kassaDurableStore?.persist?.(api.getStorageKey?.()||'registratiekassa-zoo-v1',state);}catch{}
  }

  function coordinateTabs(){
    if(!('BroadcastChannel' in window)) return null;
    const channel=new BroadcastChannel('registratiekassa-sync-v1');
    channel.addEventListener('message',event=>{
      if(event.data?.type==='queue-changed'){
        renderStatus();
        if(document.visibilityState==='visible') wakeSync('ander tabblad');
      }
    });
    return channel;
  }

  const channel=coordinateTabs();
  async function poll(){
    renderStatus();
    await persistSnapshotIfChanged();
    const counts=pendingCounts();
    const signature=`${counts.total}:${syncState().cursor||0}:${syncState().lastSyncAt||0}`;
    if(signature!==lastQueueSignature){
      lastQueueSignature=signature;
      try{channel?.postMessage({type:'queue-changed',signature});}catch{}
    }
  }

  ['online','focus','pageshow'].forEach(name=>window.addEventListener(name,()=>wakeSync(name),{passive:true}));
  window.addEventListener('offline',renderStatus,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') wakeSync('zichtbaar');
    else persistSnapshotIfChanged();
  });
  window.addEventListener('pagehide',()=>persistSnapshotIfChanged(),{passive:true});

  try{const request=navigator.storage?.persist?.();request?.catch?.(()=>{});}catch{}
  setInterval(poll,1600);
  setInterval(()=>{
    if(pendingCounts().total) wakeSync('wachtrij');
    else healthCheck();
  },15000);
  poll();
  setTimeout(()=>wakeSync('opstart'),700);

  window.__kassaConnectionApi={
    sync:()=>wakeSync('handmatig'),
    health:healthCheck,
    pending:pendingCounts,
    state:syncState,
    classifyDevice
  };
})();
