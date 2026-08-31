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
