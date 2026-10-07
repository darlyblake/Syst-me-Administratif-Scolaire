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
  const value = studentId.trim()
  if (!value) return null

  // Le reçu historique peut contenir soit l'UUID Supabase,
  // soit le matricule de l'élève. On accepte volontairement les deux.
  const looksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

  const query = supabaseBrowser
    .from("students")
    .select("*")

  const { data, error } = looksLikeUuid
    ? await query.eq("id", value).maybeSingle()
    : await query.eq("student_number", value).maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger l’élève.")
  }

  return (data as Student | null) ?? null
}

export interface DuplicateStudentCandidate {
  id: string
  student_number: string | null
  first_name: string
  last_name: string
  birth_date: string | null
  sex: string | null
  active: boolean
  current_enrollment: {
    id: string
    academic_year_id: string
    academic_year_name: string | null
    class_id: string | null
    class_name: string | null
    status: string | null
  } | null
}

export interface DuplicateStudentResult {
  found: boolean
  count: number
  students: DuplicateStudentCandidate[]
}

export async function findDuplicateStudentForEnrollment(data: {
  establishmentId: string
  firstName: string
  lastName: string
  birthDate: string
}): Promise<DuplicateStudentResult> {
  const { data: result, error } = await supabaseBrowser.rpc("find_duplicate_student_for_enrollment", {
    p_establishment_id: data.establishmentId,
    p_first_name: data.firstName,
    p_last_name: data.lastName,
    p_birth_date: data.birthDate,
  })

  if (error) throw new Error(error.message || "Impossible de vérifier si l'élève existe déjà.")

  const value = (result && typeof result === "object" ? result : {}) as Record<string, unknown>
  return {
    found: value.found === true,
    count: typeof value.count === "number" ? value.count : 0,
    students: Array.isArray(value.students) ? value.students as DuplicateStudentCandidate[] : [],
  }
}


export interface ChangeStudentEnrollmentClassResult {
  changed: boolean
  enrollment_id: string
  student_id: string
  class_id: string
  previous_class_id?: string | null
  message?: string
}

export async function changeStudentEnrollmentClass(data: {
  establishmentId: string
  enrollmentId: string
  classId: string
}): Promise<ChangeStudentEnrollmentClassResult> {
  const { data: result, error } = await supabaseBrowser.rpc("change_student_enrollment_class", {
    p_establishment_id: data.establishmentId,
    p_enrollment_id: data.enrollmentId,
    p_class_id: data.classId,
  })

  if (error) {
    if (error.message?.includes("class_level_mismatch")) {
      throw new Error("La nouvelle classe doit appartenir au même niveau que l'inscription actuelle.")
    }
    throw new Error(error.message || "Impossible de changer la classe de l'élève.")
  }

  return result as ChangeStudentEnrollmentClassResult
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
