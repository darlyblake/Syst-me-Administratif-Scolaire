export type PaymentMode = "monthly" | "installments" | "single"

export interface Establishment {
  id: string
  name: string
  legal_name?: string | null
  short_name?: string | null
  establishment_type?: string | null
  code?: string | null
  slogan?: string | null
  email?: string | null
  phone?: string | null
  alternate_phone?: string | null
  website?: string | null
  address_line1?: string | null
  address_line2?: string | null
  postal_code?: string | null
  city?: string | null
  province?: string | null
  country?: string | null
  country_code?: string | null
  currency_code?: string | null
  currency_name?: string | null
  currency_symbol?: string | null
  timezone?: string | null
  logo_url?: string | null
  seal_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface AcademicYear {
  id: string
  establishment_id: string
  name: string
  start_date?: string | null
  end_date?: string | null
  status?: "draft" | "active" | "closed"
  created_at?: string
}

export interface EducationCycle {
  id: string
  establishment_id: string
  name: string
  code?: string
  display_order?: number
  active?: boolean
  created_at?: string
}

export interface GradeLevel {
  id: string
  cycle_id: string
  name: string
  code?: string
  display_order?: number
  active?: boolean
  created_at?: string
}

export interface SchoolClass {
  id: string
  establishment_id: string
  grade_level_id: string
  name: string
  code?: string
  capacity?: number
  active?: boolean
  created_at?: string
}

export interface AcademicStructureCycle extends EducationCycle {
  grade_levels?: AcademicStructureLevel[]
}

export interface AcademicStructureLevel extends GradeLevel {
  school_classes?: Pick<SchoolClass, "id" | "name">[]
}
