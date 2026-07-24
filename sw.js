const CACHE='registratiekassa-zoo-v14';
const APP_PARTS=Array.from({length:7},(_,index)=>`./assets/app.full.${String(index+1).padStart(2,'0')}.b64`);
const FILES=['./','./index.html','./loader.js','./manifest.webmanifest','./icons/icon.svg','./apple-fixes.css','./voice-controller.js','./assets/styles.css.gz.b64',...APP_PARTS];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  const networkFirst=event.request.mode==='navigate'||/\/(?:index\.html|loader\.js|sw\.js)$/.test(url.pathname);
  if(networkFirst){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(event.request,copy));
    return response;
  }).catch(()=>caches.match('./index.html'))));
});
