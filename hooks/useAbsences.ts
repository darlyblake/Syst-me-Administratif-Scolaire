"use client"

import { useEffect, useState } from "react"
import {
  getAbsencesByStudent,
  getAbsencesByClass,
  getAbsencesForDate,
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
