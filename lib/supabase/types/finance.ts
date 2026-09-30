export type FinancePaymentState = 'paid' | 'partial' | 'partial_late' | 'late' | 'pending';

export interface FinanceStudentPaymentBoardRow {
  enrollment_id: string;
  establishment_id: string;
  student_id: string;
  class_id: string | null;
  academic_year_id: string;
  funding_source: string | null;
  state_expected_amount: number;
  parent_payable_amount: number;
  
  schedule_id: string;
  installment_number: number;
  label: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  remaining_amount: number;
  status: string;
  payment_state: FinancePaymentState;
  days_overdue: number;
}

export interface FinanceMovementRow {
  id: string;
  establishment_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  direction: 'credit' | 'debit';
  reference: string | null;
  created_by: string | null;
  created_at: string;
  source_type: string | null;
  source_id: string | null;
}

export interface FinancePaymentHistoryRow {
  payment_id: string;
  establishment_id: string;
  enrollment_id: string;
  payment_date: string;
  payment_amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  payer_type: string | null;
  category: string | null;
  
  allocation_id: string;
  allocated_amount: number;
  
  schedule_id: string;
  installment_number: number;
  schedule_label: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  schedule_status: string;
  schedule_remaining: number;
}

export interface FinanceMovementSummary {
  total_in: number;
  total_out: number;
  balance: number;
}

export interface FinancePaymentSummary {
  expected: number;
  paid: number;
  remaining: number;
  overdue: number;
  paid_schedules: number;
  pending_schedules: number;
  family_expected: number;
  family_paid: number;
  family_remaining: number;
  state_expected: number;
  state_paid: number;
  state_remaining: number;
  state_schedules: number;
}
