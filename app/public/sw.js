// The offline shell: the app's own files are kept on the device so it opens without a signal, and Help now
// (its numbers are part of the app) still works. Nothing from the server is ever stored here: members' data,
// messages and sign-ins come from Supabase, a different address, and are never cached.
const CACHE = 'user-shell-v2';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // the server's data is never cached
  if (req.mode === 'navigate') {
    // The page itself: the newest version when online, the saved one when not.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  // Scripts, fonts and images have their version in their name, so a saved copy is always right.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});

// Notifications. The server only ever sends a neutral line, never names or message text.
self.addEventListener('push', e => {
  let n = { title: 'User', body: 'You have a new message.', tag: 'message' };
  try { n = { ...n, ...e.data.json() }; } catch { /* keep the neutral default */ }
  e.waitUntil(self.registration.showNotification(n.title, { body: n.body, tag: n.tag, icon: 'icon-192.png', badge: 'icon-192.png' }));
});
// Tapping one opens User, or brings it to the front if it's already open.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.registration.scope));
    return open ? open.focus() : self.clients.openWindow('./');
  }));
});
