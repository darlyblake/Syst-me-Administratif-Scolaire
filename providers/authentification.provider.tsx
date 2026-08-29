"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Utilisateur } from "@/types/models"
import { serviceAuthentification, type AuthContext } from "@/services/authentification.supabase.service"
import { supabaseBrowser } from "@/lib/supabase/client"

interface ContexteAuthentification {
  utilisateur: Utilisateur | null
  contexte: AuthContext | null
  etablissementActif: { id: string; name: string; role?: string } | null
  estConnecte: boolean
  estEnCoursDeChargement: boolean
  connecter: (email: string, motDePasse: string) => Promise<{ succes: boolean; erreur?: string }>
  deconnecter: () => Promise<void>
  actualiser: () => Promise<void>
  selectionnerEtablissement: (etablissementId: string) => void
  obtenirCheminRedirection: () => string
}

const STORAGE_KEY = "eduPilot.currentEstablishmentId"

const ContexteAuthentification = createContext<ContexteAuthentification | undefined>(undefined)

function ProviderAuthentification({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [contexte, setContexte] = useState<AuthContext | null>(null)
  const [etablissementActif, setEtablissementActif] = useState<{ id: string; name: string; role?: string } | null>(null)
  const [estEnCoursDeChargement, setEstEnCoursDeChargement] = useState(true)

  const actualiserSelectionEtablissement = (establishments: AuthContext["establishments"] | undefined) => {
    if (typeof window === "undefined") return

    if (!establishments?.length) {
      setEtablissementActif(null)
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }

    const savedId = window.localStorage.getItem(STORAGE_KEY)
    const candidate = establishments.find((etablissement) => etablissement.id === savedId) ?? establishments[0]

    setEtablissementActif(candidate)
    setUtilisateur((previous) =>
      previous ? { ...previous, etablissementId: candidate.id } : previous,
    )
    window.localStorage.setItem(STORAGE_KEY, candidate.id)
  }

  const actualiser = async () => {
    const [nextUser, nextContext] = await Promise.all([
      serviceAuthentification.obtenirUtilisateurConnecte(),
      serviceAuthentification.obtenirContexte(),
    ])

    const selectedUser = nextUser
      ? { ...nextUser, etablissementId: nextContext?.establishments?.[0]?.id ?? nextUser.etablissementId }
      : null

    setUtilisateur(selectedUser)
    setContexte(nextContext)
    actualiserSelectionEtablissement(nextContext?.establishments)
  }

  useEffect(() => {
    let mounted = true
    void actualiser().finally(() => { if (mounted) setEstEnCoursDeChargement(false) })
    const { data } = supabaseBrowser.auth.onAuthStateChange(async () => { if (mounted) await actualiser() })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (contexte?.establishments) {
      actualiserSelectionEtablissement(contexte.establishments)
    }
  }, [contexte?.establishments])

  const connecter = async (email: string, motDePasse: string) => {
    const result = await serviceAuthentification.connecter(email, motDePasse)
    if (result.succes) {
      const nextUser = result.utilisateur ? { ...result.utilisateur, etablissementId: result.contexte?.establishments?.[0]?.id ?? result.utilisateur.etablissementId } : null
      setUtilisateur(nextUser)
      setContexte(result.contexte ?? null)
      if (result.contexte?.establishments?.length) {
        actualiserSelectionEtablissement(result.contexte.establishments)
      }
    }
    return { succes: result.succes, erreur: result.erreur }
  }

  const deconnecter = async () => {
    await serviceAuthentification.deconnecter()
    setUtilisateur(null)
    setContexte(null)
    setEtablissementActif(null)
    if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY)
  }

  const selectionnerEtablissement = (etablissementId: string) => {
    const found = contexte?.establishments?.find((etablissement) => etablissement.id === etablissementId)
    if (!found) return

    setEtablissementActif(found)
    setUtilisateur((previous) => (previous ? { ...previous, etablissementId: found.id } : previous))
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, found.id)
  }

  const obtenirCheminRedirection = () => serviceAuthentification.getRedirectionPath(contexte?.account_type)

  return <ContexteAuthentification.Provider value={{ utilisateur, contexte, etablissementActif, estConnecte: !!utilisateur, estEnCoursDeChargement, connecter, deconnecter, actualiser, selectionnerEtablissement, obtenirCheminRedirection }}>{children}</ContexteAuthentification.Provider>
}

function useAuthentification() {
  const contexte = useContext(ContexteAuthentification)
  if (!contexte) throw new Error("useAuthentification doit être utilisé dans un ProviderAuthentification")
  return contexte
}

export { ProviderAuthentification, useAuthentification }
