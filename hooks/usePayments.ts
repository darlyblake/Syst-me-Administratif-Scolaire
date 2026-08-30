"use client"

import { useState, useEffect, useCallback } from "react"
import { createPaymentWithAllocations, getEnrollmentFinancialSummary, getPayments, getPaymentSchedule } from "@/lib/supabase/services/payment.service"
import { getPaymentSummaryByEstablishment, listPaymentsPaginated } from "@/lib/supabase/services/payment.service"
import type { Payment, PaymentSchedule, PaymentSummary } from "@/lib/supabase/types"

interface UsePaymentsReturn {
  payments: Payment[]
  schedule: PaymentSchedule[]
  summary: PaymentSummary | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  isCreating: boolean
  create: (data: Parameters<typeof createPaymentWithAllocations>[0]) => Promise<string | null>
}

export function usePayments(enrollmentId: string): UsePaymentsReturn {
  const [payments, setPayments] = useState<Payment[]>([])
  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const loadData = async () => {
    if (!enrollmentId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [paymentsData, scheduleData, summaryData] = await Promise.all([
        getPayments(enrollmentId),
        getPaymentSchedule(enrollmentId),
        getEnrollmentFinancialSummary(enrollmentId),
      ])

      setPayments(paymentsData)
      setSchedule(scheduleData)
      setSummary(summaryData)
    } catch (err) {
      console.error("Erreur lors du chargement des paiements:", err)
      setError("Impossible de charger les paiements")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [enrollmentId])

  const create = useCallback(async (data: Parameters<typeof createPaymentWithAllocations>[0]) => {
    if (isCreating) return null
    try {
      setIsCreating(true)
      setError(null)
      const paymentId = await createPaymentWithAllocations(data)
      await loadData()
      return paymentId
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer le paiement.")
      return null
    } finally {
      setIsCreating(false)
    }
  }, [isCreating, loadData])

  return {
    payments,
    schedule,
    summary,
    isLoading,
    error,
    refresh: loadData,
    isCreating,
    create,
  }
}

export function usePaymentList(filters: {
  establishmentId: string | null
  page?: number
  pageSize?: number
  studentId?: string | null
  from?: string | null
  to?: string | null
  refreshKey?: number
}) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!filters.establishmentId) {
      setPayments([])
      setTotal(0)
      setTotalPages(0)
      setIsLoading(false)
      return
    }
    let active = true
    setIsLoading(true)
    void listPaymentsPaginated({ ...filters, establishmentId: filters.establishmentId })
      .then((result) => {
        if (!active) return
        setPayments(result.data)
        setTotal(result.total)
        setTotalPages(result.total_pages)
        setError(null)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Impossible de charger les paiements.")
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [filters.establishmentId, filters.page, filters.pageSize, filters.studentId, filters.from, filters.to, filters.refreshKey])

  return { payments, total, totalPages, isLoading, error }
}

export function useEstablishmentPaymentSummary(establishmentId: string | null, academicYearId: string | null, refreshKey = 0) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getPaymentSummaryByEstablishment>> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId || !academicYearId) {
      setSummary(null)
      setIsLoading(false)
      return
    }
    let active = true
    setIsLoading(true)
    void getPaymentSummaryByEstablishment(establishmentId, academicYearId)
      .then((result) => { if (active) { setSummary(result); setError(null) } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Impossible de charger le résumé financier.") })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [establishmentId, academicYearId, refreshKey])

  return { summary, isLoading, error }
}
