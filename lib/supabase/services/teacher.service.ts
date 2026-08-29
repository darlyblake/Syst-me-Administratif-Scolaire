import { supabaseBrowser } from "@/lib/supabase/client"
import type { Teacher } from "@/lib/supabase/types"

export async function getTeachers(establishmentId: string): Promise<Teacher[]> {
  const { data, error } = await supabaseBrowser
    .from("teachers")
    .select("*")
    .eq("establishment_id", establishmentId)
    .eq("status", "active")
    .order("first_name", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger les enseignants.")
  }

  return (data ?? []) as Teacher[]
}

export async function getTeacher(teacherId: string): Promise<Teacher | null> {
  const { data, error } = await supabaseBrowser
    .from("teachers")
    .select("*")
    .eq("id", teacherId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger l'enseignant.")
  }

  return (data as Teacher | null) ?? null
}

export async function createTeacher(data: Partial<Teacher>): Promise<Teacher> {
  const { data: result, error } = await supabaseBrowser
    .from("teachers")
    .insert({
      establishment_id: data.establishment_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      specialization: data.specialization,
      hire_date: data.hire_date || new Date().toISOString(),
      status: data.status || "active",
      biography: data.biography,
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de créer l'enseignant.")
  }

  return result as Teacher
}

export async function updateTeacher(teacherId: string, data: Partial<Teacher>): Promise<Teacher> {
  const { data: result, error } = await supabaseBrowser
    .from("teachers")
    .update({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      specialization: data.specialization,
      biography: data.biography,
    })
    .eq("id", teacherId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de modifier l'enseignant.")
  }

  return result as Teacher
}

export async function deactivateTeacher(teacherId: string): Promise<Teacher> {
  const { data, error } = await supabaseBrowser
    .from("teachers")
    .update({ status: "inactive" })
    .eq("id", teacherId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de désactiver l'enseignant.")
  }

  return data as Teacher
}
