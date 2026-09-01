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

function toAbsence(record: any): Absence {
  return {
    id: record.id,
    establishment_id: record.establishment_id,
    student_id: record.student_id,
    class_id: record.class_id,
    date: record.attendance_date,
    status: record.status,
    reason: record.reason ?? null,
    justified: record.status === "justified",
    justified_by: null,
    notes: null,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }
}

export async function recordAbsence(data: Partial<Absence>): Promise<Absence> {
  if (!data.establishment_id || !data.student_id || !data.class_id) {
    throw new Error("Les informations de l'établissement, de l'élève et de la classe sont requises.")
  }

  const date = data.date ? data.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const { data: id, error } = await supabaseBrowser.rpc("record_attendance", {
    p_establishment_id: data.establishment_id,
    p_student_id: data.student_id,
    p_class_id: data.class_id,
    p_date: date,
    p_status: data.status || "absent",
    p_reason: data.reason || null,
  })

  if (error) throw new Error("Impossible d'enregistrer l'absence.")

  return {
    id: id as string,
    establishment_id: data.establishment_id,
    student_id: data.student_id,
    class_id: data.class_id,
    date,
    status: data.status || "absent",
    reason: data.reason ?? null,
    justified: data.status === "justified",
    justified_by: null,
    notes: data.notes ?? null,
  }
}

export async function updateAbsence(absenceId: string, data: Partial<Absence>): Promise<Absence> {
  const { data: result, error } = await supabaseBrowser
    .from("attendance_records")
    .update({
      status: data.status,
      reason: data.reason,
    })
    .eq("id", absenceId)
    .select("*")
    .single()

  if (error) throw new Error("Impossible de modifier l'absence.")
  return toAbsence(result)
}

export async function getAbsencesByStudent(studentId: string, dateRange?: { start: string; end: string }): Promise<Absence[]> {
  let query = supabaseBrowser
    .from("attendance_records")
    .select("*")
    .eq("student_id", studentId)
    .in("status", ["absent", "late", "justified"])

  if (dateRange) {
    query = query.gte("attendance_date", dateRange.start).lte("attendance_date", dateRange.end)
  }

  const { data, error } = await query.order("attendance_date", { ascending: false })

  if (error) throw new Error("Impossible de charger les absences de l'élève.")
  return (data ?? []).map(toAbsence)
}

export async function getAbsencesByClass(classId: string, date?: string): Promise<AbsenceWithStudent[]> {
  let query = supabaseBrowser
    .from("attendance_records")
    .select("*, student:students(id, first_name, last_name)")
    .eq("class_id", classId)
    .in("status", ["absent", "late", "justified"])

  if (date) query = query.eq("attendance_date", date)

  const { data, error } = await query.order("attendance_date", { ascending: false })

  if (error) throw new Error("Impossible de charger les absences de la classe.")
  return (data ?? []).map((record: any) => ({ ...toAbsence(record), student: record.student }))
}

export async function getAbsencesForDate(establishmentId: string, date: string): Promise<AbsenceWithStudent[]> {
  const { data, error } = await supabaseBrowser
    .from("attendance_records")
    .select("*, student:students(id, first_name, last_name)")
    .eq("establishment_id", establishmentId)
    .eq("attendance_date", date)
    .in("status", ["absent", "late", "justified"])
    .order("class_id", { ascending: true })

  if (error) throw new Error("Impossible de charger les absences de la journée.")
  return (data ?? []).map((record: any) => ({ ...toAbsence(record), student: record.student }))
}
