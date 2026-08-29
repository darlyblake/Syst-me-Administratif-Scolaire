export interface PaymentSchedule {
  id: string
  enrollment_id: string
  installment_number: number
  label: string
  amount: number
  due_date?: string | null
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
}
