// Math Adventure — service worker (généré au build, ne pas éditer)
const CACHE = 'math-adventure-4c2447a8';
const FILES = ["./","./index.html","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];

// Taille réelle de index.html (octets décodés), écrite au build : sert à afficher le % de téléchargement.
const INDEX_BYTES = 17639615;

// Prévient les pages ouvertes (même pas encore contrôlées) : barre « Prêt sans internet » de l'accueil.
async function notify(msg) {
  const list = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  for (const c of list) c.postMessage({ type: 'ma-offline', ...msg });
}

// Corps lu en entier avant l'écriture : cache.add() en flux échoue (« network error »)
// sur le gros index.html dans Chromium/Edge. Lecture par morceaux pour compter les octets.
async function precache(cache, file) {
  const res = await fetch(new Request(file, { cache: 'reload' }));
  if (!res.ok) throw new Error(file + ' : HTTP ' + res.status);
  const type = res.headers.get('Content-Type') || '';
  let body;
  if (file === './index.html' && res.body && INDEX_BYTES > 0) {
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0, last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      const now = Date.now();
      if (now - last > 250) { last = now; notify({ state: 'progress', p: Math.min(0.99, loaded / INDEX_BYTES) }); }
    }
    body = await new Blob(chunks).arrayBuffer();
  } else {
    body = await res.arrayBuffer();
  }
  await cache.put(file, new Response(body, { status: 200, headers: { 'Content-Type': type } }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async (cache) => { for (const f of FILES) await precache(cache, f); })
      .catch(async (err) => {
        await caches.delete(CACHE);
        await notify({ state: 'error' });
        throw err;
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('math-adventure-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => notify({ state: 'ready' })),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Ouverture de l'app (avec ou sans ?paramètres / #route) → le jeu en cache.
  // Seulement à la racine : les autres pages du site (ex. /guide/) restent servies par le réseau.
  const path = new URL(req.url).pathname;
  const root = new URL(self.registration.scope).pathname;
  if (req.mode === 'navigate' && (path === root || path === root + 'index.html')) {
    event.respondWith(caches.match('./index.html', { cacheName: CACHE }).then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
