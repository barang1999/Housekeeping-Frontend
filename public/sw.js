// Ensure new SW takes control right away
self.addEventListener("install", (event) => {
  self.skipWaiting();
  console.log("[sw] installed");
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
  console.log("[sw] activated");
});

// Log + guard + show notification
self.addEventListener("push", (event) => {
  try {
    console.log("[sw] push event received");
    if (!event.data) {
      console.warn("[sw] push: no data payload");
      return;
    }

    let payload = {};
    try {
      payload = event.data.json();
    } catch (e) {
      console.warn("[sw] push: failed to parse JSON payload", e);
      return;
    }

    const title = payload.title || "Update";
    const options = {
      body: payload.body || "",
      tag: payload.tag,
      data: payload.data || {},
      renotify: false,
      // ok if these don't exist; browser will fallback
      badge: "/icons/badge.png",
      icon: "/icons/icon-192.png"
    };

    console.log("[sw] showing notification:", { title, ...options });
    event.waitUntil(
      self.registration.showNotification(title, options).catch((err) => {
        console.error("[sw] showNotification failed", err);
      })
    );
  } catch (err) {
    console.error("[sw] push handler error", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  console.log("[sw] notification clicked", event.notification);
  event.notification.close();
  const roomNumber = event.notification?.data?.roomNumber;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "NAVIGATE_ROOM", roomNumber });
          return client.focus();
        }
      }
      return clients.openWindow("/");
    })
  );
});
