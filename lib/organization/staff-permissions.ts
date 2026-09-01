export interface StaffPermissionSet {
  role: string
  granted: string[]
  revoked: string[]
}

/** Permissions effectives = permissions du rôle + ajouts - retraits. */
export function resolvePermissions(set: StaffPermissionSet): string[] {
  const result = new Set(set.granted)
  for (const permission of set.revoked) result.delete(permission)
  return [...result]
}

export function hasPermission(set: StaffPermissionSet, permission: string): boolean {
  return resolvePermissions(set).includes(permission)
}
