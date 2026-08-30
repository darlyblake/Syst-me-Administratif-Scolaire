import { supabaseBrowser } from "@/lib/supabase/client"
import type { Staff } from "@/lib/supabase/types"

export interface StaffPage {
  items: Staff[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

function parseStaffPage(value: unknown, page: number, pageSize: number): StaffPage {
  const result = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  return {
    items: Array.isArray(result.items) ? result.items as Staff[] : [],
    page: typeof result.page === "number" ? result.page : page,
    page_size: typeof result.page_size === "number" ? result.page_size : pageSize,
    total: typeof result.total === "number" ? result.total : 0,
    total_pages: typeof result.total_pages === "number" ? result.total_pages : 0,
  }
}

export async function listStaffPaginated(
  establishmentId: string,
  page = 1,
  pageSize = 25,
  search = "",
  active = true,
): Promise<StaffPage> {
  const { data, error } = await supabaseBrowser.rpc("list_staff_paginated", {
    p_establishment_id: establishmentId,
    p_page: page,
    p_page_size: pageSize,
    p_search: search || null,
    p_active: active,
  })

  if (error) throw new Error("Impossible de charger le personnel.")
  return parseStaffPage(data, page, pageSize)
}

export async function createStaff(data: {
  establishmentId: string
  profileId: string
  firstName: string
  lastName: string
  position: string
  employeeNumber?: string
  phone?: string
  email?: string
  hireDate: string
  active?: boolean
}): Promise<string> {
  const { data: result, error } = await supabaseBrowser.rpc("create_staff", {
    p_establishment_id: data.establishmentId,
    p_first_name: data.firstName,
    p_last_name: data.lastName,
    p_position: data.position,
    p_employee_number: data.employeeNumber || null,
    p_phone: data.phone || null,
    p_email: data.email || null,
    p_hire_date: data.hireDate,
    p_profile_id: data.profileId,
    p_active: data.active ?? true,
  })

  if (error) throw new Error("Impossible de créer le membre du personnel.")
  return result as string
}

export async function updateStaff(data: {
  staffId: string
  firstName: string
  lastName: string
  position: string
  employeeNumber?: string
  phone?: string
  email?: string
  hireDate: string
  active: boolean
}): Promise<string> {
  const { data: result, error } = await supabaseBrowser.rpc("update_staff", {
    p_staff_id: data.staffId,
    p_first_name: data.firstName,
    p_last_name: data.lastName,
    p_position: data.position,
    p_employee_number: data.employeeNumber || null,
    p_phone: data.phone || null,
    p_email: data.email || null,
    p_hire_date: data.hireDate,
    p_active: data.active,
  })

  if (error) throw new Error("Impossible de modifier le membre du personnel.")
  return result as string
}

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

export async function createStaffLegacy(data: Partial<Staff>): Promise<Staff> {
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

export async function updateStaffLegacy(staffId: string, data: Partial<Staff>): Promise<Staff> {
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

export async function deactivateStaff(staffId: string): Promise<string> {
  const { data, error } = await supabaseBrowser.rpc("deactivate_staff", {
    p_staff_id: staffId,
  })

  if (error) throw new Error("Impossible de désactiver le membre du personnel.")
  return data as string
}
