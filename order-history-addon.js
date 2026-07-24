(()=>{
  'use strict';
  const STORE_KEY='registratiekassa-audit-v3';
  const $=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const format=value=>new Intl.DateTimeFormat('nl-BE',{dateStyle:'short',timeStyle:'medium'}).format(new Date(Number(value)||Date.now()));
  const events=()=>{try{const value=JSON.parse(localStorage.getItem(STORE_KEY)||'[]');return Array.isArray(value)?value:[];}catch{return [];}};
  const api=()=>window.__kassaAppApi;
  const productName=id=>api()?.getProduct?.(id)?.name||id||'Product';
  const tableName=id=>api()?.getTable?.(id)?.label||id||'Onbekend';
  const eventText=event=>{
    const qty=event.qty?`${event.qty}× `:'';
    const product=event.productName||productName(event.productId);
    const action=event.action||'';
    if(action==='item_add') return `${qty}${product} toegevoegd`;
    if(action==='item_remove') return `${qty}${product} verwijderd`;
    if(action==='item_send') return `${qty}${product} besteld`;
    if(action==='item_move') return `${qty}${product} verplaatst`;
    if(action==='payment') return 'Betaling geregistreerd';
    if(action==='order_move') return 'Rekening verplaatst';
    if(action==='order_open') return 'Rekening geopend';
    if(action==='order_close') return 'Rekening gesloten';
    if(action==='order_delete') return 'Rekening verwijderd';
    if(action==='bill_request') return 'Rekening gevraagd';
    return event.note||action||'Activiteit';
  };
  function context(){
    const app=api();
    const tableId=String(app?.getSelectedTableId?.()||'');
    const order=app?.getState?.()?.orders?.[tableId];
    if(!tableId||!order) return null;
    return {tableId,orderId:String(order.id||order.orderId||`table:${tableId}`)};
  }
  function render(ctx){
    const list=events().filter(event=>event.orderId===ctx.orderId||(!event.orderId&&event.tableId===ctx.tableId)).sort((a,b)=>a.ts-b.ts);
    const byActor=new Map();
    list.forEach(event=>{
      const key=event.actorId||event.actorName||'unknown';
      const row=byActor.get(key)||{name:event.actorName||key,added:0,removed:0,sent:0};
      if(event.action==='item_add') row.added+=Number(event.qty||0);
      if(event.action==='item_remove') row.removed+=Number(event.qty||0);
      if(event.action==='item_send') row.sent+=Number(event.qty||0);
      byActor.set(key,row);
    });
    if($('historyTitle')) $('historyTitle').textContent=`Rekening ${tableName(ctx.tableId)}`;
    if($('historySubtitle')) $('historySubtitle').textContent=`Alle toevoegingen, verwijderingen en bestellingen · ${ctx.orderId.slice(0,16)}`;
    if($('historySummary')) $('historySummary').innerHTML=[...byActor.values()].map(row=>`<div><strong>${escapeHtml(row.name)}</strong><span>+${row.added} · −${row.removed} · besteld ${row.sent}</span></div>`).join('')||'<div><span>Nog geen gelogde handelingen voor deze rekening.</span></div>';
    if($('historyTimeline')) $('historyTimeline').innerHTML=list.length?list.map(event=>`<article class="audit-entry tone-${event.action==='item_remove'||event.action==='order_delete'?'danger':event.action==='item_add'?'success':'info'}"><div class="audit-entry-icon">${event.action==='item_remove'||event.action==='order_delete'?'−':event.action==='item_add'?'+':'•'}</div><div class="audit-entry-body"><div class="audit-entry-title"><strong>${escapeHtml(eventText(event))}</strong><span>${escapeHtml(format(event.ts))}</span></div><div class="audit-entry-meta"><span>${escapeHtml(event.actorName||'Onbekend')}</span><span>${escapeHtml(event.deviceId||'onbekend apparaat')}</span>${event.source?`<span>${escapeHtml(event.source)}</span>`:''}</div>${event.note?`<p>${escapeHtml(event.note)}</p>`:''}</div></article>`).join(''):'<div class="audit-empty">Nog geen geschiedenis. Bestaande handelingen van vóór het herstelde logboek worden niet verzonnen.</div>';
  }
  function open(){
    const app=api();
    if(app?.getSession?.()?.role!=='boss') return app?.toast?.('Alleen de Baas kan rekeninggeschiedenis bekijken.');
    const ctx=context();
    if(!ctx) return app?.toast?.('Kies eerst een rekening.');
    render(ctx);
    $('historyDialog')?.showModal?.();
  }
  function install(){
    const app=api();
    if(!app) return;
    const actions=document.querySelector('.order-head-actions');
    const title=$('selectedTableTitle');
    const boss=app.getSession?.()?.role==='boss';
    if(!boss){actions?.querySelector('[data-direct-order-history]')?.remove();return;}
    if(actions&&context()&&!actions.querySelector('[data-direct-order-history]')){
      const button=document.createElement('button');
      button.type='button';button.className='soft-button order-history-button';button.dataset.directOrderHistory='1';button.textContent='Historiek';button.title='Wie heeft wat toegevoegd of verwijderd op deze rekening?';button.addEventListener('click',open);actions.appendChild(button);
    }
    if(title&&title.dataset.directOrderHistory!=='1'){
      title.dataset.directOrderHistory='1';title.classList.add('ticket-history-target');title.tabIndex=0;title.title='Open rekeninggeschiedenis';title.addEventListener('click',open);title.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
    }
  }
  const observer=new MutationObserver(install);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  let attempts=0;const timer=setInterval(()=>{install();if(++attempts>120) clearInterval(timer);},250);
  install();
})();
