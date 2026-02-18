// SelebrityAboki Fruit - Custom Push Notification Service Worker
// This file handles push events from the backend

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = {
            title: 'SelebrityAboki Fruit',
            body: event.data.text(),
            icon: '/icons/icon-192.png',
            url: '/',
        };
    }

    const options = {
        body: data.body || 'You have a new notification',
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        image: data.image,
        tag: data.tag || 'selebrity-notification',
        renotify: true,
        requireInteraction: false,
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'open', title: '🍎 View' },
            { action: 'close', title: 'Dismiss' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SelebrityAboki Fruit', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
