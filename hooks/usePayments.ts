"use client"

import { useState, useEffect } from "react"
import { getPayments, getPaymentSummary, getPaymentSchedule } from "@/lib/supabase/services/payment.service"
import type { Payment, PaymentSchedule, PaymentSummary } from "@/lib/supabase/types"

interface UsePaymentsReturn {
  payments: Payment[]
  schedule: PaymentSchedule[]
  summary: PaymentSummary | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function usePayments(enrollmentId: string): UsePaymentsReturn {
  const [payments, setPayments] = useState<Payment[]>([])
  const [schedule, setSchedule] = useState<PaymentSchedule[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        getPaymentSummary(enrollmentId),
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

  return {
    payments,
    schedule,
    summary,
    isLoading,
    error,
    refresh: loadData,
  }
}
