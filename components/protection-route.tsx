/**
 * Composant de protection des routes
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 */

"use client"

import type React from "react"

import { useAuthentification } from "@/providers/authentification.provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface Props {
  children: React.ReactNode
}

export function ProtectionRoute({ children }: Props) {
  const { estConnecte, estEnCoursDeChargement } = useAuthentification()
  const router = useRouter()

  useEffect(() => {
    if (!estEnCoursDeChargement && !estConnecte) {
      router.push("/connexion")
    }
  }, [estConnecte, estEnCoursDeChargement, router])

  // Afficher un écran de chargement pendant la vérification
  if (estEnCoursDeChargement) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Ne pas afficher le contenu si l'utilisateur n'est pas connecté
  if (!estConnecte) {
    return null
  }

  return <>{children}</>
}
