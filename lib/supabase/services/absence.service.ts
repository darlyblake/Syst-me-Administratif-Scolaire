import { supabaseBrowser } from "@/lib/supabase/client"
import type { Absence, AbsenceWithStudent } from "@/lib/supabase/types"

export interface AttendanceStatistics {
  total: number
  present: number
  absent: number
  late: number
  excused: number
  presence_rate: number
}

export async function getAttendanceStatistics(data: {
  establishmentId: string
  from: string
  to: string
  classId?: string | null
}): Promise<AttendanceStatistics> {
  const { data: result, error } = await supabaseBrowser.rpc("get_attendance_statistics", {
    p_establishment_id: data.establishmentId,
    p_from: data.from,
    p_to: data.to,
    p_class_id: data.classId || null,
  })

  if (error) throw new Error("Impossible de charger les statistiques de présence.")
  return result as AttendanceStatistics
}

export interface AttendanceHistory {
  id: string
  student_id: string
  class_id: string
  attendance_date: string
  status: string
  reason?: string
  recorded_by?: string
  created_at?: string
  first_name?: string
  last_name?: string
}

export interface AttendanceHistoryPaginatedResponse {
  data: AttendanceHistory[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export async function listAttendanceHistoryPaginated(params: {
  establishmentId: string
  page: number
  pageSize: number
  classId?: string | null
  studentId?: string | null
  from?: string
  to?: string
}): Promise<AttendanceHistoryPaginatedResponse> {
  const { data: result, error } = await supabaseBrowser.rpc("list_attendance_history_paginated", {
    p_establishment_id: params.establishmentId,
    p_page: params.page,
    p_page_size: params.pageSize,
    p_class_id: params.classId || null,
    p_student_id: params.studentId || null,
    p_from: params.from || null,
    p_to: params.to || null,
  })

  if (error) throw new Error("Impossible de charger l'historique des présences.")
  return result as AttendanceHistoryPaginatedResponse
}

export async function recordAttendance(data: {
  establishmentId: string
  studentId: string
  classId: string
  date: string
  status: string
  reason?: string
}): Promise<string> {
  const { data: result, error } = await supabaseBrowser.rpc("record_attendance", {
    p_establishment_id: data.establishmentId,
    p_student_id: data.studentId,
    p_class_id: data.classId,
    p_date: data.date,
    p_status: data.status,
    p_reason: data.reason || null,
  })

  if (error) throw new Error("Impossible d'enregistrer la présence.")
  return result as string
}

export async function recordAbsence(data: Partial<Absence>): Promise<Absence> {
  const { data: result, error } = await supabaseBrowser
    .from("absences")
    .insert({
      establishment_id: data.establishment_id,
      student_id: data.student_id,
      class_id: data.class_id,
      date: data.date || new Date().toISOString(),
      status: data.status || "absent",
      reason: data.reason,
      justified: data.justified || false,
      justified_by: data.justified_by,
      notes: data.notes,
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible d'enregistrer l'absence.")
  }

  return result as Absence
}

export async function updateAbsence(absenceId: string, data: Partial<Absence>): Promise<Absence> {
  const { data: result, error } = await supabaseBrowser
    .from("absences")
    .update({
      status: data.status,
      reason: data.reason,
      justified: data.justified,
      justified_by: data.justified_by,
      notes: data.notes,
    })
    .eq("id", absenceId)
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de modifier l'absence.")
  }

  return result as Absence
}

export async function getAbsencesByStudent(studentId: string, dateRange?: { start: string; end: string }): Promise<Absence[]> {
  let query = supabaseBrowser
    .from("absences")
    .select("*")
    .eq("student_id", studentId)

  if (dateRange) {
    query = query.gte("date", dateRange.start).lte("date", dateRange.end)
  }

  const { data, error } = await query.order("date", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les absences de l'élève.")
  }

  return (data ?? []) as Absence[]
}

export async function getAbsencesByClass(classId: string, date?: string): Promise<AbsenceWithStudent[]> {
  let query = supabaseBrowser
    .from("absences")
    .select("*, student:students(id, first_name, last_name)")
    .eq("class_id", classId)

  if (date) {
    query = query.eq("date", date)
  }

  const { data, error } = await query.order("date", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les absences de la classe.")
  }

  return (data ?? []) as AbsenceWithStudent[]
}

export async function getAbsencesForDate(establishmentId: string, date: string): Promise<AbsenceWithStudent[]> {
  const { data, error } = await supabaseBrowser
    .from("absences")
    .select("*, student:students(id, first_name, last_name)")
    .eq("establishment_id", establishmentId)
    .eq("date", date)
    .order("class_id", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger les absences de la journée.")
  }

  return (data ?? []) as AbsenceWithStudent[]
}
