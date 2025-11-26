// Service Worker for Push Notifications
console.log('Service Worker file loaded');

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    clients.claim().then(() => {
      console.log('Service Worker activated and claimed clients');
    })
  );
});

// Keep service worker alive
self.addEventListener('fetch', (event) => {
  // Pass through all fetch requests
  event.respondWith(fetch(event.request));
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received in service worker:', event);

  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
      console.log('Push data:', data);
    } catch (e) {
      console.log('Push data (text):', event.data.text());
      data = {
        title: 'New Notification',
        body: event.data.text()
      };
    }
  }

  const title = data.title || '🔔 Reminder';
  const options = {
    body: data.body || 'You have a new reminder',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: data.tag || 'notification-' + Date.now(),
    data: data.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
    silent: false
  };

  console.log('Showing notification:', title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('✅ Notification shown successfully');
      })
      .catch((error) => {
        console.error('❌ Failed to show notification:', error);
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncludes: false })
      .then((clientList) => {
        console.log('Open clients:', clientList.length);
        
        // Check if there's already a window open
        for (let client of clientList) {
          if (client.url.includes('localhost:3000') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow('http://localhost:3000' + urlToOpen);
        }
      })
  );
});

console.log('Service Worker setup complete');