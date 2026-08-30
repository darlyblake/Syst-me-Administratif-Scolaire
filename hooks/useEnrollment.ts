"use client"

import { useCallback, useEffect, useState } from "react"
import { createStudentEnrollmentWithSchedule, getEnrollment, getEnrollmentSchedule } from "@/lib/supabase/services/enrollment.service"
import type { Enrollment } from "@/lib/supabase/types"

export function useEnrollment(enrollmentId: string | null) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [schedule, setSchedule] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!enrollmentId) {
      setEnrollment(null)
      setSchedule([])
      setIsLoading(false)
      setError(null)
      return
    }

    let active = true

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [enrollmentData, scheduleData] = await Promise.all([
          getEnrollment(enrollmentId),
          getEnrollmentSchedule(enrollmentId),
        ])

        if (active) {
          setEnrollment(enrollmentData)
          setSchedule(scheduleData)
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Erreur de chargement de l'inscription.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [enrollmentId])

  const createStudentEnrollment = useCallback(async (data: Parameters<typeof createStudentEnrollmentWithSchedule>[0]) => {
    if (isSubmitting) return null
    try {
      setIsSubmitting(true)
      setError(null)
      return await createStudentEnrollmentWithSchedule(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer l'inscription.")
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting])

  return { enrollment, schedule, isLoading, error, isSubmitting, createStudentEnrollment }
}
