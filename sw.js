// Math Adventure — service worker (généré au build, ne pas éditer)
const CACHE = 'math-adventure-af4b0e34';
const FILES = ["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];

// Corps lu en entier avant l'écriture : cache.add() en flux échoue (« network error »)
// sur le index.html de ~12 Mo dans Chromium/Edge.
async function precache(cache, file) {
  const res = await fetch(new Request(file, { cache: 'reload' }));
  if (!res.ok) throw new Error(file + ' : HTTP ' + res.status);
  const body = await res.arrayBuffer();
  await cache.put(file, new Response(body, { status: 200, headers: { 'Content-Type': res.headers.get('Content-Type') || '' } }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async (cache) => { for (const f of FILES) await precache(cache, f); })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('math-adventure-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Ouverture de l'app (avec ou sans ?paramètres / #route) → le jeu en cache.
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
