import { supabaseBrowser } from "@/lib/supabase/client"

export type TeacherLessonSlot = {
  slot_id: string
  establishment_id: string
  academic_year_id: string
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
}

export type TeacherLessonPointage = {
  id: string
  timetable_slot_id: string
  attendance_date: string
  started_time: string | null
  ended_time: string | null
  scheduled_hours: number
  counted_hours: number
  status: "scheduled" | "in_progress" | "completed" | "missed" | "exception" | "cancelled"
  exception_reason: string | null
}

export type TeacherWeeklySummary = {
  planned_hours: number
  counted_hours: number
  pointed_courses: number
  scheduled_courses: number
  missing_courses: number
  difference_hours: number
}

const db = supabaseBrowser as any
const POINTAGE_SELECT = "id,timetable_slot_id,attendance_date,started_time,ended_time,scheduled_hours,counted_hours,status,exception_reason"

export const enseignantPointageService = {
  async getContext(establishmentId: string) {
    const { data, error } = await db.rpc("teacher_context", { p_establishment_id: establishmentId })
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async getTeacherSchedule(establishmentId: string) {
    const { data, error } = await db.rpc("teacher_schedule", { p_establishment_id: establishmentId })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: any): TeacherLessonSlot => ({
      slot_id: row.slot_id,
      establishment_id: row.establishment_id,
      academic_year_id: row.academic_year_id,
      class_id: row.class_id,
      class_name: row.class_name ?? "Classe",
      subject_id: row.subject_id,
      subject_name: row.subject_name ?? "Matière",
      day_of_week: Number(row.day_of_week),
      starts_at: String(row.starts_at).slice(0, 5),
      ends_at: String(row.ends_at).slice(0, 5),
      room: row.room ?? null,
    }))
  },

  async getSchedule(establishmentId: string, academicYearId: string, teacherId?: string) {
    let query = db
      .from("timetable_slots")
      .select("id,establishment_id,academic_year_id,day_of_week,starts_at,ends_at,room,class_subjects!inner(class_id,subject_id,teacher_id,school_classes!inner(id,name),subjects!inner(id,name))")
      .eq("establishment_id", establishmentId)
      .eq("academic_year_id", academicYearId)
      .order("day_of_week")
      .order("starts_at")

    if (teacherId) query = query.eq("class_subjects.teacher_id", teacherId)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return (data ?? []).map((row: any): TeacherLessonSlot => ({
      slot_id: row.id,
      establishment_id: row.establishment_id,
      academic_year_id: row.academic_year_id,
      class_id: row.class_subjects?.class_id,
      class_name: row.class_subjects?.school_classes?.name ?? "Classe",
      subject_id: row.class_subjects?.subject_id,
      subject_name: row.class_subjects?.subjects?.name ?? "Matière",
      day_of_week: Number(row.day_of_week),
      starts_at: String(row.starts_at).slice(0, 5),
      ends_at: String(row.ends_at).slice(0, 5),
      room: row.room ?? null,
    }))
  },

  async getActiveAcademicYear(establishmentId: string) {
    const { data, error } = await db.from("academic_years").select("id,name,start_date,end_date,status").eq("establishment_id", establishmentId).eq("status", "active").maybeSingle()
    if (error) throw new Error(error.message)
    return data
  },

  async getWeeklySummary(establishmentId: string, teacherId: string, weekStart: string): Promise<TeacherWeeklySummary> {
    const { data, error } = await db.rpc("get_teacher_weekly_pointage", {
      p_establishment_id: establishmentId,
      p_teacher_id: teacherId,
      p_week_start: weekStart,
    })
    if (error) throw new Error(error.message)
    return data?.[0] ?? { planned_hours: 0, counted_hours: 0, pointed_courses: 0, scheduled_courses: 0, missing_courses: 0, difference_hours: 0 }
  },

  async getPointages(establishmentId: string, teacherId: string, from: string, to: string) {
    const { data, error } = await db.from("teacher_lesson_attendance").select(POINTAGE_SELECT).eq("establishment_id", establishmentId).eq("teacher_id", teacherId).gte("attendance_date", from).lte("attendance_date", to).order("attendance_date").order("started_time")
    if (error) throw new Error(error.message)
    return (data ?? []) as TeacherLessonPointage[]
  },

  async startLesson(input: { establishmentId: string; academicYearId: string; timetableSlotId: string; teacherId: string; attendanceDate: string; startedTime: string }) {
    const { data: userData } = await supabaseBrowser.auth.getUser()
    const { data, error } = await db.from("teacher_lesson_attendance").insert({
      establishment_id: input.establishmentId,
      academic_year_id: input.academicYearId,
      timetable_slot_id: input.timetableSlotId,
      teacher_id: input.teacherId,
      attendance_date: input.attendanceDate,
      started_time: input.startedTime,
      status: "in_progress",
      recorded_by: userData.user?.id ?? null,
    }).select(POINTAGE_SELECT).single()
    if (error) throw new Error(error.message)
    return data as TeacherLessonPointage
  },

  async endLesson(id: string, endedTime: string) {
    const { data, error } = await db.from("teacher_lesson_attendance").update({ ended_time: endedTime, status: "completed" }).eq("id", id).select(POINTAGE_SELECT).single()
    if (error) throw new Error(error.message)
    return data as TeacherLessonPointage
  },
}
