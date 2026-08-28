/**
 * Autorisation applicative.
 * Le rôle décrit la fonction du compte, la permission l'action et le scope
 * l'étendue des données accessibles.
 */

export type AppRole = "admin" | "directeur" | "secretariat" | "comptabilite" | "surveillant" | "enseignant" | "ecole" | "parent" | "eleve" | "unknown"
export type PermissionScope = "own" | "establishment" | "all"

export type Permission =
  | "personnel.view" | "personnel.create" | "personnel.edit" | "personnel.delete"
  | "enseignants.view" | "enseignants.create" | "enseignants.edit" | "enseignants.assign" | "enseignants.delete"
  | "planning.view" | "planning.manage" | "pointage.view" | "pointage.manage"
  | "documents.view" | "documents.manage" | "salaires.view" | "salaires.manage"
  | "rapports.view" | "classes.view" | "classes.manage" | "profile.view" | "profile.edit"

export interface PermissionRule {
  permission: Permission
  scope: PermissionScope
}

const ADMIN: readonly PermissionRule[] = [
  { permission: "personnel.view", scope: "establishment" }, { permission: "personnel.create", scope: "establishment" }, { permission: "personnel.edit", scope: "establishment" }, { permission: "personnel.delete", scope: "establishment" },
  { permission: "enseignants.view", scope: "establishment" }, { permission: "enseignants.create", scope: "establishment" }, { permission: "enseignants.edit", scope: "establishment" }, { permission: "enseignants.assign", scope: "establishment" }, { permission: "enseignants.delete", scope: "establishment" },
  { permission: "planning.view", scope: "establishment" }, { permission: "planning.manage", scope: "establishment" },
  { permission: "pointage.view", scope: "establishment" }, { permission: "pointage.manage", scope: "establishment" },
  { permission: "documents.view", scope: "establishment" }, { permission: "documents.manage", scope: "establishment" },
  { permission: "salaires.view", scope: "establishment" }, { permission: "salaires.manage", scope: "establishment" },
  { permission: "rapports.view", scope: "establishment" }, { permission: "classes.view", scope: "establishment" }, { permission: "classes.manage", scope: "establishment" },
  { permission: "profile.view", scope: "establishment" }, { permission: "profile.edit", scope: "establishment" },
]

export const ROLE_PERMISSIONS: Record<AppRole, readonly PermissionRule[]> = {
  admin: ADMIN,
  ecole: ADMIN,
  directeur: [
    { permission: "personnel.view", scope: "establishment" }, { permission: "personnel.edit", scope: "establishment" },
    { permission: "enseignants.view", scope: "establishment" }, { permission: "enseignants.edit", scope: "establishment" }, { permission: "enseignants.assign", scope: "establishment" },
    { permission: "planning.view", scope: "establishment" }, { permission: "planning.manage", scope: "establishment" }, { permission: "pointage.view", scope: "establishment" },
    { permission: "documents.view", scope: "establishment" }, { permission: "documents.manage", scope: "establishment" }, { permission: "rapports.view", scope: "establishment" },
    { permission: "classes.view", scope: "establishment" }, { permission: "classes.manage", scope: "establishment" }, { permission: "profile.view", scope: "own" }, { permission: "profile.edit", scope: "own" },
  ],
  secretariat: [
    { permission: "personnel.view", scope: "establishment" }, { permission: "personnel.create", scope: "establishment" }, { permission: "personnel.edit", scope: "establishment" },
    { permission: "enseignants.view", scope: "establishment" }, { permission: "enseignants.edit", scope: "establishment" }, { permission: "documents.view", scope: "establishment" }, { permission: "documents.manage", scope: "establishment" }, { permission: "classes.view", scope: "establishment" },
    { permission: "profile.view", scope: "own" }, { permission: "profile.edit", scope: "own" },
  ],
  comptabilite: [
    { permission: "personnel.view", scope: "establishment" }, { permission: "enseignants.view", scope: "establishment" }, { permission: "salaires.view", scope: "establishment" }, { permission: "salaires.manage", scope: "establishment" }, { permission: "rapports.view", scope: "establishment" },
    { permission: "profile.view", scope: "own" }, { permission: "profile.edit", scope: "own" },
  ],
  surveillant: [
    { permission: "enseignants.view", scope: "establishment" }, { permission: "planning.view", scope: "establishment" }, { permission: "pointage.view", scope: "establishment" }, { permission: "pointage.manage", scope: "establishment" }, { permission: "classes.view", scope: "establishment" },
    { permission: "profile.view", scope: "own" }, { permission: "profile.edit", scope: "own" },
  ],
  enseignant: [
    { permission: "planning.view", scope: "own" }, { permission: "pointage.view", scope: "own" }, { permission: "documents.view", scope: "own" }, { permission: "classes.view", scope: "own" }, { permission: "profile.view", scope: "own" }, { permission: "profile.edit", scope: "own" },
  ],
  parent: [],
  eleve: [],
  unknown: [],
}

export function normalizeRole(role: string | undefined | null): AppRole {
  if (!role) return "unknown"
  const normalized = role.trim().toLowerCase()
  if (normalized === "administrateur" || normalized === "administrateur_ecole" || normalized === "admin" || normalized === "ecole") return "admin"
  if (normalized === "directeur" || normalized === "direction") return "directeur"
  if (normalized === "secretariat" || normalized === "secrétariat") return "secretariat"
  if (normalized === "comptabilite" || normalized === "comptabilité") return "comptabilite"
  if (normalized === "surveillant") return "surveillant"
  if (normalized === "enseignant") return "enseignant"
  if (normalized === "parent") return "parent"
  if (normalized === "eleve" || normalized === "élève") return "eleve"
  return "unknown"
}

export function hasPermission(role: string | undefined | null, permission: Permission, requestedScope?: PermissionScope): boolean {
  if (!role) return false
  const rules = ROLE_PERMISSIONS[normalizeRole(role)]
  const rule = rules.find(item => item.permission === permission)
  if (!rule) return false
  if (!requestedScope || requestedScope === rule.scope) return true
  if (rule.scope === "all") return true
  return rule.scope === "establishment" && requestedScope === "own"
}
