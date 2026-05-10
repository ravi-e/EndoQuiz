const CACHE_NAME = 'endoquiz-v20';
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'questions.json',
  'icon.png',
  'splash.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch Event - Network First for core assets, Cache First for others
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isCoreAsset = url.pathname.endsWith('app.js') || 
                      url.pathname.endsWith('index.html') || 
                      url.pathname.endsWith('styles.css') ||
                      url.pathname.endsWith('questions.json') ||
                      url.pathname.includes('/images/') ||
                      url.pathname === '/';

  if (isCoreAsset) {
    // Network First
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache First
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'refresh-questions') {
    event.waitUntil(fetchAndCacheQuestions());
  }
});

async function fetchAndCacheQuestions() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch('questions.json');
    if (response.ok) {
      await cache.put('questions.json', response.clone());
    }
  } catch (error) {
    console.error('[SW] Background sync fetch failed', error);
  }
}
