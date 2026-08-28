"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"

export default function PageAccueil() {
  const router = useRouter()
  const { estConnecte, estEnCoursDeChargement, utilisateur } = useAuthentification()

  useEffect(() => {
    if (!estEnCoursDeChargement) {
      if (estConnecte && utilisateur) {
        // Rediriger selon le rôle
        if (utilisateur.role === 'admin') {
          router.replace("/admin/dashboard")
        } else if (utilisateur.role === 'ecole') {
          router.replace("/ecole/tableau-bord")
        } else if (utilisateur.role === 'parent') {
          router.replace("/parents/tableau-bord")
        } else {
          router.replace("/login")
        }
      } else {
        router.replace("/login")
      }
    }
  }, [estConnecte, estEnCoursDeChargement, utilisateur, router])

  // Afficher un indicateur de chargement pendant la vérification
  return (
    <div className="min-h-screen flex items-center justify-center bg-creme">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>
  )
}
