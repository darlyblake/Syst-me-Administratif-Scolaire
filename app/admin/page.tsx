"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"

export default function AdminPage() {
  const router = useRouter()
  const { utilisateur, estEnCoursDeChargement } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement) {
      if (!utilisateur || utilisateur.role !== "admin") {
        router.replace("/login")
      } else {
        router.replace("/admin/dashboard")
      }
    }
  }, [utilisateur, estEnCoursDeChargement, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme">
      <p className="text-sm text-muted-foreground">Redirection...</p>
    </div>
  )
}
