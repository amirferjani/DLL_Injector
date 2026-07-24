const CACHE='registratiekassa-v4';
const ASSETS=['./', 'index.html', 'loader.js', 'manifest.webmanifest', 'icons/icon.svg', 'assets/app.01.txt', 'assets/app.02.txt', 'assets/app.03.txt', 'assets/app.04.txt', 'assets/app.05.txt', 'assets/app.06.txt', 'assets/styles.01.txt', 'assets/styles.02.txt', 'assets/styles.03.txt', 'assets/styles.04.txt'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match('index.html'))));});
