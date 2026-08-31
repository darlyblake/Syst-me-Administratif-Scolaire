import { supabaseBrowser } from "@/lib/supabase/client"
import type { Payment, PaymentSchedule, PaymentAllocation, PaymentSummary } from "@/lib/supabase/types"

export interface PaymentPage {
  data: Payment[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface EstablishmentPaymentSummary {
  expected: number
  paid: number
  remaining: number
  overdue: number
  paid_schedules: number
  pending_schedules: number
  family_expected: number
  family_paid: number
  family_remaining: number
  state_expected: number
  state_paid: number
  state_remaining: number
  state_schedules: number
}

export async function getPaymentSummaryByEstablishment(establishmentId: string, academicYearId: string): Promise<EstablishmentPaymentSummary> {
  const { data, error } = await supabaseBrowser.rpc("get_payment_summary", {
    p_establishment_id: establishmentId,
    p_academic_year_id: academicYearId,
  })

  if (error) throw new Error("Impossible de charger le résumé financier.")
  return data as EstablishmentPaymentSummary
}

export async function listPaymentsPaginated(data: {
  establishmentId: string
  page?: number
  pageSize?: number
  studentId?: string | null
  from?: string | null
  to?: string | null
}): Promise<PaymentPage> {
  const { data: result, error } = await supabaseBrowser.rpc("list_payments_paginated", {
    p_establishment_id: data.establishmentId,
    p_page: data.page ?? 1,
    p_page_size: data.pageSize ?? 25,
    p_student_id: data.studentId || null,
    p_from: data.from || null,
    p_to: data.to || null,
  })

  if (error) throw new Error("Impossible de charger les paiements.")
  const value = (result && typeof result === "object" ? result : {}) as Record<string, unknown>
  return {
    data: Array.isArray(value.data) ? value.data as Payment[] : [],
    page: typeof value.page === "number" ? value.page : data.page ?? 1,
    page_size: typeof value.page_size === "number" ? value.page_size : data.pageSize ?? 25,
    total: typeof value.total === "number" ? value.total : 0,
    total_pages: typeof value.total_pages === "number" ? value.total_pages : 0,
  }
}

export async function createPaymentWithAllocations(data: {
  enrollmentId: string
  amount: number
  reference?: string
  method: string
  notes?: string
  allocations: Array<{ schedule_id: string; amount: number }>
}): Promise<string> {
  const { data: result, error } = await supabaseBrowser.rpc("create_payment_with_allocations", {
    p_enrollment_id: data.enrollmentId,
    p_amount: data.amount,
    p_reference: data.reference || null,
    p_method: data.method,
    p_notes: data.notes || null,
    p_allocations: data.allocations,
  })

  if (error) throw new Error("Impossible d'enregistrer le paiement.")
  return result as string
}

export async function getPaymentSchedule(enrollmentId: string): Promise<PaymentSchedule[]> {
  const { data, error } = await supabaseBrowser
    .from("payment_schedules")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("installment_number", { ascending: true })

  if (error) throw new Error("Impossible de charger l'échéancier.")

  return (data ?? []) as PaymentSchedule[]
}

export async function getPayments(enrollmentId: string): Promise<Payment[]> {
  const { data, error } = await supabaseBrowser
    .from("payments")
    .select("*")
    .eq("enrollment_id", enrollmentId)
    .order("payment_date", { ascending: false })

  if (error) throw new Error("Impossible de charger les paiements.")

  return (data ?? []) as Payment[]
}

export async function getEnrollmentFinancialSummary(enrollmentId: string): Promise<PaymentSummary> {
  const { data, error } = await supabaseBrowser.rpc("get_enrollment_financial_summary", {
    p_enrollment_id: enrollmentId,
  })

  if (error) throw new Error("Impossible de charger le résumé financier.")
  return data as PaymentSummary
}
