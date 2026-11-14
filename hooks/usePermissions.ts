"use client"

import { useCallback, useMemo } from "react"
import { useAuthentification } from "@/providers/authentification.provider"
import {
  hasPermission as checkPermission,
  normalizeRole,
  type Permission,
  type PermissionScope,
} from "@/types/authorization"
import { hasEffectiveSchoolPermission, isEstablishmentAdmin } from "@/lib/organization/runtime-permissions"

const SCHOOL_PERMISSION_MAP: Record<Permission, string> = {
  "personnel.view": "staff.view",
  "personnel.create": "staff.manage",
  "personnel.edit": "staff.manage",
  "personnel.delete": "staff.manage",
  "enseignants.view": "teachers.view",
  "enseignants.create": "teachers.manage",
  "enseignants.edit": "teachers.manage",
  "enseignants.assign": "teachers.manage",
  "enseignants.delete": "teachers.manage",
  "planning.view": "classes.view",
  "planning.manage": "classes.manage",
  "pointage.view": "attendance.view",
  "pointage.manage": "attendance.manage",
  "documents.view": "documents.view",
  "documents.manage": "documents.manage",
  "salaires.view": "staff.view",
  "salaires.manage": "staff.manage",
  "rapports.view": "reports.view",
  "classes.view": "classes.view",
  "classes.manage": "classes.manage",
  "profile.view": "profile.view",
  "profile.edit": "profile.edit",
}

/** Façade d'autorisation : pour le personnel, les droits viennent du rôle configuré et des droits individuels. */
export function usePermissions() {
  const { utilisateur, contexte } = useAuthentification()
  const role = useMemo(() => normalizeRole(utilisateur?.role), [utilisateur?.role])
  const schoolUser = useMemo(() => utilisateur ? {
    ...utilisateur,
    etablissementRole: (utilisateur as { etablissementRole?: string }).etablissementRole,
    permissions: (utilisateur as { permissions?: string[] }).permissions ?? [],
    revoked_permissions: (utilisateur as { revoked_permissions?: string[] }).revoked_permissions ?? [],
  } : null, [utilisateur])

  const can = useCallback(
    (permission: Permission, scope?: PermissionScope) => {
      if (contexte?.account_type === "school_member") {
        if (permission.startsWith("profile.")) return true
        return hasEffectiveSchoolPermission(schoolUser, SCHOOL_PERMISSION_MAP[permission])
      }
      return checkPermission(utilisateur?.role, permission, scope)
    },
    [contexte?.account_type, schoolUser, utilisateur?.role],
  )

  const hasPermission = useCallback(
    (resource: string, action: string) => {
      const key = `${resource}:${action}`
      if (contexte?.account_type === "school_member") {
        const schoolMap: Record<string, string> = {
          "teachers:create": "teachers.manage",
          "teachers:read": "teachers.view",
          "teachers:update": "teachers.manage",
          "teachers:delete": "teachers.manage",
          "classes:read": "classes.view",
          "classes:update": "classes.manage",
          "schedule:read": "timetable.view",
          "schedule:update": "academic.manage",
          "documents:read": "documents.view",
          "documents:upload": "documents.manage",
          "salaries:read": "staff.view",
          "salaries:update": "staff.manage",
          "reports:read": "reports.view",
          "students:read": "students.read",
          "students:create": "students.manage",
          "students:update": "students.manage",
          "enrollments:read": "enrollments.read",
          "enrollments:create": "enrollments.manage",
          "payments:read": "payments.view",
          "payments:create": "payments.manage",
          "payments:update": "payments.manage",
          "attendance:read": "attendance.read",
          "attendance:update": "attendance.manage",
          "communication:read": "communication.view",
        }
        const permission = schoolMap[key]
        return permission ? hasEffectiveSchoolPermission(schoolUser, permission) : false
      }

      const legacyMap: Record<string, Permission> = {
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
      const permission = legacyMap[key]
      return permission ? can(permission) : false
    },
    [can, contexte?.account_type, schoolUser],
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
  const admin = contexte?.account_type === "school_member"
    ? isEstablishmentAdmin(schoolUser)
    : role === "admin"

  return {
    role,
    can,
    hasPermission,
    hasAllPermissions,
    hasAnyPermissions: hasAnyPermissions,
    isAdmin: admin,
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
