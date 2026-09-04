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
  selectionnerEtablissement: (etablissementId: string) => boolean
  obtenirCheminRedirection: () => string
}

const ContexteAuthentification = createContext<ContexteAuthentification | undefined>(undefined)
const CLE_ETABLISSEMENT_ACTIF = "enseignant:etablissement-actif"

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

function lireEtablissementPersisté(etablissements: AuthContext["establishments"] = []) {
  if (typeof window === "undefined" || !etablissements.length) return undefined
  try {
    const id = window.localStorage.getItem(CLE_ETABLISSEMENT_ACTIF)
    if (id) {
      const trouvé = etablissements.find((etablissement) => etablissement.id === id)
      if (trouvé) return trouvé
    }
  } catch {
    // localStorage peut être indisponible (navigation privée / politique navigateur).
  }
  return etablissements[0]
}

function persisterEtablissement(etablissementId: string | null) {
  if (typeof window === "undefined") return
  try {
    if (etablissementId) window.localStorage.setItem(CLE_ETABLISSEMENT_ACTIF, etablissementId)
    else window.localStorage.removeItem(CLE_ETABLISSEMENT_ACTIF)
  } catch {
    // La persistance est uniquement un confort UX, jamais une source d'autorisation.
  }
}

function ProviderAuthentification({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null)
  const [contexte, setContexte] = useState<AuthContext | null>(null)
  const [etablissementActif, setEtablissementActif] = useState<{ id: string; name: string; role?: string } | null>(null)
  const [estEnCoursDeChargement, setEstEnCoursDeChargement] = useState(true)

  const appliquerContexte = (nextContext: AuthContext, baseUtilisateur: Utilisateur) => {
    const establishments = nextContext.establishments ?? []
    const selected = nextContext.account_type === "teacher" ? lireEtablissementPersisté(establishments) : establishments[0]
    const nextUser = construireUtilisateur(baseUtilisateur, nextContext.account_type, selected)
    setUtilisateur(nextUser)
    setContexte(nextContext)
    setEtablissementActif(selected ?? null)
    if (nextContext.account_type === "teacher") persisterEtablissement(selected?.id ?? null)
  }

  const actualiser = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession()
      if (sessionError || !session?.user) {
        setUtilisateur(null); setContexte(null); setEtablissementActif(null); persisterEtablissement(null); return
      }

      const nextContext = await Promise.race([
        serviceAuthentification.obtenirContexte(),
        new Promise<AuthContext | null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
      ])

      if (!nextContext?.authenticated || !nextContext.account_type) {
        setUtilisateur(null); setContexte(null); setEtablissementActif(null); return
      }

      appliquerContexte(nextContext, {
        id: session.user.id,
        nomUtilisateur: nextContext.email ?? session.user.email ?? "",
        role: "enseignant",
        dernierConnexion: session.user.last_sign_in_at ?? new Date().toISOString(),
      })
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
    if (result.succes && result.contexte && result.utilisateur) {
      appliquerContexte(result.contexte, result.utilisateur)
    }
    return { succes: result.succes, erreur: result.erreur }
  }

  const deconnecter = async () => {
    await serviceAuthentification.deconnecter()
    setUtilisateur(null); setContexte(null); setEtablissementActif(null); persisterEtablissement(null)
  }

  const selectionnerEtablissement = (etablissementId: string) => {
    if (contexte?.account_type !== "teacher") return false
    const found = contexte.establishments?.find((etablissement) => etablissement.id === etablissementId)
    if (!found) return false
    setEtablissementActif(found)
    setUtilisateur((previous) => previous ? construireUtilisateur(previous, contexte.account_type, found) : previous)
    persisterEtablissement(found.id)
    return true
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
