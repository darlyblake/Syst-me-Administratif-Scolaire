"use client"

import { useEffect, useState } from "react"
import { getEstablishment } from "@/lib/supabase/services/establishment.service"
import type { Establishment } from "@/lib/supabase/types"

export function useEstablishment(establishmentId: string | null) {
  const [data, setData] = useState<Establishment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getEstablishment(establishmentId)
        if (active) setData(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement de l’établissement.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [establishmentId])

  return { data, isLoading, error }
}
