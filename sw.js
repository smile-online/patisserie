/* سمايل حلواني — بيخلي الموقع يشتغل كتطبيق ويفتح بسرعة حتى والنت ضعيف */
const VERSION = 'smile-v6';
const CORE = ['./', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/emblem-light.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function networkFirst(req, key, ms) {
  return new Promise(resolve => {
    let done = false;
    const fromCache = () => caches.match(key, { ignoreSearch: true }).then(r => r || caches.match('index.html'));
    const t = setTimeout(() => { if (!done) fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }); }, ms);
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(key, copy)); }
      if (!done) { done = true; clearTimeout(t); resolve(res); }
    }).catch(() => { clearTimeout(t); fromCache().then(r => { if (!done) { done = true; resolve(r || Response.error()); } }); });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // لوحة التحكم وصفحة الطلبات وأي طلبات خارجية (جوجل/خرايط/GitHub) بتعدي من غير كاش
  if (url.origin !== location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const c = res.clone(); caches.open(VERSION).then(x => x.put(req, c)); return res; })));
    }
    return;
  }
  const path = url.pathname;
  if (/\/(admin|orders)\.html$/.test(path)) return;
  if (req.mode === 'navigate' || /\/(index\.html)?$/.test(path)) { e.respondWith(networkFirst(req, 'index.html', 4000)); return; }
  if (/\/prices\.json$/.test(path)) { e.respondWith(networkFirst(req, path.split('/').pop(), 3000)); return; }
  if (/\/(uploads|icons)\//.test(path)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return res; })));
  }
});
