/**
 * Rokad Smart School Platform - Web Push Service Worker Listener
 * Supports iOS 16.4+ (PWA Standalone) and Android / Desktop Web Push
 */

// Purge any legacy API runtime caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.delete('api-metadata-cache').catch(() => {})
  );
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'سامانه رُکاد',
    body: 'یک پیام یا اطلاعیه جدید دریافت شد.',
    url: '/app',
    tag: 'rokad-notification',
  };

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: payload.icon || '/icons/pwa-192x192.png',
    badge: payload.badge || '/icons/favicon-32x32.png',
    image: payload.image || undefined,
    tag: payload.tag || 'rokad-push',
    renotify: true,
    requireInteraction: false,
    dir: 'rtl',
    lang: 'fa-IR',
    vibrate: [150, 50, 150],
    data: {
      url: payload.url || '/app',
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open_app',
        title: 'مشاهده در سامانه',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'سامانه هوشمند رُکاد', notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/app';

  // Open window or focus existing window if already open
  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

self.addEventListener('notificationclose', (_event) => {
  // Can track dismissed notifications if needed
});
