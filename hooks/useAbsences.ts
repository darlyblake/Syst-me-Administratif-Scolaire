"use client"

import { useCallback, useEffect, useState } from "react"
import {
  getAbsencesByStudent,
  getAbsencesByClass,
  getAbsencesForDate,
  getAttendanceStatistics,
} from "@/lib/supabase/services/absence.service"
import type { Absence, AbsenceWithStudent } from "@/lib/supabase/types"

export function useStudentAbsences(studentId: string | null, dateRange?: { start: string; end: string }) {
  const [absences, setAbsences] = useState<Absence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) {
      setAbsences([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getAbsencesByStudent(studentId, dateRange)
        if (active) setAbsences(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des absences.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [studentId, dateRange?.start, dateRange?.end])

  return { absences, isLoading, error }
}

export function useClassAbsences(classId: string | null, date?: string) {
  const [absences, setAbsences] = useState<AbsenceWithStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!classId) {
      setAbsences([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getAbsencesByClass(classId, date)
        if (active) setAbsences(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des absences.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [classId, date])

  return { absences, isLoading, error }
}

export function useDailyAbsences(establishmentId: string | null, date: string) {
  const [absences, setAbsences] = useState<AbsenceWithStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!establishmentId) {
      setAbsences([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getAbsencesForDate(establishmentId, date)
        if (active) setAbsences(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des absences.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [establishmentId, date])

  return { absences, isLoading, error }
}

export function useAttendanceStatistics(filters: { establishmentId: string | null; from: string; to: string; classId?: string | null }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getAttendanceStatistics>> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((value) => value + 1), [])

  useEffect(() => {
    if (!filters.establishmentId) {
      setData(null)
      setIsLoading(false)
      return
    }
    let active = true
    setIsLoading(true)
    void getAttendanceStatistics({ ...filters, establishmentId: filters.establishmentId })
      .then((result) => { if (active) { setData(result); setError(null) } })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Impossible de charger les statistiques de présence.") })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [filters.establishmentId, filters.from, filters.to, filters.classId, refreshKey])

  return { data, isLoading, error, refetch }
}
