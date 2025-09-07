const CACHE_NAME = 'offsuit-blackjack-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json',
  // Add other static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Taking control of all pages');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip API requests - always go to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match('/') // Return cached index.html for all navigation
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Fallback to network
              return fetch(request)
                .then((networkResponse) => {
                  // Cache successful responses
                  if (networkResponse && networkResponse.status === 200) {
                    cache.put(request, networkResponse.clone());
                  }
                  return networkResponse;
                })
                .catch(() => {
                  // Return offline page if available
                  return caches.match('/offline.html');
                });
            });
        })
    );
    return;
  }
  
  // Handle other requests (CSS, JS, images, etc.)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clone response as it can only be consumed once
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed:', error);
            
            // Return fallback for images
            if (request.destination === 'image') {
              return caches.match('/icons/icon-192x192.png');
            }
            
            throw error;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-game-stats') {
    event.waitUntil(syncGameStats());
  }
  
  if (event.tag === 'background-sync-daily-spin') {
    event.waitUntil(syncDailySpin());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const options = {
    body: 'Your daily spin is ready!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/?notification=daily-spin'
    },
    actions: [
      {
        action: 'spin',
        title: 'Spin Now',
        icon: '/icons/action-spin.png'
      },
      {
        action: 'dismiss',
        title: 'Later',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };
  
  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.data.url = payload.url || options.data.url;
  }
  
  event.waitUntil(
    self.registration.showNotification('Offsuit Blackjack', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  let targetUrl = '/';
  
  if (event.notification.data && event.notification.data.url) {
    targetUrl = event.notification.data.url;
  }
  
  if (event.action === 'spin') {
    targetUrl = '/?action=daily-spin';
  } else if (event.action === 'dismiss') {
    return; // Just close notification
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        
        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Utility functions for background sync
async function syncGameStats() {
  try {
    // Get pending game stats from IndexedDB
    const pendingStats = await getPendingGameStats();
    
    for (const stats of pendingStats) {
      try {
        const response = await fetch('/api/stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stats),
        });
        
        if (response.ok) {
          await removePendingGameStats(stats.id);
          console.log('[SW] Synced game stats:', stats.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync game stats:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function syncDailySpin() {
  try {
    const response = await fetch('/api/daily-spin/can-spin');
    if (response.ok) {
      const canSpin = await response.json();
      if (canSpin) {
        // Send notification
        self.registration.showNotification('Daily Spin Available!', {
          body: 'Your daily spin is ready. Tap to claim rewards!',
          icon: '/icons/icon-192x192.png',
          data: { url: '/?action=daily-spin' }
        });
      }
    }
  } catch (error) {
    console.error('[SW] Daily spin sync failed:', error);
  }
}

// IndexedDB helpers (simplified - would need full implementation)
async function getPendingGameStats() {
  // Implementation would use IndexedDB to get pending offline actions
  return [];
}

async function removePendingGameStats(id) {
  // Implementation would remove synced items from IndexedDB
  return true;
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
