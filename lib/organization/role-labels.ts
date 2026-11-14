const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  school_admin: "Administrateur de l’établissement",
  admin: "Administrateur",
  director: "Directeur",
  accountant: "Comptable",
  secretary: "Secrétaire",
  teacher: "Enseignant",
  supervisor: "Surveillant",
}

export function getSchoolRoleLabel(role?: string | null): string {
  if (!role) return "Membre de l’établissement"
  const normalized = role.trim().toLowerCase().replace(/[ -]+/g, "_")
  return ROLE_LABELS[normalized] ?? "Membre de l’établissement"
}

export function getUserInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\\s+/).filter(Boolean)
  if (!parts.length) return "U"
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")
}
