/**
 * Composant de protection des routes
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 * Amélioré avec gestion d'erreur robuste et tolérance aux états temporaires
 */

"use client"

import type React from "react"

import { useAuthentification } from "@/providers/authentification.provider"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

interface Props {
  children: React.ReactNode
}

export function ProtectionRoute({ children }: Props) {
  const { estConnecte, estEnCoursDeChargement, tempsRestant, prolongerSession } = useAuthentification()
  const router = useRouter()
  const pathname = usePathname()
  const [tentativesReconnexion, setTentativesReconnexion] = useState(0)
  const [derniereTentative, setDerniereTentative] = useState(0)

  // Fonction pour gérer la reconnexion avec limitation des tentatives
  const tenterReconnexion = useCallback(() => {
    const maintenant = Date.now()

    // Limiter les tentatives à une fois par minute
    if (maintenant - derniereTentative < 60000) {
      return false
    }

    setDerniereTentative(maintenant)

    if (tentativesReconnexion < 3) {
      const prolongee = prolongerSession()
      setTentativesReconnexion(prev => prev + 1)

      if (prolongee) {
        console.log("Reconnexion automatique réussie")
        setTentativesReconnexion(0) // Reset des tentatives en cas de succès
        return true
      }
    }

    return false
  }, [prolongerSession, tentativesReconnexion, derniereTentative])

  useEffect(() => {
    // Si on est en cours de chargement, ne rien faire
    if (estEnCoursDeChargement) {
      return
    }

    // Si l'utilisateur est connecté, tout va bien
    if (estConnecte) {
      setTentativesReconnexion(0) // Reset des tentatives
      return
    }

    // Si l'utilisateur n'est pas connecté, essayer de prolonger la session
    const reconnexionReussie = tenterReconnexion()

    // Si la reconnexion a échoué après plusieurs tentatives, rediriger
    if (!reconnexionReussie && tentativesReconnexion >= 3) {
      console.log("Redirection vers la connexion après échec de reconnexion")
      router.push("/connexion")
    }
  }, [estConnecte, estEnCoursDeChargement, router, tenterReconnexion, tentativesReconnexion])

  // Afficher un écran de chargement pendant la vérification initiale
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

  // Si l'utilisateur n'est pas connecté et qu'on a épuisé les tentatives de reconnexion
  if (!estConnecte && tentativesReconnexion >= 3) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirection vers la connexion...</p>
        </div>
      </div>
    )
  }

  // Afficher le contenu si l'utilisateur est connecté ou si on tente une reconnexion
  return <>{children}</>
}
