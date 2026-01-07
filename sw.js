const CACHE_NAME = 'dashboard-v3.26.1';
const urlsToCache = [
  '/',
  '/family-dash/',
  '/family-dash/index.html',
  '/family-dash/dashboard.html',
  '/family-dash/setup.html',
  '/family-dash/app-client.js',
  '/family-dash/api-client.js',
  '/family-dash/caldav-client.js',
  '/family-dash/config.js',
  '/family-dash/logger.js',
  '/family-dash/error-handler.js',
  '/family-dash/date-utils.js',
  '/family-dash/weather-narrative-engine.js',
  '/family-dash/favicon.svg'
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

// Fetch event - Stale-while-revalidate strategy for better performance
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
      .then(function(cachedResponse) {
        // Return cached version immediately, but also fetch fresh copy
        const fetchPromise = fetch(event.request).then(function(networkResponse) {
          // Update cache with fresh response for next time
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(function() {
          // Network failed, return cached version if available
          return cachedResponse;
        });

        // Return cached version immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise;
      })
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