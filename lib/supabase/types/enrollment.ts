export type FundingSource = "family" | "state" | "other"

export interface Enrollment {
  id: string
  establishment_id: string
  academic_year_id: string
  student_id: string
  class_id: string
  grade_level_id: string
  cycle_id: string
  tuition_plan_id: string
  funding_source?: FundingSource
  state_expected_amount?: number
  parent_payable_amount?: number
  enrollment_date?: string
  status?: "active" | "completed" | "inactive"
  created_at?: string
  updated_at?: string
}

export interface EnrollmentWithRelations extends Enrollment {
  student?: { id: string; first_name: string; last_name: string }
  class?: { id: string; name: string }
  tuition_plan?: { id: string; annual_amount: number; registration_fee: number; payment_mode: string }
}
