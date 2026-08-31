import type { Utilisateur, Role } from "@/types/models"
import { supabaseBrowser } from "@/lib/supabase/client"

export type AccountType = "platform_admin" | "parent" | "teacher" | "school_member"
export interface AuthContext { authenticated: boolean; user_id?: string; account_type?: AccountType; first_name?: string | null; last_name?: string | null; email?: string | null; establishments?: Array<{ id: string; name: string; role?: string }> }

const roleFromAccount = (type: AccountType): Role => ({ platform_admin: "admin", parent: "parent", teacher: "enseignant", school_member: "ecole" }[type])

class SupabaseAuthentificationService {
  async connecter(email: string, password: string) {
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error || !data.user) return { succes: false, erreur: "Email ou mot de passe incorrect." }
    const contexte = await this.obtenirContexte()
    if (!contexte?.authenticated || !contexte.account_type) {
      await supabaseBrowser.auth.signOut()
      return { succes: false, erreur: "Votre compte n'est pas encore configuré. Contactez l'administration." }
    }
    const utilisateur: Utilisateur = { id: data.user.id, nomUtilisateur: data.user.email ?? email, role: roleFromAccount(contexte.account_type), dernierConnexion: data.user.last_sign_in_at ?? new Date().toISOString() }
    return { succes: true, utilisateur, contexte }
  }

  async obtenirContexte(): Promise<AuthContext | null> {
    const { data: { user } } = await supabaseBrowser.auth.getUser()
    if (!user) return null
    const { data, error } = await supabaseBrowser.rpc("get_my_auth_context")
    if (error) { console.error("Erreur contexte authentification:", error); return null }
    return data as AuthContext
  }

  async obtenirUtilisateurConnecte(): Promise<Utilisateur | null> {
    const contexte = await this.obtenirContexte()
    if (!contexte?.account_type || !contexte.user_id) return null
    return { id: contexte.user_id, nomUtilisateur: contexte.email ?? "", role: roleFromAccount(contexte.account_type), dernierConnexion: new Date().toISOString() }
  }

  async deconnecter() { await supabaseBrowser.auth.signOut() }

  /** Sends the Supabase recovery email. The Recovery email template must expose {{ .Token }}. */
  async reinitialiserMotDePasse(email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return { succes: false, erreur: "L'adresse email est requise." }

    const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "")
    const origin = typeof window !== "undefined" ? window.location.origin : configuredAppUrl
    const redirectTo = origin ? `${origin}/auth/mot-de-passe-oublie` : undefined

    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(normalizedEmail, redirectTo ? { redirectTo } : undefined)
      if (error) {
        console.error("Erreur envoi récupération Supabase:", error)
        return { succes: false, erreur: this.messageErreurRecuperation(error.message) }
      }
      return { succes: true }
    } catch (error) {
      console.error("Erreur réseau Supabase pendant la récupération:", error)
      return { succes: false, erreur: "Impossible de contacter le service de récupération. Vérifiez la configuration Supabase et votre connexion internet, puis réessayez." }
    }
  }

  private messageErreurRecuperation(message: string) {
    const normalized = message.toLowerCase()
    if (normalized.includes("rate limit") || normalized.includes("too many")) return "Trop de demandes. Attendez quelques instants avant de demander un nouveau code."
    if (normalized.includes("email") && (normalized.includes("disabled") || normalized.includes("provider"))) return "L'envoi d'emails de récupération n'est pas disponible actuellement. Vérifiez la configuration Email de Supabase."
    if (normalized.includes("redirect") || normalized.includes("not allowed")) return "L'adresse de retour de récupération n'est pas autorisée dans Supabase. Ajoutez l'URL de l'application dans Authentication → URL Configuration → Redirect URLs."
    if (normalized.includes("fetch") || normalized.includes("network")) return "Impossible de contacter Supabase. Vérifiez les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel."
    return `Impossible d'envoyer le code de réinitialisation. ${message}`
  }

  async verifierCodeReinitialisation(email: string, token: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedToken = token.trim()
    if (!normalizedEmail || !/^\d{6,8}$/.test(normalizedToken)) return { succes: false, erreur: "Le code de validation est invalide." }

    try {
      const { data, error } = await supabaseBrowser.auth.verifyOtp({ email: normalizedEmail, token: normalizedToken, type: "recovery" })
      if (error || !data.session || !data.user) {
        console.error("Erreur vérification code de récupération:", error)
        return { succes: false, erreur: "Code invalide ou expiré. Demandez un nouveau code." }
      }
      return { succes: true }
    } catch (error) {
      console.error("Erreur réseau lors de la vérification du code:", error)
      return { succes: false, erreur: "Impossible de vérifier le code. Vérifiez votre connexion et réessayez." }
    }
  }

  async mettreAJourMotDePasse(password: string) {
    try {
      const { error } = await supabaseBrowser.auth.updateUser({ password })
      if (error) {
        console.error("Erreur changement mot de passe:", error)
        return { succes: false, erreur: "Impossible de modifier le mot de passe." }
      }
      return { succes: true }
    } catch (error) {
      console.error("Erreur réseau lors du changement de mot de passe:", error)
      return { succes: false, erreur: "Impossible de contacter le service d'authentification. Réessayez." }
    }
  }

  getRedirectionPath(accountType: AccountType | undefined): string {
    switch (accountType) {
      case "platform_admin": return "/admin"
      case "parent": return "/parents/tableau-de-bord"
      case "teacher": return "/enseignant"
      case "school_member": return "/etablissement"
      default: return "/connexion"
    }
  }

  aLesPermissions(action: string, contexte: AuthContext | null) {
    if (!contexte?.authenticated || !contexte.account_type) return false
    if (contexte.account_type === "platform_admin") return true
    const permissions: Record<AccountType, string[]> = {
      platform_admin: ["*"],
      parent: ["voir_profil", "voir_paiements"],
      teacher: ["voir_emploi_du_temps", "pointage", "voir_profil", "voir_eleves", "notes", "devoirs", "presences", "notifier_administration"],
      school_member: ["school.manage", "members.manage", "academic.manage", "students.manage", "enrollments.manage", "tuition.manage", "payments.manage", "grades.manage", "attendance.manage", "teachers.manage", "staff.manage", "reports.view"],
    }
    return permissions[contexte.account_type].includes(action) || permissions[contexte.account_type].includes("*")
  }
}

export const serviceAuthentification = new SupabaseAuthentificationService()
