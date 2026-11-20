// LukeApp service worker: avisos push con botones de acción.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "LukeApp", body: event.data ? event.data.text() : "" };
  }
  const urgent = data.urgent === true;
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge.png",
    // El mismo tag reemplaza el aviso anterior en vez de acumularlos…
    tag: data.tag || "lukeapp",
    // …pero vuelve a sonar y vibrar cada vez.
    renotify: true,
    // Queda fijo en pantalla hasta que lo toques (donde el sistema lo permite).
    requireInteraction: urgent,
    vibrate: urgent ? [600, 200, 600, 200, 600, 200, 900] : [300, 100, 300],
    timestamp: Date.now(),
    data: { url: data.url || "/", turn: data.turn || null, token: data.token || null },
    actions: data.turn
      ? [
          { action: "done", title: "✅ Ya lo saqué" },
          { action: "snooze", title: "⏰ 10 min más" },
        ]
      : [],
  };
  event.waitUntil(self.registration.showNotification(data.title || "LukeApp", options));
});

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const { url, turn, token } = n.data || {};
  n.close();

  if ((event.action === "done" || event.action === "snooze") && turn && token) {
    event.waitUntil(
      fetch("/api/push/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: event.action, turn, token }),
      })
        .then((r) => r.json())
        .then((res) =>
          self.registration.showNotification(res.ok ? (event.action === "done" ? "¡Gracias! 🐾" : "Te recordamos en 10 minutos ⏰") : "No se pudo", {
            body: res.message || "",
            icon: "/icon-192.png",
            badge: "/badge.png",
            tag: "lukeapp-ack",
          }),
        )
        .catch(() => self.clients.openWindow(url || "/")),
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url || "/");
          return c.focus();
        }
      }
      return self.clients.openWindow(url || "/");
    }),
  );
});
