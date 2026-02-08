import { useAuthentification } from "@/providers/authentification.provider"

export type UserRole = "administrateur" | "enseignant" | "eleve"

export interface Permission {
  resource: string
  actions: string[]
}

export interface RolePermissions {
  [key: string]: Permission[]
}

// Définition des permissions par rôle
const ROLE_PERMISSIONS: RolePermissions = {
  administrateur: [
    { resource: "teachers", actions: ["create", "read", "update", "delete", "export"] },
    { resource: "students", actions: ["create", "read", "update", "delete", "export"] },
    { resource: "classes", actions: ["create", "read", "update", "delete", "assign"] },
    { resource: "schedule", actions: ["create", "read", "update", "delete"] },
    { resource: "documents", actions: ["create", "read", "update", "delete", "upload"] },
    { resource: "messages", actions: ["create", "read", "update", "delete", "send"] },
    { resource: "salaries", actions: ["create", "read", "update", "delete"] },
    { resource: "reports", actions: ["create", "read", "update", "delete", "export"] },
    { resource: "audit", actions: ["read", "export"] },
    { resource: "settings", actions: ["create", "read", "update", "delete"] }
  ],
  enseignant: [
    { resource: "teachers", actions: ["read"] },
    { resource: "students", actions: ["read"] },
    { resource: "classes", actions: ["read"] },
    { resource: "schedule", actions: ["read", "update"] }, // Peut modifier son propre emploi du temps
    { resource: "documents", actions: ["read", "upload"] },
    { resource: "messages", actions: ["create", "read"] },
    { resource: "reports", actions: ["read"] }
  ],
  eleve: [
    { resource: "students", actions: ["read"] }, // Seulement ses propres données
    { resource: "classes", actions: ["read"] },
    { resource: "schedule", actions: ["read"] },
    { resource: "documents", actions: ["read"] },
    { resource: "messages", actions: ["create", "read"] }
  ]
}

export function usePermissions() {
  const { utilisateur } = useAuthentification()

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   */
  const hasPermission = (resource: string, action: string): boolean => {
    if (!utilisateur) return false

    const userRole = utilisateur.role as UserRole
    const rolePermissions = ROLE_PERMISSIONS[userRole]

    if (!rolePermissions) return false

    const resourcePermission = rolePermissions.find(perm => perm.resource === resource)
    if (!resourcePermission) return false

    return resourcePermission.actions.includes(action)
  }

  /**
   * Vérifie si l'utilisateur a toutes les permissions spécifiées
   */
  const hasAllPermissions = (permissions: Array<{ resource: string; action: string }>): boolean => {
    return permissions.every(perm => hasPermission(perm.resource, perm.action))
  }

  /**
   * Vérifie si l'utilisateur a au moins une des permissions spécifiées
   */
  const hasAnyPermission = (permissions: Array<{ resource: string; action: string }>): boolean => {
    return permissions.some(perm => hasPermission(perm.resource, perm.action))
  }

  /**
   * Vérifie si l'utilisateur est administrateur
   */
  const isAdmin = (): boolean => {
    return utilisateur?.role === "administrateur"
  }

  /**
   * Vérifie si l'utilisateur est enseignant
   */
  const isTeacher = (): boolean => {
    return utilisateur?.role === "enseignant"
  }

  /**
   * Vérifie si l'utilisateur est élève
   */
  const isStudent = (): boolean => {
    return utilisateur?.role === "eleve"
  }

  /**
   * Obtient toutes les permissions de l'utilisateur actuel
   */
  const getUserPermissions = (): Permission[] => {
    if (!utilisateur) return []

    const userRole = utilisateur.role as UserRole
    return ROLE_PERMISSIONS[userRole] || []
  }

  /**
   * Vérifie si l'utilisateur peut accéder à une ressource
   */
  const canAccessResource = (resource: string): boolean => {
    return hasPermission(resource, "read")
  }

  /**
   * Vérifie si l'utilisateur peut modifier une ressource
   */
  const canModifyResource = (resource: string): boolean => {
    return hasPermission(resource, "update")
  }

  /**
   * Vérifie si l'utilisateur peut créer dans une ressource
   */
  const canCreateInResource = (resource: string): boolean => {
    return hasPermission(resource, "create")
  }

  /**
   * Vérifie si l'utilisateur peut supprimer dans une ressource
   */
  const canDeleteFromResource = (resource: string): boolean => {
    return hasPermission(resource, "delete")
  }

  /**
   * Vérifie si l'utilisateur peut exporter une ressource
   */
  const canExportResource = (resource: string): boolean => {
    return hasPermission(resource, "export")
  }

  return {
    // Vérifications de base
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,

    // Rôles spécifiques
    isAdmin,
    isTeacher,
    isStudent,

    // Permissions par ressource
    canAccessResource,
    canModifyResource,
    canCreateInResource,
    canDeleteFromResource,
    canExportResource,

    // Utilitaires
    getUserPermissions,
    userRole: utilisateur?.role as UserRole,
    userId: utilisateur?.id
  }
}
