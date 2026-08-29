export type PaymentMode = "monthly" | "installments" | "single"

export interface TuitionPlan {
  id: string
  establishment_id: string
  academic_year_id: string
  grade_level_id: string
  payment_mode: PaymentMode
  annual_amount: number
  registration_fee: number
  installment_count?: number | null
  is_active?: boolean
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
