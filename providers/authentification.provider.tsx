"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Utilisateur } from "@/types/models"
import { serviceAuthentification, type AuthContext } from "@/services/authentification.supabase.service"
import { supabaseBrowser } from "@/lib/supabase/client"

interface ContexteAuthentification {
  utilisateur: Utilisateur | null
  contexte: AuthContext | null
  estConnecte: boolean
  estEnCoursDeChargement: boolean
  connecter: (email: string, motDePasse: string) => Promise<{ succes: boolean; erreur?: string }>
  deconnecter: () => Promise<void>
  actualiser: () => Promise<void>
}

const ContexteAuthentification = createContext<ContexteAuthentification | undefined>(undefined)

function ProviderAuthentification({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [contexte, setContexte] = useState<AuthContext | null>(null)
  const [estEnCoursDeChargement, setEstEnCoursDeChargement] = useState(true)

  const actualiser = async () => {
    const [nextUser, nextContext] = await Promise.all([
      serviceAuthentification.obtenirUtilisateurConnecte(),
      serviceAuthentification.obtenirContexte(),
    ])
    setUtilisateur(nextUser)
    setContexte(nextContext)
  }

  useEffect(() => {
    let mounted = true
    void actualiser().finally(() => { if (mounted) setEstEnCoursDeChargement(false) })
    const { data } = supabaseBrowser.auth.onAuthStateChange(async () => { if (mounted) await actualiser() })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  const connecter = async (email: string, motDePasse: string) => {
    const result = await serviceAuthentification.connecter(email, motDePasse)
    if (result.succes) { setUtilisateur(result.utilisateur ?? null); setContexte(result.contexte ?? null) }
    return { succes: result.succes, erreur: result.erreur }
  }

  const deconnecter = async () => { await serviceAuthentification.deconnecter(); setUtilisateur(null); setContexte(null) }

  return <ContexteAuthentification.Provider value={{ utilisateur, contexte, estConnecte: !!utilisateur, estEnCoursDeChargement, connecter, deconnecter, actualiser }}>{children}</ContexteAuthentification.Provider>
}

function useAuthentification() {
  const contexte = useContext(ContexteAuthentification)
  if (!contexte) throw new Error("useAuthentification doit être utilisé dans un ProviderAuthentification")
  return contexte
}

export { ProviderAuthentification, useAuthentification }
