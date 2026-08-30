export interface Student {
  id: string
  establishment_id: string
  academic_year_id?: string | null
  first_name: string
  last_name: string
  student_number?: string | null
  full_name?: string | null
  gender?: string | null
  sex?: string | null
  birth_date?: string | null
  date_of_birth?: string | null
  place_of_birth?: string | null
  phone?: string | null
  email?: string | null
  status?: "active" | "inactive" | "transferred" | "archived" | string
  class_id?: string | null
  grade_level_id?: string | null
  cycle_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface StudentFilters {
  search?: string
  classId?: string | null
  gradeLevelId?: string | null
  academicYearId?: string | null
  status?: string | null
}
