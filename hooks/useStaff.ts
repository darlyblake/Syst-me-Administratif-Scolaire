"use client"

import { useEffect, useState } from "react"
import { getStaff } from "@/lib/supabase/services/staff.service"
import type { Staff } from "@/lib/supabase/types"

export function useStaff(establishmentId: string | null, role?: string) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const result = await getStaff(establishmentId, role)
        if (active) setStaff(result)
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
  }, [establishmentId, role])

  return { staff, isLoading, error }
}
