const CACHE_NAME = "nova-static-v4"
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
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const request = event.request
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  // Next.js RSC/data requests must always reach the network. Intercepting
  // them can turn a temporary network failure into Response.error(), which
  // makes client-side navigation report "Failed to fetch RSC payload".
  if (url.searchParams.has("_rsc") || url.pathname.startsWith("/_next/")) return

  // Only cache the explicit static PWA assets. Do not intercept arbitrary
  // application/API requests: authentication and dynamic pages must remain
  // network-first and must never be replaced by a generic cache error.
  const isCacheableAsset =
    url.pathname === "/nova-logo.webp" ||
    url.pathname === "/manifest.webmanifest"

  if (isCacheableAsset) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
      )
    )
    return
  }

  // Keep normal document navigation working offline without interfering with
  // Next.js client-side/RSC navigation.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return (await cache.match("/offline")) || Response.error()
      })
    )
  }
})
