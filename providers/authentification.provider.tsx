"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Utilisateur } from "@/types/models"
import { serviceAuthentification } from "@/services/authentification.service"

interface ContexteAuthentification {
  utilisateur: Utilisateur | null
  estConnecte: boolean
  estEnCoursDeChargement: boolean
  tempsRestant: number
  connecter: (nomUtilisateur: string, motDePasse: string) => Promise<{ succes: boolean; erreur?: string }>
  deconnecter: () => void
  prolongerSession: () => boolean
}

const ContexteAuthentification = createContext<ContexteAuthentification | undefined>(undefined)

function ProviderAuthentification({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [estEnCoursDeChargement, setEstEnCoursDeChargement] = useState(true)
  const [tempsRestant, setTempsRestant] = useState(0)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  // Fonction pour récupérer l'utilisateur avec gestion d'erreur robuste
  const recupererUtilisateur = useCallback(() => {
    try {
      const utilisateurConnecte = serviceAuthentification.obtenirUtilisateurConnecte()
      setUtilisateur(utilisateurConnecte)
      return utilisateurConnecte
    } catch (error) {
      console.warn("Erreur lors de la récupération de l'utilisateur:", error)
      setUtilisateur(null)
      return null
    }
  }, [])

  // Fonction pour mettre à jour le temps restant
  const mettreAJourTempsRestant = useCallback(() => {
    const temps = serviceAuthentification.obtenirTempsRestant()
    setTempsRestant(temps)

    // Si moins de 30 minutes restantes, essayer de prolonger la session
    if (temps > 0 && temps < 30) {
      const prolongee = serviceAuthentification.prolongerSession()
      if (prolongee) {
        console.log("Session prolongée automatiquement")
        setTempsRestant(serviceAuthentification.obtenirTempsRestant())
      }
    }
  }, [])

  useEffect(() => {
    // Initialisation avec timeout pour éviter les blocages
    const initTimeout = setTimeout(() => {
      recupererUtilisateur()
      mettreAJourTempsRestant()
      setEstEnCoursDeChargement(false)
    }, 100)

    // Configuration de l'intervalle de vérification
    const id = setInterval(() => {
      mettreAJourTempsRestant()
    }, 60000) // Vérifier chaque minute

    setIntervalId(id)

    return () => {
      clearTimeout(initTimeout)
      if (id) clearInterval(id)
    }
  }, [recupererUtilisateur, mettreAJourTempsRestant])

  const connecter = async (nomUtilisateur: string, motDePasse: string) => {
    const resultat = await serviceAuthentification.connecter(nomUtilisateur, motDePasse)

    if (resultat.succes && resultat.utilisateur) {
      setUtilisateur(resultat.utilisateur)
      setTempsRestant(serviceAuthentification.obtenirTempsRestant())
    }

    return {
      succes: resultat.succes,
      erreur: resultat.erreur,
    }
  }

  const deconnecter = () => {
    serviceAuthentification.deconnecter()
    setUtilisateur(null)
    setTempsRestant(0)
  }

  const prolongerSession = () => {
    const prolongee = serviceAuthentification.prolongerSession()
    if (prolongee) {
      setTempsRestant(serviceAuthentification.obtenirTempsRestant())
    }
    return prolongee
  }

  const valeur: ContexteAuthentification = {
    utilisateur,
    estConnecte: !!utilisateur,
    estEnCoursDeChargement,
    tempsRestant,
    connecter,
    deconnecter,
    prolongerSession,
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
