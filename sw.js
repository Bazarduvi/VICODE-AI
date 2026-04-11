// NEXUS IDE — Service Worker v3.0
const CACHE = 'nexus-v3';
const STATIC = [
  './index.html',
  './manifest.json',
  './icon.png',
  'https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Rajdhani:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
];

// Never cache AI API calls
const BYPASS = [
  /api\.anthropic\.com/,
  /api\.openai\.com/,
  /generativelanguage\.googleapis\.com/,
  /api\.groq\.com/,
  /api\.perplexity\.ai/,
  /supabase\.co/,
  /googleapis\.com\/drive/,
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC.map(u => new Request(u, {mode:'no-cors'}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const {request} = e;
  if(request.method !== 'GET') return;
  if(BYPASS.some(rx => rx.test(request.url))) return; // bypass API calls
  if(request.url.startsWith('blob:') || request.url.startsWith('data:')) return;

  // Network-first for HTML (gets fresh updates)
  if(request.headers.get('accept')?.includes('text/html') || request.url.endsWith('.html')) {
    e.respondWith(
      fetch(request)
        .then(r => { caches.open(CACHE).then(c => c.put(request, r.clone())); return r; })
        .catch(() => caches.match(request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(r => {
        if(r.ok) caches.open(CACHE).then(c => c.put(request, r.clone()));
        return r;
      }))
  );
});

self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});
