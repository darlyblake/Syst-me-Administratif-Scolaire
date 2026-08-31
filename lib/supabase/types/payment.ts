export type PaymentPayerType = "family" | "state" | "other"
export type PaymentCategory = "registration" | "tuition" | "option" | "caution" | "other"

export interface PaymentSchedule {
  id: string
  enrollment_id: string
  installment_number: number
  label: string
  amount: number
  amount_due?: number
  amount_paid?: number
  due_date?: string | null
  payer_type?: PaymentPayerType
  category?: PaymentCategory
  is_refundable?: boolean
  is_paid?: boolean
  paid_date?: string | null
  created_at?: string
}

export interface Payment {
  id: string
  enrollment_id: string
  schedule_id?: string | null
  amount: number
  payment_date: string
  payment_method?: "cash" | "check" | "transfer" | "mobile_money" | string
  payer_type?: PaymentPayerType
  category?: PaymentCategory
  is_refundable?: boolean
  reference?: string | null
  notes?: string | null
  created_at?: string
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  schedule_id: string
  amount: number
  created_at?: string
}

export interface PaymentSummary {
  total_due: number
  paid: number
  pending: number
  overdue: number
  parent_due?: number
  state_expected?: number
  state_paid?: number
}
