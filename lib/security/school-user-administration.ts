export type SchoolRole = "school_admin" | "director" | "accountant" | "secretary" | "teacher" | "supervisor"

export type SensitiveUserAction = "reset_password" | "disable_user" | "enable_user"

/**
 * Actions d'administration des comptes réservées au rôle maître de l'établissement.
 * Le frontend peut utiliser cette fonction pour afficher/masquer les actions,
 * mais l'autorisation définitive doit être contrôlée côté serveur/Supabase.
 */
export function canManageUserCredentials(role: SchoolRole): boolean {
  return role === "school_admin"
}

export function canPerformSensitiveUserAction(role: SchoolRole, action: SensitiveUserAction): boolean {
  if (!canManageUserCredentials(role)) return false
  return ["reset_password", "disable_user", "enable_user"].includes(action)
}

export interface SchoolDocumentTemplate {
  key: string
  label: string
  description: string
  defaultRoles: SchoolRole[]
}

/** Modèles fonctionnels : le design graphique sera défini dans le module Documents. */
export const SCHOOL_DOCUMENT_TEMPLATES: SchoolDocumentTemplate[] = [
  { key: "entry_authorization", label: "Autorisation d'entrée", description: "Document permettant à un élève de rejoindre une salle après passage à l'administration.", defaultRoles: ["supervisor", "director", "school_admin"] },
  { key: "exit_authorization", label: "Autorisation de sortie", description: "Document autorisant la sortie temporaire ou exceptionnelle d'un élève.", defaultRoles: ["supervisor", "director", "school_admin"] },
  { key: "temporary_exclusion", label: "Décision d'exclusion temporaire", description: "Document indiquant l'élève, la cause, la date de début et la durée de l'exclusion.", defaultRoles: ["supervisor", "director", "school_admin"] },
  { key: "permanent_exclusion", label: "Décision d'exclusion définitive", description: "Document officiel de décision d'exclusion définitive et de son motif.", defaultRoles: ["director", "school_admin"] },
  { key: "school_attendance_certificate", label: "Attestation de scolarité", description: "Attestation officielle de présence et d'inscription de l'élève.", defaultRoles: ["secretary", "director", "school_admin"] },
  { key: "school_certificate", label: "Certificat de scolarité", description: "Certificat officiel confirmant la scolarité de l'élève pour l'année concernée.", defaultRoles: ["secretary", "director", "school_admin"] },
]
