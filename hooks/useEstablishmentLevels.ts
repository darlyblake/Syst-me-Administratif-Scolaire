"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getEnabledEstablishmentScopes,
  getEnabledGradeLevels,
  saveEnabledEstablishmentScopes,
  type EstablishmentLevelScope,
  type GradeLevel,
} from "@/services/establishment-levels.service"

export function useEstablishmentLevels(establishmentId?: string) {
  const [scopes, setScopes] = useState<EstablishmentLevelScope[]>([])
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([])
  const [loading, setLoading] = useState(Boolean(establishmentId))
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!establishmentId) {
      setScopes([])
      setGradeLevels([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [nextScopes, nextGradeLevels] = await Promise.all([
        getEnabledEstablishmentScopes(establishmentId),
        getEnabledGradeLevels(establishmentId),
      ])
      setScopes(nextScopes)
      setGradeLevels(nextGradeLevels)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de charger la configuration académique.")
    } finally {
      setLoading(false)
    }
  }, [establishmentId])

  useEffect(() => { void refresh() }, [refresh])

  const save = useCallback(async (nextScopes: EstablishmentLevelScope[]) => {
    if (!establishmentId) throw new Error("Établissement introuvable")
    await saveEnabledEstablishmentScopes(establishmentId, nextScopes)
    await refresh()
  }, [establishmentId, refresh])

  return { scopes, gradeLevels, loading, error, refresh, save }
}
