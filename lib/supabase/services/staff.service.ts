import { supabaseBrowser } from "@/lib/supabase/client"
import type { Staff } from "@/lib/supabase/types"

export async function getStaff(establishmentId: string, role?: string): Promise<Staff[]> {
  let query = supabaseBrowser
    .from("staff")
    .select("*")
    .eq("establishment_id", establishmentId)
    .eq("status", "active")

  if (role) {
    query = query.eq("role", role)
  }

  const { data, error } = await query.order("role", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger le personnel.")
  }

  return (data ?? []) as Staff[]
}

export async function getStaffMember(staffId: string): Promise<Staff | null> {
  const { data, error } = await supabaseBrowser
    .from("staff")
    .select("*")
    .eq("id", staffId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger le membre du personnel.")
  }

  return (data as Staff | null) ?? null
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  const { data: result, error } = await supabaseBrowser
    .from("staff")
    .insert({
      establishment_id: data.establishment_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      hire_date: data.hire_date || new Date().toISOString(),
      status: data.status || "active",
      department: data.department,
      salary: data.salary,
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de créer le membre du personnel.")
  }

  return result as Staff
}

export async function updateStaff(staffId: string, data: Partial<Staff>): Promise<Staff> {
  const { data: result, error } = await supabaseBrowser
    .from("staff")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      department: data.department,
      salary: data.salary,
    })
    .eq("id", staffId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de modifier le membre du personnel.")
  }

  return result as Staff
}

export async function deactivateStaff(staffId: string): Promise<Staff> {
  const { data, error } = await supabaseBrowser
    .from("staff")
    .update({ status: "inactive" })
    .eq("id", staffId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de désactiver le membre du personnel.")
  }

  return data as Staff
}
