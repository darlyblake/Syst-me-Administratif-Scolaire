"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getAcademicYears,
  getActiveAcademicYear,
} from "@/lib/supabase/services/academic-year.service"
import type { AcademicYear } from "@/lib/supabase/types"

export function useAcademicYears(establishmentId: string | null) {
  const [data, setData] = useState<AcademicYear[]>([])
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!establishmentId) {
      setData([])
      setActiveYear(null)
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [years, active] = await Promise.all([
        getAcademicYears(establishmentId),
        getActiveAcademicYear(establishmentId),
      ])

      setData(years)
      setActiveYear(active)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de l’année scolaire.")
    } finally {
      setIsLoading(false)
    }
  }, [establishmentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    data,
    activeYear,
    isLoading,
    error,
    refresh,
  }
}
