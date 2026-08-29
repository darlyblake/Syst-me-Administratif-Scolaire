export type AbsenceStatus = "present" | "absent" | "late" | "justified"

export interface Absence {
  id: string
  establishment_id: string
  student_id: string
  class_id: string
  date: string
  status: AbsenceStatus
  reason?: string | null
  justified?: boolean
  justified_by?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface AbsenceWithStudent extends Absence {
  student?: {
    id: string
    first_name: string
    last_name: string
  }
}

export interface AbsenceSummary {
  student_id: string
  total_absences: number
  total_lates: number
  total_justified: number
  attendance_rate: number
}
