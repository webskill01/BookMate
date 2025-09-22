// public/sw-template.js - SECURE VERSION with environment variables

// Production-Optimized Service Worker for BookMate PWA
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase with environment variables (injected at build time)
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__"
};

// Only initialize if config is complete and not using placeholder values
const hasValidConfig = Object.values(firebaseConfig).every(value => 
  value && 
  value !== "" && 
  !value.startsWith('__') && 
  !value.endsWith('__')
);

let messaging = null;

if (hasValidConfig) {
  try {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    console.log('[SW] Firebase initialized successfully');
  } catch (error) {
    console.error('[SW] Firebase initialization failed:', error);
  }
} else {
  console.warn('[SW] Firebase config incomplete - notifications disabled');
}

// PWA Configuration
const CACHE_NAME = 'bookmate-__CACHE_VERSION__';
const OFFLINE_PAGE = '/offline.html';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// URLs to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/add-book',
  '/settings',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// URLs that should always be fetched from network
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /firebase/,
  /googleapis/,
  /gstatic/,
  /firestore/
];

// Install Event - Cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Cache populated successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache installation failed:', error);
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch Event - Intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network-first for API calls and Firebase
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.href))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for static assets
  if (url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.jpg') ||
      url.pathname.endsWith('.svg')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first with offline fallback for pages
  event.respondWith(networkFirstWithOfflineFallback(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      // Update cache in background if it's old
      if (await isCacheExpired(request)) {
        updateCacheInBackground(request);
      }
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      // Cache successful API responses briefly
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = response.clone();
      cache.put(request, cachedResponse);
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('{"error": "Offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Network-first with offline page fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_PAGE);
      return offlinePage || new Response('Offline', {
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Offline', { status: 503 });
  }
}

// Check if cache entry is expired
async function isCacheExpired(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (!cached) return true;

  const cachedDate = new Date(cached.headers.get('date') || 0);
  return Date.now() - cachedDate.getTime() > CACHE_DURATION;
}

// Update cache in background
function updateCacheInBackground(request) {
  fetch(request)
    .then(response => {
      if (response.ok) {
        return caches.open(CACHE_NAME)
          .then(cache => cache.put(request, response));
      }
    })
    .catch(() => {
      // Silent fail for background updates
    });
}

// FCM Background Message Handler - only if messaging is available
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    
    const { notification, data } = payload;
    if (!notification) return;

    const title = notification.title || 'BookMate';
    const options = {
      body: notification.body || 'You have a new notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data?.bookId || `bookmate-${Date.now()}`,
      data: data || {},
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'View Dashboard',
          icon: '/icons/icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/icon-72x72.png'
        }
      ],
      timestamp: Date.now()
    };

    return self.registration.showNotification(title, options);
  });
}

// Enhanced Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const { action, data } = event;
  let urlToOpen = `${self.location.origin}/dashboard`;
  
  if (data?.bookId) {
    urlToOpen = `${self.location.origin}/book/${data.bookId}`;
  }

  if (action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Focus existing window if possible
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: data
          });
          return client.focus();
        }
      }

      // Open new window if no existing window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_CACHE_STATUS':
      event.ports[0].postMessage({
        cacheSize: getCacheSize(),
        version: CACHE_NAME
      });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// Utility functions
async function getCacheSize() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    return keys.length;
  } catch {
    return 0;
  }
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

// Build info
console.log('[SW] BookMate Service Worker v__VERSION__ loaded at __BUILD_TIME__');
