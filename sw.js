const CACHE = 'jacto-gps-v16';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE.map(u => new Request(u, { mode: 'no-cors' }))))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.endsWith('arcgisonline.com')) return; // imagens de satélite: não guardar no cache do app
  const isPage = e.request.mode === 'navigate' ||
    (url.origin === self.location.origin && (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json')));

  if (isPage) {
    // Página do app: sempre busca a versão nova na internet; usa a cópia salva só se estiver offline
    e.respondWith(
      fetch(e.request.url, { cache: 'no-store', credentials: 'same-origin' }).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')).then(c => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Ícones, fontes e PDF.js: cópia salva primeiro (mudam raramente)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
