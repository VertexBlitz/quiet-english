const CACHE='quiet-english-shell-v10';
const SHELL=["/manifest.webmanifest","/icons/icon-192.png","/icons/icon-512.png","/icons/apple-touch-icon.png","/pwa-install.js","/library.html","/knowledge-map.html","/placement.html","/exercise.html","/topics.html","/login.html","/register.html","/account.html","/subscription.html","/privacy.html","/terms.html","/onboarding.html","/","/index.html","/method.html","/plan.html","/practice.html","/writing.html","/listening.html","/dictionary.html","/progress.html","/calendar.html","/studio.html","/offline.html","/styles.css","/i18n.js","/session.js","/learning.js","/ai-practice.js","/pronunciation.js","/pronunciation-content.js","/pronunciation-scoring.js","/pronunciation-storage.js","/writing.js","/listening.js","/listening-trainer.js","/dictionary.js","/analytics.js","/calendar.js","/studio.js","/offline-client.js","/offline.js","/coach-practice.js","/pronunciation.html","/knowledge.html","/review.html"]
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(async ()=>{
      // The installed PWA starts with a query parameter. Resolve the cached
      // document by pathname so "/?source=installed-app" still works offline.
      const fallbackPath = url.pathname === '/' ? '/' : url.pathname;
      const hit = await caches.match(fallbackPath, { ignoreSearch: true });
      return hit || caches.match('/offline.html');
    }));
    return;
  }
  event.respondWith(caches.open(CACHE).then(cache=>{
    // HTML uses a version query string for CSS. Match the shell's canonical
    // /styles.css entry even when the browser requests /styles.css?v=...
    const cachedAsset = url.pathname === '/styles.css'
      ? cache.match(request, { ignoreSearch: true })
      : cache.match(request);

    return cachedAsset.then(hit=>hit||fetch(request).then(response=>{
      if(response.ok&&response.type==='basic'){
        const copy=response.clone();
        cache.put(request,copy).catch(error=>{
          console.warn('Quiet English asset cache update failed:',error?.message||'unknown error');
        });
      }
      return response;
    }));
  }));
});