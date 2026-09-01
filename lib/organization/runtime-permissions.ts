export interface RuntimeSchoolUser {
  role?: string | null
  permissions?: string[] | null
  revoked_permissions?: string[] | null
  status?: string | null
}

const ROLE_DEFAULTS: Record<string, string[]> = {
  school_admin: ["*"] ,
  admin: ["*"],
  director: ["students.view", "students.manage", "attendance.view", "attendance.manage", "grades.view", "grades.manage", "documents.view", "documents.generate", "staff.view", "finance.view"],
  accountant: ["students.view", "payments.view", "payments.create", "finance.view", "finance.manage"],
  secretary: ["students.view", "students.manage", "enrollment.view", "enrollment.manage", "documents.view", "documents.generate"],
  teacher: ["students.view", "attendance.view", "attendance.manage", "grades.view", "grades.manage", "timetable.view"],
  supervisor: ["students.view", "attendance.view", "attendance.manage", "documents.view", "documents.generate"],
}

export function hasEffectiveSchoolPermission(user: RuntimeSchoolUser | null | undefined, permission: string): boolean {
  if (!user || user.status === "inactive" || user.status === "suspended") return false
  const granted = new Set([...(ROLE_DEFAULTS[user.role ?? ""] ?? []), ...(user.permissions ?? [])])
  for (const revoked of user.revoked_permissions ?? []) granted.delete(revoked)
  return granted.has("*") || granted.has(permission)
}
