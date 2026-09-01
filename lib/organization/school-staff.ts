export type StaffStatus = "active" | "inactive" | "suspended"

export interface SchoolStaffProfile {
  id: string
  establishment_id: string
  first_name: string
  last_name: string
  username: string
  email?: string | null
  role: string
  status: StaffStatus
  permissions: string[]
}

export function normalizeUsername(firstName: string, lastName: string): string {
  const value = `${firstName}.${lastName}`
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".")
  return value || "utilisateur"
}

export function isStaffActive(profile: Pick<SchoolStaffProfile, "status">): boolean {
  return profile.status === "active"
}

export function canAccessEstablishment(profile: Pick<SchoolStaffProfile, "establishment_id" | "status">, establishmentId: string): boolean {
  return profile.status === "active" && profile.establishment_id === establishmentId
}
