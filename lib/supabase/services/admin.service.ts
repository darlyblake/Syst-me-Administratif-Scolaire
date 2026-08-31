import { supabaseBrowser } from "@/lib/supabase/client"

export type AdminDashboardSummary = {
  establishments_count: number
  active_establishments_count: number
  inactive_establishments_count: number
  students_count: number
  staff_count: number
  classes_count: number
  admins_count: number
  active_subscriptions_count: number
  expiring_subscriptions_count: number
  expired_subscriptions_count: number
  suspended_subscriptions_count: number
}

export type AdminExpiringSubscription = {
  establishment_id: string
  establishment_name: string
  establishment_code: string | null
  establishment_status: "active" | "inactive"
  subscription_status: "active" | "expired" | "suspended"
  plan_name: string
  starts_at: string
  ends_at: string
  days_remaining: number
}

export type AdminEstablishment = {
  id: string
  name: string
  code: string | null
  status: "active" | "inactive"
  created_at: string
  subscription_status: "active" | "expired" | "suspended" | null
  subscription_ends_at: string | null
  users_count: number
}

export type AdminParentChild = {
  id: string
  student_number: string | null
  first_name: string
  last_name: string
  active: boolean
  relationship: string | null
  is_primary: boolean
  can_view_finance: boolean
  can_view_academic: boolean
}

export type AdminParent = {
  guardian_user_id: string
  establishment_id: string
  establishment_name: string
  establishment_code: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  active: boolean
  children_count: number
  children: AdminParentChild[]
  created_at: string
}

export const PLATFORM_ADMIN_PERMISSIONS = [
  { value: "dashboard.view", label: "Tableau de bord" },
  { value: "establishments.view", label: "Voir les établissements" },
  { value: "establishments.manage", label: "Gérer les établissements" },
  { value: "subscriptions.manage", label: "Gérer les abonnements" },
  { value: "users.view", label: "Voir les utilisateurs" },
  { value: "admins.manage", label: "Gérer les administrateurs" },
  { value: "support.manage", label: "Service technique" },
  { value: "settings.manage", label: "Paramètres plateforme" },
] as const

export type PlatformAdminPermission = (typeof PLATFORM_ADMIN_PERMISSIONS)[number]["value"]

export type PlatformAdmin = {
  user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  active: boolean
  is_root: boolean
  created_by: string | null
  created_by_name: string | null
  permissions: PlatformAdminPermission[]
  created_at: string
}

export async function refreshSubscriptionMonitoring(): Promise<number> {
  const { data, error } = await supabaseBrowser.rpc("monitor_subscription_expirations")
  if (error) throw error
  return Number(data ?? 0)
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_dashboard_summary")
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error("Impossible de récupérer les statistiques administrateur.")
  return row as AdminDashboardSummary
}

export async function getAdminExpiringSubscriptions(): Promise<AdminExpiringSubscription[]> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_expiring_subscriptions")
  if (error) throw error
  return (data ?? []) as AdminExpiringSubscription[]
}

export async function getAdminEstablishments(): Promise<AdminEstablishment[]> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_establishments")
  if (error) throw error
  return (data ?? []) as AdminEstablishment[]
}

export async function getAdminParents(): Promise<AdminParent[]> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_parents")
  if (error) throw error
  return (data ?? []) as AdminParent[]
}

export async function setAdminParentActive(guardianUserId: string, establishmentId: string, active: boolean): Promise<boolean> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_set_parent_active", {
    p_guardian_user_id: guardianUserId,
    p_establishment_id: establishmentId,
    p_active: active,
  })
  if (error) throw error
  return Boolean(data)
}

export async function getPlatformAdmins(): Promise<PlatformAdmin[]> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_list")
  if (error) throw error
  return (data ?? []) as PlatformAdmin[]
}

export async function setPlatformAdminActive(userId: string, active: boolean): Promise<boolean> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_set_active", { p_user_id: userId, p_active: active })
  if (error) throw error
  return Boolean(data)
}

export async function updatePlatformAdminPermissions(userId: string, permissions: PlatformAdminPermission[]): Promise<boolean> {
  const { data, error } = await supabaseBrowser.rpc("platform_admin_update_permissions", {
    p_user_id: userId,
    p_permissions: permissions,
  })
  if (error) throw error
  return Boolean(data)
}

export async function createPlatformAdmin(input: {
  first_name: string
  last_name: string
  email: string
  password?: string
  permissions: PlatformAdminPermission[]
}) {
  const { data, error } = await supabaseBrowser.functions.invoke("create-platform-admin", {
    body: { action: "create", ...input },
  })
  if (error) throw new Error(data?.error ?? error.message)
  if (data?.error) throw new Error(data.error)
  return data as { status: "created"; user_id: string; email: string; temporary_password: string; permissions: PlatformAdminPermission[] }
}

export async function deletePlatformAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseBrowser.functions.invoke("create-platform-admin", {
    body: { action: "delete", user_id: userId },
  })
  if (error) throw new Error(data?.error ?? error.message)
  if (data?.error) throw new Error(data.error)
  return data?.status === "deleted"
}
