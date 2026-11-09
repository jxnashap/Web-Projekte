/* Mein SSV – Service Worker nur für Push-Benachrichtigungen (Mitteilungen des Vereins).
 * Es wird nichts zwischengespeichert. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let n = {}; try { n = e.data ? e.data.json() : {}; } catch (x) { n = { titel: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification((n.wichtig ? '⚠ ' : '') + (n.titel || 'Schwartauer Segler-Verein'), {
    body: n.text || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: n.id || 'ssv', renotify: !!n.wichtig, data: { url: n.url || 'mein-ssv.html' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ziel = new URL(e.notification.data && e.notification.data.url || 'mein-ssv.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((l) => { const f = l.find((c) => c.url.startsWith(ziel)); return f ? f.focus() : self.clients.openWindow(ziel); }));
});
