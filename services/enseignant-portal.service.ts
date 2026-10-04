import { supabaseBrowser } from "@/lib/supabase/client"

export type TeacherDashboard = { establishments: number; classes: number; students: number; assessments: number }
export type TeacherClass = { class_id: string; class_name: string; establishment_id: string; establishment_name: string; subject_id: string; subject_name: string; teacher_id: string; weekly_hours: number | null }
export type TeacherStudent = { student_id: string; first_name: string; last_name: string; student_number: string | null; class_id: string; class_name: string; establishment_id: string; establishment_name: string }
export type TeacherScheduleSlot = { slot_id: string; establishment_id: string; establishment_name: string; class_id: string; class_name: string; subject_id: string; subject_name: string; day_of_week: number; starts_at: string; ends_at: string; room: string | null }
export type TeacherContext = { teacher_id: string; profile_id: string; first_name: string; last_name: string; specialty: string | null; employee_number: string | null }
export type TeacherAssessment = { assessment_id: string; establishment_id: string; academic_year_id: string; academic_year_name: string; class_id: string; class_name: string; subject_id: string; subject_name: string; title: string; assessment_date: string; max_score: number; term: string | null; grade_count: number }
export type TeacherGradePeriod = { id: string; academic_year_id: string; period_number: number; label: string; period_type: string; start_date: string; end_date: string; entry_open: boolean; is_current: boolean }
export type TeacherAssessmentStudent = { student_id: string; first_name: string; last_name: string; student_number: string | null; score: number | null; comment: string | null }
export type TeacherAttendanceStudent = { student_id: string; first_name: string; last_name: string; student_number: string | null; status: string | null; reason: string | null }\nexport type TeacherAttendanceHistoryBySlotRow = { id: string; student_id: string; class_id: string; class_name: string; attendance_date: string; status: "present" | "absent" | "late" | "excused"; reason: string | null; first_name: string; last_name: string; timetable_slot_id: string; starts_at: string; ends_at: string; subject_name: string }
export type TeacherClassOverview = { class_id: string; class_name: string; student_count: number; assessment_count: number; graded_count: number; average_percentage: number | null; attendance_present: number; attendance_absent: number; attendance_late: number; attendance_excused: number }
export type TeacherNotification = { id: string; establishment_id: string; type: string; title: string; body: string | null; entity_type: string | null; entity_id: string | null; read_at: string | null; created_at: string }
export type TeacherProfile = { profile_id: string; first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null; teacher_id: string; employee_number: string | null; email: string | null; specialty: string | null; hire_date: string | null }
export type TeacherAttendanceHistoryRow = { id: string; student_id: string; class_id: string; attendance_date: string; status: "present" | "absent" | "late" | "excused"; reason: string | null; recorded_by: string | null; created_at: string; first_name: string; last_name: string }
export type TeacherAttendanceHistory = { data: TeacherAttendanceHistoryRow[]; page: number; page_size: number; total: number; total_pages: number }
export type TeacherAttendanceStatistics = { total: number; present: number; absent: number; late: number; excused: number; presence_rate: number }
export type TeacherLessonEntry = { id: string; establishment_id: string; academic_year_id: string; timetable_slot_id: string; teacher_id: string; lesson_date: string; class_id: string; class_name: string; subject_id: string; subject_name: string; starts_at: string; ends_at: string; room: string | null; topic: string; content: string; activities: string | null; created_at: string; updated_at: string }
export type TeacherHomework = { id: string; timetable_slot_id: string; lesson_entry_id: string | null; class_id: string; class_name: string; subject_id: string; subject_name: string; lesson_date: string; title: string; instructions: string; due_date: string | null; active: boolean; created_at: string; updated_at: string }

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseBrowser.rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const enseignantPortalService = {
  getDashboard: () => rpc<TeacherDashboard>("teacher_dashboard"),
  getContext: (establishmentId: string) => rpc<TeacherContext[]>("teacher_context", { p_establishment_id: establishmentId }),
  getClasses: (establishmentId: string) => rpc<TeacherClass[]>("teacher_classes", { p_establishment_id: establishmentId }),
  getStudents: (establishmentId: string) => rpc<TeacherStudent[]>("teacher_students", { p_establishment_id: establishmentId }),
  getSchedule: (establishmentId: string) => rpc<TeacherScheduleSlot[]>("teacher_schedule", { p_establishment_id: establishmentId }),
  getEstablishments: () => rpc<Array<{ establishment_id: string; establishment_name: string; status: string; joined_at: string }>>("teacher_establishments_for_user"),
  getAssessments: (establishmentId: string) => rpc<TeacherAssessment[]>("teacher_assessments", { p_establishment_id: establishmentId }),
  getGradePeriods: (establishmentId: string) => rpc<TeacherGradePeriod[]>("teacher_grade_periods", { p_establishment_id: establishmentId }),
  createAssessment: (input: {
    establishmentId: string
    academicYearId: string
    classId: string
    subjectId: string
    title: string
    assessmentDate: string
    maxScore: number
    term?: string
  }) => rpc<string>("teacher_create_assessment", {
    p_establishment_id: input.establishmentId,
    p_academic_year_id: input.academicYearId,
    p_class_id: input.classId,
    p_subject_id: input.subjectId,
    p_title: input.title,
    p_assessment_date: input.assessmentDate,
    p_max_score: input.maxScore,
    p_term: input.term || null,
  }),
  getAssessmentStudents: (assessmentId: string) => rpc<TeacherAssessmentStudent[]>("teacher_assessment_students", { p_assessment_id: assessmentId }),
  recordGrade: (assessmentId: string, studentId: string, score: number, comment?: string) => rpc<string>("record_grade", { p_assessment_id: assessmentId, p_student_id: studentId, p_score: score, p_comment: comment || null }),
  getAttendance: (establishmentId: string, classId: string, date: string) => rpc<TeacherAttendanceStudent[]>("teacher_attendance_for_date", { p_establishment_id: establishmentId, p_class_id: classId, p_date: date }),
  recordAttendanceBatch: (establishmentId: string, classId: string, timetableSlotId: string, date: string, records: Array<{ student_id: string; status: string; reason?: string }>) => rpc<number>("teacher_record_attendance_batch", { p_establishment_id: establishmentId, p_class_id: classId, p_timetable_slot_id: timetableSlotId, p_date: date, p_records: records }),
  getClassOverview: (establishmentId: string, classId: string) => rpc<TeacherClassOverview[]>("teacher_class_overview", { p_establishment_id: establishmentId, p_class_id: classId }),
  getNotifications: (limit = 30) => rpc<TeacherNotification[]>("teacher_notifications", { p_limit: limit }),
  markNotificationRead: (notificationId: string) => rpc<boolean>("teacher_mark_notification_read", { p_notification_id: notificationId }),
  markAllNotificationsRead: () => rpc<number>("teacher_mark_all_notifications_read"),
  getProfile: () => rpc<TeacherProfile[]>("teacher_profile"),
  updateProfile: (firstName: string, lastName: string, phone: string) => rpc<boolean>("teacher_update_profile", { p_first_name: firstName, p_last_name: lastName, p_phone: phone }),
  getAttendanceHistory: (establishmentId: string, page = 1, pageSize = 30, classId?: string, studentId?: string, from?: string, to?: string) => rpc<TeacherAttendanceHistory>("list_attendance_history_paginated", { p_establishment_id: establishmentId, p_page: page, p_page_size: pageSize, p_class_id: classId || null, p_student_id: studentId || null, p_from: from || null, p_to: to || null }),
  getAttendanceStatistics: (establishmentId: string, from: string, to: string, classId?: string) => rpc<TeacherAttendanceStatistics>("get_attendance_statistics", { p_establishment_id: establishmentId, p_from: from, p_to: to, p_class_id: classId || null }),\n  getAttendanceHistoryBySlot: (establishmentId: string, timetableSlotId: string, classId?: string, from?: string, to?: string) => rpc<TeacherAttendanceHistoryBySlotRow[]>("teacher_attendance_history_by_slot", { p_establishment_id: establishmentId, p_timetable_slot_id: timetableSlotId, p_class_id: classId || null, p_from: from || null, p_to: to || null }),
  getLessonEntries: (establishmentId: string, from?: string, to?: string) => rpc<TeacherLessonEntry[]>("teacher_lesson_entries", { p_establishment_id: establishmentId, p_from: from || null, p_to: to || null }),
  saveLessonEntry: (establishmentId: string, slotId: string, lessonDate: string, topic: string, content: string, activities?: string) => rpc<string>("teacher_save_lesson_entry", { p_establishment_id: establishmentId, p_timetable_slot_id: slotId, p_lesson_date: lessonDate, p_topic: topic, p_content: content, p_activities: activities || null }),
  getHomework: (establishmentId: string, from?: string, to?: string) => rpc<TeacherHomework[]>("teacher_homework", { p_establishment_id: establishmentId, p_from: from || null, p_to: to || null }),
  saveHomework: (establishmentId: string, slotId: string, lessonEntryId: string | null, title: string, instructions: string, dueDate?: string) => rpc<string>("teacher_save_homework", { p_establishment_id: establishmentId, p_timetable_slot_id: slotId, p_lesson_entry_id: lessonEntryId, p_title: title, p_instructions: instructions, p_due_date: dueDate || null }),
}
