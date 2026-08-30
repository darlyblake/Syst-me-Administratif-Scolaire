import { supabaseBrowser } from "@/lib/supabase/client"
import type { Enrollment } from "@/lib/supabase/types"

export interface StudentEnrollmentResult {
  student_id: string
  enrollment_id: string
  schedule: unknown[]
  financial_summary: Record<string, unknown>
}

export interface EnrollmentPage {
  items: import("@/lib/supabase/types").EnrollmentWithRelations[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export async function listEnrollmentsPaginated(data: {
  establishmentId: string
  page?: number
  pageSize?: number
  academicYearId?: string | null
  classId?: string | null
  status?: string | null
  search?: string
}): Promise<EnrollmentPage> {
  const { data: result, error } = await supabaseBrowser.rpc("list_enrollments_paginated", {
    p_establishment_id: data.establishmentId,
    p_page: data.page ?? 1,
    p_page_size: data.pageSize ?? 25,
    p_academic_year_id: data.academicYearId || null,
    p_class_id: data.classId || null,
    p_status: data.status || null,
    p_search: data.search || null,
  })

  if (error) throw new Error("Impossible de charger les inscriptions.")
  const value = (result && typeof result === "object" ? result : {}) as Record<string, unknown>
  const rawItems = value.items ?? value.data
  return {
    items: Array.isArray(rawItems) ? rawItems as EnrollmentPage["items"] : [],
    page: typeof value.page === "number" ? value.page : data.page ?? 1,
    page_size: typeof value.page_size === "number" ? value.page_size : data.pageSize ?? 25,
    total: typeof value.total === "number" ? value.total : 0,
    total_pages: typeof value.total_pages === "number" ? value.total_pages : 0,
  }
}

export async function createStudentEnrollmentWithSchedule(data: {
  establishmentId: string
  studentId?: string | null
  academicYearId: string
  classId: string
  tuitionPlanId: string
  enrollmentDate: string
  firstName?: string
  lastName?: string
  studentNumber?: string
  birthDate?: string
  sex?: string
  phone?: string
  email?: string
}): Promise<StudentEnrollmentResult> {
  const { data: result, error } = await supabaseBrowser.rpc("create_student_enrollment_with_schedule", {
    p_establishment_id: data.establishmentId,
    p_student_id: data.studentId || null,
    p_academic_year_id: data.academicYearId,
    p_class_id: data.classId,
    p_tuition_plan_id: data.tuitionPlanId,
    p_enrollment_date: data.enrollmentDate,
    p_first_name: data.firstName || null,
    p_last_name: data.lastName || null,
    p_student_number: data.studentNumber || null,
    p_birth_date: data.birthDate || null,
    p_sex: data.sex || null,
    p_phone: data.phone || null,
    p_email: data.email || null,
  })

  if (error) throw new Error("Impossible d'enregistrer l'inscription.")
  return result as StudentEnrollmentResult
}

export async function createEnrollment(data: Partial<Enrollment>): Promise<Enrollment> {
  const { data: result, error } = await supabaseBrowser
    .from("enrollments")
    .insert({
      establishment_id: data.establishment_id,
      academic_year_id: data.academic_year_id,
      student_id: data.student_id,
      class_id: data.class_id,
      grade_level_id: data.grade_level_id,
      cycle_id: data.cycle_id,
      tuition_plan_id: data.tuition_plan_id,
      enrollment_date: data.enrollment_date || new Date().toISOString(),
      status: data.status || "active",
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de créer l'inscription.")
  }

  return result as Enrollment
}

export async function getEnrollment(enrollmentId: string): Promise<Enrollment | null> {
  const { data, error } = await supabaseBrowser
    .from("enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    throw new Error("Impossible de charger l'inscription.")
  }

  return (data as Enrollment | null) ?? null
}

export async function getEnrollments(filters: {
  academicYearId?: string
  studentId?: string
  classId?: string
}): Promise<Enrollment[]> {
  let query = supabaseBrowser.from("enrollments").select("*")

  if (filters.academicYearId) {
    query = query.eq("academic_year_id", filters.academicYearId)
  }

  if (filters.studentId) {
    query = query.eq("student_id", filters.studentId)
  }

  if (filters.classId) {
    query = query.eq("class_id", filters.classId)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les inscriptions.")
  }

  return (data ?? []) as Enrollment[]
}

export async function getEnrollmentSchedule(enrollmentId: string) {
  const { data, error } = await supabaseBrowser
    .from("payment_schedules")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("due_date", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger l'échéancier.")
  }

  return (data ?? []) as any[]
}
