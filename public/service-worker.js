const CACHE_NAME = 'smart-classroom-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  // Vite typically bundles CSS and JS, so these paths might need adjustment after a build.
  // For now, assuming direct access to root level assets.
  // Actual compiled assets like 'index.css', 'main.js' will likely be in 'assets' with hash names.
  // We'll need to update this after checking the build output or using a PWA plugin.
  '/img/logo.png',
  '/assets/react.svg',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
