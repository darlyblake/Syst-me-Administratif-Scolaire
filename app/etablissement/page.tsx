"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"

export default function EtablissementPage() {
  const router = useRouter()
  const { utilisateur, estEnCoursDeChargement } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement) {
      if (!utilisateur || utilisateur.role !== "ecole") {
        router.replace("/login")
      } else {
        router.replace("/ecole/tableau-bord")
      }
    }
  }, [utilisateur, estEnCoursDeChargement, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme">
      <p className="text-sm text-muted-foreground">Redirection...</p>
    </div>
  )
}
