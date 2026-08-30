"use client"

import { useCallback, useEffect, useState } from "react"
import { deactivateStaff, listStaffPaginated } from "@/lib/supabase/services/staff.service"
import type { Staff } from "@/lib/supabase/types"

export function useStaff(establishmentId: string | null, options: { page?: number; pageSize?: number; search?: string; active?: boolean } = {}) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!establishmentId) {
      setStaff([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await listStaffPaginated(
          establishmentId,
          options.page ?? 1,
          options.pageSize ?? 25,
          options.search ?? "",
          options.active ?? true,
        )
        if (active) {
          setStaff(result.items)
          setTotal(result.total)
          setTotalPages(result.total_pages)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement du personnel.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [establishmentId, options.page, options.pageSize, options.search, options.active, refreshKey])

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), [])

  const deactivate = useCallback(async (staffId: string) => {
    if (isDeactivating) return false

    try {
      setIsDeactivating(true)
      setError(null)
      await deactivateStaff(staffId)
      refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de désactiver le membre du personnel.")
      return false
    } finally {
      setIsDeactivating(false)
    }
  }, [isDeactivating, refresh])

  return { staff, total, totalPages, isLoading, error, refresh, deactivate, isDeactivating }
}
