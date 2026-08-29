export interface Teacher {
  id: string
  establishment_id: string
  first_name: string
  last_name: string
  full_name?: string | null
  email?: string | null
  phone?: string | null
  specialization?: string | null
  hire_date?: string | null
  status?: "active" | "inactive" | "on_leave" | string
  biography?: string | null
  created_at?: string
  updated_at?: string
}

export interface TeacherWithClasses extends Teacher {
  assigned_classes?: Array<{
    id: string
    name: string
  }>
  subject_count?: number
}
