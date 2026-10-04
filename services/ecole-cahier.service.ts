import { supabaseBrowser } from "@/lib/supabase/client"

export type SchoolCahierEntry = {
  id: string
  establishment_id: string
  academic_year_id: string
  academic_year_name: string
  timetable_slot_id: string
  teacher_id: string
  teacher_name: string
  lesson_date: string
  day_of_week: number
  starts_at: string
  ends_at: string
  room: string | null
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  topic: string
  content: string
  activities: string | null
  homework_id: string | null
  homework_title: string | null
  homework_instructions: string | null
  homework_due_date: string | null
  homework_active: boolean | null
  updated_at: string
}

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseBrowser.rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const ecoleCahierService = {
  getEntries: (
    establishmentId: string,
    filters?: { teacherId?: string; subjectId?: string; classId?: string; from?: string; to?: string },
  ) =>
    rpc<SchoolCahierEntry[]>("school_cahier_entries", {
      p_establishment_id: establishmentId,
      p_teacher_id: filters?.teacherId || null,
      p_subject_id: filters?.subjectId || null,
      p_class_id: filters?.classId || null,
      p_from: filters?.from || null,
      p_to: filters?.to || null,
    }),
}
