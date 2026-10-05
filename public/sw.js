self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch that satisfies Chrome PWA requirements
  event.respondWith(fetch(event.request).catch(() => new Response("Офлайн режим")));
});
