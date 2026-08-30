"use client"

import { useCallback, useEffect, useState } from "react"
import { recordAttendance, listAttendanceHistoryPaginated, type AttendanceHistoryPaginatedResponse } from "@/lib/supabase/services/absence.service"

export function useAttendance() {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveAttendance = async (entries: Array<Parameters<typeof recordAttendance>[0]>) => {
    if (isSaving) return false

    try {
      setIsSaving(true)
      setError(null)
      await Promise.all(entries.map((entry) => recordAttendance(entry)))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer les présences.")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return { saveAttendance, isSaving, error }
}

export function useAttendanceHistory(params: {
  establishmentId: string | null
  page: number
  pageSize: number
  classId?: string | null
  studentId?: string | null
  from?: string
  to?: string
}) {
  const [data, setData] = useState<AttendanceHistoryPaginatedResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((v) => v + 1), [])

  useEffect(() => {
    if (!params.establishmentId) {
      setData(null)
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    void listAttendanceHistoryPaginated({
      establishmentId: params.establishmentId,
      page: params.page,
      pageSize: params.pageSize,
      classId: params.classId,
      studentId: params.studentId,
      from: params.from,
      to: params.to,
    })
      .then((result) => {
        if (active) {
          setData(result)
          setError(null)
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Impossible de charger l'historique.")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [params.establishmentId, params.page, params.pageSize, params.classId, params.studentId, params.from, params.to, refreshKey])

  return { data, isLoading, error, refetch }
}