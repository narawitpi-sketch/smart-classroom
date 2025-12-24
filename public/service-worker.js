const CACHE_NAME = 'smart-classroom-cache-v2'; // Increment cache version
const ASSET_CACHE_NAME = 'smart-classroom-assets-cache-v1';

const staticAssets = [
  '/',
  '/index.html',
  '/img/logo.png',
  '/assets/react.svg',
  '/vite.svg',
  '/manifest.json',
  '/App.css', // Assuming App.css is directly accessible or bundled
  '/index.css', // Assuming index.css is directly accessible or bundled
];

// URLs that are likely to be dynamic or API calls, use network-first strategy
const dynamicUrlsRegex = [
  new RegExp('/api/.*'), // Example: if you have API calls
  // Add other dynamic content regex here if needed
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened static cache');
        return cache.addAll(staticAssets);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Check if the request is for a navigation (HTML page)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails, serve index.html from cache
          return caches.match('/index.html');
        })
    );
    return;
  }

  // For other requests (scripts, styles, images, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If asset is found in cache, return it
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the request.
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (fetchResponse) => {
            // Check if we received a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream and
            // can only be consumed once. Since we are consuming this
            // once by the browser and once by the cache, we need to
            // clone it.
            const responseToCache = fetchResponse.clone();

            caches.open(ASSET_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          }
        ).catch(() => {
            // If network fetch fails, and not in cache, you might want to serve a fallback
            // For now, it will just fail.
        });
      })
    );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, ASSET_CACHE_NAME]; // Include new asset cache
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
