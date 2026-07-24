(()=>{
  'use strict';

  const api=window.__kassaAppApi;
  if(!api) {
    console.warn('Snelle bestelbediening kon niet starten: app-koppeling ontbreekt.');
    return;
  }

  const DOUBLE_TAP_MS=340;
  let pendingTap=null;
  let syntheticHistoryClick=false;

  const productIdFor=row=>String(
    row?.dataset?.ticketRow||
    row?.querySelector?.('[data-quantity]')?.dataset?.quantity||
    row?.querySelector?.('[data-remove]')?.dataset?.remove||
    row?.querySelector?.('[data-minus]')?.dataset?.minus||
    ''
  );

  function pulse(row,tone='plus'){
    if(!row) return;
    row.classList.remove('rk-quick-plus','rk-quick-minus');
    void row.offsetWidth;
    row.classList.add(tone==='minus'?'rk-quick-minus':'rk-quick-plus');
    setTimeout(()=>row.classList.remove('rk-quick-plus','rk-quick-minus'),240);
    try{navigator.vibrate?.(10);}catch{}
  }

  function addOne(productId,row){
    api.addProduct?.(productId,1,'double-tap');
    pulse(row,'plus');
  }

  function subtractOne(productId,row){
    api.changeQuantity?.(productId,-1,'quick-minus');
    pulse(row,'minus');
  }

  function replaySingleHistoryClick(content){
    const isBoss=api.getSession?.()?.role==='boss';
    if(!isBoss||!content?.isConnected) return;
    const historyButton=content.closest('[data-ticket-row]')?.querySelector('.item-history-button');
    if(historyButton){
      historyButton.click();
      return;
    }
    syntheticHistoryClick=true;
    try{
      content.dispatchEvent(new MouseEvent('click',{bubbles:false,cancelable:true,view:window}));
    } finally {
      syntheticHistoryClick=false;
    }
  }

  function finishPendingAsSingle(){
    if(!pendingTap) return;
    const current=pendingTap;
    pendingTap=null;
    clearTimeout(current.timer);
    replaySingleHistoryClick(current.content);
  }

  function handleLineContentClick(event){
    if(syntheticHistoryClick||event.defaultPrevented) return;
    if(event.target.closest('button,input,select,a,[data-no-double-add]')) return;
    const row=event.target.closest('#ticketList [data-ticket-row]');
    if(!row) return;
    const content=event.target.closest('.ticket-history-target')||event.target.closest('[data-ticket-row] > div:not(.ticket-actions):not(.rk-line-actions)');
    if(!content||!row.contains(content)) return;

    const productId=productIdFor(row);
    if(!productId) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const now=performance.now();
    if(pendingTap&&pendingTap.productId===productId&&now-pendingTap.at<=DOUBLE_TAP_MS){
      clearTimeout(pendingTap.timer);
      pendingTap=null;
      addOne(productId,row);
      return;
    }

    if(pendingTap) finishPendingAsSingle();
    const timer=setTimeout(()=>finishPendingAsSingle(),DOUBLE_TAP_MS+20);
    pendingTap={productId,row,content,at:now,timer};
  }

  function decorateRows(){
    const boss=api.getSession?.()?.role==='boss';
    document.querySelectorAll('#ticketList [data-ticket-row]').forEach(row=>{
      const productId=productIdFor(row);
      if(!productId) return;
      row.classList.add('rk-double-ready');

      const content=[...row.children].find(child=>child.tagName==='DIV'&&!child.classList.contains('ticket-actions')&&!child.classList.contains('rk-line-actions'))||row.querySelector('strong')?.parentElement;
      if(content){
        content.dataset.quickAdd='1';
        const title=boss
          ? 'Tik één keer voor geschiedenis; tik twee keer snel om één toe te voegen.'
          : 'Tik twee keer snel om één toe te voegen.';
        if(content.title!==title) content.title=title;
        const label=`${content.textContent?.trim()||'Product'}. ${title}`;
        if(content.getAttribute('aria-label')!==label) content.setAttribute('aria-label',label);
      }

      let actions=row.querySelector(':scope > .rk-line-actions');
      if(!actions){
        actions=document.createElement('div');
        actions.className='rk-line-actions';
        actions.dataset.noDoubleAdd='1';
        row.appendChild(actions);
      }

      let minus=actions.querySelector('[data-quick-minus]');
      if(!minus){
        minus=document.createElement('button');
        minus.type='button';
        minus.className='rk-minus-button';
        minus.dataset.quickMinus=productId;
        minus.textContent='−';
        minus.setAttribute('aria-label','Verminder dit drankje met één');
        minus.title='−1';
        minus.addEventListener('click',event=>{
          event.preventDefault();
          event.stopPropagation();
          subtractOne(productId,row);
        });
        actions.appendChild(minus);
      }

      const remove=row.querySelector('[data-remove]');
      if(remove&&remove.parentElement!==actions) actions.appendChild(remove);
      const history=row.querySelector(':scope > .item-history-button');
      if(history&&history.nextElementSibling!==actions) row.insertBefore(history,actions);
      if(actions.parentElement!==row||actions!==row.lastElementChild) row.appendChild(actions);
    });
  }

  document.addEventListener('click',handleLineContentClick,true);
  document.addEventListener('dblclick',event=>{
    if(event.target.closest('#ticketList [data-ticket-row]')&&!event.target.closest('button')){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);

  const observer=new MutationObserver(decorateRows);
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(decorateRows,1200);
  decorateRows();
})();
