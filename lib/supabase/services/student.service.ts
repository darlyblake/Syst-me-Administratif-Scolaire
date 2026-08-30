import { supabaseBrowser } from "@/lib/supabase/client"
import type { Student, StudentFilters } from "@/lib/supabase/types"

export interface AssignStudentsResult {
  created: number
  updated: number
  total: number
}

export interface StudentPage {
  items: Student[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

function parseStudentPage(value: unknown, page: number, pageSize: number): StudentPage {
  const result = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  const rawItems = result.items ?? result.data
  return {
    items: Array.isArray(rawItems) ? rawItems as Student[] : [],
    page: typeof result.page === "number" ? result.page : page,
    page_size: typeof result.page_size === "number" ? result.page_size : pageSize,
    total: typeof result.total === "number" ? result.total : 0,
    total_pages: typeof result.total_pages === "number" ? result.total_pages : 0,
  }
}

export async function assignStudentsToClass(data: {
  establishmentId: string
  studentIds: string[]
  academicYearId: string
  classId: string
  tuitionPlanId: string
  enrollmentDate: string
}): Promise<AssignStudentsResult> {
  const { data: result, error } = await supabaseBrowser.rpc("assign_students_to_class", {
    p_establishment_id: data.establishmentId,
    p_student_ids: data.studentIds,
    p_academic_year_id: data.academicYearId,
    p_class_id: data.classId,
    p_tuition_plan_id: data.tuitionPlanId,
    p_enrollment_date: data.enrollmentDate,
  })

  if (error) throw new Error("Impossible d'affecter les élèves à la classe.")
  return (result ?? { created: 0, updated: 0, total: data.studentIds.length }) as AssignStudentsResult
}

export async function listStudentsPaginated(
  establishmentId: string,
  page = 1,
  pageSize = 50,
  search = "",
  active = true,
  classId?: string | null,
  academicYearId?: string | null,
): Promise<StudentPage> {
  const { data, error } = await supabaseBrowser.rpc("list_students_paginated", {
    p_establishment_id: establishmentId,
    p_page: page,
    p_page_size: pageSize,
    p_search: search || null,
    p_active: active,
    p_class_id: classId || null,
    p_academic_year_id: academicYearId || null,
  })

  if (error) throw new Error("Impossible de charger les élèves.")
  return parseStudentPage(data, page, pageSize)
}

export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabaseBrowser.from("students").select("*").eq("id", studentId).maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger l’élève.")
  }

  return (data as Student | null) ?? null
}

export async function createStudent(data: {
  establishmentId: string
  firstName: string
  lastName: string
  studentNumber: string
  birthDate?: string
  sex?: string
  phone?: string
  email?: string
  active?: boolean
}): Promise<string> {
  const { data: result, error } = await supabaseBrowser.rpc("create_student", {
    p_establishment_id: data.establishmentId,
    p_first_name: data.firstName,
    p_last_name: data.lastName,
    p_student_number: data.studentNumber,
    p_birth_date: data.birthDate || null,
    p_sex: data.sex || null,
    p_phone: data.phone || null,
    p_email: data.email || null,
    p_active: data.active ?? true,
  })

  if (error) throw new Error("Impossible d'ajouter l'élève.")

  return result as string
}

export async function updateStudent(data: {
  studentId: string
  firstName: string
  lastName: string
  studentNumber: string
  birthDate?: string
  sex?: string
  phone?: string
  email?: string
  active: boolean
}): Promise<string> {
  const { data: result, error } = await supabaseBrowser.rpc("update_student", {
    p_student_id: data.studentId,
    p_first_name: data.firstName,
    p_last_name: data.lastName,
    p_student_number: data.studentNumber,
    p_birth_date: data.birthDate || null,
    p_sex: data.sex || null,
    p_phone: data.phone || null,
    p_email: data.email || null,
    p_active: data.active,
  })

  if (error) throw new Error("Impossible de modifier l'élève.")

  return result as string
}

export async function deactivateStudent(studentId: string): Promise<string> {
  const { data: result, error } = await supabaseBrowser.rpc("deactivate_student", {
    p_student_id: studentId,
  })

  if (error) throw new Error("Impossible de désactiver l'élève.")

  return result as string
}
