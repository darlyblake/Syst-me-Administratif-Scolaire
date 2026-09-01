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

type UtilisateurAvecRoleEtablissement = Utilisateur & { etablissementRole?: string }

function roleUtilisateurPourEtablissement(accountType: AuthContext["account_type"], establishmentRole?: string): Utilisateur["role"] {
  if (accountType !== "school_member") return ({ platform_admin: "admin", parent: "parent", teacher: "enseignant", school_member: "ecole" } as const)[accountType!]
  if (establishmentRole === "owner" || establishmentRole === "school_admin" || establishmentRole === "admin") return "admin"
  return "ecole"
}

function construireUtilisateur(
  base: Utilisateur,
  accountType: AuthContext["account_type"],
  establishment?: { id: string; name: string; role?: string },
): UtilisateurAvecRoleEtablissement {
  return {
    ...base,
    role: roleUtilisateurPourEtablissement(accountType, establishment?.role),
    etablissementRole: establishment?.role,
    etablissementId: establishment?.id ?? base.etablissementId,
  }
}

function ProviderAuthentification({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [contexte, setContexte] = useState<AuthContext | null>(null)
  const [etablissementActif, setEtablissementActif] = useState<{ id: string; name: string; role?: string } | null>(null)
  const [estEnCoursDeChargement, setEstEnCoursDeChargement] = useState(true)

  const actualiser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession()
      if (sessionError || !session?.user) {
        setUtilisateur(null); setContexte(null); setEtablissementActif(null); return
      }

      const nextContext = await Promise.race([
        serviceAuthentification.obtenirContexte(),
        new Promise<AuthContext | null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
      ])

      if (!nextContext?.authenticated || !nextContext.account_type) {
        setUtilisateur(null); setContexte(null); setEtablissementActif(null); return
      }

      const firstEstablishment = nextContext.establishments?.[0]
      const selectedUser = construireUtilisateur({
        id: session.user.id,
        nomUtilisateur: nextContext.email ?? session.user.email ?? "",
        role: "ecole",
        dernierConnexion: session.user.last_sign_in_at ?? new Date().toISOString(),
      }, nextContext.account_type, firstEstablishment)

      setUtilisateur(selectedUser)
      setContexte(nextContext)
      setEtablissementActif(firstEstablishment ?? null)
    } catch (error) {
      console.error("Erreur initialisation authentification:", error)
      setUtilisateur(null); setContexte(null); setEtablissementActif(null)
    }
  }

  useEffect(() => {
    let mounted = true
    void actualiser().finally(() => { if (mounted) setEstEnCoursDeChargement(false) })
    const { data } = supabaseBrowser.auth.onAuthStateChange(() => { if (mounted) void actualiser() })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  const connecter = async (email: string, motDePasse: string) => {
    const result = await serviceAuthentification.connecter(email, motDePasse)
    if (result.succes) {
      const firstEstablishment = result.contexte?.establishments?.[0]
      const nextUser = result.utilisateur
        ? construireUtilisateur(result.utilisateur, result.contexte?.account_type, firstEstablishment)
        : null
      setUtilisateur(nextUser)
      setContexte(result.contexte ?? null)
      setEtablissementActif(firstEstablishment ?? null)
    }
    return { succes: result.succes, erreur: result.erreur }
  }

  const deconnecter = async () => {
    await serviceAuthentification.deconnecter()
    setUtilisateur(null); setContexte(null); setEtablissementActif(null)
  }

  const selectionnerEtablissement = (etablissementId: string) => {
    const found = contexte?.establishments?.find((etablissement) => etablissement.id === etablissementId)
    if (!found) return
    setEtablissementActif(found)
    setUtilisateur((previous) => previous ? construireUtilisateur(previous, contexte?.account_type, found) : previous)
  }

  const obtenirCheminRedirection = () => serviceAuthentification.getRedirectionPath(contexte?.account_type)

  return (
    <ContexteAuthentification.Provider value={{ utilisateur, contexte, etablissementActif, estConnecte: !!utilisateur, estEnCoursDeChargement, connecter, deconnecter, actualiser, selectionnerEtablissement, obtenirCheminRedirection }}>
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
