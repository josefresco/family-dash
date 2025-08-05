const CACHE_NAME = 'dashboard-v3.17';
const urlsToCache = [
  '/',
  '/family-dash/',
  '/family-dash/index.html',
  '/family-dash/dashboard.html',
  '/family-dash/setup.html',
  '/family-dash/app-client.js',
  '/family-dash/api-client.js',
  '/family-dash/auth-client.js',
  '/family-dash/config.js'
];

// Install event
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', function(event) {
  // Only handle requests for our own origin/domain
  // Let external API calls (OpenWeatherMap, NOAA, etc.) bypass the service worker
  const url = new URL(event.request.url);
  const isExternalAPI = url.hostname !== self.location.hostname;
  
  if (isExternalAPI) {
    // Don't intercept external API calls - let them go directly to the network
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});