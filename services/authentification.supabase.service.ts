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

  /**
   * Demande un code OTP de récupération de mot de passe.
   * Le template Recovery de Supabase doit afficher {{ .Token }}.
   */
  async reinitialiserMotDePasse(email: string) {
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim().toLowerCase())
    return error
      ? { succes: false, erreur: "Impossible d'envoyer le code de réinitialisation." }
      : { succes: true }
  }

  /** Vérifie le code à 6 chiffres envoyé par email pour une récupération. */
  async verifierCodeReinitialisation(email: string, token: string) {
    const { data, error } = await supabaseBrowser.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "recovery",
    })

    if (error || !data.session || !data.user) {
      return { succes: false, erreur: "Code invalide ou expiré. Demandez un nouveau code." }
    }
    return { succes: true }
  }

  async mettreAJourMotDePasse(password: string) {
    const { error } = await supabaseBrowser.auth.updateUser({ password })
    return error ? { succes: false, erreur: "Impossible de modifier le mot de passe." } : { succes: true }
  }

  getRedirectionPath(accountType: AccountType | undefined): string {
    switch (accountType) {
      case "platform_admin": return "/admin"
      case "parent": return "/parents/tableau-de-bord"
      case "teacher": return "/enseignant"
      case "school_member": return "/etablissement"
      default: return "/login"
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
