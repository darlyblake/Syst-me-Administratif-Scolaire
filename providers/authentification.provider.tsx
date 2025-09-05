"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Utilisateur } from "@/types/models"
import { serviceAuthentification } from "@/services/authentification.service"

interface ContexteAuthentification {
  utilisateur: Utilisateur | null
  estConnecte: boolean
  estEnCoursDeChargement: boolean
  connecter: (nomUtilisateur: string, motDePasse: string) => Promise<{ succes: boolean; erreur?: string }>
  deconnecter: () => void
}

const ContexteAuthentification = createContext<ContexteAuthentification | undefined>(undefined)

function ProviderAuthentification({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [estEnCoursDeChargement, setEstEnCoursDeChargement] = useState(true)

  useEffect(() => {
    const utilisateurConnecte = serviceAuthentification.obtenirUtilisateurConnecte()
    setUtilisateur(utilisateurConnecte)
    setEstEnCoursDeChargement(false)
  }, [])

  const connecter = async (nomUtilisateur: string, motDePasse: string) => {
    const resultat = await serviceAuthentification.connecter(nomUtilisateur, motDePasse)

    if (resultat.succes && resultat.utilisateur) {
      setUtilisateur(resultat.utilisateur)
    }

    return {
      succes: resultat.succes,
      erreur: resultat.erreur,
    }
  }

  const deconnecter = () => {
    serviceAuthentification.deconnecter()
    setUtilisateur(null)
  }

  const valeur: ContexteAuthentification = {
    utilisateur,
    estConnecte: !!utilisateur,
    estEnCoursDeChargement,
    connecter,
    deconnecter,
  }

  return <ContexteAuthentification.Provider value={valeur}>{children}</ContexteAuthentification.Provider>
}

function useAuthentification() {
  const contexte = useContext(ContexteAuthentification)
  if (contexte === undefined) {
    throw new Error("useAuthentification doit être utilisé dans un ProviderAuthentification")
  }
  return contexte
}

export { ProviderAuthentification, useAuthentification }
