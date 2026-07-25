(()=>{
  'use strict';

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

  const root=document.documentElement;
  root.classList.add('rk-phone-v23');
  root.dataset.rkMobileVersion='23';

  function setColumns(){
    const cssWidth=Math.min(
      Number(window.visualViewport?.width)||window.innerWidth||shortSide,
      Math.max(shortSide,320)
    );
    const columns=cssWidth>=388?4:3;
    root.dataset.rkPhoneColumns=String(columns);
  }

  function repairMobileControls(){
    const actions=document.querySelector('.order-head-actions');
    if(actions){
      const visible=[...actions.querySelectorAll(':scope > button')].filter(button=>!button.classList.contains('hidden'));
      actions.dataset.visibleActions=String(visible.length);
    }

    document.querySelectorAll('.catalog-tab').forEach(button=>{
      button.style.removeProperty('display');
      button.removeAttribute('hidden');
    });

    const voiceButton=document.getElementById('voiceButton');
    if(voiceButton) voiceButton.style.removeProperty('display');
  }

  setColumns();
  repairMobileControls();
  window.addEventListener('resize',setColumns,{passive:true});
  window.visualViewport?.addEventListener('resize',setColumns,{passive:true});

  const observer=new MutationObserver(repairMobileControls);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  setInterval(repairMobileControls,1500);
})();
