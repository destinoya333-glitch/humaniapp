// EcoDrive+ service worker — Web Push notifications para choferes.
// Versión simple: solo recibe push y muestra notification.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "EcoDrive+", body: event.data ? event.data.text() : "Nuevo evento" };
  }
  const title = data.title || "🚖 Nuevo viaje EcoDrive+";
  const options = {
    body: data.body || "Toca para ver detalles",
    icon: data.icon || "/eco-icon-192.png",
    badge: data.badge || "/eco-badge-72.png",
    vibrate: data.vibrate || [400, 200, 400, 200, 600],
    requireInteraction: data.requireInteraction !== false, // por default mantiene visible hasta que toca
    tag: data.tag || "eco-viaje",
    renotify: true,
    data: { url: data.url || "/" },
    actions: data.actions || [
      { action: "open", title: "Ver viaje" },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return null;
    })
  );
});
