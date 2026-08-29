"use client"

import { useCallback, useEffect, useState } from "react"
import { getTuitionPlan, getTuitionPlans } from "@/lib/supabase/services/tuition.service"
import type { TuitionPlan } from "@/lib/supabase/types"

export function useTuitionPlans(academicYearId: string | null, gradeLevelId?: string | null) {
  const [data, setData] = useState<TuitionPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<TuitionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!academicYearId) {
      setData([])
      setSelectedPlan(null)
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const plans = await getTuitionPlans(academicYearId)
      setData(plans)

      if (gradeLevelId) {
        const plan = await getTuitionPlan(academicYearId, gradeLevelId)
        setSelectedPlan(plan)
      } else {
        setSelectedPlan(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de la scolarité.")
    } finally {
      setIsLoading(false)
    }
  }, [academicYearId, gradeLevelId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, selectedPlan, isLoading, error, refresh }
}
