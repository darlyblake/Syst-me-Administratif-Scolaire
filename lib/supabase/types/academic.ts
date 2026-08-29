export type PaymentMode = "monthly" | "installments" | "single"

export interface Establishment {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

export interface AcademicYear {
  id: string
  establishment_id: string
  name: string
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  status?: "draft" | "active" | "closed"
  created_at?: string
}

export interface EducationCycle {
  id: string
  establishment_id: string
  name: string
  sort_order?: number
  is_active?: boolean
  created_at?: string
}

export interface GradeLevel {
  id: string
  cycle_id: string
  name: string
  sort_order?: number
  is_active?: boolean
  created_at?: string
}

export interface SchoolClass {
  id: string
  grade_level_id: string
  name: string
  student_count?: number
  is_active?: boolean
  created_at?: string
}

export interface AcademicStructureCycle extends EducationCycle {
  grade_levels?: AcademicStructureLevel[]
}

export interface AcademicStructureLevel extends GradeLevel {
  school_classes?: Pick<SchoolClass, "id" | "name">[]
}
