/* SSV Getränkekasse – Service Worker
 * Hält die Oberfläche offline verfügbar (App startet auch bei wackligem WLAN).
 * Daten werden NIE gecacht – Buchungen gehen immer live an die Datenbank. */
const CACHE = 'ssv-kasse-v1';
const DATEIEN = ['./', 'index.html', 'kassenwart.html', 'drucken.html', 'css/app.css', 'js/config.js', 'js/store.js',
  'js/kiosk.js', 'js/admin.js', 'js/drucken.js', 'js/qrcode.js', 'js/qrcode_UTF8.js', 'icons/icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Netz zuerst (immer aktuell), Cache nur als Rückfall
  e.respondWith(fetch(e.request).then((r) => {
    const kopie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopie)); return r;
  }).catch(() => caches.match(e.request)));
});
