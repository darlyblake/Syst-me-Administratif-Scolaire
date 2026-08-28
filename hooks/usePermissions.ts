"use client"

import { useCallback, useMemo } from "react"
import { useAuthentification } from "@/providers/authentification.provider"
import {
  hasPermission as checkPermission,
  normalizeRole,
  type Permission,
  type PermissionScope,
} from "@/types/authorization"

/**
 * Façade unique des autorisations côté interface.
 * Les composants demandent une permission sans connaître la matrice des rôles.
 */
export function usePermissions() {
  const { utilisateur } = useAuthentification()

  const role = useMemo(() => normalizeRole(utilisateur?.role), [utilisateur?.role])

  const can = useCallback(
    (permission: Permission, scope?: PermissionScope) =>
      checkPermission(utilisateur?.role, permission, scope),
    [utilisateur?.role],
  )

  // Compatibilité avec l'ancienne API utilisée par certains écrans.
  const hasPermission = useCallback(
    (resource: string, action: string) => {
      const map: Record<string, Permission> = {
        "teachers:create": "enseignants.create",
        "teachers:read": "enseignants.view",
        "teachers:update": "enseignants.edit",
        "teachers:delete": "enseignants.delete",
        "classes:read": "classes.view",
        "classes:update": "classes.manage",
        "schedule:read": "planning.view",
        "schedule:update": "planning.manage",
        "documents:read": "documents.view",
        "documents:upload": "documents.manage",
        "salaries:read": "salaires.view",
        "salaries:update": "salaires.manage",
        "reports:read": "rapports.view",
        "students:read": "classes.view",
      }

      const permission = map[`${resource}:${action}`]
      return permission ? can(permission) : false
    },
    [can],
  )

  const hasAllPermissions = useCallback(
    (permissions: Array<{ resource: string; action: string }>) =>
      permissions.every(({ resource, action }) => hasPermission(resource, action)),
    [hasPermission],
  )

  const hasAnyPermission = useCallback(
    (permissions: Array<{ resource: string; action: string }>) =>
      permissions.some(({ resource, action }) => hasPermission(resource, action)),
    [hasPermission],
  )

  return {
    role,
    can,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isAdmin: role === "admin",
    isTeacher: role === "enseignant",
    isStudent: role === "eleve",
    canAccessResource: (resource: string) => hasPermission(resource, "read"),
    canModifyResource: (resource: string) => hasPermission(resource, "update"),
    canCreateInResource: (resource: string) => hasPermission(resource, "create"),
    canDeleteFromResource: (resource: string) => hasPermission(resource, "delete"),
    canExportResource: (resource: string) => resource === "teachers" ? can("enseignants.view") : false,
    userRole: utilisateur?.role,
    userId: utilisateur?.id,
    establishmentId: (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null,
  }
}
