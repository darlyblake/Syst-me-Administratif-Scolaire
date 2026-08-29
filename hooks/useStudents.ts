"use client"

import { useEffect, useState } from "react"
import { getStudents } from "@/lib/supabase/services/student.service"
import type { Student, StudentFilters } from "@/lib/supabase/types"

export function useStudents(establishmentId: string | null, filters: StudentFilters = {}) {
  const [data, setData] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId) {
      setData([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getStudents(establishmentId, filters)
        if (active) setData(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des élèves.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [establishmentId, filters.search, filters.classId, filters.gradeLevelId, filters.academicYearId, filters.status])

  return { data, isLoading, error }
}
