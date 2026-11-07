const CACHE='quiet-english-shell-v2';
const SHELL=["/","/index.html","/plan.html","/practice.html","/writing.html","/listening.html","/dictionary.html","/progress.html","/calendar.html","/studio.html","/offline.html","/styles.css","/i18n.js","/session.js","/learning.js","/ai-practice.js","/writing.js","/listening.js","/listening-trainer.js","/dictionary.js","/analytics.js","/calendar.js","/studio.js","/offline-client.js","/offline.js","/coach-practice.js","/pronunciation.html","/knowledge.html","/review.html"]
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match(request).then(hit=>hit||caches.match('/offline.html'))));
    return;
  }
  event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{
    if(response.ok&&response.type==='basic'){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  })));
});