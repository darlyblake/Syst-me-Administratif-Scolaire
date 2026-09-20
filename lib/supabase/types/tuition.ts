export type PaymentMode = "monthly" | "installments" | "single"

export interface TuitionPlan {
  id: string
  establishment_id: string
  academic_year_id: string
  grade_level_id: string
  payment_mode: PaymentMode
  annual_tuition: number
  registration_fee?: number | null
  re_registration_fee?: number | null
  installment_count?: number | null
  active?: boolean
  created_at?: string
  updated_at?: string
}

export interface TuitionPlanInstallment {
  id: string
  tuition_plan_id: string
  installment_number: number
  label: string
  amount: number
  due_date: string | null
  created_at?: string
}

export interface TuitionPlanWithInstallments extends TuitionPlan {
  installments?: TuitionPlanInstallment[]
}

export interface EstablishmentFeeSettings {
  establishment_id: string
  registration_fee: number
  re_registration_fee: number
}

export interface EstablishmentFeeOverride {
  id: string
  establishment_id: string
  scope_type: 'cycle' | 'level'
  scope_id: string
  registration_fee?: number | null
  re_registration_fee?: number | null
}
