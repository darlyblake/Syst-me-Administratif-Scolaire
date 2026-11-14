export interface RuntimeSchoolUser {
  role?: string | null
  permissions?: string[] | null
  revoked_permissions?: string[] | null
  status?: string | null
  /** Rôle métier réel dans l'établissement, distinct du rôle global school_member. */
  etablissementRole?: string | null
}

const ADMIN_ROLES = new Set(["owner", "admin", "school_admin", "administrateur", "administrateur_ecole"])

function normalizeRole(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[ -]+/g, "_")
}

function permissionCategory(permission: string): string | null {
  if (/^(students\\.|students$)/.test(permission)) return "students"
  if (/^(enrollments\\.|inscriptions\\.)/.test(permission)) return "inscriptions"
  if (/^(payments\\.|finance\\.|tuition\\.)/.test(permission)) return "finance"
  if (/^(grades\\.|notes\\.)/.test(permission)) return "notes"
  if (/^(attendance\\.|pointage\\.)/.test(permission)) return "attendance"
  if (/^documents\\./.test(permission)) return "documents"
  if (/^(staff\\.|personnel\\.|payroll\\.|salaires\\.)/.test(permission)) return "personnel"
  if (/^(teachers\\.|enseignants\\.)/.test(permission)) return "teachers"
  if (/^(classes\\.|academic\\.|planning\\.|subjects\\.|timetable\\.)/.test(permission)) return "classes"
  if (/^dashboard\\./.test(permission) || permission === "events.view" || permission === "school.events.view") return "dashboard"
  if (/^(messages\\.|communication\\.)/.test(permission)) return "communication"
  if (/^(settings\\.|school\\.)/.test(permission) || permission === "events.manage" || permission === "school.events.manage") return "settings"
  if (/^users\\./.test(permission) || permission === "members.manage") return "users.manage"
  if (permission === "roles.manage") return "roles.manage"
  if (/^(reports\\.|rapports\\.)/.test(permission)) return "reports"
  if (/^support\\./.test(permission)) return "support"
  return null
}

function impliedManagePermission(permission: string): string | null {
  const implied: Record<string, string> = {
    "students.read": "students.manage", "students.view": "students.manage",
    "enrollments.read": "enrollments.manage", "enrollments.view": "enrollments.manage", "inscriptions.view": "enrollments.manage",
    "payments.read": "payments.manage", "payments.view": "payments.manage", "finance.view": "payments.manage",
    "grades.view": "grades.manage", "notes.view": "grades.manage",
    "attendance.read": "attendance.manage", "attendance.view": "attendance.manage", "pointage.view": "attendance.manage",
    "documents.view": "documents.manage",
    "staff.view": "staff.manage", "personnel.view": "staff.manage", "salaires.view": "staff.manage",
    "teachers.view": "teachers.manage", "enseignants.view": "teachers.manage",
    "classes.view": "classes.manage", "planning.view": "classes.manage", "subjects.view": "classes.manage", "timetable.view": "classes.manage",
    "communication.view": "communication.manage", "users.view": "users.manage",
  }
  return implied[permission] ?? null
}

/** Audit logs are intentionally reserved for the establishment's top-level administrator. */
export function isEstablishmentAdmin(user: RuntimeSchoolUser | null | undefined): boolean {
  if (!user || user.status === "inactive" || user.status === "suspended") return false
  return ADMIN_ROLES.has(normalizeRole(user.etablissementRole ?? user.role))
}

/**
 * The UI mirrors database permissions; it never invents permissions from a job title.
 * Role modules and individual grants arrive from get_my_auth_context().
 */
export function hasEffectiveSchoolPermission(
  user: RuntimeSchoolUser | null | undefined,
  permission: string,
): boolean {
  if (!user || user.status === "inactive" || user.status === "suspended") return false
  if (isEstablishmentAdmin(user)) return true

  const granted = new Set(user.permissions ?? [])
  const revoked = new Set(user.revoked_permissions ?? [])
  const category = permissionCategory(permission)
  const impliedManage = impliedManagePermission(permission)

  if (
    revoked.has("*") ||
    revoked.has(permission) ||
    (category !== null && revoked.has(category))
  ) return false

  return (
    granted.has("*") ||
    granted.has(permission) ||
    (category !== null && granted.has(category)) ||
    (impliedManage !== null && granted.has(impliedManage))
  )
}
