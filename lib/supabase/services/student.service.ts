import { supabaseBrowser } from "@/lib/supabase/client"
import type { Student, StudentFilters } from "@/lib/supabase/types"

export async function getStudents(establishmentId: string, filters: StudentFilters = {}): Promise<Student[]> {
  let query = supabaseBrowser
    .from("students")
    .select("*")
    .eq("establishment_id", establishmentId)
    .order("created_at", { ascending: false })

  if (filters.classId) {
    query = query.eq("class_id", filters.classId)
  }

  if (filters.gradeLevelId) {
    query = query.eq("grade_level_id", filters.gradeLevelId)
  }

  if (filters.academicYearId) {
    query = query.eq("academic_year_id", filters.academicYearId)
  }

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  if (filters.search) {
    const value = filters.search.trim()
    if (value) {
      query = query.or(`first_name.ilike.%${value}%,last_name.ilike.%${value}%,full_name.ilike.%${value}%`)
    }
  }

  const { data, error } = await query

  if (error) {
    throw new Error("Impossible de charger les élèves.")
  }

  return (data ?? []) as Student[]
}

export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabaseBrowser.from("students").select("*").eq("id", studentId).maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger l’élève.")
  }

  return (data as Student | null) ?? null
}

export async function createStudent(data: Partial<Student>): Promise<Student> {
  const { data: result, error } = await supabaseBrowser.from("students").insert(data).select().single()

  if (error) {
    throw new Error("Impossible d’ajouter l’élève.")
  }

  return result as Student
}

export async function updateStudent(studentId: string, data: Partial<Student>): Promise<Student> {
  const { data: result, error } = await supabaseBrowser.from("students").update(data).eq("id", studentId).select().single()

  if (error) {
    throw new Error("Impossible de modifier l’élève.")
  }

  return result as Student
}

export async function deactivateStudent(studentId: string): Promise<Student> {
  const { data: result, error } = await supabaseBrowser
    .from("students")
    .update({ status: "inactive" })
    .eq("id", studentId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de désactiver l’élève.")
  }

  return result as Student
}
