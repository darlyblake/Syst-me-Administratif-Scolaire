"use client"

import { useEffect, useState } from "react"
import { getAcademicStructure } from "@/lib/supabase/services/academic.service"
import type { AcademicStructureCycle } from "@/lib/supabase/types"

export function useAcademicStructure(establishmentId: string | null) {
  const [data, setData] = useState<AcademicStructureCycle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    if (!establishmentId) {
      setData([])
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const result = await getAcademicStructure(establishmentId)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!establishmentId) {
      setData([])
      setIsLoading(false)
      setError(null)
      return
    }

    let isActive = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getAcademicStructure(establishmentId)
        if (isActive) setData(result)
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Erreur de chargement.")
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    load()

    return () => {
      isActive = false
    }
  }, [establishmentId])

  return { data, isLoading, error, refresh }
}
