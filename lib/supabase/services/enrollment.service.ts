import { supabaseBrowser } from "@/lib/supabase/client"
import type { Enrollment } from "@/lib/supabase/types"

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
