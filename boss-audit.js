(()=>{
  'use strict';

  const api=window.__kassaAppApi;
  if(!api){
    console.warn('Baaslogboek kon niet starten: app-koppeling ontbreekt.');
    return;
  }

  const STORE_KEY='registratiekassa-audit-v3';
  const SHIFT_KEY='registratiekassa-shifts-v1';
  const CLOSE_KEY='registratiekassa-day-closes-v1';
  const DEVICE_KEY='registratiekassa-device-id';
  const MAX_EVENTS=20000;
  const $=id=>document.getElementById(id);
  const clone=value=>{
    try{return structuredClone(value);}catch{}
    try{return JSON.parse(JSON.stringify(value));}catch{return value;}
  };
  const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const readJson=(key,fallback)=>{
    try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch{return fallback;}
  };
  const writeJson=(key,value)=>{
    try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
  };
  const escapeHtml=value=>String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const money=value=>new Intl.NumberFormat('nl-BE',{style:'currency',currency:'EUR'}).format(Number(value)||0);
  const formatDateTime=value=>new Intl.DateTimeFormat('nl-BE',{dateStyle:'short',timeStyle:'medium'}).format(new Date(Number(value)||Date.now()));
  const formatTime=value=>new Intl.DateTimeFormat('nl-BE',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(Number(value)||Date.now()));
  const dateKey=value=>new Date(Number(value)||Date.now()).toISOString().slice(0,10);
  const now=()=>Date.now();

  let deviceId=localStorage.getItem(DEVICE_KEY);
  if(!deviceId){deviceId=`device-${uid().slice(0,12)}`;localStorage.setItem(DEVICE_KEY,deviceId);}

  let events=readJson(STORE_KEY,[]);
  if(!Array.isArray(events)) events=[];
  let lastState=clone(api.getState?.()||{});
  let lastInteractionAt=0;
  let lastInteractionLabel='';
  let changeTimer=0;
  let currentAuditTab='activity';
  let currentHistoryContext=null;

  const staffList=()=>{
    const list=api.getStaff?.();
    return Array.isArray(list)?list:[];
  };
  const products=()=>{
    const list=api.getProducts?.();
    return Array.isArray(list)?list:[];
  };
  const productById=id=>api.getProduct?.(id)||products().find(product=>String(product.id)===String(id))||null;
  const tableLabel=id=>api.getTable?.(id)?.label||id||'Onbekend';
  const session=()=>api.getSession?.()||{};
  const actorFrom=(...objects)=>{
    const current=session();
    const candidate=objects.find(Boolean)||{};
    const actorId=candidate.lastEditedBy||candidate.updatedBy||candidate.addedBy||candidate.staffId||candidate.actorId||current.id||'unknown';
    const actorName=candidate.lastEditedByName||candidate.updatedByName||candidate.addedByName||candidate.staffName||candidate.actorName||staffList().find(person=>String(person.id)===String(actorId))?.name||current.name||'Onbekend';
    return {actorId:String(actorId),actorName:String(actorName),role:current.role||candidate.role||'team'};
  };

  const actionMeta={
    order_open:{label:'Rekening geopend',tone:'info'},
    order_close:{label:'Rekening gesloten',tone:'muted'},
    order_delete:{label:'Rekening verwijderd',tone:'danger'},
    order_move:{label:'Rekening verplaatst',tone:'warn'},
    order_merge:{label:'Rekeningen samengevoegd',tone:'warn'},
    item_add:{label:'Toegevoegd',tone:'success'},
    item_remove:{label:'Verwijderd',tone:'danger'},
    item_send:{label:'Besteld',tone:'info'},
    item_move:{label:'Product verplaatst',tone:'warn'},
    bill_request:{label:'Rekening gevraagd',tone:'warn'},
    bill_cancel:{label:'Rekeningstatus geannuleerd',tone:'muted'},
    payment:{label:'Betaling',tone:'success'},
    catalog_change:{label:'Kaart gewijzigd',tone:'info'},
    shift_start:{label:'Shift gestart',tone:'success'},
    shift_end:{label:'Shift beëindigd',tone:'muted'},
    day_close:{label:'Dagafsluiting',tone:'info'},
    imported_snapshot:{label:'Bestaande stand geïmporteerd',tone:'muted'},
    remote_sync:{label:'Synchronisatie',tone:'info'}
  };
  const metaFor=action=>actionMeta[action]||{label:action||'Activiteit',tone:'muted'};

  function persistEvents(){
    if(events.length>MAX_EVENTS) events=events.slice(events.length-MAX_EVENTS);
    writeJson(STORE_KEY,events);
  }

  function appendEvent(data){
    const actor=actorFrom(data.entity,data.item,data.order);
    const event={
      id:data.id||uid(),
      ts:Number(data.ts)||now(),
      action:data.action||'remote_sync',
      actorId:String(data.actorId||actor.actorId),
      actorName:String(data.actorName||actor.actorName),
      role:data.role||actor.role,
      deviceId:String(data.deviceId||deviceId),
      tableId:data.tableId==null?'':String(data.tableId),
      fromTableId:data.fromTableId==null?'':String(data.fromTableId),
      toTableId:data.toTableId==null?'':String(data.toTableId),
      orderId:data.orderId==null?'':String(data.orderId),
      productId:data.productId==null?'':String(data.productId),
      productName:data.productName||productById(data.productId)?.name||'',
      qty:Number(data.qty)||0,
      beforeQty:Number.isFinite(Number(data.beforeQty))?Number(data.beforeQty):null,
      afterQty:Number.isFinite(Number(data.afterQty))?Number(data.afterQty):null,
      amount:Number(data.amount)||0,
      method:data.method||'',
      source:data.source||(now()-lastInteractionAt<1800?'bediening':'synchronisatie'),
      note:data.note||'',
      details:data.details&&typeof data.details==='object'?clone(data.details):{}
    };
    const duplicate=events.slice(-30).some(old=>old.action===event.action&&old.orderId===event.orderId&&old.productId===event.productId&&old.qty===event.qty&&Math.abs(old.ts-event.ts)<250);
    if(duplicate) return null;
    events.push(event);
    persistEvents();
    return event;
  }

  function normalizeImportedEvent(raw,index){
    if(!raw||typeof raw!=='object') return null;
    const action=String(raw.action||raw.type||raw.event||'remote_sync').toLowerCase().replace(/[\s.-]+/g,'_');
    return {
      id:String(raw.id||raw.operationId||`import-${raw.ts||raw.at||index}-${index}`),
      ts:Number(raw.ts||raw.at||raw.time||raw.createdAt||raw.timestamp)||now(),
      action,
      actorId:String(raw.actorId||raw.staffId||raw.userId||'unknown'),
      actorName:String(raw.actorName||raw.staffName||raw.userName||'Onbekend'),
      role:raw.role||'team',
      deviceId:String(raw.deviceId||raw.device||'server'),
      tableId:String(raw.tableId||raw.table||''),
      fromTableId:String(raw.fromTableId||''),
      toTableId:String(raw.toTableId||''),
      orderId:String(raw.orderId||raw.ticketId||''),
      productId:String(raw.productId||raw.itemId||''),
      productName:String(raw.productName||raw.itemName||''),
      qty:Number(raw.qty||raw.quantity||0),
      beforeQty:Number.isFinite(Number(raw.beforeQty))?Number(raw.beforeQty):null,
      afterQty:Number.isFinite(Number(raw.afterQty))?Number(raw.afterQty):null,
      amount:Number(raw.amount||0),
      method:String(raw.method||''),
      source:'bestaand-logboek',
      note:String(raw.note||raw.message||raw.description||''),
      details:clone(raw.details||{})
    };
  }

  function importExistingLogs(state){
    const sources=['audit','auditLog','logs','operations','operationLog'];
    const known=new Set(events.map(event=>event.id));
    let changed=false;
    sources.forEach(key=>{
      const list=state?.[key];
      if(!Array.isArray(list)) return;
      list.forEach((raw,index)=>{
        const event=normalizeImportedEvent(raw,index);
        if(!event||known.has(event.id)) return;
        known.add(event.id);events.push(event);changed=true;
      });
    });
    if(changed) persistEvents();
  }

  function orderMap(state){
    const result=new Map();
    Object.entries(state?.orders||{}).forEach(([tableId,order])=>{
      if(!order||typeof order!=='object') return;
      const orderId=String(order.id||order.orderId||`table:${tableId}`);
      result.set(orderId,{tableId:String(tableId),order});
    });
    return result;
  }

  function itemMap(order){
    const result=new Map();
    (order?.items||[]).forEach((item,index)=>{
      if(!item||typeof item!=='object') return;
      const productId=String(item.productId||item.id||item.sku||`line-${index}`);
      const key=String(item.lineId||item.rowId||item.id||productId);
      result.set(key,{...item,productId});
    });
    return result;
  }

  function requestedValue(order){
    if(!order) return false;
    return Boolean(order.billRequested||order.requested||order.billRequestedAt||order.requestedAt||order.status==='requested'||order.status==='bill-requested');
  }

  function paymentKey(payment,index){
    return String(payment?.id||payment?.paymentId||`${payment?.paidAt||payment?.ts||0}-${payment?.tableId||''}-${index}`);
  }

  function diffStates(before,after){
    importExistingLogs(after);
    const oldOrders=orderMap(before);
    const newOrders=orderMap(after);
    const rawDeltas=[];

    for(const orderId of new Set([...oldOrders.keys(),...newOrders.keys()])){
      const oldEntry=oldOrders.get(orderId);
      const newEntry=newOrders.get(orderId);
      if(!oldEntry&&newEntry){
        appendEvent({action:'order_open',orderId,tableId:newEntry.tableId,order:newEntry.order,entity:newEntry.order,note:lastInteractionLabel});
      }else if(oldEntry&&!newEntry){
        const newPayment=(after?.payments||[]).find(payment=>String(payment.orderId||'')===orderId)||null;
        appendEvent({action:newPayment?'order_close':'order_delete',orderId,tableId:oldEntry.tableId,order:oldEntry.order,entity:newPayment||oldEntry.order,note:lastInteractionLabel});
      }else if(oldEntry&&newEntry&&oldEntry.tableId!==newEntry.tableId){
        appendEvent({action:'order_move',orderId,tableId:newEntry.tableId,fromTableId:oldEntry.tableId,toTableId:newEntry.tableId,order:newEntry.order,entity:newEntry.order,note:lastInteractionLabel});
      }

      if(!oldEntry||!newEntry) continue;
      if(requestedValue(oldEntry.order)!==requestedValue(newEntry.order)){
        appendEvent({action:requestedValue(newEntry.order)?'bill_request':'bill_cancel',orderId,tableId:newEntry.tableId,order:newEntry.order,entity:newEntry.order,note:lastInteractionLabel});
      }

      const oldItems=itemMap(oldEntry.order);
      const newItems=itemMap(newEntry.order);
      for(const lineKey of new Set([...oldItems.keys(),...newItems.keys()])){
        const oldItem=oldItems.get(lineKey);
        const newItem=newItems.get(lineKey);
        const productId=String(newItem?.productId||oldItem?.productId||lineKey);
        const oldQty=Number(oldItem?.qty||oldItem?.quantity||0);
        const newQty=Number(newItem?.qty||newItem?.quantity||0);
        const delta=newQty-oldQty;
        if(delta){
          rawDeltas.push({orderId,tableId:newEntry.tableId,productId,delta,oldQty,newQty,item:newItem||oldItem,order:newEntry.order});
        }
        const oldSent=Number(oldItem?.sentQty||oldItem?.orderedQty||0);
        const newSent=Number(newItem?.sentQty||newItem?.orderedQty||0);
        if(newSent>oldSent){
          appendEvent({action:'item_send',orderId,tableId:newEntry.tableId,productId,qty:newSent-oldSent,beforeQty:oldSent,afterQty:newSent,item:newItem,order:newEntry.order,entity:newItem||newEntry.order,note:lastInteractionLabel});
        }
      }
    }

    const consumed=new Set();
    rawDeltas.forEach((negative,index)=>{
      if(negative.delta>=0||consumed.has(index)) return;
      const matchIndex=rawDeltas.findIndex((positive,otherIndex)=>otherIndex!==index&&!consumed.has(otherIndex)&&positive.delta>0&&positive.productId===negative.productId&&positive.orderId!==negative.orderId);
      if(matchIndex<0) return;
      const positive=rawDeltas[matchIndex];
      const qty=Math.min(Math.abs(negative.delta),positive.delta);
      if(qty<=0) return;
      appendEvent({action:'item_move',orderId:positive.orderId,tableId:positive.tableId,fromTableId:negative.tableId,toTableId:positive.tableId,productId:positive.productId,qty,item:positive.item,order:positive.order,entity:positive.item||positive.order,note:lastInteractionLabel});
      if(Math.abs(negative.delta)===qty) consumed.add(index); else negative.delta+=qty;
      if(positive.delta===qty) consumed.add(matchIndex); else positive.delta-=qty;
    });

    rawDeltas.forEach((delta,index)=>{
      if(consumed.has(index)||!delta.delta) return;
      appendEvent({
        action:delta.delta>0?'item_add':'item_remove',
        orderId:delta.orderId,
        tableId:delta.tableId,
        productId:delta.productId,
        qty:Math.abs(delta.delta),
        beforeQty:delta.oldQty,
        afterQty:delta.newQty,
        item:delta.item,
        order:delta.order,
        entity:delta.item||delta.order,
        note:lastInteractionLabel
      });
    });

    const oldPayments=new Map((before?.payments||[]).map((payment,index)=>[paymentKey(payment,index),payment]));
    (after?.payments||[]).forEach((payment,index)=>{
      const key=paymentKey(payment,index);
      if(oldPayments.has(key)) return;
      appendEvent({
        action:'payment',
        ts:payment.paidAt||payment.ts,
        tableId:payment.tableId,
        orderId:payment.orderId||payment.ticketId||'',
        amount:payment.amount,
        method:payment.method,
        entity:payment,
        details:{items:clone(payment.items||[])}
      });
    });

    const catalogFields=['customProducts','catalogOverrides','productOverrides','hiddenProducts'];
    if(catalogFields.some(key=>JSON.stringify(before?.[key]??null)!==JSON.stringify(after?.[key]??null))){
      appendEvent({action:'catalog_change',entity:session(),note:lastInteractionLabel});
    }
  }

  function checkForChanges(){
    clearTimeout(changeTimer);
    changeTimer=setTimeout(()=>{
      const current=clone(api.getState?.()||{});
      try{diffStates(lastState||{},current||{});}catch(error){console.warn('Audit-diff mislukt.',error);}
      lastState=current;
      decorateTicketRows();
      if($('auditDialog')?.open) renderBossCenter();
      if($('historyDialog')?.open&&currentHistoryContext) renderHistory(currentHistoryContext);
    },40);
  }

  function seedExistingOrders(){
    const state=api.getState?.()||{};
    importExistingLogs(state);
    const knownOrders=new Set(events.map(event=>event.orderId).filter(Boolean));
    Object.entries(state.orders||{}).forEach(([tableId,order])=>{
      const orderId=String(order?.id||order?.orderId||`table:${tableId}`);
      if(knownOrders.has(orderId)) return;
      appendEvent({action:'imported_snapshot',ts:order?.openedAt||now(),tableId,orderId,order,entity:order,note:'Stand aanwezig vóór het herstelde logboek'});
      (order?.items||[]).forEach(item=>{
        const qty=Number(item.qty||item.quantity||0);
        if(qty>0) appendEvent({action:'item_add',ts:item.addedAt||order?.openedAt||now(),tableId,orderId,productId:item.productId||item.id,qty,beforeQty:0,afterQty:qty,item,order,entity:item,note:'Bestaande bestellijn geïmporteerd'});
      });
    });
  }

  function eventMatches(event,filters){
    if(filters.from&&event.ts<new Date(`${filters.from}T00:00:00`).getTime()) return false;
    if(filters.to&&event.ts>new Date(`${filters.to}T23:59:59.999`).getTime()) return false;
    if(filters.staff&&event.actorId!==filters.staff) return false;
    if(filters.table&&event.tableId!==filters.table&&event.fromTableId!==filters.table&&event.toTableId!==filters.table) return false;
    if(filters.action&&event.action!==filters.action) return false;
    if(filters.device&&event.deviceId!==filters.device) return false;
    const query=filters.query.trim().toLocaleLowerCase('nl-BE');
    if(query){
      const haystack=[event.actorName,event.productName,event.tableId,event.fromTableId,event.toTableId,event.orderId,event.note,event.method,metaFor(event.action).label].join(' ').toLocaleLowerCase('nl-BE');
      if(!haystack.includes(query)) return false;
    }
    return true;
  }

  function currentFilters(){
    return {
      from:$('auditFrom')?.value||'',
      to:$('auditTo')?.value||'',
      staff:$('auditStaffFilter')?.value||'',
      table:$('auditTableFilter')?.value||'',
      action:$('auditActionFilter')?.value||'',
      device:$('auditDeviceFilter')?.value||'',
      query:$('auditSearch')?.value||''
    };
  }

  function eventText(event){
    const qty=event.qty?`${event.qty}× `:'';
    const product=event.productName||productById(event.productId)?.name||event.productId||'';
    switch(event.action){
      case 'item_add': return `${qty}${product} toegevoegd`;
      case 'item_remove': return `${qty}${product} verwijderd`;
      case 'item_send': return `${qty}${product} naar bar/keuken gestuurd`;
      case 'item_move': return `${qty}${product} van ${tableLabel(event.fromTableId)} naar ${tableLabel(event.toTableId)} verplaatst`;
      case 'order_move': return `Rekening van ${tableLabel(event.fromTableId)} naar ${tableLabel(event.toTableId)} verplaatst`;
      case 'payment': return `${money(event.amount)} betaald via ${event.method||'onbekend'}`;
      case 'bill_request': return `Rekening gevraagd voor ${tableLabel(event.tableId)}`;
      case 'bill_cancel': return `Rekeningstatus geannuleerd voor ${tableLabel(event.tableId)}`;
      case 'order_open': return `Rekening geopend op ${tableLabel(event.tableId)}`;
      case 'order_close': return `Rekening gesloten op ${tableLabel(event.tableId)}`;
      case 'order_delete': return `Rekening verwijderd op ${tableLabel(event.tableId)}`;
      default: return event.note||metaFor(event.action).label;
    }
  }

  function renderEvent(event){
    const meta=metaFor(event.action);
    const table=event.tableId?`<button type="button" class="audit-link" data-history-order="${escapeHtml(event.orderId)}" data-history-table="${escapeHtml(event.tableId)}">${escapeHtml(tableLabel(event.tableId))}</button>`:'';
    return `<article class="audit-entry tone-${meta.tone}" data-event-id="${escapeHtml(event.id)}">
      <div class="audit-entry-icon">${event.action.includes('remove')||event.action.includes('delete')?'−':event.action.includes('add')?'+':event.action==='payment'?'€':'•'}</div>
      <div class="audit-entry-body">
        <div class="audit-entry-title"><strong>${escapeHtml(eventText(event))}</strong><span>${escapeHtml(formatDateTime(event.ts))}</span></div>
        <div class="audit-entry-meta"><span>${escapeHtml(event.actorName)}</span>${table?`<span>${table}</span>`:''}<span title="${escapeHtml(event.deviceId)}">${escapeHtml(event.deviceId.slice(0,14))}</span>${event.source?`<span>${escapeHtml(event.source)}</span>`:''}</div>
        ${event.note?`<p>${escapeHtml(event.note)}</p>`:''}
      </div>
    </article>`;
  }

  function filteredEvents(){
    const filters=currentFilters();
    return events.filter(event=>eventMatches(event,filters)).sort((a,b)=>b.ts-a.ts);
  }

  function renderAuditOptions(){
    const setOptions=(id,items,labeler,placeholder)=>{
      const select=$(id);if(!select) return;
      const current=select.value;
      select.innerHTML=`<option value="">${placeholder}</option>`+items.map(item=>`<option value="${escapeHtml(item.value)}">${escapeHtml(labeler(item))}</option>`).join('');
      select.value=current;
    };
    const staffMap=new Map(events.map(event=>[event.actorId,event.actorName]));
    staffList().forEach(person=>staffMap.set(String(person.id),person.name));
    setOptions('auditStaffFilter',[...staffMap].map(([value,name])=>({value,name})),item=>item.name,'Alle medewerkers');
    const tables=[...new Set(events.flatMap(event=>[event.tableId,event.fromTableId,event.toTableId]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'nl',{numeric:true}));
    setOptions('auditTableFilter',tables.map(value=>({value})),item=>tableLabel(item.value),'Alle tafels');
    const actions=[...new Set(events.map(event=>event.action))].sort();
    setOptions('auditActionFilter',actions.map(value=>({value})),item=>metaFor(item.value).label,'Alle acties');
    const devices=[...new Set(events.map(event=>event.deviceId).filter(Boolean))].sort();
    setOptions('auditDeviceFilter',devices.map(value=>({value})),item=>item.value,'Alle apparaten');
  }

  function summarize(list){
    return list.reduce((summary,event)=>{
      if(event.action==='item_add') summary.added+=event.qty;
      if(event.action==='item_remove') summary.removed+=event.qty;
      if(event.action==='payment'){summary.payments+=1;summary.revenue+=event.amount;}
      if(event.action==='order_move'||event.action==='item_move') summary.moved+=1;
      return summary;
    },{added:0,removed:0,payments:0,revenue:0,moved:0});
  }

  function renderSummary(list){
    const summary=summarize(list);
    const node=$('auditSummary');if(!node) return;
    node.innerHTML=`<div><small>Toegevoegd</small><strong>+${summary.added}</strong></div><div><small>Verwijderd</small><strong>−${summary.removed}</strong></div><div><small>Betalingen</small><strong>${summary.payments}</strong></div><div><small>Omzet</small><strong>${money(summary.revenue)}</strong></div><div><small>Verplaatst</small><strong>${summary.moved}</strong></div>`;
  }

  function groupByOrder(list){
    const groups=new Map();
    list.forEach(event=>{
      const key=event.orderId||`table:${event.tableId||'onbekend'}:${dateKey(event.ts)}`;
      if(!groups.has(key)) groups.set(key,{key,events:[],latest:0,tableId:event.tableId||event.toTableId||event.fromTableId||''});
      const group=groups.get(key);group.events.push(event);group.latest=Math.max(group.latest,event.ts);if(event.tableId) group.tableId=event.tableId;
    });
    return [...groups.values()].sort((a,b)=>b.latest-a.latest);
  }

  function renderOrderGroups(list){
    const node=$('auditOrderList');if(!node) return;
    const groups=groupByOrder(list);
    node.innerHTML=groups.length?groups.map(group=>{
      const summary=summarize(group.events);
      const productCounts=new Map();
      group.events.forEach(event=>{
        if(!event.productId) return;
        const row=productCounts.get(event.productId)||{name:event.productName||productById(event.productId)?.name||event.productId,add:0,remove:0};
        if(event.action==='item_add') row.add+=event.qty;
        if(event.action==='item_remove') row.remove+=event.qty;
        productCounts.set(event.productId,row);
      });
      const productsText=[...productCounts.values()].slice(0,4).map(row=>`${row.name} +${row.add}/−${row.remove}`).join(' · ');
      return `<button type="button" class="audit-order-card" data-history-order="${escapeHtml(group.key)}" data-history-table="${escapeHtml(group.tableId)}">
        <span><strong>${escapeHtml(tableLabel(group.tableId))}</strong><small>${escapeHtml(formatDateTime(group.latest))}</small></span>
        <span><b>+${summary.added}</b><b>−${summary.removed}</b><b>${money(summary.revenue)}</b></span>
        <p>${escapeHtml(productsText||'Geen productwijzigingen')}</p>
      </button>`;
    }).join(''):'<div class="audit-empty">Geen rekeningen voor deze filters.</div>';
  }

  function renderActivity(list){
    const deleted=currentAuditTab==='deleted';
    const node=$(deleted?'auditDeletedList':'auditList');if(!node) return;
    const visible=deleted?list.filter(event=>event.action==='item_remove'||event.action==='order_delete'):list;
    node.innerHTML=visible.length?visible.map(renderEvent).join(''):`<div class="audit-empty">${deleted?'Geen verwijderingen voor deze filters.':'Geen activiteiten voor deze filters.'}</div>`;
  }

  function renderOrdersTab(){
    const state=api.getState?.()||{};
    const active=Object.entries(state.orders||{}).map(([tableId,order])=>({type:'active',tableId,order,ts:order.openedAt||0}));
    const paid=(state.payments||[]).map(payment=>({type:'paid',tableId:payment.tableId,order:{id:payment.orderId||payment.id,items:payment.items||[]},payment,ts:payment.paidAt||0}));
    const rows=[...active,...paid].sort((a,b)=>b.ts-a.ts);
    const node=$('bossOrdersList');if(!node) return;
    node.innerHTML=rows.length?rows.map(row=>{
      const orderId=String(row.order?.id||`table:${row.tableId}:${row.ts}`);
      const total=row.payment?.amount||(row.order?.items||[]).reduce((sum,item)=>sum+(Number(productById(item.productId)?.price)||0)*Number(item.qty||0),0);
      return `<button type="button" class="boss-order-row" data-history-order="${escapeHtml(orderId)}" data-history-table="${escapeHtml(row.tableId)}"><span><strong>${escapeHtml(tableLabel(row.tableId))}</strong><small>${row.type==='paid'?'Betaald':'Open'} · ${escapeHtml(formatDateTime(row.ts))}</small></span><strong>${money(total)}</strong></button>`;
    }).join(''):'<div class="audit-empty">Nog geen rekeningen gevonden.</div>';
  }

  function shifts(){const list=readJson(SHIFT_KEY,[]);return Array.isArray(list)?list:[];}
  function saveShifts(list){writeJson(SHIFT_KEY,list);}
  function currentShift(){return shifts().find(shift=>!shift.endedAt&&shift.staffId===String(session().id||''))||null;}
  function startShift(){
    const current=session();if(!current.id) return;
    const list=shifts();
    if(list.some(shift=>!shift.endedAt&&shift.staffId===String(current.id))) return api.toast?.('Er loopt al een shift voor deze gebruiker.');
    const opening=Number(prompt('Startkassa / wisselgeld in euro','0')||0);
    const shift={id:uid(),staffId:String(current.id),staffName:current.name||'Onbekend',startedAt:now(),endedAt:null,openingCash:opening,closingCash:null,deviceId};
    list.push(shift);saveShifts(list);appendEvent({action:'shift_start',actorId:shift.staffId,actorName:shift.staffName,amount:opening,note:`Beginkassa ${money(opening)}`});renderShifts();
  }
  function endShift(){
    const list=shifts();const shift=list.find(item=>!item.endedAt&&item.staffId===String(session().id||''));
    if(!shift) return api.toast?.('Geen actieve shift gevonden.');
    const closing=Number(prompt('Getelde eindkassa in euro','0')||0);shift.endedAt=now();shift.closingCash=closing;saveShifts(list);appendEvent({action:'shift_end',actorId:shift.staffId,actorName:shift.staffName,amount:closing,note:`Eindkassa ${money(closing)}`});renderShifts();
  }
  function renderShifts(){
    const node=$('bossShiftList');if(!node) return;
    const list=shifts().sort((a,b)=>b.startedAt-a.startedAt);
    node.innerHTML=list.length?list.map(shift=>`<article class="shift-row"><span><strong>${escapeHtml(shift.staffName)}</strong><small>${escapeHtml(formatDateTime(shift.startedAt))}${shift.endedAt?` → ${escapeHtml(formatTime(shift.endedAt))}`:' · actief'}</small></span><span><small>Start ${money(shift.openingCash)}</small><strong>${shift.closingCash==null?'—':money(shift.closingCash)}</strong></span></article>`).join(''):'<div class="audit-empty">Nog geen shifts geregistreerd.</div>';
    const start=$('shiftStartButton'),end=$('shiftEndButton');if(start) start.disabled=Boolean(currentShift());if(end) end.disabled=!currentShift();
  }

  function dayCloses(){const list=readJson(CLOSE_KEY,[]);return Array.isArray(list)?list:[];}
  function createDayClose(){
    const day=$('dayCloseDate')?.value||dateKey(now());
    const start=new Date(`${day}T00:00:00`).getTime(),end=new Date(`${day}T23:59:59.999`).getTime();
    const state=api.getState?.()||{};
    const payments=(state.payments||[]).filter(payment=>(payment.paidAt||0)>=start&&(payment.paidAt||0)<=end);
    const audit=events.filter(event=>event.ts>=start&&event.ts<=end);
    const close={id:uid(),date:day,createdAt:now(),createdBy:session().name||'Baas',payments:payments.length,revenue:payments.reduce((sum,payment)=>sum+Number(payment.amount||0),0),cash:payments.filter(p=>String(p.method).toLowerCase().includes('cash')).reduce((sum,p)=>sum+Number(p.amount||0),0),card:payments.filter(p=>String(p.method).toLowerCase().includes('kaart')||String(p.method).toLowerCase().includes('card')).reduce((sum,p)=>sum+Number(p.amount||0),0),removed:audit.filter(event=>event.action==='item_remove').reduce((sum,event)=>sum+event.qty,0),added:audit.filter(event=>event.action==='item_add').reduce((sum,event)=>sum+event.qty,0)};
    const list=dayCloses();list.push(close);writeJson(CLOSE_KEY,list);appendEvent({action:'day_close',amount:close.revenue,note:`Dag ${day}: ${close.payments} betalingen, ${money(close.revenue)}`});renderDayClose();
  }
  function renderDayClose(){
    const node=$('dayCloseList');if(!node) return;
    const list=dayCloses().sort((a,b)=>b.createdAt-a.createdAt);
    node.innerHTML=list.length?list.map(close=>`<article class="day-close-row"><span><strong>${escapeHtml(close.date)}</strong><small>${escapeHtml(close.createdBy)} · ${escapeHtml(formatDateTime(close.createdAt))}</small></span><span><strong>${money(close.revenue)}</strong><small>Cash ${money(close.cash)} · Kaart ${money(close.card)} · verwijderd ${close.removed}</small></span></article>`).join(''):'<div class="audit-empty">Nog geen dagafsluitingen gemaakt.</div>';
  }

  function renderReports(){
    const state=api.getState?.()||{};
    const payments=state.payments||[];
    const productTotals=new Map();
    payments.forEach(payment=>(payment.items||[]).forEach(item=>{
      const product=productById(item.productId);const row=productTotals.get(item.productId)||{name:product?.name||item.productId,qty:0,revenue:0};
      row.qty+=Number(item.qty||0);row.revenue+=(Number(product?.price)||0)*Number(item.qty||0);productTotals.set(item.productId,row);
    }));
    const top=[...productTotals.values()].sort((a,b)=>b.revenue-a.revenue).slice(0,20);
    const staffRevenue=new Map();
    payments.forEach(payment=>{const id=String(payment.staffId||'unknown');const row=staffRevenue.get(id)||{name:staffList().find(person=>String(person.id)===id)?.name||id,revenue:0,count:0};row.revenue+=Number(payment.amount||0);row.count+=1;staffRevenue.set(id,row);});
    const node=$('bossReports');if(!node) return;
    node.innerHTML=`<div class="report-grid"><section><h4>Topproducten</h4>${top.length?top.map(row=>`<div class="report-row"><span>${escapeHtml(row.name)} <small>${row.qty}×</small></span><strong>${money(row.revenue)}</strong></div>`).join(''):'<p class="muted">Nog geen betaalde producten.</p>'}</section><section><h4>Per medewerker</h4>${staffRevenue.size?[...staffRevenue.values()].sort((a,b)=>b.revenue-a.revenue).map(row=>`<div class="report-row"><span>${escapeHtml(row.name)} <small>${row.count} betalingen</small></span><strong>${money(row.revenue)}</strong></div>`).join(''):'<p class="muted">Nog geen betalingen.</p>'}</section></div>`;
  }

  function setBossTab(tab){
    currentAuditTab=tab;
    document.querySelectorAll('[data-boss-tab]').forEach(button=>button.classList.toggle('active',button.dataset.bossTab===tab));
    document.querySelectorAll('[data-boss-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.bossPanel!==tab));
    renderBossCenter();
  }

  function renderBossCenter(){
    renderAuditOptions();
    const list=filteredEvents();
    renderSummary(list);
    if(currentAuditTab==='activity'||currentAuditTab==='deleted') renderActivity(list);
    if(currentAuditTab==='orders') renderOrdersTab();
    if(currentAuditTab==='shifts') renderShifts();
    if(currentAuditTab==='close') renderDayClose();
    if(currentAuditTab==='reports') renderReports();
    renderOrderGroups(list);
    const count=$('auditResultCount');if(count) count.textContent=`${list.length} gebeurtenissen`;
    const status=$('auditStorageStatus');if(status) status.textContent=`Append-only log · apparaat ${deviceId}`;
  }

  function eventListForContext(context){
    return events.filter(event=>{
      if(context.orderId&&event.orderId===context.orderId){
        if(context.productId) return event.productId===context.productId;
        return true;
      }
      if(!context.orderId&&context.tableId&&event.tableId===context.tableId){
        return context.productId?event.productId===context.productId:true;
      }
      return false;
    }).sort((a,b)=>a.ts-b.ts);
  }

  function renderHistory(context){
    const list=eventListForContext(context);
    const title=$('historyTitle'),subtitle=$('historySubtitle'),summaryNode=$('historySummary'),timeline=$('historyTimeline');
    const product=context.productId?productById(context.productId):null;
    if(title) title.textContent=product?product.name:`Rekening ${tableLabel(context.tableId)}`;
    if(subtitle) subtitle.textContent=`${tableLabel(context.tableId)}${context.orderId?` · ${context.orderId.slice(0,12)}`:''}`;
    const byActor=new Map();
    list.forEach(event=>{
      const row=byActor.get(event.actorId)||{name:event.actorName,add:0,remove:0,sent:0};
      if(event.action==='item_add') row.add+=event.qty;
      if(event.action==='item_remove') row.remove+=event.qty;
      if(event.action==='item_send') row.sent+=event.qty;
      byActor.set(event.actorId,row);
    });
    if(summaryNode) summaryNode.innerHTML=[...byActor.values()].map(row=>`<div><strong>${escapeHtml(row.name)}</strong><span>+${row.add} · −${row.remove} · besteld ${row.sent}</span></div>`).join('')||'<div><span>Nog geen historische wijzigingen voor dit item.</span></div>';
    if(timeline) timeline.innerHTML=list.length?list.map(renderEvent).join(''):'<div class="audit-empty">Voor deze bestelling is nog geen gebeurtenis opgeslagen. Bestaande regels van vóór deze update zijn als beginsnapshot geïmporteerd.</div>';
  }

  function openHistory(context){
    if(session().role!=='boss') return api.toast?.('Deze geschiedenis is alleen zichtbaar voor de baas.');
    currentHistoryContext=context;
    renderHistory(context);
    const dialog=$('historyDialog');if(dialog?.showModal) dialog.showModal();
  }

  function decorateTicketRows(){
    if(session().role!=='boss') return;
    const state=api.getState?.()||{};
    const tableId=String(api.getSelectedTableId?.()||'');
    const order=state.orders?.[tableId];
    const orderId=String(order?.id||order?.orderId||`table:${tableId}`);
    document.querySelectorAll('#ticketList .ticket-row').forEach(row=>{
      const productId=row.querySelector('[data-remove]')?.dataset.remove||row.querySelector('[data-minus]')?.dataset.minus||row.querySelector('[data-product-id]')?.dataset.productId;
      if(!productId||row.dataset.historyReady==='1') return;
      row.dataset.historyReady='1';
      const content=[...row.children].find(child=>child.tagName==='DIV')||row.querySelector('strong')?.parentElement;
      if(content){
        content.classList.add('ticket-history-target');content.setAttribute('role','button');content.tabIndex=0;content.title='Bekijk wie dit item toevoegde of verwijderde';
        const open=()=>openHistory({orderId,tableId,productId:String(productId)});
        content.addEventListener('click',open);content.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
      }
      const button=document.createElement('button');button.type='button';button.className='item-history-button';button.textContent='Geschiedenis';button.setAttribute('aria-label','Bekijk geschiedenis van deze bestellijn');
      button.addEventListener('click',event=>{event.stopPropagation();openHistory({orderId,tableId,productId:String(productId)});});
      row.appendChild(button);
    });
  }

  function exportCsv(){
    const list=filteredEvents();
    const rows=[['Datum','Tijd','Medewerker','Actie','Tafel','Van tafel','Naar tafel','Rekening','Product','Aantal','Voor','Na','Bedrag','Methode','Apparaat','Bron','Notitie']];
    list.slice().reverse().forEach(event=>{
      const date=new Date(event.ts);rows.push([date.toLocaleDateString('nl-BE'),date.toLocaleTimeString('nl-BE'),event.actorName,metaFor(event.action).label,event.tableId,event.fromTableId,event.toTableId,event.orderId,event.productName,event.qty,event.beforeQty??'',event.afterQty??'',event.amount||'',event.method,event.deviceId,event.source,event.note]);
    });
    const csv=rows.map(row=>row.map(value=>`"${String(value??'').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob=new Blob([`\ufeff${csv}`],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`registratiekassa-logboek-${dateKey(now())}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function resetFilters(){
    ['auditFrom','auditTo','auditSearch'].forEach(id=>{if($(id)) $(id).value='';});
    ['auditStaffFilter','auditTableFilter','auditActionFilter','auditDeviceFilter'].forEach(id=>{if($(id)) $(id).value='';});
    renderBossCenter();
  }

  function bindUi(){
    const auditButton=$('auditButton');
    if(auditButton){
      auditButton.textContent='Baascentrum';
      auditButton.title='Audit, rekeningen, shifts, dagafsluiting en rapporten';
      auditButton.addEventListener('click',event=>{
        if(session().role!=='boss') return;
        event.preventDefault();event.stopImmediatePropagation();
        renderBossCenter();$('auditDialog')?.showModal?.();
      },true);
    }
    document.querySelectorAll('[data-boss-tab]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();setBossTab(button.dataset.bossTab);}));
    ['auditFrom','auditTo','auditStaffFilter','auditTableFilter','auditActionFilter','auditDeviceFilter','auditSearch'].forEach(id=>$(id)?.addEventListener(id==='auditSearch'?'input':'change',renderBossCenter));
    $('auditResetFilters')?.addEventListener('click',resetFilters);
    $('auditExportButton')?.addEventListener('click',exportCsv);
    $('shiftStartButton')?.addEventListener('click',startShift);
    $('shiftEndButton')?.addEventListener('click',endShift);
    $('dayCloseCreateButton')?.addEventListener('click',createDayClose);
    if($('dayCloseDate')) $('dayCloseDate').value=dateKey(now());
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('[data-history-order]');if(!link) return;
      event.preventDefault();openHistory({orderId:link.dataset.historyOrder||'',tableId:link.dataset.historyTable||'',productId:link.dataset.historyProduct||''});
    });
    document.addEventListener('pointerdown',event=>{
      const target=event.target.closest?.('button,[data-product],[data-method],input,select');
      if(!target) return;
      lastInteractionAt=now();
      lastInteractionLabel=(target.textContent||target.getAttribute('aria-label')||target.id||'bediening').trim().replace(/\s+/g,' ').slice(0,120);
      setTimeout(checkForChanges,0);setTimeout(checkForChanges,120);
    },true);
    document.addEventListener('change',()=>{lastInteractionAt=now();lastInteractionLabel='Waarde gewijzigd';checkForChanges();},true);
    const observer=new MutationObserver(()=>{decorateTicketRows();checkForChanges();});
    observer.observe(document.body,{subtree:true,childList:true,attributes:false});
    window.addEventListener('storage',event=>{if(event.key&&event.key.includes('registratiekassa')) checkForChanges();});
    setInterval(checkForChanges,1500);
  }

  seedExistingOrders();
  bindUi();
  decorateTicketRows();
  renderBossCenter();
})();
