"use client"

import { useEffect } from "react"

const RELOAD_KEY = "nova-chunk-reload"
const RELOAD_WINDOW_MS = 30_000

export function ChunkLoadRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event?.message || ""
      const errorName = event?.error?.name || ""
      const isChunkError =
        errorName === "ChunkLoadError" ||
        /Loading chunk .* failed/i.test(message) ||
        /ChunkLoadError/i.test(message)

      if (!isChunkError) return

      const now = Date.now()
      const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || "0")

      // A single automatic reload handles stale Next.js chunk references after
      // a deployment without creating an infinite reload loop.
      if (now - lastReload < RELOAD_WINDOW_MS) return

      sessionStorage.setItem(RELOAD_KEY, String(now))
      window.location.reload()
    }

    window.addEventListener("error", onError)
    return () => window.removeEventListener("error", onError)
  }, [])

  return null
}
