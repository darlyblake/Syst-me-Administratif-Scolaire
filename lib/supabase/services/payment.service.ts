import { supabaseBrowser } from "@/lib/supabase/client"
import type { Payment, PaymentSchedule, PaymentAllocation, PaymentSummary } from "@/lib/supabase/types"

export async function getPaymentSchedule(enrollmentId: string): Promise<PaymentSchedule[]> {
  const { data, error } = await supabaseBrowser
    .from("payment_schedules")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("installment_number", { ascending: true })

  if (error) {
    throw new Error("Impossible de charger l'échéancier.")
  }

  return (data ?? []) as PaymentSchedule[]
}

export async function createPayment(data: Partial<Payment>): Promise<Payment> {
  const { data: result, error } = await supabaseBrowser
    .from("payments")
    .insert({
      enrollment_id: data.enrollment_id,
      schedule_id: data.schedule_id,
      amount: data.amount,
      payment_date: data.payment_date || new Date().toISOString(),
      payment_method: data.payment_method,
      reference: data.reference,
      notes: data.notes,
    })
    .select()
    .single()

  if (error) {
    throw new Error("Impossible de créer le paiement.")
  }

  return result as Payment
}

export async function getPayments(enrollmentId: string): Promise<Payment[]> {
  const { data, error } = await supabaseBrowser
    .from("payments")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("payment_date", { ascending: false })

  if (error) {
    throw new Error("Impossible de charger les paiements.")
  }

  return (data ?? []) as Payment[]
}

export async function getPaymentSummary(enrollmentId: string): Promise<PaymentSummary> {
  // Get the enrollment and tuition plan to calculate totals
  const { data: enrollment, error: enrollmentError } = await supabaseBrowser
    .from("enrollments")
    .select("tuition_plan_id")
    .eq("id", enrollmentId)
    .single()

  if (enrollmentError) {
    throw new Error("Impossible de charger l'inscription.")
  }

  const { data: tuitionPlan, error: tuitionError } = await supabaseBrowser
    .from("tuition_plans")
    .select("annual_amount, registration_fee")
    .eq("id", enrollment.tuition_plan_id)
    .single()

  if (tuitionError) {
    throw new Error("Impossible de charger le plan de scolarité.")
  }

  const totalDue = (tuitionPlan.annual_amount || 0) + (tuitionPlan.registration_fee || 0)

  // Get paid amount
  const { data: payments, error: paymentsError } = await supabaseBrowser
    .from("payments")
    .select("amount")
    .eq("enrollment_id", enrollmentId)

  if (paymentsError) {
    throw new Error("Impossible de charger les paiements.")
  }

  const paid = (payments ?? []).reduce((sum, p) => sum + (p.amount || 0), 0)
  const pending = Math.max(0, totalDue - paid)

  return {
    total_due: totalDue,
    paid,
    pending,
    overdue: 0, // Would need date comparison logic
  }
}
