"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("Impossible d'enregistrer le service worker NOVA.", error)
      })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register, { once: true })
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return null
}
