export interface RuntimeSchoolUser {
  role?: string | null
  permissions?: string[] | null
  revoked_permissions?: string[] | null
  status?: string | null
}

const ROLE_DEFAULTS: Record<string, string[]> = {
  // `owner` est le rôle établissement attribué au propriétaire/
  // administrateur principal de l'établissement. Il doit conserver
  // l'ensemble des permissions prévues pour l'administration de son école.
  owner: ["*"],
  school_admin: ["*"],
  admin: ["*"],
  director: ["students.view", "students.edit", "attendance.view", "attendance.manage", "grades.view", "grades.manage", "documents.view", "documents.create", "staff.view", "finance.view"],
  accountant: ["dashboard.view", "students.view", "payments.view", "payments.create", "finance.view"],
  secretary: ["dashboard.view", "students.view", "students.create", "students.edit", "enrollments.view", "enrollments.create", "documents.view", "documents.create"],
  teacher: ["dashboard.view", "students.view", "attendance.view", "attendance.manage", "grades.view", "grades.manage", "classes.view", "timetable.view"],
  supervisor: ["dashboard.view", "students.view", "attendance.view", "attendance.manage", "documents.view", "documents.create", "exclusions.create"],
}

export function hasEffectiveSchoolPermission(user: RuntimeSchoolUser | null | undefined, permission: string): boolean {
  if (!user || user.status === "inactive" || user.status === "suspended") return false
  const granted = new Set([...(ROLE_DEFAULTS[user.role ?? ""] ?? []), ...(user.permissions ?? [])])
  for (const revoked of user.revoked_permissions ?? []) granted.delete(revoked)
  return granted.has("*") || granted.has(permission)
}
