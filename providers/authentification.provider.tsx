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

const ContexteAuthentification = createContext<ContexteAuthentification | undefined>(undefined)

function ProviderAuthentification({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [contexte, setContexte] = useState<AuthContext | null>(null)
  const [etablissementActif, setEtablissementActif] = useState<{ id: string; name: string; role?: string } | null>(null)
  const [estEnCoursDeChargement, setEstEnCoursDeChargement] = useState(true)

  const actualiserSelectionEtablissement = (establishments: AuthContext["establishments"] | undefined) => {
    const candidate = establishments?.[0]
    setEtablissementActif(candidate ?? null)
    if (candidate) {
      setUtilisateur((previous) => previous ? { ...previous, etablissementId: candidate.id } : previous)
    }
  }

  const actualiser = async () => {
    try {
      // Vérifie d'abord la session locale. Pour un visiteur, on ne doit pas
      // attendre un RPC Supabase qui n'est pas nécessaire.
      const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession()
      if (sessionError || !session?.user) {
        setUtilisateur(null)
        setContexte(null)
        setEtablissementActif(null)
        return
      }

      const nextContext = await Promise.race([
        serviceAuthentification.obtenirContexte(),
        new Promise<AuthContext | null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
      ])

      if (!nextContext?.authenticated || !nextContext.account_type) {
        setUtilisateur(null)
        setContexte(null)
        setEtablissementActif(null)
        return
      }

      const selectedUser: Utilisateur = {
        id: session.user.id,
        nomUtilisateur: nextContext.email ?? session.user.email ?? "",
        role: ({ platform_admin: "admin", parent: "parent", teacher: "enseignant", school_member: "ecole" } as const)[nextContext.account_type],
        dernierConnexion: session.user.last_sign_in_at ?? new Date().toISOString(),
        etablissementId: nextContext.establishments?.[0]?.id,
      }

      setUtilisateur(selectedUser)
      setContexte(nextContext)
      actualiserSelectionEtablissement(nextContext.establishments)
    } catch (error) {
      console.error("Erreur initialisation authentification:", error)
      setUtilisateur(null)
      setContexte(null)
      setEtablissementActif(null)
    }
  }

  useEffect(() => {
    let mounted = true

    void actualiser().finally(() => {
      if (mounted) setEstEnCoursDeChargement(false)
    })

    const { data } = supabaseBrowser.auth.onAuthStateChange(() => {
      if (!mounted) return
      void actualiser()
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const connecter = async (email: string, motDePasse: string) => {
    const result = await serviceAuthentification.connecter(email, motDePasse)
    if (result.succes) {
      const nextUser = result.utilisateur
        ? { ...result.utilisateur, etablissementId: result.contexte?.establishments?.[0]?.id ?? result.utilisateur.etablissementId }
        : null
      setUtilisateur(nextUser)
      setContexte(result.contexte ?? null)
      actualiserSelectionEtablissement(result.contexte?.establishments)
    }
    return { succes: result.succes, erreur: result.erreur }
  }

  const deconnecter = async () => {
    await serviceAuthentification.deconnecter()
    setUtilisateur(null)
    setContexte(null)
    setEtablissementActif(null)
  }

  const selectionnerEtablissement = (etablissementId: string) => {
    const found = contexte?.establishments?.find((etablissement) => etablissement.id === etablissementId)
    if (!found) return
    setEtablissementActif(found)
    setUtilisateur((previous) => previous ? { ...previous, etablissementId: found.id } : previous)
  }

  const obtenirCheminRedirection = () => serviceAuthentification.getRedirectionPath(contexte?.account_type)

  return (
    <ContexteAuthentification.Provider
      value={{ utilisateur, contexte, etablissementActif, estConnecte: !!utilisateur, estEnCoursDeChargement, connecter, deconnecter, actualiser, selectionnerEtablissement, obtenirCheminRedirection }}
    >
      {children}
    </ContexteAuthentification.Provider>
  )
}

function useAuthentification() {
  const contexte = useContext(ContexteAuthentification)
  if (!contexte) throw new Error("useAuthentification doit être utilisé dans un ProviderAuthentification")
  return contexte
}

export { ProviderAuthentification, useAuthentification }
