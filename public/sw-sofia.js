// Miss Sofia service worker — Web Push para mantener la racha viva.
// Versión simple: recibe push y muestra notification (Sofia te espera 👀).

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
    data = { title: "Miss Sofia", body: event.data ? event.data.text() : "Te toca practicar" };
  }
  const title = data.title || "👩‍🏫 Sofia te está esperando";
  const options = {
    body: data.body || "No rompas tu racha — 5 minutos y listo 🔥",
    icon: data.icon || "/sofia-avatar.jpg",
    badge: data.badge || "/sofia-avatar.jpg",
    vibrate: data.vibrate || [300, 150, 300],
    requireInteraction: data.requireInteraction === true,
    tag: data.tag || "sofia-racha",
    renotify: true,
    data: { url: data.url || "/sofia-chat" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/sofia-chat";
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
