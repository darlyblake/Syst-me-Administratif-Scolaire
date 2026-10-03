import { supabaseBrowser } from "@/lib/supabase/client"

export type PointageAction = "arrival" | "departure" | "course_start" | "course_end"

export type PointageSettings = {
  id: string
  establishment_id: string
  academic_year_id: string | null
  early_arrival_tolerance_minutes: number
  full_credit_threshold_minutes: number
  full_credit_hours: number
  partial_credit_hours: number
  allow_teacher_close: boolean
  require_admin_closure_after_schedule_end: boolean
  alert_missing_lesson_after_minutes: number
  alerts_enabled: boolean
  code_enabled: boolean
  qr_enabled: boolean
}

export type PointageAlert = {
  alert_type: string
  teacher_id: string
  timetable_slot_id: string
  lesson_attendance_id: string | null
  scheduled_start: string
  scheduled_end: string
  status: string
  late_minutes: number
}

export type PointageResult = {
  event_type: string
  attendance_id?: string
  staff_type?: string
  staff_id?: string
  teacher_id?: string
  timetable_slot_id?: string
  class_id?: string
  subject_id?: string
  scheduled_start?: string
  scheduled_end?: string
  late_minutes?: number
  credited_hours?: number
  ended_time?: string
  actual_duration_minutes?: number
  status?: string
}

class ServicePointage {
  async enregistrerParCode(
    establishmentId: string,
    action: PointageAction,
    code: string,
  ): Promise<PointageResult> {
    const { data, error } = await supabaseBrowser.rpc("pointage_record_by_code", {
      p_establishment_id: establishmentId,
      p_event_type: action,
      p_code: code.trim().toUpperCase(),
    })
    if (error) throw error
    return data as PointageResult
  }

  async creerSessionQr(
    establishmentId: string,
    terminalLabel = "Ordinateur central",
    ttlSeconds = 60,
  ): Promise<{ token: string; expires_at: string }> {
    const { data, error } = await supabaseBrowser.rpc("pointage_create_qr_session", {
      p_establishment_id: establishmentId,
      p_terminal_label: terminalLabel,
      p_ttl_seconds: ttlSeconds,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    return row as { token: string; expires_at: string }
  }

  async obtenirCoursActuelEnseignant(establishmentId: string) {
    const { data, error } = await supabaseBrowser.rpc("pointage_current_teacher_course", {
      p_establishment_id: establishmentId,
    })
    if (error) throw error
    return Array.isArray(data) ? data[0] ?? null : data
  }

  async commencerCoursParQr(token: string): Promise<PointageResult> {
    const { data, error } = await supabaseBrowser.rpc("pointage_start_teacher_course_by_qr", {
      p_qr_token: token,
    })
    if (error) throw error
    return data as PointageResult
  }

  async terminerCoursParQr(token: string): Promise<PointageResult> {
    const { data, error } = await supabaseBrowser.rpc("pointage_finish_teacher_course_by_qr", {
      p_qr_token: token,
    })
    if (error) throw error
    return data as PointageResult
  }

  async obtenirAlertes(establishmentId: string, date?: string): Promise<PointageAlert[]> {
    const { data, error } = await supabaseBrowser.rpc("pointage_get_alerts", {
      p_establishment_id: establishmentId,
      p_date: date ?? null,
    })
    if (error) throw error
    return (data ?? []) as PointageAlert[]
  }

  async cloturerCours(id: string, motif?: string): Promise<PointageResult> {
    const { data, error } = await supabaseBrowser.rpc("pointage_close_lesson_admin", {
      p_attendance_id: id,
      p_reason: motif ?? null,
    })
    if (error) throw error
    return data as PointageResult
  }

  async obtenirParametres(
    establishmentId: string,
    academicYearId?: string | null,
  ): Promise<PointageSettings | null> {
    let query = supabaseBrowser
      .from("pointage_settings")
      .select("*")
      .eq("establishment_id", establishmentId)

    if (academicYearId) {
      query = query.eq("academic_year_id", academicYearId)
    } else {
      query = query.is("academic_year_id", null)
    }

    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data as PointageSettings | null
  }

  async enregistrerParametres(input: {
    establishmentId: string
    academicYearId: string
    earlyArrivalToleranceMinutes: number
    fullCreditThresholdMinutes: number
    fullCreditHours: number
    partialCreditHours: number
    allowTeacherClose: boolean
    requireAdminClosureAfterScheduleEnd: boolean
    alertMissingLessonAfterMinutes: number
    alertsEnabled: boolean
    codeEnabled: boolean
    qrEnabled: boolean
  }): Promise<string> {
    const { data, error } = await supabaseBrowser.rpc("pointage_upsert_settings", {
      p_establishment_id: input.establishmentId,
      p_academic_year_id: input.academicYearId,
      p_early_arrival_tolerance_minutes: input.earlyArrivalToleranceMinutes,
      p_full_credit_threshold_minutes: input.fullCreditThresholdMinutes,
      p_full_credit_hours: input.fullCreditHours,
      p_partial_credit_hours: input.partialCreditHours,
      p_allow_teacher_close: input.allowTeacherClose,
      p_require_admin_closure_after_schedule_end: input.requireAdminClosureAfterScheduleEnd,
      p_alert_missing_lesson_after_minutes: input.alertMissingLessonAfterMinutes,
      p_alerts_enabled: input.alertsEnabled,
      p_code_enabled: input.codeEnabled,
      p_qr_enabled: input.qrEnabled,
    })
    if (error) throw error
    return data as string
  }

  async genererCode(
    establishmentId: string,
    staffType: "teacher" | "staff",
    staffId: string,
  ): Promise<string> {
    const { data, error } = await supabaseBrowser.rpc("pointage_issue_code", {
      p_establishment_id: establishmentId,
      p_staff_type: staffType,
      p_staff_id: staffId,
    })
    if (error) throw error
    return data as string
  }

  async obtenirPointagesPersonnel(establishmentId: string, date: string) {
    const { data, error } = await supabaseBrowser
      .from("staff_attendance")
      .select("id,staff_id,staff_type,attendance_date,check_in,check_out,status,notes")
      .eq("establishment_id", establishmentId)
      .eq("attendance_date", date)
      .order("check_in", { ascending: true })
    if (error) throw error
    return data ?? []
  }

  async obtenirCoursPointes(establishmentId: string, date: string) {
    const { data, error } = await supabaseBrowser
      .from("teacher_lesson_attendance")
      .select("id,teacher_id,timetable_slot_id,attendance_date,started_time,ended_time,status,scheduled_hours,counted_hours,credited_minutes,late_minutes,start_method,end_method,actual_duration_minutes")
      .eq("establishment_id", establishmentId)
      .eq("attendance_date", date)
      .order("started_time", { ascending: true })
    if (error) throw error
    return data ?? []
  }
}

export const servicePointage = new ServicePointage()
