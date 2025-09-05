/**
 * Page d'accueil - Redirige vers la page appropriée selon l'état de connexion
 */

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthentification } from "@/providers/authentification.provider"

export default function PageAccueil() {
  const { estConnecte, estEnCoursDeChargement } = useAuthentification()
  const router = useRouter()

  useEffect(() => {
    if (!estEnCoursDeChargement) {
      if (estConnecte) {
        router.push("/tableau-bord")
      } else {
        router.push("/connexion")
      }
    }
  }, [estConnecte, estEnCoursDeChargement, router])

  // Écran de chargement pendant la vérification de l'authentification
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du système...</p>
      </div>
    </div>
  )
}
