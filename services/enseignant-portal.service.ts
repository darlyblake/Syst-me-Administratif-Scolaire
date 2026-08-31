import { supabaseBrowser } from "@/lib/supabase/client"

export type TeacherDashboard = {
  establishments: number
  classes: number
  students: number
  assessments: number
}

export type TeacherClass = {
  class_id: string
  class_name: string
  establishment_id: string
  establishment_name: string
  subject_id: string
  subject_name: string
  teacher_id: string
  weekly_hours: number | null
}

export type TeacherStudent = {
  student_id: string
  first_name: string
  last_name: string
  student_number: string | null
  class_id: string
  class_name: string
  establishment_id: string
  establishment_name: string
}

export type TeacherScheduleSlot = {
  slot_id: string
  establishment_id: string
  establishment_name: string
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
}

export type TeacherContext = {
  teacher_id: string
  profile_id: string
  first_name: string
  last_name: string
  specialty: string | null
  employee_number: string | null
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseBrowser.rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const enseignantPortalService = {
  getDashboard: () => rpc<TeacherDashboard>("teacher_dashboard"),

  getContext: (establishmentId: string) =>
    rpc<TeacherContext[]>("teacher_context", { p_establishment_id: establishmentId }),

  getClasses: (establishmentId: string) =>
    rpc<TeacherClass[]>("teacher_classes", { p_establishment_id: establishmentId }),

  getStudents: (establishmentId: string) =>
    rpc<TeacherStudent[]>("teacher_students", { p_establishment_id: establishmentId }),

  getSchedule: (establishmentId: string) =>
    rpc<TeacherScheduleSlot[]>("teacher_schedule", { p_establishment_id: establishmentId }),

  getEstablishments: () =>
    rpc<Array<{ establishment_id: string; establishment_name: string; status: string; joined_at: string }>>(
      "teacher_establishments_for_user",
    ),
}
