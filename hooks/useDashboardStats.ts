"use client"

import { useEffect, useState } from "react"
import { supabaseBrowser } from "@/lib/supabase/client"

export interface DashboardStats {
  total_students: number
  active_students: number
  total_teachers: number
  total_classes: number
  total_revenue: number
  pending_payments: number
  academic_year?: string
}

export function useDashboardStats(establishmentId: string | null, academicYearId: string | null) {
  const [stats, setStats] = useState<DashboardStats>({
    total_students: 0,
    active_students: 0,
    total_teachers: 0,
    total_classes: 0,
    total_revenue: 0,
    pending_payments: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId) {
      setIsLoading(false)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get total students
        const { data: studentData, error: studentError } = await supabaseBrowser
          .from("students")
          .select("id, status")
          .eq("establishment_id", establishmentId)

        if (studentError) throw new Error("Erreur de chargement des élèves")

        const activeStudents = studentData?.filter((s) => s.status === "active").length ?? 0

        // Get classes count
        const { data: classData, error: classError } = await supabaseBrowser
          .from("school_classes")
          .select("id")

        if (classError) throw new Error("Erreur de chargement des classes")

        // Get payment summary
        let totalRevenue = 0
        let pendingPayments = 0

        if (academicYearId) {
          const { data: enrollments, error: enrollmentError } = await supabaseBrowser
            .from("enrollments")
            .select("id, tuition_plan_id")
            .eq("establishment_id", establishmentId)
            .eq("academic_year_id", academicYearId)

          if (!enrollmentError && enrollments) {
            for (const enrollment of enrollments) {
              // Get payments for this enrollment
              const { data: payments } = await supabaseBrowser
                .from("payments")
                .select("amount")
                .eq("enrollment_id", enrollment.id)

              const paid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
              totalRevenue += paid

              // Get pending amount
              const { data: tuition } = await supabaseBrowser
                .from("tuition_plans")
                .select("annual_amount, registration_fee")
                .eq("id", enrollment.tuition_plan_id)
                .single()

              if (tuition) {
                const total = (tuition.annual_amount || 0) + (tuition.registration_fee || 0)
                const pending = Math.max(0, total - paid)
                pendingPayments += pending
              }
            }
          }
        }

        if (active) {
          setStats({
            total_students: studentData?.length ?? 0,
            active_students: activeStudents,
            total_teachers: 0, // Would need teachers table
            total_classes: classData?.length ?? 0,
            total_revenue: totalRevenue,
            pending_payments: pendingPayments,
          })
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement du tableau de bord")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [establishmentId, academicYearId])

  return { stats, isLoading, error }
}
