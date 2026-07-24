(async()=>{
  const robots=document.createElement('meta');
  robots.name='robots';
  robots.content='noindex,nofollow,noarchive,nosnippet,noimageindex';
  document.head.appendChild(robots);

  const fetchText=async path=>{
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok) throw new Error(`Kon ${path} niet laden (${response.status})`);
    return (await response.text()).trim();
  };
  const unpack=async b64=>{
    const bytes=Uint8Array.from(atob(b64),character=>character.charCodeAt(0));
    if(!('DecompressionStream' in window)) throw new Error('Deze browser is te oud voor de nieuwe kassaversie. Update Safari of Chrome.');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  };
  const appParts=Array.from({length:8},(_,index)=>`assets/app.full.${String(index+1).padStart(2,'0')}.b64`);
  const [cssB64,jsParts]=await Promise.all([
    fetchText('assets/styles.v4.gz.b64'),
    Promise.all(appParts.map(fetchText))
  ]);
  const [css,js]=await Promise.all([unpack(cssB64),unpack(jsParts.join(''))]);
  const style=document.createElement('style');
  style.textContent=css;
  document.head.appendChild(style);

  // Voeg de nieuwe Baas-bediening toe aan oudere opgeslagen indexversies.
  if(!document.getElementById('catalogAdminButton')){
    const button=document.createElement('button');
    button.id='catalogAdminButton';
    button.className='soft-button hidden';
    button.textContent='Kaartbeheer';
    const audit=document.getElementById('auditButton');
    (audit?.parentElement||document.querySelector('.top-actions'))?.insertBefore(button,audit||null);
  }
  if(!document.getElementById('conflictDialog')){
    document.body.insertAdjacentHTML('beforeend',`<dialog id="conflictDialog" class="dialog-card wide-dialog conflict-dialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">SYNCHRONISATIE</p><h3>Gelijktijdige wijzigingen</h3></div><button value="cancel" class="icon-close">×</button></div><p class="muted">Kies per tafel welke versie behouden moet worden. Je keuze wordt daarna opnieuw gesynchroniseerd.</p><div id="conflictList" class="conflict-list"></div><button value="cancel" class="soft-button full">Later oplossen</button></form></dialog>`);
  }
  if(!document.getElementById('catalogAdminDialog')){
    document.body.insertAdjacentHTML('beforeend',`<dialog id="catalogAdminDialog" class="dialog-card catalog-admin-dialog"><form method="dialog"><div class="dialog-head"><div><p class="eyebrow">BAASOMGEVING</p><h3>Kaart- en prijsbeheer</h3></div><button value="cancel" class="icon-close">×</button></div><div class="catalog-admin-toolbar"><label class="product-search"><span>⌕</span><input id="catalogAdminSearch" type="search" placeholder="Zoek naam, categorie of ID"></label><button id="catalogAddButton" type="button" class="primary-small">Nieuw product</button></div><p id="catalogAdminCount" class="muted compact"></p><div id="catalogAdminList" class="catalog-admin-list"></div><button value="cancel" class="soft-button full">Sluiten</button></form></dialog>`);
  }

  (0,eval)(js);
})().catch(error=>{
  document.body.innerHTML=`<pre style="color:white;background:#07101b;padding:20px;white-space:pre-wrap">Registratiekassa kon niet starten:\n${error.stack||error}</pre>`;
});
