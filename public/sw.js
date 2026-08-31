const CACHE_NAME = "nova-static-v3"
const APP_SHELL = ["/", "/offline", "/nova-logo.webp", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const asset of APP_SHELL) {
          try {
            await cache.add(asset)
          } catch (error) {
            console.warn("NOVA: impossible de mettre en cache", asset, error)
          }
        }
      })
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const request = event.request
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return (await cache.match("/offline")) || Response.error()
      })
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request)
        .then((response) => {
          if (response.ok && (
            url.pathname.startsWith("/_next/static/") ||
            url.pathname === "/nova-logo.webp" ||
            url.pathname === "/manifest.webmanifest"
          )) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => cached || Response.error())
    )
  )
})
