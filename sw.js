const CACHE='registratiekassa-zoo-v12';
const APP_PARTS=Array.from({length:7},(_,index)=>`./assets/app.full.${String(index+1).padStart(2,'0')}.b64`);
const FILES=['./','./index.html','./loader.js','./manifest.webmanifest','./icons/icon.svg','./assets/styles.css.gz.b64',...APP_PARTS];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match('./index.html'))));});
