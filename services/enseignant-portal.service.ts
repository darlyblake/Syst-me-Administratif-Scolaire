import { supabaseBrowser } from "@/lib/supabase/client"

export type TeacherDashboard = { establishments: number; classes: number; students: number; assessments: number }
export type TeacherClass = { class_id: string; class_name: string; establishment_id: string; establishment_name: string; subject_id: string; subject_name: string; teacher_id: string; weekly_hours: number | null }
export type TeacherStudent = { student_id: string; first_name: string; last_name: string; student_number: string | null; class_id: string; class_name: string; establishment_id: string; establishment_name: string }
export type TeacherScheduleSlot = { slot_id: string; establishment_id: string; establishment_name: string; class_id: string; class_name: string; subject_id: string; subject_name: string; day_of_week: number; starts_at: string; ends_at: string; room: string | null }
export type TeacherContext = { teacher_id: string; profile_id: string; first_name: string; last_name: string; specialty: string | null; employee_number: string | null }
export type TeacherAssessment = { assessment_id: string; establishment_id: string; academic_year_id: string; academic_year_name: string; class_id: string; class_name: string; subject_id: string; subject_name: string; title: string; assessment_date: string; max_score: number; term: string | null; grade_count: number }
export type TeacherAssessmentStudent = { student_id: string; first_name: string; last_name: string; student_number: string | null; score: number | null; comment: string | null }
export type TeacherAttendanceStudent = { student_id: string; first_name: string; last_name: string; student_number: string | null; status: string | null; reason: string | null }
export type TeacherClassOverview = { class_id: string; class_name: string; student_count: number; assessment_count: number; graded_count: number; average_percentage: number | null; attendance_present: number; attendance_absent: number; attendance_late: number; attendance_excused: number }

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
  getAssessmentStudents: (assessmentId: string) => rpc<TeacherAssessmentStudent[]>("teacher_assessment_students", { p_assessment_id: assessmentId }),
  recordGrade: (assessmentId: string, studentId: string, score: number, comment?: string) => rpc<string>("record_grade", { p_assessment_id: assessmentId, p_student_id: studentId, p_score: score, p_comment: comment || null }),
  getAttendance: (establishmentId: string, classId: string, date: string) => rpc<TeacherAttendanceStudent[]>("teacher_attendance_for_date", { p_establishment_id: establishmentId, p_class_id: classId, p_date: date }),
  recordAttendance: (establishmentId: string, studentId: string, classId: string, date: string, status: string, reason?: string) => rpc<string>("record_attendance", { p_establishment_id: establishmentId, p_student_id: studentId, p_class_id: classId, p_date: date, p_status: status, p_reason: reason || null }),
  getClassOverview: (establishmentId: string, classId: string) => rpc<TeacherClassOverview[]>("teacher_class_overview", { p_establishment_id: establishmentId, p_class_id: classId }),
}
