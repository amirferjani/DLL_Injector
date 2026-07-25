(()=>{
  'use strict';

  const root=document.documentElement;
  let started=false;
  let railObserver=null;
  let layoutObserver=null;
  let scrollLock=null;
  let restoreTimers=[];
  let lastProductInteractionAt=-Infinity;

  function isPhone(){
    const ua=String(navigator.userAgent||'');
    const touch=Number(navigator.maxTouchPoints||0);
    const isIPhone=/iPhone|iPod/i.test(ua);
    const isIPad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&touch>1);
    const coarse=Boolean(window.matchMedia?.('(pointer:coarse)').matches);
    const shortSide=Math.min(Number(screen?.width)||innerWidth,Number(screen?.height)||innerHeight);
    return isIPhone||(!isIPad&&coarse&&shortSide<=600);
  }

  function ensureStyle(){
    if(document.querySelector('link[data-rk-mobile-order-v20]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='mobile-order-v20.css';
    link.dataset.rkMobileOrderV20='1';
    document.head.appendChild(link);
  }

  function originalCatalogButton(mode){
    return document.querySelector(`.catalog-tabs .catalog-tab[data-catalog="${mode}"]`);
  }

  function proxyButton(mode,label,extraClass=''){
    const original=originalCatalogButton(mode);
    if(!original) return null;
    const button=document.createElement('button');
    button.type='button';
    button.className=`category-button rk-catalog-proxy ${extraClass}${original.classList.contains('active')?' active':''}`.trim();
    button.dataset.rkCatalogProxy=mode;
    button.textContent=label;
    button.setAttribute('aria-pressed',String(original.classList.contains('active')));
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      originalCatalogButton(mode)?.click();
    });
    return button;
  }

  function ensureModeProxies(){
    if(!isPhone()) return;
    const rail=document.getElementById('categoryRail');
    if(!rail) return;

    const coreAll=rail.querySelector('[data-category="Alles"]');
    if(coreAll){
      coreAll.classList.add('rk-core-all-category');
      coreAll.setAttribute('aria-hidden','true');
      coreAll.tabIndex=-1;
    }

    if(!rail.querySelector('[data-rk-catalog-proxy="favorites"]')){
      const favorites=proxyButton('favorites','Favorieten');
      const all=proxyButton('all','Alles');
      if(all) rail.insertBefore(all,rail.firstChild);
      if(favorites) rail.insertBefore(favorites,rail.firstChild);
    }
    if(!rail.querySelector('[data-rk-catalog-proxy="recent"]')){
      const recent=proxyButton('recent','Recent','rk-catalog-recent');
      if(recent) rail.appendChild(recent);
    }

    rail.querySelectorAll('[data-rk-catalog-proxy]').forEach(proxy=>{
      const original=originalCatalogButton(proxy.dataset.rkCatalogProxy);
      const active=Boolean(original?.classList.contains('active'));
      proxy.classList.toggle('active',active);
      proxy.setAttribute('aria-pressed',String(active));
    });
  }

  function compactActionLabels(){
    if(!isPhone()) return;
    const request=document.getElementById('requestBillButton');
    if(request){
      const active=request.classList.contains('active')||request.textContent.includes('✓');
      const label=active?'Rekening ✓':'Rekening';
      if(request.textContent!==label) request.textContent=label;
      request.title='Rekening gevraagd';
      request.setAttribute('aria-label',active?'Rekening werd gevraagd':'Markeer rekening gevraagd');
    }
  }

  function applyReferenceLayout(){
    if(!isPhone()) return false;
    ensureStyle();
    root.classList.add('rk-phone','rk-order-v20');
    root.dataset.rkOrderVersion='20';

    const orderContent=document.getElementById('orderContent');
    const catalogTabs=document.querySelector('#orderContent .catalog-tabs');
    const rail=document.getElementById('categoryRail');
    const orderMain=document.querySelector('#orderContent .order-main');
    if(!orderContent||!catalogTabs||!rail||!orderMain) return false;

    orderContent.classList.add('rk-order-reference');
    if(rail.parentElement!==orderContent||rail.nextElementSibling!==catalogTabs){
      orderContent.insertBefore(rail,catalogTabs);
    }
    ensureModeProxies();
    compactActionLabels();

    if(!railObserver){
      railObserver=new MutationObserver(()=>queueMicrotask(ensureModeProxies));
      railObserver.observe(rail,{childList:true});
    }
    return true;
  }

  function clearRestoreTimers(){
    restoreTimers.forEach(clearTimeout);
    restoreTimers=[];
  }

  function armScrollLock(tile){
    if(!isPhone()) return;
    clearRestoreTimers();
    const rail=document.getElementById('categoryRail');
    scrollLock={
      y:Math.max(0,window.scrollY||document.documentElement.scrollTop||0),
      x:Math.max(0,window.scrollX||document.documentElement.scrollLeft||0),
      railLeft:Number(rail?.scrollLeft||0),
      tableId:String(window.__kassaAppApi?.getSelectedTableId?.()||''),
      expires:performance.now()+950
    };
    root.classList.add('rk-scroll-locked');
    try{tile?.blur?.();}catch{}
  }

  function restoreScrollPosition(){
    const lock=scrollLock;
    if(!lock||performance.now()>lock.expires){
      scrollLock=null;
      root.classList.remove('rk-scroll-locked');
      return;
    }
    const restore=()=>{
      if(!scrollLock||performance.now()>scrollLock.expires) return;
      window.scrollTo(lock.x,lock.y);
      const rail=document.getElementById('categoryRail');
      if(rail) rail.scrollLeft=lock.railLeft;
    };
    [0,16,48,110,220,420,700].forEach(delay=>{
      restoreTimers.push(setTimeout(restore,delay));
    });
    restoreTimers.push(setTimeout(()=>{
      if(scrollLock===lock) scrollLock=null;
      root.classList.remove('rk-scroll-locked');
    },980));
  }

  function handleCapturedClick(event){
    const product=event.target.closest?.('.product-tile');
    if(product){
      lastProductInteractionAt=performance.now();
      if(!scrollLock) armScrollLock(product);
      event.preventDefault();
      try{product.blur();}catch{}
      restoreScrollPosition();
      return;
    }

    const table=event.target.closest?.('.table-button');
    if(table&&performance.now()-lastProductInteractionAt<700){
      event.preventDefault();
      event.stopImmediatePropagation();
      restoreScrollPosition();
    }
  }

  function installScrollStability(){
    document.addEventListener('pointerdown',event=>{
      const product=event.target.closest?.('.product-tile');
      if(product) armScrollLock(product);
    },true);
    document.addEventListener('touchstart',event=>{
      const product=event.target.closest?.('.product-tile');
      if(product&&!scrollLock) armScrollLock(product);
    },{capture:true,passive:true});
    document.addEventListener('click',handleCapturedClick,true);

    const orderContent=document.getElementById('orderContent');
    if(orderContent){
      layoutObserver=new MutationObserver(()=>{
        applyReferenceLayout();
        compactActionLabels();
        if(scrollLock) restoreScrollPosition();
      });
      layoutObserver.observe(orderContent,{subtree:true,childList:true});
    }
  }

  function start(){
    if(started) return true;
    if(!window.__kassaAppApi||!document.getElementById('orderContent')) return false;
    if(!isPhone()) return false;
    started=true;
    applyReferenceLayout();
    installScrollStability();
    window.addEventListener('pageshow',applyReferenceLayout,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(applyReferenceLayout,120),{passive:true});
    window.visualViewport?.addEventListener('resize',applyReferenceLayout,{passive:true});
    setInterval(()=>{
      applyReferenceLayout();
      compactActionLabels();
    },1500);
    window.__kassaMobileOrderV20={
      apply:applyReferenceLayout,
      restoreScroll:restoreScrollPosition,
      version:20
    };
    return true;
  }

  if(!start()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(start()||attempts>240) clearInterval(timer);
    },50);
  }
})();
