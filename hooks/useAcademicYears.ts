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
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applySelection = useCallback((years: AcademicYear[], preferred: AcademicYear | null) => {
    const fallbackYear = preferred ?? years[0] ?? null

    setSelectedYear(fallbackYear)
  }, [])

  const refresh = useCallback(async () => {
    if (!establishmentId) {
      setData([])
      setActiveYear(null)
      setSelectedYear(null)
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
      applySelection(years, active)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement de l’année scolaire.")
    } finally {
      setIsLoading(false)
    }
  }, [establishmentId, applySelection])

  const selectYear = useCallback((yearId: string) => {
    const year = data.find((item) => item.id === yearId) ?? null
    setSelectedYear(year)
  }, [data])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!data.length) return
    if (!selectedYear) {
      applySelection(data, activeYear)
    }
  }, [activeYear, applySelection, data, selectedYear])

  return {
    data,
    activeYear,
    selectedYear,
    isLoading,
    error,
    refresh,
    selectYear,
  }
}
