"use client"

import { useEffect, useState } from "react"
import { getGradesByStudent, getGradesByClass } from "@/lib/supabase/services/grade.service"
import type { Grade, GradeWithStudent } from "@/lib/supabase/types"

export function useStudentGrades(studentId: string | null) {
  const [grades, setGrades] = useState<Grade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) {
      setGrades([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getGradesByStudent(studentId)
        if (active) setGrades(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des notes.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [studentId])

  return { grades, isLoading, error }
}

export function useClassGrades(classId: string | null, filters?: { subject?: string; term?: string }) {
  const [grades, setGrades] = useState<GradeWithStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!classId) {
      setGrades([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await getGradesByClass(classId, filters)
        if (active) setGrades(result)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement des notes.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [classId, filters?.subject, filters?.term])

  return { grades, isLoading, error }
}
