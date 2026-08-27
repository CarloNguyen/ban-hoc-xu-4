/* Bàn học của Nyna — offline service worker.
   Pre-caches the 4 app files on install, then serves them cache-first while
   quietly refreshing from the network in the background whenever online —
   so the iPad works fully offline, and picks up new versions automatically. */
var CACHE = 'ban-hoc-v1';
var FILES = [
  './Ban_hoc.html',
  './Math_Xu_4.html',
  './Science_4.html',
  './ESL_Xu_4.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(FILES); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin === location.origin){
    /* our own files: cache-first + background refresh (stale-while-revalidate) */
    e.respondWith(
      caches.open(CACHE).then(function(c){
        return c.match(req, {ignoreSearch:true}).then(function(cached){
          var fetching = fetch(req).then(function(res){
            if(res && res.ok) c.put(req, res.clone());
            return res;
          }).catch(function(){ return cached; });
          return cached || fetching;
        });
      })
    );
  } else if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    /* fonts: same strategy so they work offline after first load */
    e.respondWith(
      caches.open(CACHE + '-fonts').then(function(c){
        return c.match(req).then(function(cached){
          var fetching = fetch(req).then(function(res){
            if(res && res.ok) c.put(req, res.clone());
            return res;
          }).catch(function(){ return cached; });
          return cached || fetching;
        });
      })
    );
  }
  /* everything else (YouTube, Drive, GitHub API…): straight to network */
});
