export interface RuntimeSchoolUser {
  role?: string | null
  permissions?: string[] | null
  revoked_permissions?: string[] | null
  status?: string | null
  etablissementRole?: string | null
}

const ADMIN_ROLES = new Set(["owner", "admin", "school_admin", "administrateur", "administrateur_ecole"])

function normalizeRole(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ -]+/g, "_")
}

function startsWithAny(value: string, prefixes: string[]) {
  return prefixes.some((prefix) => value.startsWith(prefix))
}

function permissionCategory(permission: string): string | null {
  if (permission === "students" || ["students.read", "students.view"].includes(permission)) return "students"
  if (["students.manage", "students.create", "students.edit", "students.delete"].includes(permission)) return "students.manage"
  if (startsWithAny(permission, ["enrollments.", "inscriptions."])) return "inscriptions"
  if (startsWithAny(permission, ["payments.", "finance."]) || permission === "tuition.manage") return "finance"
  if (startsWithAny(permission, ["grades.", "notes."])) return "notes"
  if (startsWithAny(permission, ["attendance.", "pointage."])) return "attendance"
  if (startsWithAny(permission, ["documents."])) return "documents"
  if (startsWithAny(permission, ["staff.", "personnel.", "payroll.", "salaires."])) return "personnel"
  if (startsWithAny(permission, ["teachers.", "enseignants."])) return "teachers"
  if (startsWithAny(permission, ["classes.", "academic.", "planning.", "subjects.", "timetable."])) return "classes"
  if (startsWithAny(permission, ["dashboard."]) || ["events.view", "school.events.view"].includes(permission)) return "dashboard"
  if (startsWithAny(permission, ["messages.", "communication."])) return "communication"
  if (startsWithAny(permission, ["settings.", "school."]) || ["events.manage", "school.events.manage"].includes(permission)) return "settings"
  if (startsWithAny(permission, ["users."]) || ["users.view", "users.manage", "members.manage"].includes(permission)) return "users.manage"
  if (permission === "roles.manage") return "roles.manage"
  if (startsWithAny(permission, ["reports.", "rapports."])) return "reports"
  if (startsWithAny(permission, ["support."])) return "support"
  return null
}

function impliedManagePermission(permission: string): string | null {
  const implied: Record<string, string> = {
    "students.read": "students.manage",
    "students.view": "students.manage",
    "enrollments.read": "enrollments.manage",
    "enrollments.view": "enrollments.manage",
    "inscriptions.view": "enrollments.manage",
    "payments.read": "payments.manage",
    "payments.view": "payments.manage",
    "finance.view": "payments.manage",
    "grades.view": "grades.manage",
    "notes.view": "grades.manage",
    "attendance.read": "attendance.manage",
    "attendance.view": "attendance.manage",
    "pointage.view": "attendance.manage",
    "documents.view": "documents.manage",
    "staff.view": "staff.manage",
    "personnel.view": "staff.manage",
    "salaires.view": "staff.manage",
    "teachers.view": "teachers.manage",
    "enseignants.view": "teachers.manage",
    "classes.view": "classes.manage",
    "planning.view": "classes.manage",
    "subjects.view": "classes.manage",
    "timetable.view": "classes.manage",
    "communication.view": "communication.manage",
    "users.view": "users.manage",
  }
  return implied[permission] ?? null
}

/** Le journal d’audit est réservé à l’administrateur principal de l’établissement. */
export function isEstablishmentAdmin(user: RuntimeSchoolUser | null | undefined): boolean {
  if (!user || user.status === "inactive" || user.status === "suspended") return false
  return ADMIN_ROLES.has(normalizeRole(user.etablissementRole ?? user.role))
}

/** Le frontend reflète les droits renvoyés par get_my_auth_context ; il ne déduit aucun droit du seul intitulé du poste. */
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

  if (revoked.has("*") || revoked.has(permission) || (category !== null && revoked.has(category))) {
    return false
  }

  return (
    granted.has("*") ||
    granted.has(permission) ||
    (category !== null && granted.has(category)) ||
    (impliedManage !== null && granted.has(impliedManage))
  )
}
