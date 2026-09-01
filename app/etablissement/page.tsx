"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"

export default function EtablissementPage() {
  const router = useRouter()
  const { utilisateur, contexte, etablissementActif, estEnCoursDeChargement } = useAuthentification()

  useEffect(() => {
    if (estEnCoursDeChargement) return

    const isSchoolAccount = contexte?.account_type === "school_member"
    const hasEstablishment = Boolean(etablissementActif?.id || utilisateur?.etablissementId)
    const isPlatformAdmin = contexte?.account_type === "platform_admin" || utilisateur?.role === "admin"

    if ((!isSchoolAccount && !isPlatformAdmin) || !utilisateur || !hasEstablishment) {
      router.replace("/connexion")
      return
    }

    router.replace("/ecole/tableau-bord")
  }, [contexte, etablissementActif, estEnCoursDeChargement, router, utilisateur])

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme">
      <p className="text-sm text-muted-foreground">Redirection...</p>
    </div>
  )
}
