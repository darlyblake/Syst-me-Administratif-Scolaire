"use client"

import { useCallback, useEffect, useState } from "react"
import { 
  getEstablishmentFeeSettings, 
  getEstablishmentFeeOverrides 
} from "@/lib/supabase/services/establishment-fees.service"
import type { EstablishmentFeeSettings, EstablishmentFeeOverride } from "@/lib/supabase/types/tuition"

export function useEstablishmentFees(establishmentId: string | null) {
  const [settings, setSettings] = useState<EstablishmentFeeSettings | null>(null)
  const [overrides, setOverrides] = useState<EstablishmentFeeOverride[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!establishmentId) {
      setSettings(null)
      setOverrides([])
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [fetchedSettings, fetchedOverrides] = await Promise.all([
        getEstablishmentFeeSettings(establishmentId),
        getEstablishmentFeeOverrides(establishmentId)
      ])

      setSettings(fetchedSettings)
      setOverrides(fetchedOverrides)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement des frais.")
    } finally {
      setIsLoading(false)
    }
  }, [establishmentId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { settings, overrides, isLoading, error, refresh }
}
