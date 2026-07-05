// Gzowo Bowling — minimal service worker: enables installable PWA; network passthrough (the game needs live RTDB, so no offline caching).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
