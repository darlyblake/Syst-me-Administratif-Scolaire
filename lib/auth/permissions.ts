export const SCHOOL_ROLES = [
  "school_admin",
  "secretary",
  "accountant",
  "teacher",
  "supervisor",
] as const

export type SchoolRole = (typeof SCHOOL_ROLES)[number]

export const SCHOOL_PERMISSIONS = [
  "students.view",
  "students.create",
  "students.edit",
  "students.delete",
  "enrollments.view",
  "enrollments.manage",
  "attendance.view",
  "attendance.manage",
  "grades.view",
  "grades.manage",
  "payments.view",
  "payments.create",
  "payments.refund",
  "finance.view",
  "finance.manage",
  "staff.view",
  "staff.manage",
  "documents.view",
  "documents.manage",
  "communication.view",
  "communication.manage",
  "settings.view",
  "settings.manage",
  "users.manage",
] as const

export type SchoolPermission = (typeof SCHOOL_PERMISSIONS)[number]

export const DEFAULT_ROLE_PERMISSIONS: Record<SchoolRole, readonly SchoolPermission[]> = {
  school_admin: SCHOOL_PERMISSIONS,
  secretary: [
    "students.view", "students.create", "students.edit",
    "enrollments.view", "enrollments.manage",
    "attendance.view", "documents.view", "documents.manage",
    "communication.view", "communication.manage", "settings.view",
  ],
  accountant: [
    "students.view", "enrollments.view", "payments.view", "payments.create",
    "payments.refund", "finance.view", "finance.manage", "documents.view",
  ],
  teacher: ["students.view", "attendance.view", "attendance.manage", "grades.view", "grades.manage", "communication.view"],
  supervisor: ["students.view", "attendance.view", "attendance.manage", "communication.view"],
}

const SYSTEM_ONLY = new Set<SchoolPermission>(["users.manage", "settings.manage"])

export function canManagePermission(permission: SchoolPermission): boolean {
  return !SYSTEM_ONLY.has(permission)
}

export function hasPermission(permissions: readonly SchoolPermission[], permission: SchoolPermission): boolean {
  return permissions.includes(permission)
}
