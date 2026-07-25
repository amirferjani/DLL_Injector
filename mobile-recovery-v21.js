(()=>{
  'use strict';

  const root=document.documentElement;
  const ua=String(navigator.userAgent||'');
  const touchPoints=Number(navigator.maxTouchPoints||0);
  const isIPhone=/iPhone|iPod/i.test(ua);
  const isIPad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&touchPoints>1);
  const coarse=Boolean(window.matchMedia?.('(pointer:coarse)').matches);
  const screenWidth=Number(window.screen?.width)||window.innerWidth||1024;
  const screenHeight=Number(window.screen?.height)||window.innerHeight||1024;
  const shortSide=Math.min(screenWidth,screenHeight);
  const phone=isIPhone||(!isIPad&&coarse&&shortSide<=600);
  if(!phone) return;

  root.classList.add('rk-mobile-recovery');
  root.dataset.rkMobileVersion='21';

  let productGesture=null;
  let restoreTimers=[];

  function clearRestoreTimers(){
    restoreTimers.forEach(clearTimeout);
    restoreTimers=[];
  }

  function captureProductGesture(target,event){
    clearRestoreTimers();
    const rail=document.getElementById('categoryRail');
    productGesture={
      y:Math.max(0,window.scrollY||document.documentElement.scrollTop||0),
      x:Math.max(0,window.scrollX||document.documentElement.scrollLeft||0),
      railLeft:Number(rail?.scrollLeft||0),
      clientX:Number(event?.clientX??event?.touches?.[0]?.clientX??-9999),
      clientY:Number(event?.clientY??event?.touches?.[0]?.clientY??-9999),
      at:performance.now(),
      expires:performance.now()+850
    };
    try{target?.blur?.();}catch{}
  }

  function restoreScroll(){
    const lock=productGesture;
    if(!lock||performance.now()>lock.expires) return;
    const restore=()=>{
      if(productGesture!==lock||performance.now()>lock.expires) return;
      if(Math.abs((window.scrollY||0)-lock.y)>1||Math.abs((window.scrollX||0)-lock.x)>1){
        window.scrollTo(lock.x,lock.y);
      }
      const rail=document.getElementById('categoryRail');
      if(rail&&Math.abs(rail.scrollLeft-lock.railLeft)>1) rail.scrollLeft=lock.railLeft;
    };
    [0,16,48,110,220,420,700].forEach(delay=>restoreTimers.push(setTimeout(restore,delay)));
    restoreTimers.push(setTimeout(()=>{
      if(productGesture===lock) productGesture=null;
    },900));
  }

  document.addEventListener('pointerdown',event=>{
    const tile=event.target.closest?.('.product-tile');
    if(tile) captureProductGesture(tile,event);
  },true);

  document.addEventListener('touchstart',event=>{
    const tile=event.target.closest?.('.product-tile');
    if(tile&&!productGesture) captureProductGesture(tile,event);
  },{capture:true,passive:true});

  document.addEventListener('click',event=>{
    const tile=event.target.closest?.('.product-tile');
    if(tile){
      if(!productGesture) captureProductGesture(tile,event);
      restoreScroll();
      return;
    }

    const table=event.target.closest?.('.table-button');
    const lock=productGesture;
    if(!table||!lock||performance.now()>lock.expires) return;
    const dx=Number(event.clientX)-lock.clientX;
    const dy=Number(event.clientY)-lock.clientY;
    if(Math.hypot(dx,dy)<=44){
      event.preventDefault();
      event.stopImmediatePropagation();
      restoreScroll();
    }
  },true);

  window.__kassaMobileRecoveryV21={
    version:21,
    restore:restoreScroll,
    active:()=>Boolean(productGesture)
  };
})();
