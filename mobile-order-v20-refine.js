(()=>{
  'use strict';

  const root=document.documentElement;
  let started=false;
  let observer=null;

  function isPhone(){
    const ua=String(navigator.userAgent||'');
    const touch=Number(navigator.maxTouchPoints||0);
    const isIPhone=/iPhone|iPod/i.test(ua);
    const isIPad=/iPad/i.test(ua)||(navigator.platform==='MacIntel'&&touch>1);
    const coarse=Boolean(window.matchMedia?.('(pointer:coarse)').matches);
    const shortSide=Math.min(Number(screen?.width)||innerWidth,Number(screen?.height)||innerHeight);
    return isIPhone||(!isIPad&&coarse&&shortSide<=600);
  }

  function ensureStyles(){
    let base=document.querySelector('link[data-rk-mobile-order-v20]');
    if(!base){
      base=document.createElement('link');
      base.rel='stylesheet';
      base.href='mobile-order-v20.css';
      base.dataset.rkMobileOrderV20='1';
      document.head.appendChild(base);
    }
    let refine=document.querySelector('link[data-rk-mobile-order-v20-refine]');
    if(!refine){
      refine=document.createElement('link');
      refine.rel='stylesheet';
      refine.href='mobile-order-v20-refine.css';
      refine.dataset.rkMobileOrderV20Refine='1';
      base.insertAdjacentElement('afterend',refine);
    }else if(refine.previousElementSibling!==base){
      base.insertAdjacentElement('afterend',refine);
    }
  }

  function apply(){
    if(!isPhone()) return false;
    const orderHead=document.querySelector('#orderContent .order-head');
    const titleBlock=orderHead?.firstElementChild;
    const request=document.getElementById('requestBillButton');
    if(!orderHead||!titleBlock||!request) return false;

    ensureStyles();
    root.classList.add('rk-phone','rk-order-v20');
    if(request.parentElement!==titleBlock) titleBlock.appendChild(request);
    request.classList.add('rk-request-pill');
    const active=request.classList.contains('active')||request.textContent.includes('✓');
    const label=active?'Rekening ✓':'Rekening gevraagd';
    if(request.textContent!==label) request.textContent=label;
    request.title=active?'Rekening werd gevraagd':'Markeer rekening gevraagd';
    request.setAttribute('aria-label',request.title);
    return true;
  }

  function start(){
    if(started) return true;
    if(!window.__kassaAppApi||!apply()) return false;
    started=true;
    const orderHead=document.querySelector('#orderContent .order-head');
    if(orderHead){
      observer=new MutationObserver(()=>queueMicrotask(apply));
      observer.observe(orderHead,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    }
    setInterval(apply,1200);
    window.addEventListener('pageshow',apply,{passive:true});
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
